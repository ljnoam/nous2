// Lightweight IndexedDB outbox for offline POSTs
// Items are flushed on 'online' or when SW requests a sync (message).

type OutboxItem = {
  id: string;
  type: 'love_note' | 'bucket_item' | 'event';
  payload: Record<string, any>;
  createdAt: number;
};

const DB_NAME = 'nous2-outbox';
const STORE = 'outbox';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOutbox(type: OutboxItem['type'], payload: OutboxItem['payload']) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const item: OutboxItem = { id, type, payload, createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const req = tx.objectStore(STORE).add(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  tx.commit?.();
  db.close();
  console.log('[outbox] queued', item);

  // Ask SW to schedule a background sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('outbox-sync');
    } catch {}
  }
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const arr: OutboxItem[] = await new Promise((resolve, reject) => {
    const out: OutboxItem[] = [];
    const req = tx.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const cur = req.result as IDBCursorWithValue | null;
      if (cur) { out.push(cur.value as OutboxItem); cur.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return arr.sort((a, b) => a.createdAt - b.createdAt);
}

async function removeOutbox(id: string) {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  await new Promise<void>((resolve, reject) => {
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  tx.commit?.();
  db.close();
}

// Flush queued items using Supabase client
export async function flushOutbox() {
  if (!navigator.onLine) return;
  const { supabase } = await import('@/lib/supabase/client');
  const items = await listOutbox();
  for (const item of items) {
    try {
      if (item.type === 'love_note') {
        const { error } = await supabase.from('love_notes').insert(item.payload);
        if (error) throw error;
      } else if (item.type === 'bucket_item') {
        const { error } = await supabase.from('bucket_items').insert(item.payload);
        if (error) throw error;
      } else if (item.type === 'event') {
        const { error } = await supabase.from('couple_events').insert(item.payload);
        if (error) throw error;
      }
      await removeOutbox(item.id);
      console.log('[outbox] flushed', item.id);
    } catch (e) {
      console.warn('[outbox] flush failed; will retry later', item.id, e);
      // Stop on first failure to preserve order
      break;
    }
  }
}

