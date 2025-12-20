'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if splash has already been shown this session
    const hasShownSplash = sessionStorage.getItem('splash_shown')

    if (!hasShownSplash) {
      setIsVisible(true)
      sessionStorage.setItem('splash_shown', 'true')
    }
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        >
          <video
            autoPlay
            muted
            playsInline
            onEnded={() => setIsVisible(false)}
            className="w-[100dvw] h-[100dvh] object-contain object-center"
          >
            <source src="/intro.mp4" type="video/mp4" />
          </video>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
