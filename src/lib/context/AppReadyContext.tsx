'use client'

import { createContext, ReactNode, useCallback, useContext, useState } from 'react'

interface AppReadyContextType {
  isAppReady: boolean
  setAppReady: () => void
}

const AppReadyContext = createContext<AppReadyContextType>({
  isAppReady: false,
  setAppReady: () => {},
})

export function AppReadyProvider({ children }: { children: ReactNode }) {
  const [isAppReady, setIsAppReady] = useState(false)

  const setAppReady = useCallback(() => {
    setIsAppReady(true)
  }, [])

  return (
    <AppReadyContext.Provider value={{ isAppReady, setAppReady }}>
      {children}
    </AppReadyContext.Provider>
  )
}

export function useAppReady() {
  return useContext(AppReadyContext)
}
