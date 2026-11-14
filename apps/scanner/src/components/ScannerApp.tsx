'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { NuscLogo } from './NuscLogo'
import { SignOutButton } from './SignOutButton'
import {
  classifyServerResult,
  findSnapshotCredential,
  isSnapshotUsable,
  retryDelayMs,
  type OfflineSnapshot,
  type ScanPayload,
  type ScanStatus,
  type ServerScanResult,
  type SnapshotCredential,
} from '@/lib/offline-model'
import {
  clearActiveStaff,
  enqueueScan,
  getActiveStaff,
  listScans,
  listPendingScans,
  loadSnapshots,
  requestPersistentStorage,
  saveSnapshot,
  setActiveStaff,
  updateScan,
  type LocalScan,
} from '@/lib/offline-store'

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
  category?: string
  assigned_role?: string
  assigned_zone?: string | null
  assigned_shift?: string | null
  signedPhotoUrl?: string | null
  photo_available?: boolean
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
  syncStatus?: ScanStatus
  operationId?: string
  localMatch?: SnapshotCredential | null
  checkpointValue?: string
}

type ScanFeedback = ScanResult

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const gates = ['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4']
const duplicateCodes = new Set(['ALREADY_CHECKED_IN', 'ALREADY_CHECKED_OUT', 'IDEMPOTENCY_CONFLICT'])

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
  initialStaffUserId = '',
  offlineShell = false,
}: {
  matches: ScannerMatch[]
  matchesUnavailable: boolean
  staffEmail: string
  initialStaffUserId?: string
  offlineShell?: boolean
}) {
  const router = useRouter()
  const [eventId, setEventId] = useState('')
  const [matchOptions, setMatchOptions] = useState(matches)
  const [staffUserId, setStaffUserId] = useState(initialStaffUserId)
  const [action, setAction] = useState<AttendanceAction>('check_in')
  const [checkpointType, setCheckpointType] = useState<CheckpointType>('gate')
  const [gate, setGate] = useState(gates[0])
  const [booth, setBooth] = useState('')
  const [manualValue, setManualValue] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const [error, setError] = useState('')
  const [clientNow, setClientNow] = useState<number | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [serverReachable, setServerReachable] = useState(false)
  const [authorizationInvalid, setAuthorizationInvalid] = useState(false)
  const [snapshots, setSnapshots] = useState<OfflineSnapshot[]>([])
  const [localScans, setLocalScans] = useState<LocalScan[]>([])
  const [preparingOffline, setPreparingOffline] = useState(false)
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null)
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
  const syncRef = useRef(false)
  const syncCallbackRef = useRef<() => Promise<void>>(async () => {})
  const healthRef = useRef(false)
  const latestOperationRef = useRef('')
  const retryTimerRef = useRef<number | null>(null)
  const captureTimeRef = useRef(0)

  const selectedMatch = matchOptions.find((match) => match.id === eventId)
  const selectedSnapshot = snapshots.find((snapshot) => snapshot.event.id === eventId) ?? null
  const usableSnapshot = isSnapshotUsable(selectedSnapshot, staffUserId, eventId, clientNow ?? 0)
  const localAuthorizationReady = Boolean(staffUserId && usableSnapshot)
  const matchClosed = Boolean(selectedMatch && (
    !selectedMatch.is_active
    || (clientNow !== null && new Date(selectedMatch.end_date).getTime() < clientNow)
  ))
  const checkpoint = checkpointType === 'gate' ? gate : booth.trim()
  const scannerReady = Boolean(
    eventId
    && clientNow !== null
    && (serverReachable || (localAuthorizationReady && !authorizationInvalid))
    && (checkpointType === 'gate' || (checkpoint.length >= 2 && checkpoint.length <= 100))
    && !(matchClosed && action === 'check_in'),
  )
  const pendingCount = localScans.filter((scan) => scan.status === 'pending').length
  const confirmedCount = localScans.filter((scan) => scan.status === 'confirmed').length
  const rejectedCount = localScans.filter((scan) => scan.status === 'rejected').length
  const conflictCount = localScans.filter((scan) => scan.status === 'conflict').length

  const stopCamera = useCallback(() => {
    generationRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOpen(false)
  }, [])

  const loadLocalState = useCallback(async (ownerId: string) => {
    const [loadedSnapshots, loadedScans] = await Promise.all([
      loadSnapshots(ownerId),
      listScans(ownerId),
    ])
    setSnapshots(loadedSnapshots)
    setLocalScans(loadedScans)
    setMatchOptions((current) => {
      const byId = new Map(current.map((match) => [match.id, match]))
      for (const snapshot of loadedSnapshots) {
        if (!byId.has(snapshot.event.id)) {
          byId.set(snapshot.event.id, {
            id: snapshot.event.id,
            title: snapshot.event.title,
            start_date: snapshot.event.startDate,
            end_date: snapshot.event.endDate,
            is_active: true,
            is_test: snapshot.event.isTest,
          })
        }
      }
      return [...byId.values()]
    })
  }, [])

  const probeHealth = useCallback(async () => {
    if (!navigator.onLine || healthRef.current) return false
    healthRef.current = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8_000)
    try {
      const response = await fetch('/api/scanner/health', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      })
      const body = await response.json().catch(() => null) as { reachable?: boolean; staffUserId?: string } | null
      if (!response.ok || !body?.reachable || typeof body.staffUserId !== 'string') {
        setServerReachable(false)
        if (response.status === 401 || response.status === 403) {
          setAuthorizationInvalid(true)
          stopCamera()
        }
        return false
      }

      const staffChanged = staffUserId !== body.staffUserId
      if (staffChanged && staffUserId) {
        setServerReachable(false)
        setAuthorizationInvalid(true)
        setSnapshots([])
        setLocalScans([])
        setEventId('')
        stopCamera()
        setFeedback(null)
        latestOperationRef.current = ''
        await clearActiveStaff(staffUserId).catch(() => {})
        router.refresh()
      } else if (staffChanged) {
        setServerReachable(false)
        setAuthorizationInvalid(true)
      }
      setStaffUserId(body.staffUserId)
      if (staffChanged) {
        await setActiveStaff(body.staffUserId)
        await loadLocalState(body.staffUserId)
      }
      setAuthorizationInvalid(false)
      setServerReachable(true)
      return true
    } catch {
      setServerReachable(false)
      return false
    } finally {
      window.clearTimeout(timeout)
      healthRef.current = false
    }
  }, [loadLocalState, router, staffUserId, stopCamera])

  const syncPending = useCallback(async () => {
    if (syncRef.current || !serverReachable || !navigator.onLine || !staffUserId) return
    syncRef.current = true
    let connectionFailed = false
    try {
      const rows = await listPendingScans(staffUserId, 10)
      for (const row of rows) {
        if (row.status !== 'pending' || row.retryAt > Date.now()) continue
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 12_000)
        let response: Response
        let body: (ServerScanResult & { error?: string }) | null
        try {
          response = await fetch('/api/attendance', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              operationId: row.operationId,
              qrValue: row.payload.qrValue,
              action: row.payload.action,
              checkpointType: row.payload.checkpointType,
              checkpoint: row.payload.checkpoint,
              eventId: row.payload.eventId,
            }),
          })
          body = await response.json().catch(() => null) as (ServerScanResult & { error?: string }) | null
        } catch {
          const attempts = row.attempts + 1
          await updateScan(staffUserId, row.operationId, {
            attempts,
            retryAt: Date.now() + retryDelayMs(attempts),
          })
          setLocalScans((current) => current.map((item) => item.operationId === row.operationId
            ? { ...item, attempts, retryAt: Date.now() + retryDelayMs(attempts) }
            : item))
          setServerReachable(false)
          connectionFailed = true
          break
        } finally {
          window.clearTimeout(timeout)
        }

        if (response.status === 401 || response.status === 403 || !response.ok || !body || typeof body.success !== 'boolean') {
          const attempts = row.attempts + 1
          await updateScan(staffUserId, row.operationId, {
            attempts,
            retryAt: Date.now() + retryDelayMs(attempts),
          })
          setLocalScans((current) => current.map((item) => item.operationId === row.operationId
            ? { ...item, attempts, retryAt: Date.now() + retryDelayMs(attempts) }
            : item))
          if (response.status === 401 || body?.code === 'SCANNER_ACCESS_DENIED') {
            setAuthorizationInvalid(true)
            stopCamera()
          }
          if (response.status === 401 || response.status === 403 || response.status >= 500) {
            setServerReachable(false)
            connectionFailed = true
          }
          break
        }

        if (body.code === 'RETRY_PENDING') {
          const attempts = row.attempts + 1
          const retryAt = Date.now() + retryDelayMs(attempts)
          await updateScan(staffUserId, row.operationId, { attempts, retryAt })
          setLocalScans((current) => current.map((item) => item.operationId === row.operationId
            ? { ...item, attempts, retryAt }
            : item))
          break
        }

        const status = classifyServerResult(body)
        const { candidate: serverCandidate, ...receipt } = body
        await updateScan(staffUserId, row.operationId, {
          status,
          retryAt: 0,
          serverResult: receipt,
        })
        setLocalScans((current) => current.map((item) => item.operationId === row.operationId
          ? { ...item, status, retryAt: 0, serverResult: receipt }
          : item))

        if (latestOperationRef.current === row.operationId) {
          const localCandidate = row.payload.localMatch
          setFeedback({
            ...body,
            candidate: serverCandidate ?? (localCandidate ? {
              full_name: localCandidate.fullName,
              id_number: localCandidate.idNumber,
              category: localCandidate.category,
              assigned_role: localCandidate.role,
              photo_available: localCandidate.photoAvailable,
            } : undefined),
            syncStatus: status,
            operationId: row.operationId,
            localMatch: localCandidate,
            checkpointValue: row.payload.checkpoint,
          })
          if (body.success && 'vibrate' in navigator) navigator.vibrate?.(70)
        }

      }
      const pendingRows = await listPendingScans(staffUserId, 10)
      const nextRetry = pendingRows
        .reduce((next, row) => Math.min(next, row.retryAt), Number.POSITIVE_INFINITY)
      if (Number.isFinite(nextRetry) && serverReachable && navigator.onLine && !connectionFailed) {
        if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null
          void syncCallbackRef.current()
        }, Math.max(250, Math.min(60_000, nextRetry - Date.now())))
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Could not read the local attendance queue.')
    } finally {
      syncRef.current = false
    }
  }, [serverReachable, staffUserId, stopCamera])

  const submitScan = useCallback(async (rawValue: string) => {
    const qrValue = rawValue.trim()
    if (!qrValue || busyRef.current) return
    if (!scannerReady) {
      setError(!serverReachable && !localAuthorizationReady
        ? 'Prepare a current offline match snapshot while online before scanning without connectivity.'
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
      const captureTime = Math.max(Date.now(), captureTimeRef.current + 1)
      captureTimeRef.current = captureTime
      const capturedAt = new Date(captureTime).toISOString()
      const localMatch = usableSnapshot && selectedSnapshot
        ? await findSnapshotCredential(selectedSnapshot, qrValue, capturedAt, action)
        : null
      const payload: ScanPayload = {
          qrValue,
          action,
          checkpointType,
          checkpoint,
          eventId,
        capturedAt,
        snapshotVersion: usableSnapshot ? 1 : null,
        localMatch,
      }
      const { created, scan } = await enqueueScan(staffUserId, payload)
      latestOperationRef.current = scan.operationId
      setLocalScans((current) => [scan, ...current.filter((item) => item.operationId !== scan.operationId)])
      setFeedback({
        success: false,
        code: 'PENDING_SYNC',
        message: created ? 'Saved on this device. Waiting for server validation.' : 'This scan is already waiting for server validation.',
        action,
        syncStatus: scan.status,
        operationId: scan.operationId,
        localMatch,
        checkpointValue: checkpoint,
        candidate: localMatch ? {
          full_name: localMatch.fullName,
          id_number: localMatch.idNumber,
          category: localMatch.category,
          assigned_role: localMatch.role,
          photo_available: localMatch.photoAvailable,
        } : undefined,
      })
      if ('vibrate' in navigator) navigator.vibrate?.(45)
      void syncPending()
    } catch (storageError) {
      setError(storageError instanceof Error
        ? `Scan was not saved. ${storageError.message}`
        : 'Scan was not saved. Check device storage before scanning again.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [action, checkpoint, checkpointType, eventId, localAuthorizationReady, matchClosed, scannerReady, selectedSnapshot, serverReachable, staffUserId, syncPending, usableSnapshot])

  const prepareOffline = useCallback(async () => {
    if (!eventId || !serverReachable || !staffUserId || preparingOffline) return
    setPreparingOffline(true)
    setError('')
    try {
      const response = await fetch('/api/scanner/offline-snapshot', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      })
      const body = await response.json().catch(() => null) as { success?: boolean; snapshot?: OfflineSnapshot; error?: string } | null
      if (!response.ok || !body?.success || !body.snapshot) {
        throw new Error(body?.error || 'Could not prepare match data for offline scanning.')
      }
      if (body.snapshot.staffUserId !== staffUserId || body.snapshot.event.id !== eventId) {
        throw new Error('Offline match data did not match the signed-in scanner account.')
      }

      if (!('serviceWorker' in navigator)) throw new Error('This browser does not support the offline scanner shell.')
      const registration = await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve, reject) => {
          const timeoutRef = { current: 0 }
          const onControllerChange = () => {
            window.clearTimeout(timeoutRef.current)
            resolve()
          }
          timeoutRef.current = window.setTimeout(() => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
            reject(new Error('Reload the scanner while online to finish offline setup.'))
          }, 10_000)
          navigator.serviceWorker.addEventListener('controllerchange', onControllerChange, { once: true })
        })
      }
      await import('jsqr')
      const worker = registration.active
      if (!worker) throw new Error('The offline scanner shell is not ready yet. Reload while online and try again.')
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel()
        const timeout = window.setTimeout(() => {
          channel.port1.close()
          reject(new Error('The offline scanner shell did not finish caching.'))
        }, 15_000)
        channel.port1.onmessage = (message: MessageEvent<{ success?: boolean; error?: string }>) => {
          window.clearTimeout(timeout)
          channel.port1.close()
          if (message.data?.success) resolve()
          else reject(new Error(message.data?.error || 'Could not cache the offline scanner shell.'))
        }
        worker.postMessage({ type: 'PREPARE_OFFLINE_SHELL' }, [channel.port2])
      })

      const persisted = await requestPersistentStorage()
      setStoragePersisted(persisted)
      await setActiveStaff(staffUserId)
      await saveSnapshot(body.snapshot)
      await loadLocalState(staffUserId)
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : 'Offline preparation failed.')
    } finally {
      setPreparingOffline(false)
    }
  }, [eventId, loadLocalState, preparingOffline, serverReachable, staffUserId])

  useEffect(() => {
    verifyRef.current = submitScan
  }, [submitScan])

  useEffect(() => {
    syncCallbackRef.current = syncPending
  }, [syncPending])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        let ownerId = initialStaffUserId
        if (!ownerId) ownerId = await getActiveStaff() || ''
        if (cancelled) return
        if (ownerId) {
          setStaffUserId(ownerId)
          if (initialStaffUserId) await setActiveStaff(ownerId)
          await loadLocalState(ownerId)
        }
        const persisted = await navigator.storage?.persisted?.()
        if (!cancelled && typeof persisted === 'boolean') setStoragePersisted(persisted)
        if (!cancelled && navigator.onLine) void probeHealth()
      } catch (storageError) {
        if (!cancelled) setError(storageError instanceof Error ? storageError.message : 'Offline storage could not be opened.')
        if (!cancelled && navigator.onLine) void probeHealth()
      }
    })()
    return () => { cancelled = true }
  }, [initialStaffUserId, loadLocalState, probeHealth])

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

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      void probeHealth()
    }
    const onOffline = () => {
      setIsOnline(false)
      setServerReachable(false)
    }
    const onForeground = () => {
      if (document.visibilityState !== 'visible') return
      setIsOnline(navigator.onLine)
      if (navigator.onLine) void probeHealth()
    }
    const healthTimer = window.setInterval(() => {
      if ((pendingCount > 0 || !serverReachable) && document.visibilityState === 'visible' && navigator.onLine) {
        void probeHealth()
      }
    }, 60_000)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('focus', onForeground)
    document.addEventListener('visibilitychange', onForeground)
    return () => {
      window.clearInterval(healthTimer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('focus', onForeground)
      document.removeEventListener('visibilitychange', onForeground)
    }
  }, [pendingCount, probeHealth, serverReachable])

  useEffect(() => {
    if (!serverReachable) return
    const timer = window.setTimeout(() => { void syncPending() }, 0)
    return () => window.clearTimeout(timer)
  }, [serverReachable, staffUserId, syncPending])

  useEffect(() => () => {
    generationRef.current += 1
    if (timerRef.current) clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current)
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
      setError('Camera unavailable. Allow camera access in your browser settings or enter the accreditation ID below.')
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

  const isPending = feedback?.syncStatus === 'pending'
  const isDuplicate = Boolean(feedback && !feedback.success && (
    feedback.syncStatus === 'conflict' || (feedback.code && duplicateCodes.has(feedback.code))
  ))
  const resultTone = feedback?.success ? 'success' : isPending ? 'pending' : isDuplicate ? 'warning' : 'failure'

  return (
    <main className="scanner-shell">
      <header className="scanner-header">
        <div className="brand-lockup">
          <NuscLogo className="brand-logo" />
          <span className="brand-caption">NAGALAND UNITED<br />SPORTS CLUB</span>
        </div>
        <div className="header-actions">
          {installPrompt && (
            <button className="install-button" type="button" onClick={installApp}>Install app</button>
          )}
          <SignOutButton compact staffUserId={staffUserId} />
        </div>
      </header>

      <section className="scanner-intro">
        <div>
          <p className="eyebrow">Matchday operations</p>
          <h1>Accreditation scanner</h1>
          <p className="staff-line"><span className="staff-dot" aria-hidden="true" />
            {staffEmail ? `Signed in as ${staffEmail}` : offlineShell ? 'Offline scanner session' : 'Checking scanner session'}
          </p>
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

      <div className={serverReachable ? 'connection-status is-online' : 'connection-status is-offline'} role="status">
        <span className="connection-light" aria-hidden="true" />
        {serverReachable
          ? `Online - server ready${pendingCount ? ` - ${pendingCount} pending sync` : ''}`
          : localAuthorizationReady
            ? `Offline ready - ${pendingCount} pending server validation`
            : isOnline ? 'Connection uncertain - awaiting scanner server' : 'Offline - prepare a match snapshot first'}
      </div>

      {authorizationInvalid && (
        <div className="error-banner" role="alert">The server rejected this scanner session. Cached data cannot authorize new scans; sign in with an authorized scanner account.</div>
      )}
      {!serverReachable && localAuthorizationReady && (
        <div className="offline-banner" role="status">Scans are saved on this device and remain pending until the server validates them.</div>
      )}
      {!serverReachable && !localAuthorizationReady && !isOnline && (
        <div className="error-banner" role="alert">No current offline match is prepared. Reconnect and prepare the selected match before scanning.</div>
      )}
      {matchesUnavailable && matchOptions.length === 0 && <div className="error-banner" role="alert">Match list unavailable. Reconnect or open a previously prepared offline match.</div>}

      <section className="setup-panel" aria-label="Match and checkpoint setup">
        <label className="field-label" htmlFor="match-select">MATCH</label>
        <select
          id="match-select"
          value={eventId}
          onChange={(event) => { setEventId(event.target.value); setFeedback(null); setError('') }}
          disabled={cameraOpen || busy || (!serverReachable && matchOptions.length === 0)}
        >
          <option value="">{matchOptions.length ? 'Choose a match' : 'No matches available'}</option>
          {matchOptions.map((match) => (
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

        <div className="offline-preparation">
          <button className="button button-secondary" type="button" onClick={prepareOffline}
            disabled={!eventId || !serverReachable || preparingOffline || cameraOpen || busy}>
            {preparingOffline ? 'Preparing offline scanner...' : 'Prepare this match for offline use'}
          </button>
          {usableSnapshot && selectedSnapshot ? (
            <p className="offline-ready-note" role="status">
              Offline ready - {selectedSnapshot.credentials.length} credentials - expires {formatTime(selectedSnapshot.expiresAt)} IST
            </p>
          ) : (
            <p className="muted-note">Preparing requires a verified connection and an authorized scanner account.</p>
          )}
          {storagePersisted === false && (
            <p className="closed-note" role="status">The browser may clear local scanner data when device storage is low. Keep the queue synchronized when possible.</p>
          )}
        </div>

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

      <section className="scan-panel" aria-label="Accreditation ID camera scanner">
        <div className="scan-panel-top">
          <div>
            <p className="eyebrow">ID reader</p>
            <h2>Scan accreditation ID</h2>
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
              <small>Place the accreditation QR inside the frame</small>
            </div>
          )}
          {busy && <div className="camera-busy"><span className="spinner" /> Saving scan on this device</div>}
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
          <p>Each scan is saved on this device first, then checked by the server.</p>
        </div>

        <div className="manual-divider"><span>OR ENTER THE PRINTED ACCREDITATION ID</span></div>
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
            aria-label="QR value or printed accreditation ID"
            disabled={busy}
          />
          <button className="manual-submit" type="submit" disabled={busy || !scannerReady || !manualValue.trim()}>
            {busy ? 'Wait' : 'Verify'}
          </button>
        </form>
        <p className="manual-help">You can enter the printed ID or the 64-character QR value. Offline scans stay pending until checked by the server.</p>
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
              <p className="eyebrow">{feedback.success ? 'SERVER CONFIRMED' : isPending ? 'SAVED - PENDING SERVER CHECK' : isDuplicate ? 'SERVER REPORTED A CONFLICT' : 'SERVER REJECTED SCAN'}</p>
              <h2>
                {feedback.success
                  ? (feedback.action === 'check_out' ? 'Check-out recorded' : 'Check-in recorded')
                  : isPending
                    ? 'Scan saved on this device'
                    : feedback.message || 'Pass not accepted'}
              </h2>
            </div>
          </div>
          {feedback.match_title && <p className="feedback-match">{feedback.match_title}</p>}
          {feedback.candidate && (
            <div className="candidate-row">
              {feedback.candidate.signedPhotoUrl && (
                <Image src={feedback.candidate.signedPhotoUrl} width={56} height={70} alt="" unoptimized />
              )}
              <div>
                <strong>{feedback.candidate.full_name || 'Accreditation holder'}</strong>
                <span>{feedback.candidate.id_number}</span>
                <span>{feedback.candidate.assigned_role}</span>
                {feedback.candidate.category && <span>Category: {feedback.candidate.category}</span>}
                {isPending && <span className="pending-candidate-note">Local match only - attendance is not confirmed</span>}
                {(feedback.candidate.assigned_zone || feedback.candidate.assigned_shift) && (
                  <span>{[feedback.candidate.assigned_zone, feedback.candidate.assigned_shift].filter(Boolean).join(' · ')}</span>
                )}
              </div>
            </div>
          )}
          {feedback.success && feedback.scanned_at && (
            <p className="feedback-time">{formatTime(feedback.scanned_at)} IST · {feedback.checkpoint_type === 'booth' ? 'Booth' : 'Gate'} {feedback.checkpointValue ?? checkpoint}</p>
          )}
          {feedback.first_scanned_at && (
            <p className="feedback-time">Session started {formatTime(feedback.first_scanned_at)} IST at {feedback.first_gate || 'the selected checkpoint'}.</p>
          )}
          {(feedback.code === 'SYSTEM_ERROR' || feedback.code === 'NETWORK_ERROR') && (
            <p className="feedback-caution">No success was confirmed. Check the attendance before retrying.</p>
          )}
        </section>
      )}

      <section className="queue-panel" aria-label="Offline synchronization queue">
        <div className="queue-heading">
          <div>
            <p className="eyebrow">DEVICE QUEUE</p>
            <h2>Attendance sync status</h2>
          </div>
          <button className="button button-quiet button-compact" type="button"
            onClick={() => { if (isOnline) void probeHealth(); void syncPending() }}
            disabled={!isOnline || pendingCount === 0}>
            Retry sync
          </button>
        </div>
        <div className="queue-counts" aria-label="Attendance status totals">
          <span><strong>{pendingCount}</strong> pending</span>
          <span><strong>{confirmedCount}</strong> confirmed</span>
          <span><strong>{rejectedCount}</strong> rejected</span>
          <span><strong>{conflictCount}</strong> conflicts</span>
        </div>
        {localScans.length > 0 && (
          <ul className="queue-list">
            {[...localScans].reverse().slice(0, 8).map((scan) => (
              <li key={scan.operationId} className={`queue-item status-${scan.status}`}>
                <span className="queue-status">{scan.status === 'confirmed' ? 'Synchronized' : scan.status === 'pending' ? 'Pending server check' : scan.status === 'conflict' ? 'Conflict' : 'Rejected'}</span>
                <strong>{scan.payload.localMatch?.idNumber || 'Unmatched credential'}</strong>
                <span>{scan.action === 'check_in' ? 'Check in' : 'Check out'} - {scan.payload.checkpointType === 'gate' ? scan.payload.checkpoint : `Booth ${scan.payload.checkpoint}`}</span>
                <time dateTime={scan.capturedAt}>{formatTime(scan.capturedAt)} IST</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="scanner-footer">
        <span>NUSC · Matchday attendance</span>
        <span>{serverReachable ? 'Attendance confirmed by server' : 'Offline scans are pending until server validation'}</span>
      </footer>
    </main>
  )
}
