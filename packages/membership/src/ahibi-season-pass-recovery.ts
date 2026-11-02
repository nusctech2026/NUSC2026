import { createAdminClient } from '@nusc/db';

type RecoveryTicket = {
  matchIndex: number;
  ticketId: string;
  eventId: string;
  matchDate: string;
  opponent: string;
  ticketType: 'General Pass' | 'Premium Pass';
  zone: string | null;
  status: 'confirmed' | 'used';
  ticketAccessPath: string;
};

type RecoveryOrder = {
  orderId: string;
  kind: 'paid' | 'manual';
  passId: 'general-season' | 'premium-season';
  ticketType: 'General Pass' | 'Premium Pass';
  zone: string | null;
  amountMinor: number | null;
  settlementType: 'paid' | 'complimentary';
  status: string;
  ahibiStatus: string;
  reservationId: string | null;
  partnerOrderId: string | null;
  tickets: Array<Partial<RecoveryTicket>>;
};

export class AhibiSeasonPassRecoveryError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
    this.name = 'AhibiSeasonPassRecoveryError';
  }
}

function relationOne(value: any) {
  return Array.isArray(value) ? value[0] : value;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length < 4 ? '••••' : '•'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

function missingManualSchema(error: any) {
  return ['42P01', 'PGRST204', 'PGRST205'].includes(String(error?.code || ''))
    || /membership_ahibi_manual_pass_orders|manual_order_id|does not exist/i.test(String(error?.message || ''));
}

function safeOrder(order: RecoveryOrder) {
  return {
    orderId: order.orderId,
    kind: order.kind,
    passId: order.passId,
    ticketType: order.ticketType,
    zone: order.zone,
    amountMinor: order.amountMinor,
    settlementType: order.settlementType,
    status: order.status,
    ahibiStatus: order.ahibiStatus,
    reservationId: order.reservationId,
    partnerOrderId: order.partnerOrderId,
    tickets: order.tickets,
  };
}

async function ticketsForOrder(db: ReturnType<typeof createAdminClient>, order: RecoveryOrder, member: any, userId: string) {
  const query = db.from('membership_season_pass_tickets')
    .select('ahibi_booking_id,ahibi_event_id,match_date,opponent,ticket_type,zone,status,ticket_access_path')
    .eq('member_id', member.id).eq('user_id', userId)
    .order('match_date', { ascending: true });
  if (order.kind === 'manual') query.eq('manual_order_id', order.orderId);
  else query.eq('payment_order_id', order.orderId);
  const { data, error } = await query;
  if (error) {
    if (order.kind === 'manual' && missingManualSchema(error)) return [];
    throw new AhibiSeasonPassRecoveryError(503, 'TICKET_LOOKUP_UNAVAILABLE');
  }
  return (data || []).map((ticket: any, offset: number) => ({
    matchIndex: offset + 1,
    ticketId: ticket.ahibi_booking_id,
    eventId: ticket.ahibi_event_id,
    matchDate: ticket.match_date,
    opponent: ticket.opponent,
    ticketType: ticket.ticket_type,
    zone: ticket.zone,
    status: ticket.status === 'used' ? 'used' : ticket.status,
    ticketAccessPath: ticket.ticket_access_path,
  }));
}

async function recoveryOrdersForMember(db: ReturnType<typeof createAdminClient>, member: any) {
  const paidResult = await db.from('membership_payment_orders')
    .select('id,member_id,user_id,status,purpose,payment_id,paid_at,ahibi_reservation_id,ahibi_pass_id,ahibi_zone,ahibi_pass_status,ahibi_replaces_order_id')
    .eq('member_id', member.id).eq('user_id', member.user_id).eq('purpose', 'tier').eq('status', 'paid')
    .not('ahibi_reservation_id', 'is', null)
    .in('ahibi_pass_id', ['general-season', 'premium-season'])
    .order('paid_at', { ascending: false }).limit(20);
  if (paidResult.error) throw new AhibiSeasonPassRecoveryError(503, 'ORDER_LOOKUP_UNAVAILABLE');

  const orders: RecoveryOrder[] = (paidResult.data || []).map((row: any) => ({
    orderId: row.id,
    kind: 'paid',
    passId: row.ahibi_pass_id,
    ticketType: row.ahibi_pass_id === 'general-season' ? 'General Pass' : 'Premium Pass',
    zone: row.ahibi_zone,
    amountMinor: null,
    settlementType: 'paid',
    status: row.status,
    ahibiStatus: row.ahibi_pass_status,
    reservationId: row.ahibi_reservation_id,
    partnerOrderId: `nusc-order-${row.id}`,
    tickets: [],
  }));

  const manualResult = await db.from('membership_ahibi_manual_pass_orders')
    .select('id,member_id,user_id,status,pass_id,ticket_type,zone,list_amount_paise,settled_amount_paise,settlement_type,ahibi_pass_status,ahibi_reservation_id,ahibi_partner_order_id')
    .eq('member_id', member.id).eq('user_id', member.user_id)
    .in('pass_id', ['general-season', 'premium-season'])
    .order('created_at', { ascending: false }).limit(20);
  if (manualResult.error && !missingManualSchema(manualResult.error)) {
    throw new AhibiSeasonPassRecoveryError(503, 'ORDER_LOOKUP_UNAVAILABLE');
  }
  for (const row of manualResult.data || []) {
    orders.push({
      orderId: row.id,
      kind: 'manual',
      passId: row.pass_id,
      ticketType: row.ticket_type,
      zone: row.zone,
      amountMinor: Number(row.list_amount_paise),
      settlementType: row.settlement_type || 'paid',
      status: row.status,
      ahibiStatus: row.ahibi_pass_status,
      reservationId: row.ahibi_reservation_id,
      partnerOrderId: row.ahibi_partner_order_id,
      tickets: [],
    });
  }

  for (const order of orders) order.tickets = await ticketsForOrder(db, order, member, member.user_id);
  return orders;
}

export async function searchAhibiSeasonPassRecovery(rawQuery: unknown) {
  const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (query.length < 5 || query.length > 32) return { members: [] };
  const db = createAdminClient();
  let members: any[] = [];
  if (/^NUSC\d{8}$/i.test(query)) {
    const result = await db.from('members')
      .select('id,user_id,membership_number,plan_id,plan:membership_plans(slug,name)')
      .ilike('membership_number', query).limit(10);
    if (result.error) throw new AhibiSeasonPassRecoveryError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
    members = result.data || [];
  } else {
    const phone = query.replace(/\D/g, '');
    if (phone.length !== 10) return { members: [] };
    const profileResult = await db.from('member_profiles').select('user_id,first_name,last_name,phone').eq('phone', phone).limit(10);
    if (profileResult.error) throw new AhibiSeasonPassRecoveryError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
    const userIds = (profileResult.data || []).map((profile: any) => profile.user_id).filter(Boolean);
    if (!userIds.length) return { members: [] };
    const memberResult = await db.from('members')
      .select('id,user_id,membership_number,plan_id,plan:membership_plans(slug,name)')
      .in('user_id', userIds).limit(10);
    if (memberResult.error) throw new AhibiSeasonPassRecoveryError(503, 'MEMBER_LOOKUP_UNAVAILABLE');
    members = memberResult.data || [];
  }

  const results = [];
  for (const member of members) {
    const plan = relationOne(member.plan);
    if (!member.membership_number || !['rise-general', 'rise-premium'].includes(plan?.slug)) continue;
    const orders = await recoveryOrdersForMember(db, member);
    if (!orders.length) continue;
    const { data: profile } = await db.from('member_profiles')
      .select('first_name,last_name,phone').eq('user_id', member.user_id).maybeSingle();
    results.push({
      memberNumber: member.membership_number,
      name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
      phoneMasked: maskPhone(profile?.phone || ''),
      tier: plan?.name || plan?.slug,
      orders: orders.map(safeOrder),
    });
  }
  return { members: results };
}

function validateTickets(raw: unknown, reservationId: string): RecoveryTicket[] {
  if (!Array.isArray(raw) || raw.length !== 10) throw new AhibiSeasonPassRecoveryError(400, 'INVALID_TICKET_SET');
  const tickets = raw.map((value: any) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AhibiSeasonPassRecoveryError(400, 'INVALID_TICKET_SET');
    const ticket = value as Partial<RecoveryTicket>;
    const ticketId = String(ticket.ticketId || '');
    const eventId = String(ticket.eventId || '');
    const matchIndex = Number(ticket.matchIndex);
    const ticketAccessPath = String(ticket.ticketAccessPath || '');
    if (!Number.isInteger(matchIndex) || matchIndex < 1 || matchIndex > 10
      || !/^[a-f0-9]{24}$/i.test(ticketId) || !/^[a-f0-9]{24}$/i.test(eventId)
      || !/^\d{4}-\d{2}-\d{2}$/.test(String(ticket.matchDate || ''))
      || typeof ticket.opponent !== 'string' || ticket.opponent.length < 1 || ticket.opponent.length > 160
      || !['General Pass', 'Premium Pass'].includes(String(ticket.ticketType))
      || !['confirmed', 'used'].includes(String(ticket.status))
      || !/^G-[1-5]$|^$/.test(String(ticket.zone || ''))
      || ticketAccessPath !== `/api/nusc-partner/v1/reservations/${reservationId}/tickets/${ticketId}`) {
      throw new AhibiSeasonPassRecoveryError(400, 'INVALID_TICKET_SET');
    }
    return {
      matchIndex,
      ticketId,
      eventId,
      matchDate: String(ticket.matchDate),
      opponent: ticket.opponent,
      ticketType: ticket.ticketType as RecoveryTicket['ticketType'],
      zone: ticket.zone || null,
      status: ticket.status as RecoveryTicket['status'],
      ticketAccessPath,
    };
  }).sort((a, b) => a.matchIndex - b.matchIndex);
  if (tickets.some((ticket, index) => ticket.matchIndex !== index + 1)
      || new Set(tickets.map(ticket => ticket.ticketId)).size !== 10
      || new Set(tickets.map(ticket => ticket.eventId)).size !== 10) {
    throw new AhibiSeasonPassRecoveryError(400, 'INVALID_TICKET_SET');
  }
  return tickets;
}

