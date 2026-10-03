import { TaskVerificationRecord } from '../types.ts';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient.ts';

const STORAGE_PREFIX = 'questlife_verifications_';
const DB_NAME = 'questlife_task_verifications_db';
const STORE_NAME = 'task_photos';
const DB_VERSION = 1;

/**
 * Initializes or gets the IndexedDB database for task photos.
 */
function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores photo in IndexedDB.
 */
export async function saveTaskPhotoBlob(id: string, photoDataUrl: string): Promise<void> {
  try {
    const db = await openPhotoDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, photoDataUrl, timestamp: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[TaskVerification] Failed to save photo to IndexedDB:', err);
  }
}

/**
 * Retrieves photo from IndexedDB.
 */
export async function getTaskPhotoBlob(id: string): Promise<string | null> {
  try {
    const db = await openPhotoDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve(req.result ? req.result.photoDataUrl : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Loads all verification records for a specific date from localStorage.
 */
export function loadTaskVerificationsForDate(dateKey: string): Record<string, TaskVerificationRecord> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${dateKey}`);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[TaskVerification] Failed to load from localStorage:', err);
    return {};
  }
}

/**
 * Saves all verification records for a specific date to localStorage.
 */
export function saveTaskVerificationsForDate(
  dateKey: string,
  records: Record<string, TaskVerificationRecord>
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${dateKey}`, JSON.stringify(records));
  } catch (err) {
    console.warn('[TaskVerification] Failed to save to localStorage:', err);
  }
}

/**
 * Saves a single task verification record and syncs with Supabase if configured.
 */
export async function recordTaskVerification(record: TaskVerificationRecord): Promise<void> {
  // 1. Save photo separately if present to avoid overflowing localStorage
  if (record.capturedPhotoUrl) {
    await saveTaskPhotoBlob(record.id, record.capturedPhotoUrl);
  }

  // 2. Save metadata in localStorage without large image strings
  const recordForStorage: TaskVerificationRecord = {
    ...record,
    // Keep thumbnail small or strip large dataUrl from localStorage; retrieve from IndexedDB when viewing
    capturedPhotoUrl: undefined,
  };

  const currentRecords = loadTaskVerificationsForDate(record.date);
  currentRecords[record.taskId] = recordForStorage;
  saveTaskVerificationsForDate(record.date, currentRecords);

  // 3. Sync to Supabase if configured
  const supabase = getSupabase();
  if (supabase && isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('task_verifications').upsert(
        {
          id: record.id,
          task_id: record.taskId,
          user_id: record.userId,
          date_key: record.date,
          completion_method: record.completionMethod,
          completed_at: record.completedAt,
          capture_timestamp: record.captureTimestamp ?? null,
          verification_status: record.verificationStatus,
          xp_awarded: record.xpAwarded,
          target_time_str: record.targetTimeStr ?? null,
          allowed_window_str: record.allowedWindowStr ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        console.warn('[TaskVerification] Supabase sync notice:', error.message);
      }
    } catch (syncErr) {
      console.warn('[TaskVerification] Background sync notice:', syncErr);
    }
  }
}

/**
 * Removes a task verification record (e.g. when unchecking/resetting a task).
 */
export async function removeTaskVerification(dateKey: string, taskId: string): Promise<void> {
  const currentRecords = loadTaskVerificationsForDate(dateKey);
  const existing = currentRecords[taskId];
  if (existing) {
    delete currentRecords[taskId];
    saveTaskVerificationsForDate(dateKey, currentRecords);

    const supabase = getSupabase();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from('task_verifications')
          .delete()
          .eq('date_key', dateKey)
          .eq('task_id', taskId);
      } catch {
        // silent fail in offline mode
      }
    }
  }
}
