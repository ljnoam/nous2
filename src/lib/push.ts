'use client';

type EnableOptions = {
  /**
   * Force une resouscription push (utilise apres pushsubscriptionchange).
   */
  forceResubscribe?: boolean;
};

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export async function enablePush(options: EnableOptions = {}): Promise<boolean> {
  console.log('[push] VAPID key length:', PUBLIC_VAPID_KEY?.length, PUBLIC_VAPID_KEY)
  const { forceResubscribe = false } = options;
  try {
    if (typeof window === 'undefined') return false;

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.warn('[push] Service worker ou PushManager indisponible');
      return false;
    }

    if (!PUBLIC_VAPID_KEY) {
      console.warn('[push] VAPID public key manquante');
      return false;
    }

    if (Notification.permission === 'denied') {
      console.warn('[push] Permission notifications deja refusee');
      return false;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[push] Permission notifications refusee');
        return false;
      }
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (subscription && forceResubscribe) {
      try { await subscription.unsubscribe(); } catch {}
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });
    }

    const ok = await syncSubscriptionWithServer(subscription);
    console.log('[push] enablePush ->', ok);
    return ok;
  } catch (err: any) {
    if (err instanceof DOMException) {
      console.error('[push] enablePush DOMException', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
    } else {
      console.error('[push] enablePush error', err);
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
