'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createCampaignTestMatch, deleteCampaignTestMatch, getCampaignMatches, getCampaignTestMatchAccess, saveCampaignMatch } from '../../../actions/campaignAdminActions';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

const empty = { id: '', title: '', venue: '', startDate: '', endDate: '', isActive: true };
const indiaInput = (value: string) => new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16);
const formatIndiaDateTime = (value: string) => new Date(value).toLocaleString('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
});

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
  const [testMatchAccess, setTestMatchAccess] = useState<'checking' | 'manage' | 'view' | 'unavailable'>('checking');
  const load = () => getCampaignMatches(true).then(async data => {
    setMatches(data);
    const access = await getCampaignTestMatchAccess();
    setTestMatchAccess(access.canManageTestMatches ? 'manage' : 'view');
  }).catch(err => {
    setError(err instanceof Error ? err.message : 'Unable to load match information. Please retry.');
    setTestMatchAccess('unavailable');
  }).finally(() => { setLoading(false); });
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
      const result = await createCampaignTestMatch(testForm.title, testForm.date);
      setTestForm({ title: '', date: '' });
      setMessage(`TEST match "${result.match.title}" created. It is available to authorized TEST attendance scans.`);
      try {
        setMatches(await getCampaignMatches(true));
      } catch {
        setError('The TEST match was created, but the list could not refresh. Reload this page to verify it.');
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create TEST match. Please retry.'); }
    finally { setTestSaving(false); }
  };
  const deleteTest = async (match: any) => {
    if (!window.confirm(`Delete TEST match "${match.title}"? This permanently deletes the match and all TEST attendance recorded for it.`)) return;
    setDeletingTestId(match.id); setError(''); setMessage('');
    try {
      const result = await deleteCampaignTestMatch(match.id);
      setMatches(current => current.filter(item => item.id !== match.id));
      setMessage(`Deleted TEST match "${result.title}" and ${result.deletedAttendanceCount} associated attendance records.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete TEST match. Please retry.'); }
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
    {error && <p className="campaign-match-feedback campaign-match-feedback--error" role="alert">{error}</p>}
    {message && <p className="campaign-match-feedback campaign-match-feedback--success" role="status">{message}</p>}
    <form onSubmit={save} style={{ marginTop: '24px', display: 'grid', gap: '14px', maxWidth: '600px' }}>
      <h2>{form.id ? 'Edit match' : 'Add a match'}</h2>
      <label>Match name<input style={inputStyle} required maxLength={255} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="NUSC vs visiting team" /></label>
      <label>Venue<input style={inputStyle} required maxLength={255} value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
      <label>Check-in opens (India time)<input style={inputStyle} type="datetime-local" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label>
      <label>Check-in closes (India time)<input style={inputStyle} type="datetime-local" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></label>
      <label><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Match active</label>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="campaign-primary-button" type="submit" disabled={saving}>{saving ? 'Saving match...' : 'Save match'}</button>
        {form.id && <button className="campaign-secondary-button" type="button" disabled={saving} onClick={() => setForm(empty)}>Cancel edit</button>}
      </div>
    </form>
    <h2 style={{ marginTop: '32px' }}>Official match days</h2>
    {loading ? <p>Loading matches...</p> : officialMatches.length === 0 ? <p>No official matches are configured.</p> :
      <ul style={{ listStyle: 'none', padding: 0 }}>{officialMatches.map(match => <li key={match.id} style={{ padding: '16px 0', borderTop: '1px solid #cbd5e1' }}>
        <strong>{match.title}</strong> · {match.is_active ? 'Active' : 'Inactive'}
        <p>{match.venue} · {new Date(match.start_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} – {new Date(match.end_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        <button className="campaign-secondary-button" type="button" onClick={() => setForm({ id: match.id, title: match.title, venue: match.venue,
          startDate: indiaInput(match.start_date), endDate: indiaInput(match.end_date), isActive: match.is_active })}>Edit {match.title}</button>
      </li>)}</ul>}

    <section className="campaign-test-match-panel" aria-labelledby="campaign-test-match-title">
      <p className="campaign-test-match-eyebrow">Scanner practice</p>
      <h2 id="campaign-test-match-title">Create a test match day</h2>
      <p className="campaign-test-match-help">Test matches use a full-day attendance window in India time. They stay separate from official matches.</p>
      {testMatchAccess === 'checking' && <p className="campaign-test-match-note">Checking your match-management access...</p>}
      {testMatchAccess === 'unavailable' && <p className="campaign-test-match-note" role="status">We could not verify your test-match access. Refresh the page or contact an administrator.</p>}
      {testMatchAccess === 'view' && <p className="campaign-test-match-note" role="status">You can view test matches. A Super Admin or Campaign Manager must create or delete them.</p>}
      {testMatchAccess === 'manage' && <form className="campaign-test-match-form" onSubmit={createTest}>
        <label className="campaign-test-match-field">
          <span>Test match name</span>
          <input required maxLength={255} value={testForm.title}
            onChange={e => setTestForm({ ...testForm, title: e.target.value })} placeholder="For example, Scanner rehearsal" />
        </label>
        <label className="campaign-test-match-field">
          <span>Match date (India time)</span>
          <input type="date" required value={testForm.date}
            onChange={e => setTestForm({ ...testForm, date: e.target.value })} />
        </label>
        <button className="campaign-primary-button campaign-test-match-create" type="submit" disabled={testSaving || Boolean(deletingTestId)}>
          {testSaving ? 'Creating test match...' : 'Create test match'}
        </button>
      </form>}
    </section>

    <section className="campaign-test-match-list-section" aria-labelledby="campaign-test-match-list-title">
      <h2 id="campaign-test-match-list-title">Test match days <span className="campaign-test-match-count">({testMatches.length})</span></h2>
      {loading ? <p>Loading test matches...</p> : testMatches.length === 0 ? <p>No test matches yet.</p> :
        <ul className="campaign-test-match-list">{testMatches.map(match => <li className="campaign-test-match-item" key={match.id}>
          <div className="campaign-test-match-details">
            <div className="campaign-test-match-name-row">
              <span className="campaign-test-match-badge">TEST</span>
              <strong>{match.title}</strong>
              <span className={`campaign-test-match-status${match.is_active ? ' is-active' : ''}`}>{match.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <p>{match.venue} · {formatIndiaDateTime(match.start_date)} – {formatIndiaDateTime(match.end_date)} IST</p>
          </div>
          {testMatchAccess === 'manage' && <div className="campaign-test-match-delete-row">
            <p>This also permanently removes attendance recorded for this test match.</p>
            <button className="campaign-danger-button" type="button" disabled={Boolean(deletingTestId) || testSaving}
              onClick={() => void deleteTest(match)}>
              {deletingTestId === match.id ? 'Deleting test match...' : 'Delete test match and attendance'}
            </button>
          </div>}
        </li>)}</ul>}
    </section>
  </main>;
};
