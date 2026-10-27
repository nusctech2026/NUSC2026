import { createAdminClient } from '@nusc/db';
import {
  AhibiSeasonPassError,
  confirmAhibiSeasonPass,
  getAhibiSeasonPassStatus,
  replaceAhibiGeneralPass,
  releaseAhibiSeasonPass,
  reserveAhibiSeasonPass,
  type AhibiSeasonPassId,
  type AhibiSeasonPassTicket,
  type AhibiSeasonPassZone,
} from './ahibi-season-pass';

type PassOrder = {
  id: string;
  member_id: string;
  user_id: string;
  plan_id: string;
  purpose: 'registration' | 'tier';
  status: string;
  razorpay_order_id: string | null;
  payment_id: string | null;
  upgrade_from_plan_id: string | null;
  upgrade_credit_source_order_id: string | null;
  ahibi_replaces_order_id: string | null;
  ahibi_reservation_id: string | null;
  ahibi_pass_id: AhibiSeasonPassId | null;
  ahibi_zone: AhibiSeasonPassZone | null;
  ahibi_pass_status: string;
  ahibi_reservation_expires_at: string | null;
};

export type AhibiPassTicketRecord = AhibiSeasonPassTicket & {
  memberId: string;
  userId: string;
  paymentOrderId: string;
};

function passForPlan(slug: string): AhibiSeasonPassId | null {
  if (slug === 'rise-general') return 'general-season';
  if (slug === 'rise-premium') return 'premium-season';
  return null;
}

function isZone(value: unknown): value is AhibiSeasonPassZone {
  return value === 'G-1' || value === 'G-2' || value === 'G-3' || value === 'G-4' || value === 'G-5';
}

function reservationIdFor(orderId: string) {
  return `nusc-order-${orderId}`;
}

function memberReferenceFor(memberId: string) {
  return `nusc-member-${memberId}`;
}

async function setOrderAhibiStatus(orderId: string, status: string) {
  const db = createAdminClient();
  const { error } = await db.from('membership_payment_orders').update({ ahibi_pass_status: status }).eq('id', orderId);
  if (error) console.error('Could not update Ahibi pass status:', error.code || 'database_error');
}

async function getGeneralPassOrderForUpgrade(db: ReturnType<typeof createAdminClient>, order: PassOrder) {
  let query = db.from('membership_payment_orders')
    .select('id,member_id,user_id,plan_id,purpose,status,payment_id,ahibi_reservation_id,ahibi_pass_id,ahibi_zone,ahibi_pass_status')
    .eq('member_id', order.member_id).eq('user_id', order.user_id)
    .eq('plan_id', order.upgrade_from_plan_id).eq('purpose', 'tier').eq('status', 'paid')
    .eq('ahibi_pass_id', 'general-season');
  if (order.upgrade_credit_source_order_id) {
    query = query.eq('id', order.upgrade_credit_source_order_id);
  } else {
    query = query.order('paid_at', { ascending: false }).limit(1);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data?.ahibi_reservation_id || !data.payment_id
      || !['issued', 'replaced'].includes(data.ahibi_pass_status)) {
    throw new AhibiSeasonPassError(409, 'AHIBI_GENERAL_PASS_NOT_ACTIVE');
  }
  return data as PassOrder;
}

