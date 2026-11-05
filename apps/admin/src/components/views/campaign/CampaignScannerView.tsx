'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@payloadcms/ui';
import Link from 'next/link';
import { getCampaignMatches, recordCampaignAttendanceScan } from '../../../actions/campaignAdminActions';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';
import { isCampaignOnlyStaff } from '../../../auth/staffRoles';

type Match = { id: string; title: string; start_date: string; end_date: string; is_active: boolean };
type ScanResult = {
  success: boolean; action?: 'check_in' | 'check_out'; message?: string; match_title?: string; first_scanned_at?: string; first_gate?: string;
  candidate?: { full_name?: string; id_number?: string; assigned_role?: string; assigned_zone?: string; assigned_shift?: string; signedPhotoUrl?: string };
};
const gates = ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4'];

export const CampaignScannerView = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState('');
  const [attendanceAction, setAttendanceAction] = useState<'check_in' | 'check_out'>('check_in');
  const [gate, setGate] = useState(gates[0]);
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<Array<{ time: string; name: string; message: string; success: boolean }>>([]);
  const { user } = useAuth();
  const userRoles = (user as { roles?: string[]; display_roles?: { role: string }[] } | null)?.roles
    ?? (user as { display_roles?: { role: string }[] } | null)?.display_roles?.map(item => item.role)
    ?? [];
  const manager = isCampaignOnlyStaff(user) && userRoles.some(role => ['super_admin', 'campaign_manager'].includes(role));
  const video = useRef<HTMLVideoElement>(null);
  const manualInput = useRef<HTMLInputElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const busyRef = useRef(false);
  const lastValue = useRef('');
  const scannerCooldownUntil = useRef(0);
  const verifyRef = useRef<(value: string) => Promise<boolean>>(async () => false);

  useEffect(() => {
    let active = true;
    getCampaignMatches().then(data => { if (active) setMatches(data); })
      .catch(() => { if (active) setError('Unable to load matches. Refresh and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stopCamera = () => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setScanning(false);
  };
  useEffect(() => () => {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
  }, []);

  const verify = async (value: string) => {
    if (busyRef.current || !value.trim()) return false;
    if (!eventId) { setError('Select a match first.'); return false; }
    if (Date.now() < scannerCooldownUntil.current) {
      setError('Wait one second before scanning the next pass.');
      return false;
    }
    busyRef.current = true; setBusy(true); setError(''); setResult(null);
    let handled = false;
    try {
      const response = await recordCampaignAttendanceScan(value.trim(), attendanceAction, gate, eventId);
      if (response.success) scannerCooldownUntil.current = Date.now() + 1000;
      setResult(response);
      const actionLabel = response.action === 'check_out' ? 'Check-out' : 'Check-in';
      setRecent(previous => [{ success: response.success, name: response.candidate?.full_name || 'Unknown credential', message: response.message || (response.success ? `${actionLabel} recorded` : 'Scan denied'), time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) }, ...previous].slice(0, 8));
      handled = true;
    } catch {
      setError('Unable to verify attendance. Retry before admitting this person.');
      handled = true;
    }
    finally { busyRef.current = false; setBusy(false); }
    return handled;
  };
  useEffect(() => { verifyRef.current = verify; });

  const startCamera = async () => {
    if (!eventId || stream.current) return;
    setError('');
    const version = ++generation.current;
    try {
      const { default: decode } = await import('jsqr');
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (version !== generation.current) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.current = camera;
      if (!video.current) { stopCamera(); return; }
      video.current.srcObject = camera;
      await video.current.play();
      if (version !== generation.current) return;
      setScanning(true); lastValue.current = '';
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Camera display unavailable');
      const tick = () => {
        if (version !== generation.current) return;
        const element = video.current;
        if (element && element.readyState >= 2 && !busyRef.current && Date.now() >= scannerCooldownUntil.current) {
          const scale = Math.min(1, 640 / element.videoWidth);
          canvas.width = Math.round(element.videoWidth * scale); canvas.height = Math.round(element.videoHeight * scale);
          if (canvas.width && canvas.height) {
            context.drawImage(element, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = decode(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
            if (!code) lastValue.current = '';
            else if (code.data !== lastValue.current) { lastValue.current = code.data; void verifyRef.current(code.data); }
          }
        }
        timer.current = setTimeout(tick, 250);
      };
      tick();
    } catch {
      stopCamera();
      setError('Camera unavailable. Allow camera access or use the printed pass ID below.');
      manualInput.current?.focus();
    }
  };
  const available = attendanceAction === 'check_out'
    ? matches
    : matches.filter(match => match.is_active && new Date(match.end_date).getTime() >= Date.now());
  const submitManual = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = manualId;
    if (!value.trim() || busy) return;
    const handled = await verify(value);
    if (handled) {
      setManualId('');
      manualInput.current?.focus();
    }
  };
  const duplicateResult = !result?.success && /already|duplicate|previously/i.test(result?.message || '');
  const resultClass = duplicateResult
    ? 'campaign-result-warning' : result?.success ? 'campaign-result-success' : 'campaign-result-failure';

  return <main className="campaign-page campaign-scanner-layout">
    <CampaignWorkspaceNav />
    <header>
      <p className="campaign-eyebrow">Matchday operations</p>
      <h1>Workforce attendance scanner</h1>
      <p className="campaign-page-intro">Choose a match, check-in or check-out, and your gate. Verify the name and photo before recording attendance.</p>
    </header>

    <section className="campaign-scanner-setup" aria-label="Attendance action, match, and gate setup">
      <label htmlFor="campaign-scan-action">Attendance action
        <select id="campaign-scan-action" value={attendanceAction} onChange={e => { setAttendanceAction(e.target.value as 'check_in' | 'check_out'); setEventId(''); setResult(null); setError(''); }} disabled={scanning || busy || loading}>
          <option value="check_in">Check-in (Admit)</option>
          <option value="check_out">Check-out (Close session)</option>
        </select>
      </label>
      <label htmlFor="campaign-scan-match">Match
        <select id="campaign-scan-match" value={eventId} onChange={e => { setEventId(e.target.value); setResult(null); }} disabled={scanning || busy || loading}>
          <option value="">{loading ? 'Loading matches…' : 'Select a match'}</option>
          {available.map(match => <option key={match.id} value={match.id}>{match.title} · {new Date(match.start_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</option>)}
        </select>
      </label>
      <label htmlFor="campaign-scan-gate">Entry point
        <select id="campaign-scan-gate" value={gate} onChange={e => setGate(e.target.value)} disabled={scanning || busy}>
          {gates.map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
    </section>

    {!loading && available.length === 0 && <div className="campaign-empty-banner" role="status">
      <strong>{attendanceAction === 'check_in' ? 'No active match is ready for check-in.' : 'No match is available for check-out.'}</strong> {manager ? <>A campaign manager can <Link href="/admin/campaign/matches">add or activate a match</Link>.</> : 'Contact your campaign manager to activate the match.'}
    </div>}

    <section className="campaign-scanner-card" aria-label="QR scanner">
      <div className="campaign-camera-frame">
        <video ref={video} playsInline muted aria-label="Live QR scanner camera" style={{ display: scanning ? 'block' : 'none' }} />
        {!scanning && <div className="campaign-camera-idle"><strong>{eventId ? 'Ready to scan' : 'Select a match to begin'}</strong><span>{eventId ? 'Use the camera or enter the pass ID below.' : 'Your match and gate will appear above.'}</span></div>}
        {result && <div className={`campaign-scan-feedback ${resultClass}`} role={result.success ? 'status' : 'alert'} aria-live={result.success ? 'polite' : 'assertive'}>
          <strong>{result.success ? (result.action === 'check_out' ? 'CHECK-OUT RECORDED' : 'CHECK-IN RECORDED') : duplicateResult ? 'DUPLICATE SCAN' : 'SCAN DENIED'}</strong>
          <span>{result.candidate?.full_name ? `${result.candidate.full_name} · ` : ''}{result.success ? `${result.action === 'check_out' ? 'Check-out' : 'Check-in'} recorded successfully` : result.message || 'Pass not admitted'}</span>
        </div>}
      </div>
      <div className="campaign-scanner-actions">
        <button className="campaign-primary-button" type="button" onClick={() => scanning ? stopCamera() : void startCamera()} disabled={!eventId || busy}>
          {scanning ? 'Stop camera' : 'Start camera scanner'}
        </button>
        {scanning && <span className="campaign-scanning-hint" role="status">Camera active · pauses one second after each successful scan</span>}
      </div>
    </section>

    <form className="campaign-manual-entry" onSubmit={submitManual}>
      <label htmlFor="manual-campaign-id">QR value or printed pass ID
        <input ref={manualInput} id="manual-campaign-id" value={manualId} onChange={e => setManualId(e.target.value)} required autoComplete="off" placeholder="Scan with a handheld reader or type NUSC-ID…" maxLength={128} disabled={!eventId || busy} />
      </label>
      <button className="campaign-secondary-button" type="submit" disabled={!eventId || busy || !manualId.trim()}>{busy ? 'Verifying…' : `Verify and ${attendanceAction === 'check_in' ? 'check in' : 'check out'}`}</button>
    </form>

    {error && <div className="campaign-error-banner" role="alert">{error}</div>}
    {result && <section className={`campaign-scan-result ${resultClass}`} aria-label="Latest scan details">
      <h2>{result.success ? (result.action === 'check_out' ? 'Check-out recorded' : 'Check-in recorded') : result.message || 'Pass not admitted'}</h2>
      {result.match_title && <p className="campaign-result-match">{result.match_title}</p>}
      {result.candidate && <div className="campaign-scanned-candidate">
        {result.candidate.signedPhotoUrl && <img src={result.candidate.signedPhotoUrl} width={88} height={108} alt={`Photo of ${result.candidate.full_name || 'candidate'}`} />}
        <div><strong>{result.candidate.full_name || 'Candidate'}</strong><p>{result.candidate.id_number}</p><p>{result.candidate.assigned_role}</p><p>{result.candidate.assigned_zone || 'No zone assigned'} · {result.candidate.assigned_shift || 'No shift assigned'}</p></div>
      </div>}
      {result.first_scanned_at && <p>Session started: {new Date(result.first_scanned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST at {result.first_gate}</p>}
    </section>}
    {recent.length > 0 && <section className="campaign-recent-scans" aria-label="Recent scans on this device"><h2>Recent scans on this device</h2>
      <ul>{recent.map((scan, index) => <li key={`${scan.time}-${index}`}><span className={scan.success ? 'campaign-recent-ok' : 'campaign-recent-denied'}>{scan.success ? 'Recorded' : 'Denied'}</span><span>{scan.time}</span><strong>{scan.name}</strong><span>{scan.message}</span></li>)}</ul>
    </section>}
  </main>;
};
