import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect, useState } from 'react'

// Define types locally or import (assuming Expense is needed)
// Using 'any' for now for non-critical types if imports are tricky or copying from useAppStore
// Ideally we import from ../types
import { Expense } from '../types' 

interface UserState {
  // --- USER & COUPLE ---
  user: { id: string; email?: string; user_metadata: any } | null;
  couple: { id: string; members_count: number } | null;
  firstName: string | null;
  
  setUser: (user: any) => void;
  setCouple: (couple: any) => void;
  setFirstName: (name: string) => void;

  // --- EXPENSES ---
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;
  
  // --- MOOD ---
  todayMoods: { my: string | null; partner: string | null; date: string };
  setTodayMoods: (moods: { my: string | null; partner: string | null; date: string }) => void;

  // --- PLAYROOM ---
  viewedDebateIds: string[];
  currentDebateTopicId: string | null;
  currentDebateCategory: string | null;
  
  markDebateViewed: (id: string) => void;
  setCurrentDebateState: (topicId: string | null, category: string | null) => void;
  resetDebateHistory: () => void;
}

const useStoreBase = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      couple: null,
      firstName: null,
      setUser: (user) => set({ user }),
      setCouple: (couple) => set({ couple }),
      setFirstName: (name) => set({ firstName: name }),

      expenses: [],
      setExpenses: (expenses) => set({ expenses }),
      addExpense: (expense) => set((state) => ({ expenses: [expense, ...state.expenses] })),
      updateExpense: (expense) => set((state) => ({
        expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)),
      })),
      removeExpense: (id) => set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
      })),

      todayMoods: { my: null, partner: null, date: '' },
      setTodayMoods: (moods) => set({ todayMoods: moods }),

      viewedDebateIds: [],
      currentDebateTopicId: null,
      currentDebateCategory: null,
      markDebateViewed: (id) => set((state) => {
        if (state.viewedDebateIds.includes(id)) return {};
        return { viewedDebateIds: [...state.viewedDebateIds, id] };
      }),
      setCurrentDebateState: (topicId, category) => set({ 
        currentDebateTopicId: topicId, 
        currentDebateCategory: category 
      }),
      resetDebateHistory: () => set({ viewedDebateIds: [] }),
    }),
    {
      name: 'nous-storage-v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // IMPORTANT: We handle hydration manually or use the hook below
    }
  )
);

// HOOK SÉCURISÉ POUR SSR
// Ce hook ne retourne l'état qu'une fois monté sur le client
export const useStore = <T>(selector: (state: UserState) => T): T | undefined => {
  const result = useStoreBase(selector)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return mounted ? result : undefined
}

// Export raw store for non-hook usage (e.g. inside functions)
export const useRawStore = useStoreBase;
