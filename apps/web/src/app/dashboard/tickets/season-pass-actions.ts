'use server';

import { createAdminClient, createServerClient } from '@nusc/db';
import { ensureAhibiPassIssued } from '@nusc/membership/src/ahibi-season-pass-flow';
import { revalidatePath } from 'next/cache';

export async function refreshSeasonPassTickets() {
  const session = await createServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return;

  const { data: member, error: memberError } = await session.from('members')
    .select('id,plan_id,plan:membership_plans(slug)')
    .eq('user_id', user.id).maybeSingle();
  const planRelation = member?.plan;
  const plan = Array.isArray(planRelation) ? planRelation[0] : planRelation;
  if (memberError || !member || !plan || !['rise-general', 'rise-premium'].includes(plan.slug)) return;

  const db = createAdminClient();
  const { data: order, error: orderError } = await db.from('membership_payment_orders')
    .select('razorpay_order_id,payment_id')
    .eq('member_id', member.id).eq('user_id', user.id).eq('plan_id', member.plan_id)
    .eq('purpose', 'tier').eq('status', 'paid').not('razorpay_order_id', 'is', null)
    .order('paid_at', { ascending: false }).limit(1).maybeSingle();
  if (!orderError && order?.razorpay_order_id && order.payment_id) {
    try {
      await ensureAhibiPassIssued(order.razorpay_order_id, order.payment_id, { retryRefundRequired: true });
    }
    catch { /* Keep the status recoverable; the member can retry from the dashboard. */ }
  }
  revalidatePath('/dashboard/tickets');
}
