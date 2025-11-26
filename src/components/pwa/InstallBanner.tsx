'use client'

import { useEffect, useState } from 'react'

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function isStandalone() {
      // iOS Safari
      const anyNav = navigator as any
      const iOSStandalone = typeof anyNav.standalone !== 'undefined' && anyNav.standalone
      const displayMode = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
      return iOSStandalone || displayMode
    }

    const onBIP = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      if (!isStandalone()) setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBIP)

    // Hide if already installed
    if (isStandalone()) setVisible(false)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] inset-x-0 px-3 z-[1000]">
      <div className="max-w-3xl mx-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg p-3 flex items-center gap-3">
        <span className="text-sm">Installer l’app pour un accès rapide</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={async () => {
              if (!deferred) return setVisible(false)
              await deferred.prompt()
              await deferred.userChoice
              setDeferred(null)
              setVisible(false)
            }}
            className="px-3 py-1.5 rounded-lg text-sm bg-black text-white dark:bg-white dark:text-black"
          >Installer</button>
          <button
            onClick={() => setVisible(false)}
            className="px-3 py-1.5 rounded-lg text-sm border border-black/10 dark:border-white/10"
          >Plus tard</button>
        </div>
      </div>
    </div>
  )
}

