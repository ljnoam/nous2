'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import PinPad from './PinPad'

type SecurityGateProps = {
  isOpen: boolean
  onClose: () => void
  onUnlock: () => void
  coupleId: string
}

export default function SecurityGate({ isOpen, onClose, onUnlock, coupleId }: SecurityGateProps) {
  const [mode, setMode] = useState<'loading' | 'create' | 'enter'>('loading')
  const [error, setError] = useState(false)
  const [setupStep, setSetupStep] = useState<'first' | 'confirm'>('first')
  const [firstPin, setFirstPin] = useState('')

  useEffect(() => {
    if (isOpen) {
      checkPinStatus()
    } else {
        // Reset state on close
        setMode('loading')
        setSetupStep('first')
        setFirstPin('')
        setError(false)
    }
  }, [isOpen])

  async function checkPinStatus() {
    setMode('loading')
    const { data, error } = await supabase
      .from('couples')
      .select('secret_pin')
      .eq('id', coupleId)
      .single()
    
    if (data && data.secret_pin) {
        setMode('enter')
    } else {
        setMode('create')
    }
  }

  async function handleEnter(pin: string) {
    // Verify PIN against server (or cached if acceptable/safe enough for this app level)
    // Ideally we verify server side, but here we'll fetch and compare for simplicity
    // OR: create a dedicated RPC 'verify_pin' ideally, but raw select is okay if RLS allows reading own couple
    // Assuming RLS allows reading own couple row.
    const { data } = await supabase.from('couples').select('secret_pin').eq('id', coupleId).single()
    
    if (data?.secret_pin === pin) {
        onUnlock()
    } else {
        setError(true)
        setTimeout(() => setError(false), 500)
    }
  }

  async function handleCreate(pin: string) {
    if (setupStep === 'first') {
        setFirstPin(pin)
        setSetupStep('confirm')
    } else {
        if (pin === firstPin) {
            // Save
            const { error: err } = await supabase
                .from('couples')
                .update({ secret_pin: pin })
                .eq('id', coupleId)
            
            if (!err) {
                onUnlock()
            } else {
                alert('Erreur: ' + err.message)
            }
        } else {
            setError(true)
            setTimeout(() => {
                setError(false)
                setSetupStep('first')
                setFirstPin('')
            }, 500)
        }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="border-none bg-white/95 dark:bg-black/95 backdrop-blur-3xl shadow-2xl p-0 max-w-sm sm:rounded-3xl h-full max-h-screen sm:max-h-[600px] flex flex-col justify-center">
            <DialogTitle className="sr-only">Sécurité</DialogTitle>
            {mode === 'loading' && <div className="text-center">Chargement...</div>}
            
            {mode === 'enter' && (
                <PinPad 
                    label="Code secret"
                    onComplete={handleEnter}
                    error={error}
                    // biometricType="faceId" // To implement later with WebAuthn
                />
            )}

            {mode === 'create' && (
                <PinPad 
                    label={setupStep === 'first' ? "Choisi un code secret" : "Confirme le code"}
                    onComplete={handleCreate}
                    error={error}
                />
            )}
        </DialogContent>
    </Dialog>
  )
}
