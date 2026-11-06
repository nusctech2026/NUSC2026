'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createCampaignTestMatch, deleteCampaignTestMatch, getCampaignMatches, saveCampaignMatch } from '../../../actions/campaignAdminActions';
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
  const [testForm, setTestForm] = useState({ title: '', date: '' });
  const [testSaving, setTestSaving] = useState(false);
  const [deletingTestId, setDeletingTestId] = useState('');
  const load = () => getCampaignMatches(true).then(data => { setMatches(data); })
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
      setForm(empty); setMessage('Match saved. It is now available in the gate scanner.');
      // The database has confirmed the save; refresh the list without delaying success feedback.
      void load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save match'); }
    finally { setSaving(false); }
  };
  const createTest = async (event: React.FormEvent) => {
    event.preventDefault(); setTestSaving(true); setError(''); setMessage('');
    try {
      await createCampaignTestMatch(testForm.title, testForm.date);
      setTestForm({ title: '', date: '' });
      setMatches(await getCampaignMatches(true));
      setMessage('TEST match created. It is available to authorized TEST attendance scans.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create TEST match'); }
    finally { setTestSaving(false); }
  };
  const deleteTest = async (match: any) => {
    if (!window.confirm(`Permanently delete TEST match "${match.title}" and its associated TEST attendance records?`)) return;
    setDeletingTestId(match.id); setError(''); setMessage('');
    try {
      const result = await deleteCampaignTestMatch(match.id);
      setMatches(current => current.filter(item => item.id !== match.id));
      setMessage(`Deleted TEST match "${result.title}" and ${result.deletedAttendanceCount} associated attendance records.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete TEST match'); }
    finally { setDeletingTestId(''); }
  };
  const officialMatches = matches.filter(match => !match.is_test);
  const testMatches = matches.filter(match => match.is_test);
  const inputStyle = { display: 'block', width: '100%', padding: '10px', marginTop: '4px' };

  return <main className="campaign-page" style={{ maxWidth: '1000px', margin: 'auto' }}>
    <CampaignWorkspaceNav />
    <h1>Campaign matches</h1>
    <p>Official match windows are configurable in India time. TEST match attendance stays separate and can be deleted with its TEST match.</p>
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
    <h2 style={{ marginTop: '32px' }}>Official match days</h2>
    {loading ? <p>Loading matches...</p> : officialMatches.length === 0 ? <p>No official matches are configured.</p> :
      <ul style={{ listStyle: 'none', padding: 0 }}>{officialMatches.map(match => <li key={match.id} style={{ padding: '16px 0', borderTop: '1px solid #cbd5e1' }}>
        <strong>{match.title}</strong> · {match.is_active ? 'Active' : 'Inactive'}
        <p>{match.venue} · {new Date(match.start_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} – {new Date(match.end_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        <button type="button" onClick={() => setForm({ id: match.id, title: match.title, venue: match.venue,
          startDate: indiaInput(match.start_date), endDate: indiaInput(match.end_date), isActive: match.is_active })}>Edit {match.title}</button>
      </li>)}</ul>}

    <h2 style={{ marginTop: '32px' }}>Create a TEST match day</h2>
    <p>TEST scans use a provisional 00:00–23:59 IST window. This is an attendance window, not a kickoff time.</p>
    <form onSubmit={createTest} style={{ display: 'grid', gap: '14px', maxWidth: '600px' }}>
      <label>TEST match name<input style={inputStyle} required maxLength={255} value={testForm.title}
        onChange={e => setTestForm({ ...testForm, title: e.target.value })} placeholder="TEST - scanner rehearsal" /></label>
      <label>TEST date (India time)<input style={inputStyle} type="date" required value={testForm.date}
        onChange={e => setTestForm({ ...testForm, date: e.target.value })} /></label>
      <button type="submit" disabled={testSaving}>{testSaving ? 'Creating TEST match...' : 'Create TEST match'}</button>
    </form>

    <h2 style={{ marginTop: '32px' }}>TEST match days</h2>
    {loading ? <p>Loading TEST matches...</p> : testMatches.length === 0 ? <p>No TEST match days.</p> :
      <ul style={{ listStyle: 'none', padding: 0 }}>{testMatches.map(match => <li key={match.id} style={{ padding: '16px 0', borderTop: '1px solid #f59e0b' }}>
        <strong>TEST — {match.title}</strong> · {match.is_active ? 'Active' : 'Inactive'}
        <p>{match.venue} · {new Date(match.start_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} – {new Date(match.end_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        <button type="button" disabled={deletingTestId === match.id} onClick={() => void deleteTest(match)}>
          {deletingTestId === match.id ? 'Deleting TEST match...' : 'Permanently delete TEST match and attendance'}
        </button>
      </li>)}</ul>}
  </main>;
};
