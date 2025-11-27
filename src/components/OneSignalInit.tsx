'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function OneSignalInit({ userId }: { userId?: string }) {
  useEffect(() => {
    const runOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
          allowLocalhostAsSecureOrigin: true,
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: true,
                  categories: [],
                  text: {
                    actionMessage: "Nous aimerions vous envoyer des notifications pour les nouveaux messages.",
                    acceptButton: "Autoriser",
                    cancelMessage: "Plus tard"
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 5
                  }
                }
              ]
            }
          }
        });

        if (userId) {
          await OneSignal.login(userId);
        }
        
      } catch (error: any) {
        console.error('OneSignal init error:', error);
        // Suppress the specific "Can only be used on" error to avoid crashing the app flow, 
        // but log it clearly so the user knows to update their dashboard.
        if (error?.message?.includes('Can only be used on')) {
           console.warn('OneSignal Configuration Error: Please add "http://localhost:3000" to your OneSignal App Settings under "Site URL" or "Allowed Origins".');
        }
      }
    };

    runOneSignal();
  }, [userId]);

  return null;
}
