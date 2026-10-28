import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@nusc/db';
import QRCode from 'qrcode';
import { AhibiSeasonPassError, getAhibiSeasonPassTicket, type AhibiSeasonPassTicketDetails } from '@nusc/membership/src/ahibi-season-pass';
import { getTicketsDashboardData } from '../service';
import { ClaimMembershipEntryButton } from './ClaimMembershipEntryButton';
import { refreshSeasonPassTickets } from './season-pass-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Match Tickets | NUSC Membership' };

function safeAhibiUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'ahibi.in' || url.hostname.endsWith('.ahibi.in'))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function TicketsPage() {
  let dashboard;
  try {
    dashboard = await getTicketsDashboardData();
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') redirect('/login');
    return <p>Unable to load matchday benefits. Please try again shortly.</p>;
  }

  const member = dashboard.membership;
  if (!dashboard.hasActiveTier) {
    const registrationPaid = member?.registration_payment_status === 'paid';
    return (
      <section aria-labelledby="match-tickets-empty-title" style={{
        boxSizing: 'border-box', maxWidth: 680, margin: '32px auto', padding: 'clamp(24px, 5vw, 40px)',
        border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', textAlign: 'center',
      }}>
        <div aria-hidden="true" style={{
          display: 'grid', placeItems: 'center', width: 56, height: 56, margin: '0 auto 16px',
          borderRadius: 16, background: '#eff6ff', color: '#173f78',
        }}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0-2-2V7Z" />
            <path d="M9 8v1m0 3v1m0 3v1" />
          </svg>
        </div>
        <h1 id="match-tickets-empty-title" style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1.75rem', fontWeight: 700 }}>
          Matchday entry is part of your Rise membership
        </h1>
        <p style={{ maxWidth: 520, margin: '0 auto 24px', color: '#475569', lineHeight: 1.65 }}>
          {registrationPaid
            ? 'Your NUSC registration is complete. Activate Rise General, Rise Premium, or Rise VIP Box to unlock matchday entry. Your tickets will appear here once your tier is active.'
            : 'Complete your NUSC registration and activate a Rise tier to unlock matchday entry. Your tickets will appear here once your tier is active.'}
        </p>
        <Link href="/dashboard" className="membership-pay-button" style={{
          display: 'inline-flex', width: 'auto', minHeight: 46, alignItems: 'center', justifyContent: 'center',
          padding: '12px 20px', borderRadius: 8, textDecoration: 'none',
        }}>
          Choose a Rise tier
        </Link>
      </section>
    );
  }

  const active = member?.registration_payment_status === 'paid' && member.status === 'active'
    && (!member.end_date || new Date(member.end_date) > new Date());
  const admin = createAdminClient();
  const seasonPassMember = Boolean(active && member && ['rise-general', 'rise-premium'].includes(member.plan.slug));
  let seasonOrder: { id: string; ahibi_reservation_id: string | null; ahibi_pass_id: string | null; ahibi_zone: string | null; ahibi_pass_status: string; ahibi_replaces_order_id: string | null } | null = null;
  let seasonTickets: Array<AhibiSeasonPassTicketDetails & { qrDataUrl: string | null }> = [];
  if (seasonPassMember && member) {
    const { data: paidOrder } = await admin.from('membership_payment_orders')
      .select('id,ahibi_reservation_id,ahibi_pass_id,ahibi_zone,ahibi_pass_status,ahibi_replaces_order_id')
      .eq('member_id', member.id).eq('user_id', dashboard.profile.id).eq('plan_id', member.plan_id)
      .eq('purpose', 'tier').eq('status', 'paid').order('paid_at', { ascending: false }).limit(1).maybeSingle();
    seasonOrder = paidOrder;
    if (paidOrder?.ahibi_reservation_id && paidOrder.ahibi_pass_status === 'issued') {
      const { data: storedTickets } = await admin.from('membership_season_pass_tickets')
        .select('ahibi_booking_id,ahibi_event_id,match_date,opponent,ticket_type,zone,status,ticket_access_path')
        .eq('payment_order_id', paidOrder.id).eq('member_id', member.id).eq('user_id', dashboard.profile.id)
        .order('match_date', { ascending: true });
      if (storedTickets && storedTickets.length > 0 && storedTickets.length <= 10) {
        const ticketResults = await Promise.all(storedTickets.map(async (stored) => {
          const expected = {
            ticketId: stored.ahibi_booking_id,
            eventId: stored.ahibi_event_id,
            matchDate: stored.match_date,
            opponent: stored.opponent,
            ticketType: stored.ticket_type,
            zone: stored.zone,
            status: stored.status,
            ticketAccessPath: stored.ticket_access_path,
          } as AhibiSeasonPassTicketDetails;
          try {
            const ticket = await getAhibiSeasonPassTicket(paidOrder.ahibi_reservation_id!, stored.ahibi_booking_id, expected);
            const qrDataUrl = await QRCode.toDataURL(ticket.qrPayload, { errorCorrectionLevel: 'M', margin: 2, width: 240 });
            return { ...ticket, qrDataUrl };
          } catch (error) {
            console.error('Ahibi ticket lookup failed:', error instanceof AhibiSeasonPassError ? error.code : 'ticket_lookup_failed');
            return { ...expected, qrPayload: '', qrDataUrl: null };
          }
        }));
        seasonTickets = ticketResults;
      }
    }
  }
  const legacyResults = seasonPassMember ? null : await Promise.all([
    admin.from('membership_home_matches')
      .select('id,opponent,date_time,venue,ahibi_event_id,ahibi_ticket_url')
      .eq('status', 'upcoming')
      .not('ahibi_event_id', 'is', null).gt('date_time', new Date().toISOString())
      .order('date_time', { ascending: true }),
    member
      ? admin.from('membership_match_entries')
          .select('fixture_id,status,expires_at')
          .eq('member_id', member.id)
          .in('status', ['reserved', 'session_created', 'redeemed'])
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (legacyResults && (legacyResults[0].error || legacyResults[1].error)) {
    return <p>Unable to load matchday benefits. Please try again shortly.</p>;
  }

  const entryByFixture = new Map((legacyResults?.[1].data || []).map((entry) => [entry.fixture_id, entry]));
  const fixtures = (legacyResults?.[0].data || []).filter((fixture) => Boolean(fixture.ahibi_event_id?.trim()));
  const entryType = typeof dashboard.entitlements.entry === 'string' ? dashboard.entitlements.entry : '';
  const homeMatches = Number(dashboard.entitlements.home_matches || 0);

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Match Tickets</h1>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <p style={{ color: '#64748b', margin: 0 }}>{seasonPassMember
          ? seasonOrder?.ahibi_replaces_order_id
            ? `Your Premium season pass tickets for ${seasonTickets.length || 'the remaining'} home matches.`
            : 'Your Ahibi season pass tickets for all ten home matches.'
          : 'Use your membership entry for each eligible home match through Ahibi.'}</p>
      </div>

      {seasonPassMember && <section aria-labelledby="season-pass-heading" style={{ marginBottom: 32 }}>
        <h2 id="season-pass-heading" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Season Pass</h2>
        {!seasonOrder ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, color: '#475569' }}>
            Your Rise membership is active, but its Ahibi season pass record is not available yet. Refresh shortly or contact the club.
          </div>
        ) : seasonOrder.ahibi_pass_status === 'issued' && seasonTickets.length > 0 && seasonTickets.length <= 10 ? (
          <>
            {seasonOrder.ahibi_zone && <p style={{ color: '#475569' }}>General seating zone: <strong>{seasonOrder.ahibi_zone}</strong> across all ten matches.</p>}
            {seasonTickets.some(ticket => !ticket.qrDataUrl) && <p role="status" style={{ color: '#92400e' }}>Some ticket QR codes could not load. You can still download the AHIBI ticket.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {seasonTickets.map(ticket => <article key={ticket.ticketId} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 6px', color: '#0f172a' }}>NUSC vs {ticket.opponent}</h3>
                <p style={{ margin: '0 0 12px', color: '#64748b' }}>{new Date(`${ticket.matchDate}T12:00:00+05:30`).toLocaleDateString('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' })}</p>
                <p style={{ margin: '0 0 14px', color: '#334155' }}>{ticket.ticketType}{ticket.zone ? ` · ${ticket.zone}` : ''} · {ticket.status}</p>
                {ticket.qrDataUrl && <img src={ticket.qrDataUrl} alt={`Scannable AHIBI ticket QR code for NUSC versus ${ticket.opponent}`} width="240" height="240" style={{ display: 'block', width: 'min(100%, 240px)', height: 'auto', margin: '0 auto 16px' }} />}
                <a href={`/api/dashboard/tickets/${encodeURIComponent(ticket.ticketId)}/pdf`} style={{ display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 8, background: '#173f78', color: '#fff', padding: '10px 14px', borderRadius: 6, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
                  Download AHIBI ticket (PDF)
                </a>
              </article>)}
            </div>
          </>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <p style={{ color: '#475569', lineHeight: 1.6, marginTop: 0 }}>
              {seasonOrder.ahibi_pass_status === 'refund_required'
                ? 'Payment was received, but Ahibi has not confirmed the ticket allocation yet. Refresh to retry the existing allocation; please do not pay again.'
                : seasonOrder.ahibi_pass_status === 'needs_reconciliation'
                  ? 'Your ticket allocation needs a status check. Please refresh ticket status; do not pay again.'
                  : 'Your Ahibi tickets are being prepared. Refresh ticket status shortly; do not pay again.'}
            </p>
            <form action={refreshSeasonPassTickets}><button type="submit" className="membership-pay-button">Refresh ticket status</button></form>
          </div>
        )}
      </section>}

      {!seasonPassMember && (!active || !entryType || !Number.isFinite(homeMatches) || homeMatches <= 0) ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 32 }}>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
              Activate a Rise tier to access its matchday entry benefit. <Link href="/dashboard">Choose your membership tier</Link>.
          </p>
        </div>
      ) : !seasonPassMember ? (
        <>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <p style={{ color: '#334155', lineHeight: 1.6, margin: 0 }}>
              Your active membership includes one {entryType} entry for each of up to {homeMatches} home matches this season. Select a match below to receive a short-lived Ahibi booking link. The entry is used only after Ahibi confirms the booking.
            </p>
          </div>

          {fixtures.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 28, color: '#64748b' }}>
              No upcoming home matches are open for member booking yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {fixtures.map((fixture) => {
                const existing = entryByFixture.get(fixture.id);
                const reservationActive = existing?.status === 'session_created'
                  || (existing?.status === 'reserved' && new Date(existing.expires_at) > new Date());
                const fixtureDate = new Date(fixture.date_time);
                const eventUrl = safeAhibiUrl(fixture.ahibi_ticket_url);
                return (
                  <article key={fixture.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 650, color: '#0f172a', margin: '0 0 6px' }}>NUSC vs {fixture.opponent}</h2>
                      <p style={{ margin: 0, color: '#64748b' }}>
                        {fixtureDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                        {fixture.venue ? ` · ${fixture.venue}` : ''}
                      </p>
                      {eventUrl && <a href={eventUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#475569' }}>View Ahibi event</a>}
                    </div>
                    <div>
                      {existing?.status === 'redeemed' ? (
                        <span style={{ color: '#166534', fontWeight: 600 }}>Entry booked</span>
                      ) : reservationActive ? (
                        <span style={{ color: '#92400e', fontWeight: 600 }}>Ahibi booking in progress</span>
                      ) : (
                        <ClaimMembershipEntryButton fixtureId={fixture.id} />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