async function syncGeneralTicketStatuses(
  db: ReturnType<typeof createAdminClient>,
  orderId: string,
  remoteTickets: AhibiSeasonPassTicket[],
) {
  const { data: stored, error } = await db.from('membership_season_pass_tickets')
    .select('ahibi_event_id,ahibi_booking_id').eq('payment_order_id', orderId);
  if (error || !stored || stored.length !== 10 || remoteTickets.length !== 10) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  const storedByEvent = new Map(stored.map(ticket => [ticket.ahibi_event_id, ticket.ahibi_booking_id]));
  for (const remote of remoteTickets) {
    if (storedByEvent.get(remote.eventId) !== remote.ticketId) throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  for (const status of ['confirmed', 'used', 'cancelled'] as const) {
    const eventIds = remoteTickets.filter(ticket => ticket.status === status).map(ticket => ticket.eventId);
    if (eventIds.length === 0) continue;
    const { error: updateError } = await db.from('membership_season_pass_tickets')
      .update({ status }).eq('payment_order_id', orderId).in('ahibi_event_id', eventIds);
    if (updateError) throw new AhibiSeasonPassError(503, 'AHIBI_STATUS_SYNC_FAILED');
  }
}

async function prepareGeneralPassReplacement(db: ReturnType<typeof createAdminClient>, order: PassOrder) {
  if (!order.upgrade_from_plan_id) return null;
  const oldOrder = await getGeneralPassOrderForUpgrade(db, order);
  if (oldOrder.ahibi_pass_status !== 'issued') throw new AhibiSeasonPassError(409, 'AHIBI_GENERAL_PASS_NOT_ACTIVE');
  if (!isZone(oldOrder.ahibi_zone)) throw new AhibiSeasonPassError(409, 'AHIBI_GENERAL_PASS_NOT_ACTIVE');
  const status = await getAhibiSeasonPassStatus(oldOrder.ahibi_reservation_id!, {
    partnerOrderId: reservationIdFor(oldOrder.id),
    passId: 'general-season',
    zone: oldOrder.ahibi_zone,
  });
  if (status.reservation.status !== 'issued' || status.tickets.length !== 10) {
    throw new AhibiSeasonPassError(409, 'AHIBI_GENERAL_PASS_NOT_ACTIVE');
  }
  await syncGeneralTicketStatuses(db, oldOrder.id, status.tickets);
  if (!status.tickets.some(ticket => ticket.status === 'confirmed')) {
    throw new AhibiSeasonPassError(409, 'AHIBI_NO_REMAINING_MATCHES');
  }
  return oldOrder;
}

export async function reserveAhibiPassForOrder(orderId: string, requestedZone: unknown) {
  const db = createAdminClient();
  const { data: orderData, error: orderError } = await db.from('membership_payment_orders')
    .select('id,member_id,user_id,plan_id,purpose,status,razorpay_order_id,payment_id,upgrade_from_plan_id,upgrade_credit_source_order_id,ahibi_replaces_order_id,ahibi_reservation_id,ahibi_pass_id,ahibi_zone,ahibi_pass_status,ahibi_reservation_expires_at')
    .eq('id', orderId).single();
  if (orderError || !orderData) throw new Error('Unable to prepare the membership pass reservation.');
  const order = orderData as PassOrder;
  if (order.purpose !== 'tier' || !['creating', 'pending'].includes(order.status)) {
    throw new Error('Membership checkout is not available.');
  }

  const { data: plan, error: planError } = await db.from('membership_plans').select('slug').eq('id', order.plan_id).single();
  if (planError || !plan) throw new Error('Membership plan is unavailable.');
  const passId = passForPlan(plan.slug);
  if (!passId) throw new Error('This membership tier does not include an Ahibi season pass.');
  const zone = passId === 'general-season' && isZone(requestedZone) ? requestedZone : null;
  if (passId === 'general-season' && !zone) throw new Error('Choose a General season pass seating zone.');
  if (passId === 'premium-season' && requestedZone !== null) throw new Error('Premium season passes do not use a seating zone.');

  if (order.ahibi_reservation_id) {
    if (order.ahibi_pass_id !== passId || order.ahibi_zone !== zone) {
      throw new Error('This pending checkout already has a different pass selection. Cancel it before starting another checkout.');
    }
    if (order.ahibi_pass_status === 'held' && order.ahibi_reservation_expires_at
        && Date.parse(order.ahibi_reservation_expires_at) > Date.now()) {
      if (order.upgrade_from_plan_id && !order.ahibi_replaces_order_id) {
        throw new AhibiSeasonPassError(409, 'AHIBI_GENERAL_PASS_NOT_ACTIVE');
      }
      return { reservationId: order.ahibi_reservation_id, status: 'held' as const };
    }
    if (order.ahibi_pass_status === 'held' || order.ahibi_pass_status === 'issuing') {
      throw new AhibiSeasonPassError(409, 'AHIBI_HOLD_EXPIRED');
    }
    throw new AhibiSeasonPassError(409, 'AHIBI_RESERVATION_NOT_REUSABLE');
  }

  const partnerOrderId = reservationIdFor(order.id);
  const { data: preparingOrder, error: beginError } = await db.from('membership_payment_orders').update({
    ahibi_pass_id: passId,
    ahibi_zone: zone,
    ahibi_pass_status: 'reserving',
  }).eq('id', order.id).in('status', ['creating', 'pending']).select('id').maybeSingle();
  if (beginError || !preparingOrder) throw new Error('Membership checkout is no longer available.');

  try {
    const oldGeneralOrder = await prepareGeneralPassReplacement(db, order);
    if (oldGeneralOrder) {
      const { data: linkedOrder, error: linkError } = await db.from('membership_payment_orders')
        .update({ ahibi_replaces_order_id: oldGeneralOrder.id })
        .eq('id', order.id).in('status', ['creating', 'pending']).select('id').maybeSingle();
      if (linkError || !linkedOrder) throw new Error('Unable to link the General pass being replaced.');
    }
    const reservation = await reserveAhibiSeasonPass({
      partnerOrderId,
      memberReference: memberReferenceFor(order.member_id),
      passId,
      zone,
    });
    const { data: savedOrder, error: saveError } = await db.from('membership_payment_orders').update({
      ahibi_reservation_id: reservation.reservationId,
      ahibi_pass_id: passId,
      ahibi_zone: zone,
      ahibi_pass_status: 'held',
      ahibi_reservation_expires_at: reservation.expiresAt,
    }).eq('id', order.id).in('status', ['creating', 'pending']).select('id').maybeSingle();
    if (saveError || !savedOrder) {
      try { await releaseAhibiSeasonPass(reservation.reservationId); } catch { /* The hold expires automatically. */ }
      await setOrderAhibiStatus(order.id, 'needs_reconciliation');
      throw new Error('Unable to save the Ahibi ticket reservation. No membership payment was started.');
    }
    return { reservationId: reservation.reservationId, status: 'held' as const };
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('Unable to save the Ahibi')) {
      const { error: closeError } = await db.from('membership_payment_orders').update({
        status: 'creation_failed', ahibi_pass_status: 'failed',
      }).eq('id', order.id).in('status', ['creating', 'pending']);
      if (closeError) console.error('Could not close failed Ahibi checkout preparation:', closeError.code || 'database_error');
    }
    throw error;
  }
}

