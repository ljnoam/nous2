'use client';

type EnableOptions = {
  /**
   * Force une resouscription push (utilise apres pushsubscriptionchange).
   */
  forceResubscribe?: boolean;
};

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export async function enablePush(options: EnableOptions = {}): Promise<boolean> {
  console.log('[push] Starting enablePush...');
  console.log('[push] VAPID key present:', !!PUBLIC_VAPID_KEY, 'Length:', PUBLIC_VAPID_KEY?.length);
  
  const { forceResubscribe = false } = options;
  try {
    if (typeof window === 'undefined') {
      console.warn('[push] Window undefined');
      return false;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.warn('[push] Service worker or PushManager not available');
      return false;
    }

    if (!PUBLIC_VAPID_KEY) {
      console.error('[push] VAPID public key is missing!');
      return false;
    }

    if (Notification.permission === 'denied') {
      console.warn('[push] Permission denied');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.log('[push] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('[push] Permission result:', permission);
      if (permission !== 'granted') {
        console.warn('[push] Permission not granted');
        return false;
      }
    }

    console.log('[push] Waiting for SW ready...');
    
    // Timeout wrapper for SW ready
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<ServiceWorkerRegistration | null>((_, reject) => 
      setTimeout(() => reject(new Error('SW ready timeout')), 5000)
    );

    let registration: ServiceWorkerRegistration;
    try {
      // Try to get existing registration first
      registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;
    } catch (e) {
      console.warn('[push] SW ready timed out or failed. Attempting manual registration...');
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[push] Manual registration successful:', registration);
        // Wait for it to be active
        await new Promise(resolve => setTimeout(resolve, 100));
        registration = await navigator.serviceWorker.ready;
      } catch (regErr) {
        console.error('[push] Manual registration failed:', regErr);
        return false;
      }
    }
    
    console.log('[push] SW ready:', registration);
    
    let subscription = await registration.pushManager.getSubscription();
    console.log('[push] Existing subscription:', subscription);

    if (subscription && forceResubscribe) {
      console.log('[push] Force resubscribe: unsubscribing...');
      try { await subscription.unsubscribe(); } catch (e) { console.error('[push] Unsubscribe error:', e); }
      subscription = null;
    }

    if (!subscription) {
      console.log('[push] Subscribing new...');
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        });
        console.log('[push] New subscription created:', subscription);
      } catch (subErr) {
        console.error('[push] Subscribe failed:', subErr);
        return false;
      }
    }

    console.log('[push] Syncing with server...');
    const ok = await syncSubscriptionWithServer(subscription);
    console.log('[push] enablePush result:', ok);
    return ok;
  } catch (err: any) {
    console.error('[push] enablePush CRITICAL error:', err);
    if (err instanceof DOMException) {
      console.error('[push] DOMException details:', {
        name: err.name,
        message: err.message,
        code: err.code,
      });
    }
    return false;
  }
}

export async function disablePush(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('[push] Aucun abonnement actif');
      return true;
    }

    const resp = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!resp.ok) {
      console.warn('[push] Desinscription serveur echouee', await resp.text());
      return false;
    }

    try { await subscription.unsubscribe(); } catch {}
    const confirm = await registration.pushManager.getSubscription();
    const ok = !confirm;
    console.log('[push] disablePush ->', ok);
    return ok;
  } catch (err) {
    console.error('[push] disablePush error', err);
    return false;
  }
}

async function syncSubscriptionWithServer(subscription: PushSubscription | null): Promise<boolean> {
  if (!subscription) return false;
  const keyP256dh = subscription.getKey('p256dh');
  const keyAuth = subscription.getKey('auth');
  if (!keyP256dh || !keyAuth) {
    console.warn('[push] Subscription invalide (missing keys)');
    return false;
  }

  const payload = {
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64(keyP256dh),
    auth: arrayBufferToBase64(keyAuth),
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.warn('[push] Synchronisation serveur echouee', await res.text());
    return false;
  }

  return true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
