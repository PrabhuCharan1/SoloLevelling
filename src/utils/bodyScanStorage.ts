import { BodyProgressScan } from '../types.ts';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient.ts';

const DB_NAME = 'questlife_body_scans_db';
const DB_VERSION = 1;
const STORE_NAME = 'scans';
const META_KEY = 'questlife_body_scans_meta';

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Calculates human-readable timeline label based on elapsed weeks since baseline
 */
export function calculateScanLabel(
  isBaseline: boolean,
  scanTimestamp: number,
  baselineTimestamp?: number,
  scanNumber: number = 1
): string {
  if (isBaseline || scanNumber === 1) {
    return 'BASELINE';
  }

  if (!baselineTimestamp) {
    return `SCAN #${scanNumber}`;
  }

  const elapsedMs = Math.max(0, scanTimestamp - baselineTimestamp);
  const weeks = Math.round(elapsedMs / (7 * 24 * 60 * 60 * 1000));

  if (weeks <= 0) {
    return `SCAN #${scanNumber}`;
  }

  return `WEEK ${weeks}`;
}

/**
 * Saves or updates a body progress scan into IndexedDB and updates the metadata index
 */
export async function saveBodyScan(scan: BodyProgressScan): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putReq = store.put(scan);

      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });

    // Update metadata in localStorage for instant listing
    updateMetaIndex(scan);
  } catch (err) {
    console.warn('[bodyScanStorage] IndexedDB save failed, falling back to safe local storage:', err);
    fallbackSave(scan);
  }
}

/**
 * Retrieves all body progress scans ordered chronologically (oldest / baseline first)
 */
export async function getAllBodyScans(): Promise<BodyProgressScan[]> {
  try {
    const db = await openDB();
    const scans = await new Promise<BodyProgressScan[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getAllReq = store.getAll();

      getAllReq.onsuccess = () => resolve(getAllReq.result || []);
      getAllReq.onerror = () => reject(getAllReq.error);
    });

    return scans.sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.warn('[bodyScanStorage] IndexedDB read failed, reading from fallback:', err);
    return fallbackGetAll();
  }
}

/**
 * Retrieves a specific scan by ID
 */
export async function getBodyScanById(id: string): Promise<BodyProgressScan | null> {
  try {
    const db = await openDB();
    const scan = await new Promise<BodyProgressScan | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });

    return scan;
  } catch (err) {
    console.warn('[bodyScanStorage] getBodyScanById failed:', err);
    const all = fallbackGetAll();
    return all.find((s) => s.id === id) || null;
  }
}

/**
 * Deletes a scan from storage
 */
export async function deleteBodyScan(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const delReq = store.delete(id);

      delReq.onsuccess = () => resolve();
      delReq.onerror = () => reject(delReq.error);
    });

    // Remove from metadata index
    removeMetaIndex(id);
  } catch (err) {
    console.warn('[bodyScanStorage] deleteBodyScan failed:', err);
    fallbackDelete(id);
  }
}

/**
 * Gets the baseline scan if one exists
 */
export async function getBaselineScan(): Promise<BodyProgressScan | null> {
  const all = await getAllBodyScans();
  return all.find((s) => s.isBaseline) || (all.length > 0 ? all[0] : null);
}

/**
 * Gets the most recent scan
 */
export async function getLatestScan(): Promise<BodyProgressScan | null> {
  const all = await getAllBodyScans();
  return all.length > 0 ? all[all.length - 1] : null;
}

// ─────────────────────────────────────────────────────────────
// Fallback In-Memory / LocalStorage Storage (Safe Resilience)
// ─────────────────────────────────────────────────────────────
const inMemoryFallback: Map<string, BodyProgressScan> = new Map();

function updateMetaIndex(scan: BodyProgressScan) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    const list: Array<{ id: string; timestamp: number; scanNumber: number; isBaseline: boolean; label: string }> = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((item) => item.id !== scan.id);
    filtered.push({
      id: scan.id,
      timestamp: scan.timestamp,
      scanNumber: scan.scanNumber,
      isBaseline: scan.isBaseline,
      label: scan.label,
    });
    window.localStorage.setItem(META_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore quota errors
  }
}

function removeMetaIndex(id: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    const filtered = list.filter((item: any) => item.id !== id);
    window.localStorage.setItem(META_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore
  }
}

function fallbackSave(scan: BodyProgressScan) {
  inMemoryFallback.set(scan.id, scan);
  updateMetaIndex(scan);
}

function fallbackGetAll(): BodyProgressScan[] {
  return Array.from(inMemoryFallback.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function fallbackDelete(id: string) {
  inMemoryFallback.delete(id);
  removeMetaIndex(id);
}

// ─────────────────────────────────────────────────────────────
// Optional Private Cloud Sync (Supabase Private Storage)
// ─────────────────────────────────────────────────────────────
export async function syncBodyScanToCloud(
  userId: string,
  scan: BodyProgressScan
): Promise<{ success: boolean; storagePath?: string }> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured || !userId) {
    return { success: false };
  }

  try {
    // Convert base64 DataURL to Blob for upload
    const response = await fetch(scan.imageDataUrl);
    const blob = await response.blob();
    const filePath = `${userId}/${scan.id}.jpg`;

    // Upload to private 'body-scans' bucket
    const { error: uploadError } = await supabase.storage
      .from('body-scans')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[bodyScanStorage] Cloud storage upload note:', uploadError.message);
      return { success: false };
    }

    return { success: true, storagePath: filePath };
  } catch (err) {
    console.warn('[bodyScanStorage] syncBodyScanToCloud warning:', err);
    return { success: false };
  }
}
