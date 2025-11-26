// src/app/sw-client.ts
// Enregistre le service worker PWA (pour push + offline)

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return; // sécurité SSR

  if ('serviceWorker' in navigator) {
    try {
      const swUrl = '/sw.js?v=20251023';
      const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
      console.log('[SW] Service worker enregistré ✅', reg);

      // Si nouveau SW dispo → l’installer silencieusement
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Nouvelle version dispo, sera activée au prochain chargement.');
            }
          });
        }
      });
    } catch (err) {
      console.error('[SW] Erreur d’enregistrement :', err);
    }
  } else {
    console.warn('[SW] Non supporté sur ce navigateur.');
  }
}

// Auto-enregistrement au chargement du site
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}
