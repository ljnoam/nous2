import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Expense } from '../types'

/**
 * ZUSTAND APP STORE
 * 
 * Central source of truth for "Nous" application.
 * Persists key data to localStorage for Offline-First capability.
 */

interface UserState {
  // --- USER & COUPLE SLICE ---
  // Essential for identification and permission checks
  user: { id: string; email?: string; user_metadata: any } | null;
  couple: { id: string; members_count: number } | null;
  firstName: string | null; // Cached display name
  
  setUser: (user: any) => void;
  setCouple: (couple: any) => void;
  setFirstName: (name: string) => void;

  // --- LIFE SLICE (Expenses, Mood) ---
  // Data that should be instantly available when opening the app
  expenses: Expense[];
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  removeExpense: (id: string) => void;
  
  // Cache today's mood to prevent flicker/refetch
  todayMoods: { my: string | null; partner: string | null; date: string };
  setTodayMoods: (moods: { my: string | null; partner: string | null; date: string }) => void;

  // --- PLAYROOM SLICE (Debates) ---
  // Game state persistence
  viewedDebateIds: string[];
  currentDebateTopicId: string | null;
  currentDebateCategory: string | null;
  
  markDebateViewed: (id: string) => void;
  setCurrentDebateState: (topicId: string | null, category: string | null) => void;
  resetDebateHistory: () => void;

  // --- UI STATE ---
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<UserState>()(
  persist(
    (set, get) => ({
      // User Init
      user: null,
      couple: null,
      firstName: null,
      
      setUser: (user) => set({ user }),
      setCouple: (couple) => set({ couple }),
      setFirstName: (name) => set({ firstName: name }),

      // Life Init
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

      // Playroom Init
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

      // Hydration
      _hasHydrated: false,
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: 'nous-storage-v1', // Unique name in localStorage
      storage: createJSONStorage(() => localStorage), // Default is localStorage
      
      // Listener when rehydration finishes
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },

      // Whitelist of keys to persist (All logic data, exclude transient UI if any)
      partialize: (state) => ({
          user: state.user,
          couple: state.couple,
          firstName: state.firstName,
          expenses: state.expenses,
          todayMoods: state.todayMoods,
          viewedDebateIds: state.viewedDebateIds,
          currentDebateTopicId: state.currentDebateTopicId,
          currentDebateCategory: state.currentDebateCategory,
      })
    }
  )
)
