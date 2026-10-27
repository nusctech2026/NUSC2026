'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCampaignMatches, saveCampaignMatch } from '../../../actions/campaignAdminActions';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

const empty = { id: '', title: '', venue: '', startDate: '', endDate: '', isActive: true };
const indiaInput = (value: string) => new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16);

export const CampaignMatchesView = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = () => getCampaignMatches().then(data => { setMatches(data); })
    .catch(() => { setError('Unable to load matches. Please retry.'); })
    .finally(() => { setLoading(false); });
  useEffect(() => { void load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      await saveCampaignMatch({ ...form, id: form.id || undefined,
        startDate: new Date(`${form.startDate}+05:30`).toISOString(),
        endDate: new Date(`${form.endDate}+05:30`).toISOString(),
      });
      setForm(empty); setMessage('Match saved. It is now available in the gate scanner.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save match'); }
    finally { setSaving(false); }
  };
  const inputStyle = { display: 'block', width: '100%', padding: '10px', marginTop: '4px' };

  return <main className="campaign-page" style={{ maxWidth: '1000px', margin: 'auto' }}>
    <CampaignWorkspaceNav />
    <h1>Campaign matches</h1>
    <p>Create one record per match. Attendance is recorded once per person for each match.</p>
    <Link href="/admin/campaign/scanner">Open gate scanner</Link>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <form onSubmit={save} style={{ marginTop: '24px', display: 'grid', gap: '14px', maxWidth: '600px' }}>
      <h2>{form.id ? 'Edit match' : 'Add a match'}</h2>
      <label>Match name<input style={inputStyle} required maxLength={255} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="NUSC vs visiting team" /></label>
      <label>Venue<input style={inputStyle} required maxLength={255} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
      <label>Check-in opens (India time)<input style={inputStyle} type="datetime-local" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label>
      <label>Check-in closes (India time)<input style={inputStyle} type="datetime-local" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></label>
      <label><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Match active</label>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save match'}</button>
        {form.id && <button type="button" disabled={saving} onClick={() => setForm(empty)}>Cancel edit</button>}
      </div>
    </form>
    <h2 style={{ marginTop: '32px' }}>Scheduled matches</h2>
    {loading ? <p>Loading matches...</p> : matches.length === 0 ? <p>No matches yet. Add the first match above.</p> :
      <ul style={{ listStyle: 'none', padding: 0 }}>{matches.map(match => <li key={match.id} style={{ padding: '16px 0', borderTop: '1px solid #cbd5e1' }}>
        <strong>{match.title}</strong> · {match.is_active ? 'Active' : 'Inactive'}
        <p>{match.venue} · {new Date(match.start_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} – {new Date(match.end_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        <button type="button" onClick={() => setForm({ id: match.id, title: match.title, venue: match.venue,
          startDate: indiaInput(match.start_date), endDate: indiaInput(match.end_date), isActive: match.is_active })}>Edit {match.title}</button>
      </li>)}</ul>}
  </main>;
};
