import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@nusc/db';
import { getDashboardData } from '../service';
import { ClaimMembershipEntryButton } from './ClaimMembershipEntryButton';

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
    dashboard = await getDashboardData();
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') redirect('/login');
    return <p>Unable to load matchday benefits. Please try again shortly.</p>;
  }

  const member = dashboard.membership;
  const active = member?.registration_payment_status === 'paid' && member.status === 'active'
    && (!member.end_date || new Date(member.end_date) > new Date());
  const admin = createAdminClient();
  const [fixturesResult, entriesResult] = await Promise.all([
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
  if (fixturesResult.error || entriesResult.error) {
    return <p>Unable to load matchday benefits. Please try again shortly.</p>;
  }

  const entryByFixture = new Map((entriesResult.data || []).map((entry) => [entry.fixture_id, entry]));
  const fixtures = (fixturesResult.data || []).filter((fixture) => Boolean(fixture.ahibi_event_id?.trim()));
  const entryType = typeof dashboard.entitlements.entry === 'string' ? dashboard.entitlements.entry : '';
  const homeMatches = Number(dashboard.entitlements.home_matches || 0);

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Match Tickets</h1>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <p style={{ color: '#64748b', margin: 0 }}>Use one membership entry for each eligible home match through Ahibi.</p>
      </div>

      {!active || !entryType || !Number.isFinite(homeMatches) || homeMatches <= 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 32 }}>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
              Activate a Rise tier to access its matchday entry benefit. <Link href="/dashboard">Choose your membership tier</Link>.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
