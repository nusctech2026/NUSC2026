import crypto from 'crypto';
import { createAdminClient } from '@nusc/db';
import {
  AhibiSeasonPassError,
  confirmAhibiSeasonPass,
  releaseAhibiSeasonPass,
  reserveAhibiSeasonPass,
  type AhibiSeasonPassId,
  type AhibiSeasonPassZone,
  type AhibiSeasonPassTicket,
} from './ahibi-season-pass';

const SEASON_ID = 'nusc-il-2026-27';

const PASS_OPTIONS = Object.freeze({
  'general-season': { ticketType: 'General Pass', amountPaise: 389400 },
  'premium-season': { ticketType: 'Premium Pass', amountPaise: 1947000 },
});

type ManualPassRow = {
  id: string;
  request_id: string;
  season_id: string;
  request_hash: string;
  member_id: string;
  user_id: string;
  membership_number: string;
  pass_id: AhibiSeasonPassId;
  ticket_type: 'General Pass' | 'Premium Pass';
  zone: AhibiSeasonPassZone | null;
  list_amount_paise: number;
  settled_amount_paise: number | null;
  settlement_type: 'paid' | 'complimentary' | null;
  payment_method: 'Cash' | 'Card' | 'UPI' | null;
  payment_reference: string | null;
  complimentary_reason: string | null;
  settlement_hash: string | null;
  created_by_ahibi_admin_id: string;
  settled_by_ahibi_admin_id: string | null;
  status: string;
  ahibi_pass_status: string;
  ahibi_reservation_id: string | null;
  ahibi_partner_order_id: string | null;
  ahibi_reservation_expires_at: string | null;
  error_code: string | null;
};

export class ManualRiseSeasonPassError extends Error {
  constructor(public readonly status: number, public readonly code: string, message = code) {
    super(message);
    this.name = 'ManualRiseSeasonPassError';
  }
}