function existingRowStatus(orderId: string, kind: 'paid' | 'manual', row: any) {
  return kind === 'paid' ? row.payment_order_id === orderId : row.manual_order_id === orderId;
}

export async function syncAhibiSeasonPassRecovery(input: {
  orderId: unknown;
  memberNumber: unknown;
  kind: unknown;
  reservationId: unknown;
  tickets: unknown;
  adminReference: unknown;
}) {
  const orderId = String(input.orderId || '');
  const memberNumber = String(input.memberNumber || '');
  const kind = input.kind;
  const reservationId = String(input.reservationId || '');
  if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^NUSC\d{8}$/i.test(memberNumber)
      || (kind !== 'paid' && kind !== 'manual') || !/^nsp_[a-f0-9]{40}$/.test(reservationId)) {
    throw new AhibiSeasonPassRecoveryError(400, 'INVALID_RECOVERY_REQUEST');
  }
  const tickets = validateTickets(input.tickets, reservationId);
  const db = createAdminClient();
  const { data: member, error: memberError } = await db.from('members')
    .select('id,user_id,membership_number').eq('membership_number', memberNumber).maybeSingle();
  if (memberError || !member) throw new AhibiSeasonPassRecoveryError(404, 'MEMBER_NOT_FOUND');

  let order: any;
  if (kind === 'paid') {
    const result = await db.from('membership_payment_orders')
      .select('id,member_id,user_id,purpose,status,ahibi_reservation_id,ahibi_pass_id,ahibi_zone,ahibi_pass_status')
      .eq('id', orderId).eq('member_id', member.id).eq('user_id', member.user_id)
      .eq('purpose', 'tier').eq('status', 'paid').maybeSingle();
    if (result.error || !result.data) throw new AhibiSeasonPassRecoveryError(404, 'PASS_ORDER_NOT_FOUND');
    order = result.data;
    if (order.ahibi_reservation_id !== reservationId || !['issued', 'needs_reconciliation'].includes(order.ahibi_pass_status)) {
      throw new AhibiSeasonPassRecoveryError(409, 'PASS_ORDER_NOT_RECOVERABLE');
    }
  } else {
    const result = await db.from('membership_ahibi_manual_pass_orders')
      .select('id,member_id,user_id,status,pass_id,ticket_type,zone,settlement_type,settlement_hash,ahibi_reservation_id,ahibi_pass_status')
      .eq('id', orderId).eq('member_id', member.id).eq('user_id', member.user_id).maybeSingle();
    if (result.error || !result.data) throw new AhibiSeasonPassRecoveryError(404, 'PASS_ORDER_NOT_FOUND');
    order = result.data;
    if (!['issued', 'needs_reconciliation'].includes(order.status)
      || !['issued', 'needs_reconciliation'].includes(order.ahibi_pass_status) || !order.settlement_hash
      || !['paid', 'complimentary'].includes(order.settlement_type) || order.ahibi_reservation_id !== reservationId) {
      throw new AhibiSeasonPassRecoveryError(409, 'PASS_ORDER_NOT_RECOVERABLE');
    }
  }

  const passId = kind === 'paid' ? order.ahibi_pass_id : order.pass_id;
  const zone = kind === 'paid' ? order.ahibi_zone : order.zone;
  const expectedType = passId === 'general-season' ? 'General Pass' : 'Premium Pass';
  if (!['general-season', 'premium-season'].includes(passId) || tickets.some(ticket => (
    ticket.ticketType !== expectedType || (ticket.zone || null) !== (zone || null)
  ))) throw new AhibiSeasonPassRecoveryError(409, 'PASS_TICKET_MISMATCH');

  const keyColumn = kind === 'paid' ? 'payment_order_id' : 'manual_order_id';
  const { data: oldRows, error: oldRowsError } = await db.from('membership_season_pass_tickets')
    .select('payment_order_id,manual_order_id,ahibi_booking_id,ahibi_event_id,status')
    .eq(keyColumn, orderId).eq('member_id', member.id).eq('user_id', member.user_id);
  if (oldRowsError && !(kind === 'manual' && missingManualSchema(oldRowsError))) {
    throw new AhibiSeasonPassRecoveryError(503, 'TICKET_LOOKUP_UNAVAILABLE');
  }
  const oldByEvent = new Map((oldRows || []).map((row: any) => [row.ahibi_event_id, row]));
  for (const row of oldRows || []) {
    if (!existingRowStatus(orderId, kind, row) || row.status === 'cancelled') {
      throw new AhibiSeasonPassRecoveryError(409, 'INVALID_STORED_TICKET_STATE');
    }
  }
  const rows = tickets.map(ticket => {
    const existing: any = oldByEvent.get(ticket.eventId);
    const status = existing?.status === 'used' || ticket.status === 'used' ? 'used' : 'confirmed';
    return {
      ...(kind === 'paid' ? { payment_order_id: orderId } : { manual_order_id: orderId }),
      member_id: member.id,
      user_id: member.user_id,
      ahibi_booking_id: ticket.ticketId,
      ahibi_event_id: ticket.eventId,
      match_date: ticket.matchDate,
      opponent: ticket.opponent,
      ticket_type: ticket.ticketType,
      zone: ticket.zone,
      status,
      ticket_access_path: ticket.ticketAccessPath,
    };
  });
  const onConflict = kind === 'paid' ? 'payment_order_id,ahibi_event_id' : 'manual_order_id,ahibi_event_id';
  const { error: upsertError } = await db.from('membership_season_pass_tickets').upsert(rows, { onConflict });
  if (upsertError) throw new AhibiSeasonPassRecoveryError(503, 'TICKET_SYNC_FAILED');

  const { data: saved, error: readError } = await db.from('membership_season_pass_tickets')
    .select('ahibi_booking_id,ahibi_event_id,match_date,opponent,ticket_type,zone,status,ticket_access_path')
    .eq(keyColumn, orderId).eq('member_id', member.id).eq('user_id', member.user_id);
  if (readError || !saved || saved.length !== 10) throw new AhibiSeasonPassRecoveryError(503, 'TICKET_SYNC_INCOMPLETE');
  const savedByEvent = new Map(saved.map((row: any) => [row.ahibi_event_id, row]));
  if (tickets.some(ticket => {
    const row: any = savedByEvent.get(ticket.eventId);
    return !row || row.ahibi_booking_id !== ticket.ticketId || row.ticket_access_path !== ticket.ticketAccessPath;
  })) throw new AhibiSeasonPassRecoveryError(503, 'TICKET_SYNC_INCOMPLETE');

  if (kind === 'paid') {
    const { error: updateError } = await db.from('membership_payment_orders').update({ ahibi_pass_status: 'issued' })
      .eq('id', orderId).eq('member_id', member.id).eq('status', 'paid').eq('ahibi_reservation_id', reservationId);
    if (updateError) throw new AhibiSeasonPassRecoveryError(503, 'PASS_STATUS_SYNC_FAILED');
  } else {
    const { error: updateError } = await db.from('membership_ahibi_manual_pass_orders').update({
      status: 'issued',
      ahibi_pass_status: 'issued',
      error_code: null,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId).eq('member_id', member.id).in('status', ['issued', 'needs_reconciliation'])
      .eq('ahibi_reservation_id', reservationId);
    if (updateError) throw new AhibiSeasonPassRecoveryError(503, 'PASS_STATUS_SYNC_FAILED');
  }
  return {
    status: 'synced',
    ticketCount: 10,
    activeTicketCount: saved.filter((ticket: any) => ticket.status === 'confirmed').length,
    usedTicketCount: saved.filter((ticket: any) => ticket.status === 'used').length,
  };
}
