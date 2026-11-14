import {
  normalizeScannerCredential,
  sha256Hex,
  type OfflineSnapshot,
  type ScanPayload,
  type ScanStatus,
  type ServerScanResult,
} from './offline-model'

const databaseName = 'nusc-scanner-offline'
const databaseVersion = 2
const queueStore = 'scanQueue'
const snapshotStore = 'snapshots'
const keyStore = 'encryptionKeys'
const settingsStore = 'settings'

type EncryptedValue = { iv: string; ciphertext: string }

type StoredScan = {
  operationId: string
  staffUserId: string
  eventId: string
  action: ScanPayload['action']
  checkpointType: ScanPayload['checkpointType']
  capturedAt: string
  status: ScanStatus
  attempts: number
  retryAt: number
  unresolvedKey?: string
  scan: EncryptedValue
  result?: EncryptedValue
  updatedAt: string
}

export type LocalScan = StoredScan & {
  payload: ScanPayload
  serverResult?: ServerScanResult
}

type StoredSnapshot = {
  key: string
  staffUserId: string
  eventId: string
  expiresAt: string
  snapshot: EncryptedValue
}

type StoredKey = { staffUserId: string; key: CryptoKey }
type Setting = { key: string; value: string | null }

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable in this browser.'))
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      const upgrade = request.transaction
      if (!upgrade) throw new Error('Could not upgrade offline storage.')
      const queue = database.objectStoreNames.contains(queueStore)
        ? upgrade.objectStore(queueStore)
        : database.createObjectStore(queueStore, { keyPath: 'operationId' })
      if (!queue.indexNames.contains('staffUserId')) queue.createIndex('staffUserId', 'staffUserId', { unique: false })
      if (!queue.indexNames.contains('status')) queue.createIndex('status', 'status', { unique: false })
      if (!queue.indexNames.contains('unresolvedKey')) queue.createIndex('unresolvedKey', 'unresolvedKey', { unique: false })
      if (!queue.indexNames.contains('staffStatus')) queue.createIndex('staffStatus', ['staffUserId', 'status'], { unique: false })
      const snapshots = database.objectStoreNames.contains(snapshotStore)
        ? upgrade.objectStore(snapshotStore)
        : database.createObjectStore(snapshotStore, { keyPath: 'key' })
      if (!snapshots.indexNames.contains('staffUserId')) snapshots.createIndex('staffUserId', 'staffUserId', { unique: false })
      if (!database.objectStoreNames.contains(keyStore)) database.createObjectStore(keyStore, { keyPath: 'staffUserId' })
      if (!database.objectStoreNames.contains(settingsStore)) database.createObjectStore(settingsStore, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open offline storage.'))
    request.onblocked = () => reject(new Error('Offline storage is busy in another scanner tab. Close the other tab and retry.'))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('Offline storage operation failed.'))
    transaction.onabort = () => reject(transaction.error || new Error('Offline storage operation was interrupted.'))
  })
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Offline storage request failed.'))
  })
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

function fromBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function keyForStaff(staffUserId: string) {
  const database = await openDatabase()
  try {
    const read = database.transaction(keyStore, 'readonly')
    const existing = await requestResult(read.objectStore(keyStore).get(staffUserId)) as StoredKey | undefined
    await transactionDone(read)
    if (existing?.key) return existing.key
  } finally {
    database.close()
  }

  const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const databaseForAdd = await openDatabase()
  try {
    const transaction = databaseForAdd.transaction(keyStore, 'readwrite')
    const store = transaction.objectStore(keyStore)
    const existingRequest = store.get(staffUserId)
    let selectedKey: CryptoKey = generated
    existingRequest.onsuccess = () => {
      if (existingRequest.result) selectedKey = (existingRequest.result as StoredKey).key
      else store.add({ staffUserId, key: generated } satisfies StoredKey)
    }
    await transactionDone(transaction)
    return selectedKey
  } finally {
    databaseForAdd.close()
  }
}

async function encryptJson(staffUserId: string, value: unknown): Promise<EncryptedValue> {
  const key = await keyForStaff(staffUserId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) }
}

async function decryptJson<T>(staffUserId: string, value: EncryptedValue): Promise<T> {
  const key = await keyForStaff(staffUserId)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(value.iv) },
    key,
    fromBase64(value.ciphertext),
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

export async function setActiveStaff(staffUserId: string) {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(settingsStore, 'readwrite')
    transaction.objectStore(settingsStore).put({ key: 'activeStaffUserId', value: staffUserId } satisfies Setting)
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

export async function getActiveStaff() {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(settingsStore, 'readonly')
    const setting = await requestResult(transaction.objectStore(settingsStore).get('activeStaffUserId')) as Setting | undefined
    await transactionDone(transaction)
    return setting?.value ?? null
  } finally {
    database.close()
  }
}