function relationOne(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function memberIsEligible(member: any, now = Date.now()) {
  const plan = relationOne(member?.plan);
  const endDate = member?.end_date ? Date.parse(member.end_date) : null;
  return member?.status === 'active'
    && member?.registration_payment_status === 'paid'
    && (!endDate || (Number.isFinite(endDate) && endDate > now))
    && ['rise-general', 'rise-premium'].includes(plan?.slug);
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length < 4 ? '••••' : '•'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

function passPrices() {
  return Object.fromEntries(Object.entries(PASS_OPTIONS).map(([passId, pass]) => [
    passId,
    { ticketType: pass.ticketType, amountMinor: pass.amountPaise, amount: pass.amountPaise / 100 },
  ]));
}

function requestHash(value: unknown) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function appendAudit(order: ManualPassRow, action: string, adminReference: string, details: Record<string, unknown> = {}) {
  return [...((order as any).audit || []), {
    action,
    adminReference,
    at: new Date().toISOString(),
    details,
  }];
}

function publicOrder(order: ManualPassRow, tickets: AhibiSeasonPassTicket[] = []) {
  return {
    orderId: order.id,
    status: order.status,
    passId: order.pass_id,
    ticketType: order.ticket_type,
    zone: order.zone,
    amountMinor: order.list_amount_paise,
    currency: 'INR',
    settlementType: order.settlement_type,
    paymentMethod: order.payment_method,
    reservationExpiresAt: order.ahibi_reservation_expires_at,
    errorCode: order.error_code,
    tickets: tickets.map(ticket => ({
      ticketId: ticket.ticketId,
      eventId: ticket.eventId,
      matchDate: ticket.matchDate,
      opponent: ticket.opponent,
      ticketType: ticket.ticketType,
      zone: ticket.zone,
      status: ticket.status,
      ticketAccessPath: ticket.ticketAccessPath,
    })),
  };
}

async function findEligibleMembers(query: string) {
  const db = createAdminClient();
  let userIds: string[] = [];
  let profiles: any[] = [];

  if (/^NUSC\d{8}$/i.test(query)) {
    const { data, error } = await db.from('members')
      .select('id,user_id,membership_number,status,registration_payment_status,end_date,plan:membership_plans(slug,name)')
      .ilike('membership_number', query)
      .limit(20);
    if (error) throw new ManualRiseSeasonPassError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
    const members = (data || []).filter((member: any) => memberIsEligible(member));
    userIds = members.map((member: any) => member.user_id);
  } else {
    const phone = query.replace(/\D/g, '');
    if (phone.length !== 10) return [];
    const { data, error } = await db.from('member_profiles')
      .select('user_id,first_name,last_name,phone')
      .eq('phone', phone)
      .limit(20);
    if (error) throw new ManualRiseSeasonPassError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
    profiles = data || [];
    userIds = profiles.map((profile: any) => profile.user_id);
  }

  if (!userIds.length) return [];
  const { data: memberRows, error: memberError } = await db.from('members')
    .select('id,user_id,membership_number,status,registration_payment_status,end_date,plan:membership_plans(slug,name)')
    .in('user_id', userIds)
    .limit(20);
  if (memberError) throw new ManualRiseSeasonPassError(503, 'MEMBER_LOOKUP_UNAVAILABLE');

  const eligible = (memberRows || []).filter((member: any) => memberIsEligible(member));
  const eligibleUserIds = eligible.map((member: any) => member.user_id);
  let profileByUser = new Map(profiles.map((profile: any) => [profile.user_id, profile]));
  if (eligibleUserIds.length && profiles.length === 0) {
    const { data, error } = await db.from('member_profiles')
      .select('user_id,first_name,last_name,phone')
      .in('user_id', eligibleUserIds)
      .limit(20);
    if (error) throw new ManualRiseSeasonPassError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
    profileByUser = new Map((data || []).map((profile: any) => [profile.user_id, profile]));
  }

  return eligible.map((member: any) => {
    const plan = relationOne(member.plan);
    const profile: any = profileByUser.get(member.user_id) || {};
    return {
      memberNumber: member.membership_number,
      name: (profile.first_name || '') + ' ' + (profile.last_name || ''),
      phoneMasked: maskPhone(profile.phone || ''),
      tier: plan?.name || plan?.slug || '',
      passId: plan?.slug === 'rise-general' ? 'general-season' : 'premium-season',
      expiresAt: member.end_date || null,
    };
  }).filter((member: any) => Boolean(member.memberNumber));
}

async function findEligibleMemberByNumber(db: ReturnType<typeof createAdminClient>, memberNumber: string) {
  const { data: member, error } = await db.from('members')
    .select('id,user_id,plan_id,membership_number,status,registration_payment_status,end_date,plan:membership_plans(slug,name)')
    .eq('membership_number', memberNumber)
    .maybeSingle();
  if (error) throw new ManualRiseSeasonPassError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
  if (!member || !memberIsEligible(member)) throw new ManualRiseSeasonPassError(409, 'MEMBER_NOT_ELIGIBLE', 'This membership is not eligible for RISE season pass booking.');

  const { data: profile, error: profileError } = await db.from('member_profiles')
    .select('user_id,first_name,last_name,phone')
    .eq('user_id', member.user_id)
    .maybeSingle();
  if (profileError) throw new ManualRiseSeasonPassError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
  return { member, profile: profile || {} };
}

async function lookupOrder(db: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data, error } = await db.from('membership_ahibi_manual_pass_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new ManualRiseSeasonPassError(503, 'ORDER_LOOKUP_UNAVAILABLE');
  if (!data) throw new ManualRiseSeasonPassError(404, 'ORDER_NOT_FOUND');
  return data as ManualPassRow;
}

export async function searchRiseSeasonPassMembers(rawQuery: unknown) {
  const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (query.length < 5 || query.length > 32) return { members: [], passes: passPrices() };
  const members = await findEligibleMembers(query);
  return { members, passes: passPrices() };
}

export function isEligibleRiseSeasonPassMember(member: unknown, now = Date.now()) {
  return memberIsEligible(member, now);
}

export function getRiseSeasonPassPrices() {
  return passPrices();
}

export async function reserveManualRiseSeasonPass(input: {
  requestId: string;
  memberNumber: string;
  passId: AhibiSeasonPassId;
  zone: AhibiSeasonPassZone | null;
  adminReference: string;
}) {
  if (!/^[a-f0-9-]{36}$/i.test(input.requestId)) throw new ManualRiseSeasonPassError(400, 'REQUEST_ID_REQUIRED');
  const pass = PASS_OPTIONS[input.passId];
  if (!pass) throw new ManualRiseSeasonPassError(400, 'INVALID_PASS');
  if ((input.passId === 'general-season' && !/^G-[1-5]$/.test(String(input.zone || '')))
      || (input.passId === 'premium-season' && input.zone !== null)) {
    throw new ManualRiseSeasonPassError(400, 'INVALID_ZONE');
  }

  const db = createAdminClient();
  const { member } = await findEligibleMemberByNumber(db, input.memberNumber);
  const memberPlan = relationOne(member.plan);
  const eligiblePassId = memberPlan?.slug === 'rise-general' ? 'general-season' : 'premium-season';
  if (input.passId !== eligiblePassId) throw new ManualRiseSeasonPassError(409, 'MEMBER_PASS_MISMATCH', 'The selected pass must match the member’s active RISE tier.');
  const hash = requestHash({ memberId: member.id, passId: input.passId, zone: input.zone });
  let { data: orderData, error: orderError } = await db.from('membership_ahibi_manual_pass_orders')
    .select('*').eq('request_id', input.requestId).maybeSingle();
  if (orderError) throw new ManualRiseSeasonPassError(503, 'ORDER_LOOKUP_UNAVAILABLE');

  if (orderData && orderData.request_hash !== hash) throw new ManualRiseSeasonPassError(409, 'REQUEST_ID_CONFLICT');
  if (orderData?.settlement_hash || orderData?.status === 'issued' || orderData?.status === 'reserved') return publicOrder(orderData as ManualPassRow);
  if (orderData?.status === 'cancelled') throw new ManualRiseSeasonPassError(409, 'ORDER_CANCELLED');
  if (orderData?.ahibi_reservation_id && orderData?.ahibi_reservation_expires_at
      && Date.parse(orderData.ahibi_reservation_expires_at) <= Date.now()) {
    throw new ManualRiseSeasonPassError(409, 'RESERVATION_EXPIRED');
  }

  if (!orderData) {
    const { data: duplicateManual, error: duplicateManualError } = await db.from('membership_ahibi_manual_pass_orders')
      .select('id').eq('member_id', member.id).eq('pass_id', input.passId).eq('season_id', SEASON_ID)
      .in('status', ['reserving', 'reserved', 'settling', 'issued', 'needs_reconciliation']).limit(1).maybeSingle();
    if (duplicateManualError) throw new ManualRiseSeasonPassError(503, 'ORDER_LOOKUP_UNAVAILABLE');
    if (duplicateManual) throw new ManualRiseSeasonPassError(409, 'DUPLICATE_PASS', 'This member already has a manual pass or reservation for this RISE tier.');
    const { data: onlineOrder, error: onlineOrderError } = await db.from('membership_payment_orders')
      .select('id').eq('member_id', member.id).eq('user_id', member.user_id).eq('plan_id', member.plan_id)
      .eq('purpose', 'tier').eq('ahibi_pass_id', input.passId)
      .in('status', ['creating', 'pending', 'paid'])
      .in('ahibi_pass_status', ['reserving', 'held', 'issuing', 'issued', 'needs_reconciliation', 'refund_required'])
      .limit(1).maybeSingle();
    if (onlineOrderError) throw new ManualRiseSeasonPassError(503, 'ORDER_LOOKUP_UNAVAILABLE');
    if (onlineOrder) throw new ManualRiseSeasonPassError(409, 'DUPLICATE_PASS', 'This RISE tier already has a season pass linked to its membership payment.');
    const { data, error } = await db.from('membership_ahibi_manual_pass_orders')
      .insert({
        request_id: input.requestId,
        season_id: SEASON_ID,
        request_hash: hash,
        member_id: member.id,
        user_id: member.user_id,
        membership_number: member.membership_number,
        pass_id: input.passId,
        ticket_type: pass.ticketType,
        zone: input.zone,
        list_amount_paise: pass.amountPaise,
        created_by_ahibi_admin_id: input.adminReference,
        status: 'reserving',
        ahibi_pass_status: 'reserving',
        audit: [{ action: 'reservation_started', adminReference: input.adminReference, at: new Date().toISOString(), details: { passId: input.passId, zone: input.zone } }],
      })
      .select('*').single();
    if (error || !data) {
      if (error?.code !== '23505') throw new ManualRiseSeasonPassError(503, 'ORDER_CREATE_FAILED');
      const retry = await db.from('membership_ahibi_manual_pass_orders').select('*').eq('request_id', input.requestId).maybeSingle();
      orderData = retry.data;
      if (!orderData || orderData.request_hash !== hash) {
        const duplicate = await db.from('membership_ahibi_manual_pass_orders').select('id')
          .eq('member_id', member.id).eq('pass_id', input.passId).eq('season_id', SEASON_ID)
          .in('status', ['reserving', 'reserved', 'settling', 'issued', 'needs_reconciliation']).limit(1).maybeSingle();
        if (duplicate.data) throw new ManualRiseSeasonPassError(409, 'DUPLICATE_PASS', 'This member already has a manual pass or reservation for this RISE tier.');
        throw new ManualRiseSeasonPassError(409, 'REQUEST_ID_CONFLICT');
      }
    } else {
      orderData = data;
    }
  }

  const order = orderData as ManualPassRow;
  const partnerOrderId = order.ahibi_partner_order_id || 'nusc-order-' + order.id;
  try {
    const reservation = await reserveAhibiSeasonPass({
      partnerOrderId,
      memberReference: 'nusc-member-' + order.member_id,
      passId: order.pass_id,
      zone: order.zone,
    });
    const audit = appendAudit(order, 'inventory_reserved', input.adminReference, { expiresAt: reservation.expiresAt });
    const { data: saved, error } = await db.from('membership_ahibi_manual_pass_orders').update({
      status: 'reserved',
      ahibi_pass_status: 'held',
      ahibi_reservation_id: reservation.reservationId,
      ahibi_partner_order_id: partnerOrderId,
      ahibi_reservation_expires_at: reservation.expiresAt,
      error_code: null,
      audit,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id).select('*').single();
    if (error || !saved) {
      // Keep the partner hold alive. Retrying the same deterministic partner order ID
      // returns this hold and lets the NUSC order row reconcile without double-reserving.
      throw new ManualRiseSeasonPassError(503, 'ORDER_SAVE_FAILED');
    }
    const memberProfile = await db.from('member_profiles').select('first_name,last_name,phone').eq('user_id', member.user_id).maybeSingle();
    return {
      ...publicOrder(saved as ManualPassRow),
      member: {
        memberNumber: member.membership_number,
        name: (memberProfile.data?.first_name || '') + ' ' + (memberProfile.data?.last_name || ''),
        phoneMasked: maskPhone(memberProfile.data?.phone || ''),
      },
    };
  } catch (error) {
    const code = error instanceof ManualRiseSeasonPassError ? error.code : error instanceof AhibiSeasonPassError ? error.code : 'RESERVATION_FAILED';
    const audit = appendAudit(order, 'reservation_failed', input.adminReference, { code });
    await db.from('membership_ahibi_manual_pass_orders').update({
      status: code === 'ORDER_SAVE_FAILED' ? 'needs_reconciliation' : 'failed',
      ahibi_pass_status: code === 'ORDER_SAVE_FAILED' ? 'needs_reconciliation' : 'failed',
      error_code: code,
      audit,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id);
    throw error instanceof ManualRiseSeasonPassError
      ? error
      : new ManualRiseSeasonPassError(error instanceof AhibiSeasonPassError ? error.status : 502, code, 'Unable to reserve the RISE season pass.');
  }
}

function normalizeSettlement(input: any) {
  if (input?.settlementType === 'paid') {
    if (!['Cash', 'Card', 'UPI'].includes(input.modeOfPayment)) throw new ManualRiseSeasonPassError(400, 'PAYMENT_METHOD_REQUIRED');
    const paymentReference = typeof input.paymentReference === 'string' ? input.paymentReference.trim() : '';
    if (paymentReference.length > 120) throw new ManualRiseSeasonPassError(400, 'INVALID_PAYMENT_REFERENCE');
    return { settlementType: 'paid', modeOfPayment: input.modeOfPayment, paymentReference: paymentReference || null, complimentaryReason: null };
  }
  if (input?.settlementType === 'complimentary') {
    const reason = typeof input.complimentaryReason === 'string' ? input.complimentaryReason.trim() : '';
    if (reason.length < 5 || reason.length > 500) throw new ManualRiseSeasonPassError(400, 'COMPLIMENTARY_REASON_REQUIRED');
    return { settlementType: 'complimentary', modeOfPayment: null, paymentReference: null, complimentaryReason: reason };
  }
  throw new ManualRiseSeasonPassError(400, 'INVALID_SETTLEMENT_TYPE');
}

export async function saveManualSeasonPassTickets(db: ReturnType<typeof createAdminClient>, order: ManualPassRow, tickets: AhibiSeasonPassTicket[]) {
  if (tickets.length !== 10 || new Set(tickets.map(ticket => ticket.eventId)).size !== 10) {
    throw new ManualRiseSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  const rows = tickets.map(ticket => ({
    payment_order_id: null,
    manual_order_id: order.id,
    member_id: order.member_id,
    user_id: order.user_id,
    ahibi_booking_id: ticket.ticketId,
    ahibi_event_id: ticket.eventId,
    match_date: ticket.matchDate,
    opponent: ticket.opponent,
    ticket_type: ticket.ticketType,
    zone: ticket.zone,
    status: ticket.status,
    ticket_access_path: ticket.ticketAccessPath,
  }));
  const selectFields = 'ahibi_booking_id,ahibi_event_id,match_date,opponent,ticket_type,zone,status,ticket_access_path';
  const { data: existing, error: lookupError } = await db.from('membership_season_pass_tickets')
    .select(selectFields)
    .eq('manual_order_id', order.id).eq('member_id', order.member_id).eq('user_id', order.user_id);
  if (lookupError) throw new ManualRiseSeasonPassError(503, 'TICKET_RECORD_LOOKUP_FAILED');

  const expected = new Map(tickets.map(ticket => [ticket.eventId, ticket]));
  const existingByEvent = new Map((existing || []).map((row: any) => [row.ahibi_event_id, row]));
  const rowsMatch = (storedRows: any[], complete: boolean) => {
    if (storedRows.length !== new Map(storedRows.map(row => [row.ahibi_event_id, row])).size) return false;
    if (complete && storedRows.length !== tickets.length) return false;
    return storedRows.every((row: any) => {
      const remote = expected.get(row.ahibi_event_id);
      return Boolean(remote)
        && row.ahibi_booking_id === remote!.ticketId
        && row.match_date === remote!.matchDate
        && row.opponent === remote!.opponent
        && row.ticket_type === remote!.ticketType
        && row.zone === remote!.zone
        && row.status === remote!.status
        && row.ticket_access_path === remote!.ticketAccessPath;
    });
  };
  if (existingByEvent.size !== (existing || []).length || !rowsMatch(existing || [], false)) {
    throw new ManualRiseSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }

  const missingRows = rows.filter(row => !existingByEvent.has(row.ahibi_event_id));
  let insertError: { code?: string } | null = null;
  if (missingRows.length) {
    const inserted = await db.from('membership_season_pass_tickets').insert(missingRows);
    insertError = inserted.error;
    if (insertError && insertError.code !== '23505') {
      throw new ManualRiseSeasonPassError(503, 'TICKET_RECORD_SAVE_FAILED');
    }
  }

  const { data: saved, error: readError } = await db.from('membership_season_pass_tickets')
    .select(selectFields)
    .eq('manual_order_id', order.id).eq('member_id', order.member_id).eq('user_id', order.user_id);
  if (readError) throw new ManualRiseSeasonPassError(503, 'TICKET_RECORD_LOOKUP_FAILED');
  if (!rowsMatch(saved || [], true)) {
    throw new ManualRiseSeasonPassError(insertError ? 503 : 502, insertError ? 'TICKET_RECORD_SAVE_FAILED' : 'TICKET_RECORD_INCOMPLETE');
  }
}

export function manualSeasonPassRecoveryPartnerOrderId(orderId: string, reservationId: string) {
  const hash = crypto.createHash('sha256').update(orderId + ':' + reservationId).digest('hex').slice(0, 32);
  const uuid = hash.slice(0, 8) + '-' + hash.slice(8, 12) + '-' + hash.slice(12, 16) + '-' + hash.slice(16, 20) + '-' + hash.slice(20);
  return 'nusc-order-' + uuid;
}

async function recoverExpiredAhibiReservation(
  db: ReturnType<typeof createAdminClient>,
  order: ManualPassRow,
  adminReference: string,
) {
  let current = order;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const oldReservationId = current.ahibi_reservation_id;
    if (!oldReservationId) throw new ManualRiseSeasonPassError(409, 'RESERVATION_MISSING');
    const replacementPartnerOrderId = manualSeasonPassRecoveryPartnerOrderId(current.id, oldReservationId);
    const { data: claimed, error: claimError } = await db.from('membership_ahibi_manual_pass_orders').update({
      status: 'settling',
      ahibi_pass_status: 'reserving',
      ahibi_partner_order_id: replacementPartnerOrderId,
      error_code: null,
      audit: appendAudit(current, 'inventory_recovery_started', adminReference, { previousReservationId: oldReservationId }),
      updated_at: new Date().toISOString(),
    }).eq('id', current.id).eq('ahibi_reservation_id', oldReservationId)
      .eq('settlement_hash', current.settlement_hash).select('*').maybeSingle();
    if (claimError) throw new ManualRiseSeasonPassError(503, 'RESERVATION_RECOVERY_SAVE_FAILED');

    if (claimed) current = claimed as ManualPassRow;
    else {
      current = await lookupOrder(db, current.id);
      if (current.ahibi_reservation_id !== oldReservationId) {
        if (current.ahibi_reservation_expires_at && Date.parse(current.ahibi_reservation_expires_at) > Date.now()) return current;
        continue;
      }
      if (current.ahibi_partner_order_id && current.ahibi_partner_order_id !== replacementPartnerOrderId) {
        throw new ManualRiseSeasonPassError(409, 'RESERVATION_RECOVERY_CONFLICT');
      }
    }

    const partnerOrderId = current.ahibi_partner_order_id || replacementPartnerOrderId;
    const reservation = await reserveAhibiSeasonPass({
      partnerOrderId,
      memberReference: 'nusc-member-' + current.member_id,
      passId: current.pass_id,
      zone: current.zone,
    });
    const { data: saved, error: saveError } = await db.from('membership_ahibi_manual_pass_orders').update({
      status: 'settling',
      ahibi_pass_status: 'held',
      ahibi_reservation_id: reservation.reservationId,
      ahibi_partner_order_id: partnerOrderId,
      ahibi_reservation_expires_at: reservation.expiresAt,
      error_code: null,
      audit: appendAudit(current, 'inventory_recovery_reserved', adminReference, { expiresAt: reservation.expiresAt }),
      updated_at: new Date().toISOString(),
    }).eq('id', current.id).eq('ahibi_partner_order_id', partnerOrderId)
      .eq('ahibi_reservation_id', oldReservationId).select('*').maybeSingle();
    if (saveError) throw new ManualRiseSeasonPassError(503, 'RESERVATION_RECOVERY_SAVE_FAILED');
    if (saved) current = saved as ManualPassRow;
    else current = await lookupOrder(db, current.id);

    if (current.ahibi_reservation_id !== reservation.reservationId) {
      if (current.ahibi_reservation_expires_at && Date.parse(current.ahibi_reservation_expires_at) > Date.now()) return current;
      continue;
    }
    if (Date.parse(reservation.expiresAt) > Date.now()) return current;
  }
  throw new ManualRiseSeasonPassError(409, 'RESERVATION_EXPIRED', 'Settlement is recorded. Inventory recovery did not produce a live reservation; retry this same order.');
}

export async function settleManualRiseSeasonPass(input: {
  orderId: string;
  settlementType: 'paid' | 'complimentary';
  modeOfPayment?: 'Cash' | 'Card' | 'UPI';
  paymentReference?: string;
  complimentaryReason?: string;
  adminReference: string;
}) {
  const db = createAdminClient();
  let order = await lookupOrder(db, input.orderId);
  const settlement = normalizeSettlement(input);
  const settlementHash = requestHash(settlement);
  if (order.settlement_hash && order.settlement_hash !== settlementHash) throw new ManualRiseSeasonPassError(409, 'SETTLEMENT_CONFLICT');
  if (order.status === 'issued') {
    const { data: tickets } = await db.from('membership_season_pass_tickets')
      .select('ahibi_booking_id,ahibi_event_id,match_date,opponent,ticket_type,zone,status,ticket_access_path')
      .eq('manual_order_id', order.id).eq('member_id', order.member_id).eq('user_id', order.user_id);
    return publicOrder(order, (tickets || []).map((ticket: any) => ({
      ticketId: ticket.ahibi_booking_id,
      eventId: ticket.ahibi_event_id,
      matchDate: ticket.match_date,
      opponent: ticket.opponent,
      ticketType: ticket.ticket_type,
      zone: ticket.zone,
      status: ticket.status,
      ticketAccessPath: ticket.ticket_access_path,
    })));
  }
  if (!order.ahibi_reservation_id || !['reserved', 'settling', 'needs_reconciliation'].includes(order.status)) {
    throw new ManualRiseSeasonPassError(409, 'ORDER_NOT_RESERVED');
  }
  const expected = { partnerOrderId: order.ahibi_partner_order_id || 'nusc-order-' + order.id, passId: order.pass_id, zone: order.zone };

  if (!order.settlement_hash) {
    const amount = settlement.settlementType === 'paid' ? order.list_amount_paise : 0;
    const patch: Record<string, unknown> = {
      settlement_type: settlement.settlementType,
      payment_method: settlement.modeOfPayment,
      payment_reference: settlement.paymentReference,
      complimentary_reason: settlement.complimentaryReason,
      settlement_hash: settlementHash,
      settled_amount_paise: amount,
      settled_by_ahibi_admin_id: input.adminReference,
      settled_at: new Date().toISOString(),
      status: 'settling',
      ahibi_pass_status: 'issuing',
      error_code: null,
      audit: appendAudit(order, settlement.settlementType === 'paid' ? 'offline_payment_recorded' : 'complimentary_recorded', input.adminReference, {
        settlementType: settlement.settlementType,
        modeOfPayment: settlement.modeOfPayment,
        settledAmountMinor: amount,
      }),
      updated_at: new Date().toISOString(),
    };
    const { data: claimed, error } = await db.from('membership_ahibi_manual_pass_orders')
      .update(patch).eq('id', order.id).is('settlement_hash', null).eq('status', 'reserved').select('*').maybeSingle();
    if (error) throw new ManualRiseSeasonPassError(503, 'SETTLEMENT_SAVE_FAILED');
    if (claimed) order = claimed as ManualPassRow;
    else {
      order = await lookupOrder(db, input.orderId);
      if (order.settlement_hash !== settlementHash) throw new ManualRiseSeasonPassError(409, 'SETTLEMENT_CONFLICT');
    }
  } else {
    await db.from('membership_ahibi_manual_pass_orders').update({
      status: 'settling',
      ahibi_pass_status: 'issuing',
      updated_at: new Date().toISOString(),
    }).eq('id', order.id).in('status', ['settling', 'needs_reconciliation']);
  }

  const syntheticSettlementReference = 'manual_' + order.id;
  const reservationId = order.ahibi_reservation_id;
  if (!reservationId) throw new ManualRiseSeasonPassError(409, 'RESERVATION_MISSING');
  try {
    let issued;
    try {
      issued = await confirmAhibiSeasonPass(reservationId, syntheticSettlementReference, expected);
    } catch (error) {
      if (!(error instanceof AhibiSeasonPassError) || error.code !== 'HOLD_EXPIRED') throw error;
      order = await recoverExpiredAhibiReservation(db, order, input.adminReference);
      const recoveredReservationId = order.ahibi_reservation_id;
      if (!recoveredReservationId) throw new ManualRiseSeasonPassError(409, 'RESERVATION_MISSING');
      const recoveredExpected = {
        partnerOrderId: order.ahibi_partner_order_id || expected.partnerOrderId,
        passId: order.pass_id,
        zone: order.zone,
      };
      issued = await confirmAhibiSeasonPass(recoveredReservationId, syntheticSettlementReference, recoveredExpected);
    }
    await saveManualSeasonPassTickets(db, order, issued.tickets);
    const audit = appendAudit(order, 'tickets_issued', input.adminReference, { ticketCount: issued.tickets.length });
    const { error: updateError } = await db.from('membership_ahibi_manual_pass_orders').update({
      status: 'issued',
      ahibi_pass_status: 'issued',
      error_code: null,
      issued_at: new Date().toISOString(),
      audit,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id).eq('settlement_hash', settlementHash);
    if (updateError) throw new ManualRiseSeasonPassError(503, 'ORDER_STATUS_SAVE_FAILED');
    return publicOrder({ ...order, status: 'issued', ahibi_pass_status: 'issued', error_code: null } as ManualPassRow, issued.tickets);
  } catch (error) {
    const code = error instanceof ManualRiseSeasonPassError ? error.code : error instanceof AhibiSeasonPassError ? error.code : 'ISSUANCE_PENDING';
    const audit = appendAudit(order, 'issuance_recovery_required', input.adminReference, { code });
    await db.from('membership_ahibi_manual_pass_orders').update({
      status: 'needs_reconciliation',
      ahibi_pass_status: 'needs_reconciliation',
      error_code: code,
      audit,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id).eq('settlement_hash', settlementHash);
    throw error instanceof ManualRiseSeasonPassError
      ? error
      : new ManualRiseSeasonPassError(error instanceof AhibiSeasonPassError ? error.status : 502, code, 'Settlement was recorded, but ticket issuance needs a retry. Do not collect payment again.');
  }
}

export async function cancelManualRiseSeasonPass(input: { orderId: string; adminReference: string }) {
  const db = createAdminClient();
  const order = await lookupOrder(db, input.orderId);
  if (order.status === 'cancelled') return publicOrder(order);
  if (order.settlement_hash || order.status !== 'reserved') throw new ManualRiseSeasonPassError(409, 'ORDER_NOT_CANCELLABLE');
  if (order.ahibi_reservation_id) await releaseAhibiSeasonPass(order.ahibi_reservation_id);
  const { data: saved, error } = await db.from('membership_ahibi_manual_pass_orders').update({
    status: 'cancelled',
    ahibi_pass_status: 'released',
    audit: appendAudit(order, 'reservation_cancelled', input.adminReference),
    updated_at: new Date().toISOString(),
  }).eq('id', order.id).eq('status', 'reserved').is('settlement_hash', null).select('*').maybeSingle();
  if (error || !saved) throw new ManualRiseSeasonPassError(409, 'ORDER_NOT_CANCELLABLE');
  return publicOrder(saved as ManualPassRow);
}

export async function getManualRiseSeasonPassStatus(input: { orderId: string; adminReference: string }) {
  const db = createAdminClient();
  const order = await lookupOrder(db, input.orderId);
  const { data: rows, error } = await db.from('membership_season_pass_tickets')
    .select('ahibi_booking_id,ahibi_event_id,match_date,opponent,ticket_type,zone,status,ticket_access_path')
    .eq('manual_order_id', order.id).eq('member_id', order.member_id).eq('user_id', order.user_id)
    .order('match_date', { ascending: true });
  if (error) throw new ManualRiseSeasonPassError(503, 'TICKET_LOOKUP_UNAVAILABLE');
  const tickets = (rows || []).map((ticket: any) => ({
    ticketId: ticket.ahibi_booking_id,
    eventId: ticket.ahibi_event_id,
    matchDate: ticket.match_date,
    opponent: ticket.opponent,
    ticketType: ticket.ticket_type,
    zone: ticket.zone,
    status: ticket.status,
    ticketAccessPath: ticket.ticket_access_path,
  }));
  return publicOrder(order, tickets);
}
