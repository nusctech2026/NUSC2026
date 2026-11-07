'use client'

import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { SignOutButton } from './SignOutButton'

export type ScannerMatch = {
  id: string
  title: string
  start_date: string
  end_date: string
  is_active: boolean
  is_test: boolean
}

type AttendanceAction = 'check_in' | 'check_out'
type CheckpointType = 'gate' | 'booth'

type ScanCandidate = {
  full_name?: string
  id_number?: string
  assigned_role?: string
  assigned_zone?: string | null
  assigned_shift?: string | null
  signedPhotoUrl?: string | null
}

type ScanResult = {
  success: boolean
  code?: string
  message?: string
  action?: AttendanceAction
  checkpoint_type?: CheckpointType
  match_title?: string
  scanned_at?: string
  first_scanned_at?: string
  first_gate?: string
  candidate?: ScanCandidate
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const gates = ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4']
const duplicateCodes = new Set(['ALREADY_CHECKED_IN', 'ALREADY_CHECKED_OUT'])

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

export function ScannerApp({
  matches,
  matchesUnavailable,
  staffEmail,
}: {
  matches: ScannerMatch[]
  matchesUnavailable: boolean
  staffEmail: string
}) {
  const router = useRouter()
  const [eventId, setEventId] = useState('')
  const [action, setAction] = useState<AttendanceAction>('check_in')
  const [checkpointType, setCheckpointType] = useState<CheckpointType>('gate')
  const [gate, setGate] = useState(gates[0])
  const [booth, setBooth] = useState('')
  const [manualValue, setManualValue] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [clientNow, setClientNow] = useState<number | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generationRef = useRef(0)
  const busyRef = useRef(false)
  const lastValueRef = useRef('')
  const noCodeSinceRef = useRef<number | null>(null)
  const verifyRef = useRef<(value: string) => Promise<void>>(async () => {})

  const selectedMatch = matches.find((match) => match.id === eventId)
  const matchClosed = Boolean(selectedMatch && (
    !selectedMatch.is_active
    || (clientNow !== null && new Date(selectedMatch.end_date).getTime() < clientNow)
  ))
  const checkpoint = checkpointType === 'gate' ? gate : booth.trim()
  const scannerReady = Boolean(
    eventId
    && clientNow !== null
    && isOnline
    && !matchesUnavailable
    && (checkpointType === 'gate' || (checkpoint.length >= 2 && checkpoint.length <= 100))
    && !(matchClosed && action === 'check_in'),
  )

  const stopCamera = useCallback(() => {
    generationRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }, [])

  const submitScan = useCallback(async (rawValue: string) => {
    const qrValue = rawValue.trim()
    if (!qrValue || busyRef.current) return
    if (!scannerReady) {
      setError(!isOnline
        ? 'No internet connection. Attendance requires an online confirmation.'
        : matchClosed && action === 'check_in'
          ? 'This match is closed for check-in. Open sessions can still be checked out.'
          : 'Select a match and valid checkpoint before scanning.')
      return
    }

    busyRef.current = true
    setBusy(true)
    setError('')
    setFeedback(null)

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrValue,
          action,
          checkpointType,
          checkpoint,
          eventId,
        }),
      })
      const body = await response.json().catch(() => null) as (ScanResult & { error?: string }) | null

      if (response.status === 401) {
        stopCamera()
        router.replace('/login')
        router.refresh()
        return
      }

      if (response.status === 403 && body?.code === 'SCANNER_ACCESS_DENIED') {
        stopCamera()
        setFeedback({
          success: false,
          code: body.code,
          message: body.error || 'This account is not authorized to scan.',
        })
        router.replace('/unauthorized')
        return
      }

      if (!response.ok || !body || typeof body.success !== 'boolean') {
        setFeedback({
          success: false,
          code: body?.code || 'SYSTEM_ERROR',
          message: body?.error || 'Attendance could not be confirmed. Check the scan before retrying.',
        })
        return
      }

      setFeedback(body)
      if (body.success) {
        if ('vibrate' in navigator) navigator.vibrate?.(70)
      } else if ('vibrate' in navigator) {
        navigator.vibrate?.([80, 45, 80])
      }
    } catch {
      setFeedback({
        success: false,
        code: 'NETWORK_ERROR',
        message: 'Connection interrupted. Attendance was not confirmed. Check before retrying.',
      })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [action, checkpoint, checkpointType, eventId, isOnline, matchClosed, router, scannerReady, stopCamera])

  useEffect(() => {
    verifyRef.current = submitScan
  }, [submitScan])

  useEffect(() => {
    const updateClock = () => setClientNow(Date.now())
    const updateOnline = () => setIsOnline(navigator.onLine)
    updateClock()
    updateOnline()
    const clockTimer = window.setInterval(updateClock, 30_000)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.clearInterval(clockTimer)
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => () => {
    generationRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const startCamera = useCallback(async () => {
    if (!scannerReady || streamRef.current) {
      if (!scannerReady) setError('Select a match and valid checkpoint before opening the camera.')
      return
    }

    setError('')
    const generation = ++generationRef.current
    try {
      const { default: decode } = await import('jsqr')
      const camera = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      if (generation !== generationRef.current) {
        camera.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = camera
      const video = videoRef.current
      if (!video) {
        stopCamera()
        return
      }
      video.srcObject = camera
      await video.play()
      if (generation !== generationRef.current) return
      setCameraOpen(true)
      lastValueRef.current = ''
      noCodeSinceRef.current = null

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Camera frame processing is unavailable.')

      const tick = () => {
        if (generation !== generationRef.current) return
        const frame = videoRef.current

        if (frame && frame.readyState >= 2 && frame.videoWidth > 0 && frame.videoHeight > 0) {
          const scale = Math.min(1, 720 / frame.videoWidth)
          const width = Math.round(frame.videoWidth * scale)
          const height = Math.round(frame.videoHeight * scale)
          canvas.width = width
          canvas.height = height

          if (width > 0 && height > 0) {
            context.drawImage(frame, 0, 0, width, height)
            const pixels = context.getImageData(0, 0, width, height)
            const code = decode(pixels.data, width, height, { inversionAttempts: 'dontInvert' })

            if (!code) {
              if (noCodeSinceRef.current === null) noCodeSinceRef.current = Date.now()
              if (Date.now() - noCodeSinceRef.current >= 850) lastValueRef.current = ''
            } else {
              noCodeSinceRef.current = null
              if (!busyRef.current && code.data !== lastValueRef.current) {
                lastValueRef.current = code.data
                void verifyRef.current(code.data)
              }
            }
          }
        }

        timerRef.current = setTimeout(tick, 180)
      }
      tick()
    } catch {
      stopCamera()
      setError('Camera unavailable. Allow camera access in your browser settings or enter the workforce ID below.')
      manualInputRef.current?.focus()
    }
  }, [scannerReady, stopCamera])

  async function installApp() {
    if (!installPrompt) {
      setInstallHelpOpen(true)
      return
    }
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!manualValue.trim() || busy) return
    const value = manualValue
    setManualValue('')
    await submitScan(value)
    manualInputRef.current?.focus()
  }

  const isDuplicate = Boolean(feedback && !feedback.success && feedback.code && duplicateCodes.has(feedback.code))
  const resultTone = feedback?.success ? 'success' : isDuplicate ? 'warning' : 'failure'

  return (
    <main className="scanner-shell">
      <header className="scanner-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">N</span>
          <span className="brand-caption">NAGALAND UNITED<br />SPORTS CLUB</span>
        </div>
        <div className="header-actions">
          {installPrompt && (
            <button className="install-button" type="button" onClick={installApp}>Install app</button>
          )}
          <SignOutButton compact />
        </div>
      </header>

      <section className="scanner-intro">
        <div>
          <p className="eyebrow">Matchday operations</p>
          <h1>Workforce scanner</h1>
          <p className="staff-line"><span className="staff-dot" aria-hidden="true" /> Signed in as {staffEmail}</p>
        </div>
        <details className="install-help" open={installHelpOpen || undefined}>
          <summary onClick={(event) => {
            if (!installHelpOpen) event.preventDefault()
            setInstallHelpOpen(!installHelpOpen)
          }}>Install on phone</summary>
          {installHelpOpen && (
            <div className="install-instructions">
              <p><strong>Android:</strong> Browser menu → Install app or Add to Home screen.</p>
              <p><strong>iPhone:</strong> Safari Share → Add to Home Screen. Turn on “Open as Web App”.</p>
            </div>
          )}
        </details>
      </section>

      <div className={isOnline ? 'connection-status is-online' : 'connection-status is-offline'} role="status">
        <span className="connection-light" aria-hidden="true" />
        {isOnline ? 'Online · scans require server confirmation' : 'Offline · scans are paused'}
      </div>

      {!isOnline && <div className="offline-banner" role="alert">Reconnect to the internet before recording attendance.</div>}
      {matchesUnavailable && <div className="error-banner" role="alert">Match list unavailable. Reload the scanner before continuing.</div>}

      <section className="setup-panel" aria-label="Match and checkpoint setup">
        <label className="field-label" htmlFor="match-select">MATCH</label>
        <select
          id="match-select"
          value={eventId}
          onChange={(event) => { setEventId(event.target.value); setFeedback(null); setError('') }}
          disabled={cameraOpen || busy || matchesUnavailable}
        >
          <option value="">{matches.length ? 'Choose a match' : 'No matches available'}</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.is_test ? '[TEST] ' : ''}{match.title} · {formatDate(match.start_date)}
            </option>
          ))}
        </select>

        {selectedMatch && (
          <div className="selected-match-meta">
            <span>{selectedMatch.is_test ? 'TEST MATCH' : selectedMatch.is_active ? 'ACTIVE MATCH' : 'CLOSED MATCH'}</span>
            <span>Ends {formatDate(selectedMatch.end_date)}</span>
          </div>
        )}
        {selectedMatch?.is_test && <p className="test-note">Test mode — scans will not count toward official match records.</p>}
        {matchClosed && action === 'check_in' && (
          <p className="closed-note" role="status">This match is closed for check-in. You can still check out an open session.</p>
        )}

        <div className="field-label action-label">ATTENDANCE ACTION</div>
        <div className="action-switch" role="group" aria-label="Attendance action">
          <button
            type="button"
            aria-pressed={action === 'check_in'}
            className={action === 'check_in' ? 'action-option is-selected' : 'action-option'}
            onClick={() => { setAction('check_in'); setFeedback(null); setError('') }}
            disabled={cameraOpen || busy}
          >
            <span className="action-icon" aria-hidden="true">IN</span>
            Check in
          </button>
          <button
            type="button"
            aria-pressed={action === 'check_out'}
            className={action === 'check_out' ? 'action-option is-selected' : 'action-option'}
            onClick={() => { setAction('check_out'); setFeedback(null); setError('') }}
            disabled={cameraOpen || busy}
          >
            <span className="action-icon action-icon-out" aria-hidden="true">OUT</span>
            Check out
          </button>
        </div>

        <div className="checkpoint-heading">
          <span className="field-label">CHECKPOINT</span>
          <div className="checkpoint-switch" role="group" aria-label="Checkpoint type">
            <button
              type="button"
              aria-pressed={checkpointType === 'gate'}
              className={checkpointType === 'gate' ? 'checkpoint-option is-selected' : 'checkpoint-option'}
              onClick={() => { setCheckpointType('gate'); setFeedback(null); setError('') }}
              disabled={cameraOpen || busy}
            >Gate</button>
            <button
              type="button"
              aria-pressed={checkpointType === 'booth'}
              className={checkpointType === 'booth' ? 'checkpoint-option is-selected' : 'checkpoint-option'}
              onClick={() => { setCheckpointType('booth'); setFeedback(null); setError('') }}
              disabled={cameraOpen || busy}
            >Booth</button>
          </div>
        </div>

        {checkpointType === 'gate' ? (
          <select
            aria-label="Gate"
            value={gate}
            onChange={(event) => setGate(event.target.value)}
            disabled={cameraOpen || busy}
          >
            {gates.map((value) => <option key={value}>{value}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={booth}
            onChange={(event) => { setBooth(event.target.value.slice(0, 100)); setFeedback(null); setError('') }}
            maxLength={100}
            placeholder="Enter booth name"
            aria-label="Booth name"
            disabled={cameraOpen || busy}
          />
        )}
      </section>

      <section className="scan-panel" aria-label="Workforce ID camera scanner">
        <div className="scan-panel-top">
          <div>
            <p className="eyebrow">ID reader</p>
            <h2>Scan workforce pass</h2>
          </div>
          <span className="camera-badge"><span aria-hidden="true">◉</span> LIVE CAMERA</span>
        </div>

        <div className={cameraOpen ? 'camera-stage is-active' : 'camera-stage'}>
          <video ref={videoRef} playsInline muted aria-label="Live QR scanner camera" />
          {cameraOpen ? (
            <div className="scan-guide" aria-hidden="true"><span /><span /><span /><span /><i /></div>
          ) : (
            <div className="camera-placeholder">
              <div className="camera-symbol" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <p>Rear camera ready</p>
              <small>Place the workforce QR inside the frame</small>
            </div>
          )}
          {busy && <div className="camera-busy"><span className="spinner" /> Verifying with server</div>}
        </div>

        <div className="camera-controls">
          {!cameraOpen ? (
            <button className="button button-primary camera-button" type="button" onClick={startCamera} disabled={!scannerReady || busy}>
              <span className="camera-button-icon" aria-hidden="true">▣</span>
              Open camera
            </button>
          ) : (
            <button className="button button-secondary camera-button" type="button" onClick={stopCamera} disabled={busy}>
              Pause camera
            </button>
          )}
          <p>QR data is sent securely for a live attendance check.</p>
        </div>

        <div className="manual-divider"><span>OR ENTER THE PRINTED PASS ID</span></div>
        <form className="manual-form" onSubmit={submitManual}>
          <input
            ref={manualInputRef}
            type="text"
            value={manualValue}
            onChange={(event) => setManualValue(event.target.value.slice(0, 160))}
            placeholder="NUSC-ID-2026-…"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-label="QR value or printed workforce pass ID"
            disabled={busy || !isOnline}
          />
          <button className="manual-submit" type="submit" disabled={busy || !scannerReady || !manualValue.trim()}>
            {busy ? 'Wait' : 'Verify'}
          </button>
        </form>
        <p className="manual-help">You can enter the printed ID or the 64-character QR value.</p>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {feedback && (
        <section
          className={'scan-feedback tone-' + resultTone}
          aria-label="Latest scan result"
          aria-live={feedback.success ? 'polite' : 'assertive'}
        >
          <div className="feedback-heading">
            <span className="feedback-symbol" aria-hidden="true">{feedback.success ? '✓' : isDuplicate ? '!' : '×'}</span>
            <div>
              <p className="eyebrow">{feedback.success ? 'SERVER CONFIRMED' : isDuplicate ? 'DUPLICATE SCAN' : 'SCAN NOT RECORDED'}</p>
              <h2>
                {feedback.success
                  ? (feedback.action === 'check_out' ? 'Check-out recorded' : 'Check-in recorded')
                  : feedback.message || 'Pass not accepted'}
              </h2>
            </div>
          </div>
          {feedback.match_title && <p className="feedback-match">{feedback.match_title}</p>}
          {feedback.candidate && (
            <div className="candidate-row">
              {feedback.candidate.signedPhotoUrl && (
                <img src={feedback.candidate.signedPhotoUrl} width={56} height={70} alt="" />
              )}
              <div>
                <strong>{feedback.candidate.full_name || 'Workforce member'}</strong>
                <span>{feedback.candidate.id_number}</span>
                <span>{feedback.candidate.assigned_role}</span>
                {(feedback.candidate.assigned_zone || feedback.candidate.assigned_shift) && (
                  <span>{[feedback.candidate.assigned_zone, feedback.candidate.assigned_shift].filter(Boolean).join(' · ')}</span>
                )}
              </div>
            </div>
          )}
          {feedback.success && feedback.scanned_at && (
            <p className="feedback-time">{formatTime(feedback.scanned_at)} IST · {feedback.checkpoint_type === 'booth' ? 'Booth' : 'Gate'} {checkpoint}</p>
          )}
          {feedback.first_scanned_at && (
            <p className="feedback-time">Session started {formatTime(feedback.first_scanned_at)} IST at {feedback.first_gate || 'the selected checkpoint'}.</p>
          )}
          {(feedback.code === 'SYSTEM_ERROR' || feedback.code === 'NETWORK_ERROR') && (
            <p className="feedback-caution">No success was confirmed. Check the attendance before retrying.</p>
          )}
        </section>
      )}

      <footer className="scanner-footer">
        <span>NUSC · Matchday attendance</span>
        <span>Scans are online-only</span>
      </footer>
    </main>
  )
}
