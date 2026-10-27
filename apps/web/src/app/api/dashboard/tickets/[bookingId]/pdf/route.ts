import { createAdminClient, createServerClient } from '@nusc/db';
import { AhibiSeasonPassError, getAhibiSeasonPassTicketPdf } from '@nusc/membership/src/ahibi-season-pass';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(bookingId)) return new Response('Ticket not found', { status: 404 });

  const session = await createServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return new Response('Sign in to access this ticket', { status: 401 });

  const admin = createAdminClient();
  const { data: ticket, error: ticketError } = await admin.from('membership_season_pass_tickets')
    .select('payment_order_id,member_id,user_id,status')
    .eq('ahibi_booking_id', bookingId).eq('user_id', user.id).maybeSingle();
  if (ticketError) {
    console.error('Ahibi ticket ownership lookup failed.');
    return new Response('Unable to retrieve this ticket', { status: 500 });
  }
  if (!ticket || ticket.status === 'cancelled') {
    console.warn('Ahibi ticket PDF request denied:', 'ticket_not_owned_or_cancelled');
    return new Response('Ticket not found', { status: 404 });
  }

  const { data: order, error: orderError } = await admin.from('membership_payment_orders')
    .select('ahibi_reservation_id')
    .eq('id', ticket.payment_order_id).eq('member_id', ticket.member_id).eq('user_id', user.id)
    .eq('status', 'paid').eq('ahibi_pass_status', 'issued').maybeSingle();
  if (orderError) {
    console.error('Ahibi ticket order lookup failed.');
    return new Response('Unable to retrieve this ticket', { status: 500 });
  }
  if (!order?.ahibi_reservation_id) {
    console.warn('Ahibi ticket PDF request denied:', 'paid_issued_order_missing');
    return new Response('Ticket not found', { status: 404 });
  }

  const { data: profile, error: profileError } = await admin.from('member_profiles')
    .select('first_name,last_name,phone').eq('user_id', user.id).maybeSingle();
  if (profileError) {
    console.error('Ahibi ticket attendee lookup failed.');
    return new Response('Unable to retrieve this ticket', { status: 500 });
  }
  const attendee = {
    name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
    email: user.email?.trim() || '',
    phone: profile?.phone?.trim() || '',
  };
  if (!attendee.name || attendee.name.length > 100 || /[\u0000-\u001F\u007F]/.test(attendee.name)
      || !attendee.email || attendee.email.length > 254 || /\s/.test(attendee.email)
      || !/^[^@]+@[^@]+\.[^@]+$/.test(attendee.email)
      || !attendee.phone || attendee.phone.length > 40 || !/^\+?[0-9][0-9().\s-]{4,38}$/.test(attendee.phone)
      || attendee.phone.replace(/\D/g, '').length < 5) {
    return new Response('Update your name, email, and phone in your NUSC profile to download this ticket', { status: 422 });
  }

  try {
    const pdf = await getAhibiSeasonPassTicketPdf(order.ahibi_reservation_id, bookingId, attendee);
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ahibi-ticket-${bookingId}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof AhibiSeasonPassError) {
      console.error('Ahibi ticket PDF partner request failed:', error.code);
      if (error.code === 'TICKET_NOT_FOUND') return new Response('AHIBI could not find this issued ticket', { status: 404 });
      if (error.code === 'TICKET_NOT_ACTIVE') return new Response('This AHIBI ticket is not active', { status: 409 });
      if (error.code === 'AHIBI_HTTP_404') {
        return new Response('AHIBI ticket download endpoint is unavailable; restart or update its test server', { status: 502 });
      }
      const status = error.status === 503 ? 503 : 502;
      return new Response('Unable to retrieve this ticket', { status });
    }
    console.error('Ahibi ticket PDF retrieval failed.');
    return new Response('Unable to retrieve this ticket', { status: 502 });
  }
}
