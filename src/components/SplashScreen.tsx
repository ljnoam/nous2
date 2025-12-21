'use client'

import { useAppReady } from '@/lib/context/AppReadyContext'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldDismiss, setShouldDismiss] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isAppReady } = useAppReady()

  useEffect(() => {
    const hasShownSplash = sessionStorage.getItem('splash_shown')
    if (!hasShownSplash) {
      setIsVisible(true)
      sessionStorage.setItem('splash_shown', 'true')
    }
  }, [])

  // Start dismissing after 1.5s minimum
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setShouldDismiss(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  // Dismiss when ready
  useEffect(() => {
    if (shouldDismiss) {
      if (isAppReady) {
        setIsVisible(false)
      } else {
        const forceTimer = setTimeout(() => setIsVisible(false), 1000)
        const checkReady = setInterval(() => {
          if (isAppReady) {
            setIsVisible(false)
            clearInterval(checkReady)
            clearTimeout(forceTimer)
          }
        }, 50)
        return () => { clearInterval(checkReady); clearTimeout(forceTimer) }
      }
    }
  }, [shouldDismiss, isAppReady])

  // iOS autoplay fix
  useEffect(() => {
    if (isVisible && videoRef.current) {
      videoRef.current.play().catch(() => setShouldDismiss(true))
    }
  }, [isVisible])

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.05,
            filter: 'blur(10px)'
          }}
          transition={{
            duration: 0.4,
            ease: [0.4, 0, 0.2, 1] // Apple-like cubic bezier
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden"
        >
          {/* Subtle gradient overlay for depth */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black/50 pointer-events-none"
          />

          {/* TWO Title with elegant entrance */}
          <motion.h1
            initial={{ opacity: 0, y: -30, letterSpacing: '0.5em' }}
            animate={{
              opacity: 1,
              y: 0,
              letterSpacing: '0.3em',
            }}
            transition={{
              duration: 0.8,
              delay: 0.1,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="absolute top-[16%] text-4xl font-extralight text-white/90"
            style={{
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              textShadow: '0 0 40px rgba(255,255,255,0.1)'
            }}
          >
            TWO
          </motion.h1>

          {/* Video with smooth scale entrance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="relative flex items-center justify-center"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              preload="auto"
              className="max-w-[80%] max-h-[60%] object-contain"
              webkit-playsinline="true"
            >
              <source src="/intro.mp4" type="video/mp4" />
            </video>
          </motion.div>

          {/* Elegant loading dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="absolute bottom-[12%] flex gap-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/50"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
