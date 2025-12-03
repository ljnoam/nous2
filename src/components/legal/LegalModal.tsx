'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import PrivacyContent from './PrivacyContent'
import TermsContent from './TermsContent'
import { motion, AnimatePresence } from 'framer-motion'

type LegalModalProps = {
  isOpen: boolean
  onClose: () => void
  type: 'privacy' | 'terms' | null
}

export default function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !type) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-black/5 dark:border-white/5"
          >
            {/* Header / Close Button */}
            <div className="absolute top-4 left-4 z-10">
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition backdrop-blur-md"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-16 md:p-12">
              {type === 'privacy' ? <PrivacyContent /> : <TermsContent />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
