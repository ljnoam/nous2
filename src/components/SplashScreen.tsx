'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if splash has already been shown this session
    const hasShownSplash = sessionStorage.getItem('splash_shown')

    if (!hasShownSplash) {
      setIsVisible(true)
      sessionStorage.setItem('splash_shown', 'true')

      // Hide splash after animation completes (3s total)
      setTimeout(() => {
        setIsVisible(false)
      }, 3000)
    }
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 dark:from-neutral-900 dark:via-pink-950 dark:to-rose-950"
        >
          {/* Container with fixed size for perfect centering */}
          <div className="relative w-[140px] h-[140px]">
            {/* Heart Image */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              transition={{
                duration: 0.8,
                ease: 'easeOut'
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {/* Heartbeat animation */}
              <motion.div
                animate={{
                  scale: [1, 1.08, 1, 1.08, 1],
                }}
                transition={{
                  delay: 1.2,
                  duration: 1.2,
                  times: [0, 0.2, 0.4, 0.6, 0.8],
                  ease: 'easeInOut'
                }}
              >
                <Image
                  src="/hearth.png"
                  alt="Heart Logo"
                  width={140}
                  height={140}
                  priority
                  className="drop-shadow-2xl"
                />
              </motion.div>
            </motion.div>

            {/* Text Image - perfectly centered in the heart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.8,
                duration: 1.0,
                ease: [0.34, 1.56, 0.64, 1]
              }}
              className="absolute inset-0 flex items-start justify-center pt-[25px]"
            >
              {/* Gentle pulse with the heartbeat */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1, 1.05, 1],
                }}
                transition={{
                  delay: 1.2,
                  duration: 1.2,
                  times: [0, 0.2, 0.4, 0.6, 0.8],
                  ease: 'easeInOut'
                }}
              >
                <Image
                  src="/text.png"
                  alt="Nous Logo Text"
                  width={70}
                  height={21}
                  priority
                  className="drop-shadow-lg"
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
