'use client'

import { Delete, ScanFace } from 'lucide-react'
import { useEffect, useState } from 'react'

type PinPadProps = {
  length?: number
  onComplete: (pin: string) => void
  onBiometric?: () => void
  error?: boolean
  label?: string
  biometricType?: 'faceId' | 'touchId' | null
}

export default function PinPad({
  length = 4,
  onComplete,
  onBiometric,
  error,
  label = 'Entrez le code',
  biometricType,
}: PinPadProps) {
  const [pin, setPin] = useState('')
  const [shaking, setShaking] = useState(false)

  // Trigger shake on error prop change
  useEffect(() => {
    if (error) {
      setShaking(true)
      const t = setTimeout(() => {
        setShaking(false)
        setPin('')
      }, 500)
      return () => clearTimeout(t)
    }
  }, [error])

  // Call onComplete when full
  useEffect(() => {
    if (pin.length === length) {
      onComplete(pin)
    }
  }, [pin, length, onComplete])

  const handlePress = (digit: string) => {
    if (pin.length < length) {
      setPin((p) => p + digit)
    }
  }

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1))
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8 text-center space-y-6">
        <h3 className="text-xl font-medium text-neutral-900 dark:text-white">{label}</h3>
        
        {/* Dots */}
        <div className={`flex justify-center gap-6 ${shaking ? 'animate-shake' : ''}`}>
          {Array.from({ length }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${
                i < pin.length
                  ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white'
                  : 'bg-transparent border-neutral-400 dark:border-neutral-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Key key={num} onClick={() => handlePress(num.toString())}>
            {num}
          </Key>
        ))}
        
        <div className="flex items-center justify-center">
            {biometricType && onBiometric && (
                <button onClick={onBiometric} className="text-pink-500 p-4 active:scale-90 transition">
                    <ScanFace className="w-8 h-8" />
                </button>
            )}
        </div>
        
        <Key onClick={() => handlePress('0')}>0</Key>
        
        <div className="flex items-center justify-center">
          {pin.length > 0 && (
             <button 
                onClick={handleDelete}
                className="text-neutral-900 dark:text-white p-4 active:scale-90 transition hover:text-red-500"
             >
                <span className="text-sm font-medium">Effacer</span>
             </button>
           )}
        </div>
      </div>
    </div>
  )
}

function Key({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 active:bg-neutral-300 dark:active:bg-white/30 text-2xl font-medium text-neutral-900 dark:text-white transition-all flex items-center justify-center mx-auto outline-none focus:ring-0 select-none touch-manipulation"
    >
      {children}
    </button>
  )
}
