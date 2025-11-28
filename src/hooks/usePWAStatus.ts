import { useState, useEffect } from 'react';

export function usePWAStatus() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    // Modern browsers support addEventListener on MediaQueryList, but for safety we can check
    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', checkStandalone);
    } else {
        // Fallback for older browsers
        mediaQuery.addListener(checkStandalone);
    }

    return () => {
        if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', checkStandalone);
        } else {
            mediaQuery.removeListener(checkStandalone);
        }
    };
  }, []);

  return { isStandalone };
}