export async function clearActiveStaff(staffUserId: string) {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(settingsStore, 'readwrite')
    const store = transaction.objectStore(settingsStore)
    const request = store.get('activeStaffUserId')
    request.onsuccess = () => {
      const setting = request.result as Setting | undefined
      if (setting?.value === staffUserId) store.put({ key: 'activeStaffUserId', value: null } satisfies Setting)
    }
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

export async function saveSnapshot(snapshot: OfflineSnapshot) {
  const stored: StoredSnapshot = {
    key: `${snapshot.staffUserId}:${snapshot.event.id}`,
    staffUserId: snapshot.staffUserId,
    eventId: snapshot.event.id,
    expiresAt: snapshot.expiresAt,
    snapshot: await encryptJson(snapshot.staffUserId, snapshot),
  }
  const database = await openDatabase()
  try {
    const transaction = database.transaction(snapshotStore, 'readwrite')
    transaction.objectStore(snapshotStore).put(stored)
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

export async function loadSnapshots(staffUserId: string): Promise<OfflineSnapshot[]> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(snapshotStore, 'readonly')
    const rows = await requestResult(transaction.objectStore(snapshotStore).index('staffUserId').getAll(staffUserId)) as StoredSnapshot[]
    await transactionDone(transaction)
    const now = Date.now()
    const expired = rows.filter((row) => Date.parse(row.expiresAt) <= now || !Number.isFinite(Date.parse(row.expiresAt)))
    if (expired.length) {
      const cleanup = database.transaction(snapshotStore, 'readwrite')
      const store = cleanup.objectStore(snapshotStore)
      for (const row of expired) store.delete(row.key)
      await transactionDone(cleanup)
    }
    const snapshots = await Promise.all(rows
      .filter((row) => !expired.includes(row))
      .map((row) => decryptJson<OfflineSnapshot>(staffUserId, row.snapshot)))
    return snapshots.sort((left, right) => right.issuedAt.localeCompare(left.issuedAt))
  } finally {
    database.close()
  }
}

export async function enqueueScan(staffUserId: string, payload: ScanPayload): Promise<{ created: boolean; scan: LocalScan }> {
  const operationId = crypto.randomUUID()
  const dedupeSource = [
    staffUserId,
    payload.eventId,
    payload.action,
    payload.checkpointType,
    payload.checkpoint.toLowerCase(),
    normalizeScannerCredential(payload.qrValue),
  ].join('\n')
  const unresolvedKey = await sha256Hex(dedupeSource)
  const stored: StoredScan = {
    operationId,
    staffUserId,
    eventId: payload.eventId,
    action: payload.action,
    checkpointType: payload.checkpointType,
    capturedAt: payload.capturedAt,
    status: 'pending',
    attempts: 0,
    retryAt: 0,
    unresolvedKey,
    scan: await encryptJson(staffUserId, payload),
    updatedAt: new Date().toISOString(),
  }
  const database = await openDatabase()
  let existing: StoredScan | undefined
  try {
    const transaction = database.transaction(queueStore, 'readwrite')
    const store = transaction.objectStore(queueStore)
    const lookup = store.index('unresolvedKey').get(unresolvedKey)
    lookup.onsuccess = () => {
      if (lookup.result) existing = lookup.result as StoredScan
      else store.add(stored)
    }
    await transactionDone(transaction)
  } finally {
    database.close()
  }
  const selected = existing ?? stored
  return {
    created: !existing,
    scan: {
      ...selected,
      payload: await decryptJson<ScanPayload>(staffUserId, selected.scan),
      ...(selected.result ? { serverResult: await decryptJson<ServerScanResult>(staffUserId, selected.result) } : {}),
    },
  }
}

export async function listScans(staffUserId: string): Promise<LocalScan[]> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(queueStore, 'readonly')
    const rows = await requestResult(transaction.objectStore(queueStore).index('staffUserId').getAll(staffUserId)) as StoredScan[]
    await transactionDone(transaction)
    return Promise.all(rows
      .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
      .map(async (row) => ({
        ...row,
        payload: await decryptJson<ScanPayload>(staffUserId, row.scan),
        ...(row.result ? { serverResult: await decryptJson<ServerScanResult>(staffUserId, row.result) } : {}),
      })))
  } finally {
    database.close()
  }
}

export async function listPendingScans(staffUserId: string, limit = 10): Promise<LocalScan[]> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(queueStore, 'readonly')
    const rows = await requestResult(
      transaction.objectStore(queueStore).index('staffStatus').getAll([staffUserId, 'pending']),
    ) as StoredScan[]
    await transactionDone(transaction)
    return Promise.all(rows
      .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
      .slice(0, Math.max(1, limit))
      .map(async (row) => ({
        ...row,
        payload: await decryptJson<ScanPayload>(staffUserId, row.scan),
        ...(row.result ? { serverResult: await decryptJson<ServerScanResult>(staffUserId, row.result) } : {}),
      })))
  } finally {
    database.close()
  }
}

export async function updateScan(
  staffUserId: string,
  operationId: string,
  update: { status?: ScanStatus; attempts?: number; retryAt?: number; serverResult?: ServerScanResult },
) {
  const encryptedResult = update.serverResult
    ? await encryptJson(staffUserId, update.serverResult)
    : undefined
  const database = await openDatabase()
  try {
    const transaction = database.transaction(queueStore, 'readwrite')
    const store = transaction.objectStore(queueStore)
    const request = store.get(operationId)
    request.onsuccess = () => {
      const row = request.result as StoredScan | undefined
      if (!row || row.staffUserId !== staffUserId) return
      if (update.status) row.status = update.status
      if (typeof update.attempts === 'number') row.attempts = update.attempts
      if (typeof update.retryAt === 'number') row.retryAt = update.retryAt
      if (encryptedResult) row.result = encryptedResult
      if (row.status !== 'pending') delete row.unresolvedKey
      row.updatedAt = new Date().toISOString()
      store.put(row)
    }
    await transactionDone(transaction)
  } finally {
    database.close()
  }
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}