export async function releaseAhibiPassForOrder(orderId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from('membership_payment_orders')
    .select('ahibi_reservation_id,ahibi_pass_status,status')
    .eq('id', orderId).maybeSingle();
  if (error || !data?.ahibi_reservation_id || data.ahibi_pass_status === 'released'
      || data.ahibi_pass_status === 'issued' || data.ahibi_pass_status === 'not_required') return;
  const reservationId = data.ahibi_reservation_id;
  await setOrderAhibiStatus(orderId, 'release_pending');
  try {
    await releaseAhibiSeasonPass(reservationId);
    await setOrderAhibiStatus(orderId, 'released');
  } catch (releaseError) {
    console.error('Ahibi pass hold release is pending:', releaseError instanceof AhibiSeasonPassError ? releaseError.code : 'partner_error');
  }
}

async function persistIssuedTickets(order: PassOrder, tickets: AhibiSeasonPassTicket[], replacedOrder?: PassOrder) {
  const db = createAdminClient();
  const rows = tickets.map(ticket => ({
    payment_order_id: order.id,
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
  const { error: insertError } = await db.from('membership_season_pass_tickets')
    .upsert(rows, { onConflict: 'payment_order_id,ahibi_event_id', ignoreDuplicates: true });
  if (insertError) throw new Error('Unable to save issued Ahibi tickets.');

  const { data: saved, error: readError } = await db.from('membership_season_pass_tickets')
    .select('ahibi_booking_id,ahibi_event_id,match_date,opponent,ticket_type,zone,ticket_access_path')
    .eq('payment_order_id', order.id);
  if (readError || !saved || saved.length !== tickets.length || tickets.length < 1 || tickets.length > 10) {
    throw new Error('Issued Ahibi tickets need reconciliation.');
  }
  const savedByEvent = new Map(saved.map(ticket => [ticket.ahibi_event_id, ticket]));
  for (const ticket of tickets) {
    const existing = savedByEvent.get(ticket.eventId);
    if (!existing || existing.ahibi_booking_id !== ticket.ticketId || existing.match_date !== ticket.matchDate
        || existing.opponent !== ticket.opponent || existing.ticket_type !== ticket.ticketType
        || existing.zone !== ticket.zone || existing.ticket_access_path !== ticket.ticketAccessPath) {
      throw new Error('Issued Ahibi tickets need reconciliation.');
    }
  }
  if (replacedOrder) {
    const { error: cancelError } = await db.from('membership_season_pass_tickets')
      .update({ status: 'cancelled' }).eq('payment_order_id', replacedOrder.id).eq('status', 'confirmed');
    if (cancelError) throw new Error('Issued Ahibi tickets need reconciliation.');
    const { data: linked, error: linkError } = await db.from('membership_payment_orders')
      .update({ ahibi_pass_status: 'replaced', ahibi_replaced_by_order_id: order.id })
      .eq('id', replacedOrder.id).eq('status', 'paid').in('ahibi_pass_status', ['issued', 'replaced'])
      .select('id').maybeSingle();
    if (linkError || !linked) throw new Error('Issued Ahibi tickets need reconciliation.');
  }
  const { error: updateError } = await db.from('membership_payment_orders').update({ ahibi_pass_status: 'issued' })
    .eq('id', order.id).eq('status', 'paid').eq('payment_id', order.payment_id);
  if (updateError) throw new Error('Issued Ahibi tickets need reconciliation.');
}

function isExpiredReservationError(error: unknown) {
  return error instanceof AhibiSeasonPassError
    && ['AHIBI_HOLD_EXPIRED', 'HOLD_EXPIRED', 'RESERVATION_EXPIRED', 'RESERVATION_RELEASED'].includes(error.code);
}

function isPersistenceError(error: unknown) {
  return error instanceof Error && [
    'Unable to save issued Ahibi tickets.',
    'Issued Ahibi tickets need reconciliation.',
    'Replacement status needs reconciliation.',
  ].includes(error.message);
}

async function markPassNeedsReview(orderId: string, status: 'refund_required' | 'needs_reconciliation') {
  await setOrderAhibiStatus(orderId, status);
}

export async function ensureAhibiPassIssued(
  razorpayOrderId: string,
  paymentId: string,
  options: { retryRefundRequired?: boolean } = {},
): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db.from('membership_payment_orders')
    .select('id,member_id,user_id,plan_id,purpose,status,razorpay_order_id,payment_id,upgrade_from_plan_id,upgrade_credit_source_order_id,ahibi_replaces_order_id,ahibi_reservation_id,ahibi_pass_id,ahibi_zone,ahibi_pass_status,ahibi_reservation_expires_at')
    .eq('razorpay_order_id', razorpayOrderId).maybeSingle();
  if (error || !data) return 'not_required';
  const order = data as PassOrder;
  if (order.purpose !== 'tier') return 'not_required';
  if (order.status !== 'paid' || order.payment_id !== paymentId) return 'not_required';
  if (order.ahibi_pass_status === 'issued') return 'issued';
  if (order.ahibi_pass_status === 'refund_required' && !options.retryRefundRequired) return 'refund_required';
  if (!order.ahibi_pass_id && order.ahibi_pass_status === 'not_required') return 'not_required';

  const { data: plan, error: planError } = await db.from('membership_plans').select('slug').eq('id', order.plan_id).single();
  const passId = plan && !planError ? passForPlan(plan.slug) : null;
  if (!passId || !order.ahibi_reservation_id || order.ahibi_pass_id !== passId
      || (passId === 'general-season' && !isZone(order.ahibi_zone))
      || (passId === 'premium-season' && order.ahibi_zone !== null)
      || Boolean(order.upgrade_from_plan_id) !== Boolean(order.ahibi_replaces_order_id)) {
    await markPassNeedsReview(order.id, 'refund_required');
    return 'refund_required';
  }

  const expected = {
    partnerOrderId: reservationIdFor(order.id),
    passId,
    zone: order.ahibi_zone,
  };
  const { error: beginError } = await db.from('membership_payment_orders').update({ ahibi_pass_status: 'issuing' })
    .eq('id', order.id).eq('status', 'paid').eq('payment_id', paymentId).neq('ahibi_pass_status', 'issued');
  if (beginError) {
    await markPassNeedsReview(order.id, 'needs_reconciliation');
    return 'needs_reconciliation';
  }

  try {
    if (order.upgrade_from_plan_id && order.ahibi_replaces_order_id) {
      const oldOrder = await getGeneralPassOrderForUpgrade(db, order);
      if (oldOrder.id !== order.ahibi_replaces_order_id || !isZone(oldOrder.ahibi_zone)) {
        throw new AhibiSeasonPassError(409, 'AHIBI_GENERAL_PASS_NOT_ACTIVE');
      }
      const oldStatus = await getAhibiSeasonPassStatus(oldOrder.ahibi_reservation_id!, {
        partnerOrderId: reservationIdFor(oldOrder.id), passId: 'general-season', zone: oldOrder.ahibi_zone,
      });
      if (oldStatus.reservation.status === 'issued') {
        await syncGeneralTicketStatuses(db, oldOrder.id, oldStatus.tickets);
      } else if (oldStatus.reservation.status !== 'replaced') {
        throw new AhibiSeasonPassError(409, 'AHIBI_GENERAL_PASS_NOT_ACTIVE');
      }
      const { data: oldTickets, error: oldTicketsError } = await db.from('membership_season_pass_tickets')
        .select('ahibi_event_id').eq('payment_order_id', oldOrder.id);
      const expectedEventIds = (oldTickets ?? []).map(ticket => ticket.ahibi_event_id as string);
      if (oldTicketsError || expectedEventIds.length !== 10 || new Set(expectedEventIds).size !== 10) {
        throw new Error('Issued Ahibi tickets need reconciliation.');
      }
      const replacementTickets = await replaceAhibiGeneralPass({
        premiumReservationId: order.ahibi_reservation_id,
        oldReservationId: oldOrder.ahibi_reservation_id!,
        paymentId,
        partnerOrderId: reservationIdFor(order.id),
        expectedEventIds,
      });
      await persistIssuedTickets(order, replacementTickets, oldOrder);
    } else {
      const issuance = await confirmAhibiSeasonPass(order.ahibi_reservation_id, paymentId, expected);
      await persistIssuedTickets(order, issuance.tickets);
    }
    return 'issued';
  } catch (confirmError) {
    let remoteReservationStatus: string | null = null;
    try {
      const status = await getAhibiSeasonPassStatus(order.ahibi_reservation_id, expected);
      remoteReservationStatus = status.reservation.status;
      if (status.reservation.status === 'issued') {
        if (order.upgrade_from_plan_id && order.ahibi_replaces_order_id) {
          const oldOrder = await getGeneralPassOrderForUpgrade(db, order);
          if (oldOrder.id !== order.ahibi_replaces_order_id || !isZone(oldOrder.ahibi_zone)) {
            throw new Error('Replacement status needs reconciliation.');
          }
          const oldStatus = await getAhibiSeasonPassStatus(oldOrder.ahibi_reservation_id!, {
            partnerOrderId: reservationIdFor(oldOrder.id), passId: 'general-season', zone: oldOrder.ahibi_zone,
          });
          if (oldStatus.reservation.status !== 'replaced') throw new Error('Replacement status needs reconciliation.');
          const { data: oldTickets, error: oldTicketsError } = await db.from('membership_season_pass_tickets')
            .select('ahibi_event_id').eq('payment_order_id', oldOrder.id);
          const expectedEventIds = (oldTickets ?? []).map(ticket => ticket.ahibi_event_id as string);
          if (oldTicketsError || expectedEventIds.length !== 10 || new Set(expectedEventIds).size !== 10
              || status.tickets.some(ticket => !expectedEventIds.includes(ticket.eventId))) {
            throw new Error('Replacement status needs reconciliation.');
          }
          await persistIssuedTickets(order, status.tickets, oldOrder);
        } else {
          await persistIssuedTickets(order, status.tickets);
        }
        return 'issued';
      }
      if (status.reservation.status === 'expired' || status.reservation.status === 'released') {
        await markPassNeedsReview(order.id, 'refund_required');
        return 'refund_required';
      }
    } catch (statusError) {
      if (isPersistenceError(statusError)) {
        await markPassNeedsReview(order.id, 'needs_reconciliation');
        return 'needs_reconciliation';
      }
      console.error('Ahibi season pass confirmation is pending:', statusError instanceof AhibiSeasonPassError ? statusError.code : 'partner_error');
    }
    const noRemainingMatches = confirmError instanceof AhibiSeasonPassError
      && ['AHIBI_NO_REMAINING_MATCHES', 'NO_REMAINING_MATCHES'].includes(confirmError.code);
    if (isExpiredReservationError(confirmError) || noRemainingMatches) {
      await markPassNeedsReview(order.id, 'refund_required');
      return 'refund_required';
    }
    if (confirmError instanceof AhibiSeasonPassError && confirmError.status === 409
        && remoteReservationStatus === 'held') {
      await markPassNeedsReview(order.id, 'needs_reconciliation');
      return 'needs_reconciliation';
    }
    if (isPersistenceError(confirmError)) {
      await markPassNeedsReview(order.id, 'needs_reconciliation');
      return 'needs_reconciliation';
    }
    console.error('Ahibi season pass confirmation is pending:', confirmError instanceof AhibiSeasonPassError ? confirmError.code : 'partner_error');
    return 'pending';
  }
}
