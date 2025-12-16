'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function OneSignalInit({ userId }: { userId?: string }) {
  useEffect(() => {
    const runOneSignal = async () => {
      // Skip on localhost if domain restriction is active in OneSignal dashboard
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.log('OneSignal: Skipped on localhost to detect env.')
        return
      }

      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
          allowLocalhostAsSecureOrigin: true,
        });

        if (userId) {
          // Check if already logged in as this user to avoid 409s or redundant calls
          const currentId = OneSignal.User.externalId;
          if (currentId === userId) {
            // Already logged in as this user
            return;
          }

          try {
             await OneSignal.login(userId);
          } catch (e: any) {
             console.warn('OneSignal login error:', e);
             // If 409, it usually means conflict. We might need to logout first?
             // But usually login handles switching. 
             // If we are stuck, we can try logging out and logging in again.
             if (e?.statusCode === 409 || e?.status === 409) {
                 console.log('Attempting to resolve OneSignal conflict via logout...');
                 await OneSignal.logout();
                 await OneSignal.login(userId);
             }
          }
        }
        
      } catch (error: any) {
        console.error('OneSignal init error:', error);
        if (error?.message?.includes('Can only be used on')) {
           console.warn('OneSignal Configuration Error: Please add "http://localhost:3000" to your OneSignal App Settings under "Site URL" or "Allowed Origins".');
        }
      }
    };

    const t = setTimeout(() => {
      runOneSignal();
    }, 3000); // Delay by 3 seconds to unblock main thread

    return () => clearTimeout(t);
  }, [userId]);

  return null;
}
