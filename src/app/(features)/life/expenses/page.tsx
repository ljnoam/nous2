'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Expense } from '@/lib/types'
import { Plus, Check, TrendingUp, HandCoins, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { createExpense } from '@/lib/actions'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { useAppStore } from '@/lib/store/useAppStore'
import { useShallow } from 'zustand/react/shallow'

export default function ExpensesPage() {
  const router = useRouter()
  
  // STORE
  const { 
    expenses, setExpenses, addExpense, updateExpense, removeExpense,
    user, setUser,
    couple, setCouple
  } = useAppStore(useShallow(state => ({
    expenses: state.expenses,
    setExpenses: state.setExpenses,
    addExpense: state.addExpense,
    updateExpense: state.updateExpense,
    removeExpense: state.removeExpense,
    user: state.user,
    setUser: state.setUser,
    couple: state.couple,
    setCouple: state.setCouple
  })))

  const [loading, setLoading] = useState(true)
  
  // States for Drawers
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isReimburseOpen, setIsReimburseOpen] = useState(false)

  // Form State
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch Data
  useEffect(() => {
    let mounted = true
    
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.replace('/register')
            return
        }
        if (!mounted) return
        
        if (session.user.id !== user?.id) setUser(session.user)

        // 1. Get My Couple ID
        // Use cached if available to start, but refresh
        let currentCoupleId = couple?.id;
        
        if (!currentCoupleId) {
             const { data: cm, error: cmError } = await supabase
                .from('couple_members')
                .select('couple_id')
                .eq('user_id', session.user.id)
                .maybeSingle()
            
            if (cmError || !cm) {
                console.error('Error fetching couple:', cmError)
                return
            }
            currentCoupleId = cm.couple_id;
            if (mounted) setCouple({ id: cm.couple_id, members_count: 2 }); // Assume 2 or fetch
        }

        // 2. Get Expenses
        const { data: exps, error: expError } = await supabase
            .from('expenses')
            .select('*')
            .eq('couple_id', currentCoupleId)
            .eq('is_settled', false)
            .order('created_at', { ascending: false })
        
        if (mounted) {
            if (exps) setExpenses(exps)
            setLoading(false)
        }

      } catch (err) {
        console.error('Expenses load error:', err)
        if (mounted) setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel('expenses_realtime_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
        const newRecord = payload.new as Expense
        const oldRecord = payload.old as { id: string }
        
        if (payload.eventType === 'INSERT') {
             if (!newRecord.is_settled) addExpense(newRecord)
        } else if (payload.eventType === 'UPDATE') {
             if (newRecord.is_settled) {
                 removeExpense(newRecord.id)
             } else {
                 updateExpense(newRecord)
             }
        } else if (payload.eventType === 'DELETE') {
             removeExpense(oldRecord.id)
        }
      })
      .subscribe()
      
    return () => { 
      mounted = false 
      supabase.removeChannel(channel)
    }
  }, [router, addExpense, removeExpense, updateExpense, setExpenses, setUser, setCouple, couple?.id, user?.id])

  // Balance Calculation (100% Allocation)
  const balance = useMemo(() => {
    if (!user) return 0

    let myTotal = 0
    let partnerTotal = 0
    
    expenses.forEach(e => {
        const val = Number(e.amount)
        if (e.paid_by === user.id) {
            myTotal += val
        } else {
            partnerTotal += val
        }
    })

    return myTotal - partnerTotal
  }, [expenses, user])

  async function handleAddExpense() {
    if (!amount || !description || !couple?.id || !user) return
    setSubmitting(true)
    const val = parseFloat(amount.replace(',', '.'))
    if (isNaN(val) || val <= 0) {
        alert("Montant invalide")
        setSubmitting(false)
        return
    }

    const optimisticId = 'temp-' + Date.now()
    
    try {
        // Optimistic UI Update
        const newExp: Expense = {
            id: optimisticId,
            created_at: new Date().toISOString(),
            amount: val,
            description,
            type: 'shared',
            paid_by: user.id,
            couple_id: couple.id,
            is_settled: false
        }
        
        addExpense(newExp) // Store action
        setIsAddOpen(false)
        setAmount('')
        setDescription('')

        // Server Action
        const serverExp = await createExpense({
            amount: val,
            description: description,
            couple_id: couple.id,
            type: 'shared'
        })
        
        // Replace temp with real
        // We use updateExpense to swap the ID if possible, but ID is key. 
        // Better to remove temp and add real, or update properties.
        // Since ID changes, we should remove and add.
        removeExpense(optimisticId)
        addExpense(serverExp) // This might duplicate if realtime comes in fast? Realtime handles INSERT.
        // Actually, realtime might arrive before this awaits.
        // It's tricky. But for now, simple removal of optimistic id is safe.

    } catch (e: any) {
        alert('Erreur: ' + e.message)
        removeExpense(optimisticId)
        // window.location.reload()
    } finally {
        setSubmitting(false)
    }
  }

  async function handleReimburse() {
    if (!amount || !couple?.id || !user) return
    setSubmitting(true)
    const val = parseFloat(amount.replace(',', '.'))
    if (isNaN(val) || val <= 0) {
        alert("Montant invalide")
        setSubmitting(false)
        return
    }

    const optimisticId = 'temp-' + Date.now()

    try {
        // Optimistic
        const newExp: Expense = {
            id: optimisticId,
            created_at: new Date().toISOString(),
            amount: val,
            description: 'Remboursement',
            type: 'reimbursement',
            paid_by: user.id,
            couple_id: couple.id,
            is_settled: false
        }
        addExpense(newExp)
        setIsReimburseOpen(false)
        setAmount('')

        const serverExp = await createExpense({
            amount: val,
            description: 'Remboursement',
            couple_id: couple.id,
            type: 'reimbursement'
        })
        
        removeExpense(optimisticId)
        addExpense(serverExp)

    } catch (e: any) {
        alert('Erreur: ' + e.message)
        removeExpense(optimisticId)
    } finally {
        setSubmitting(false)
    }
  }
  
  async function handleDelete(id: string) {
      if(!confirm("Supprimer cette dépense ?")) return
      
      const prevExpenses = [...expenses];
      removeExpense(id); // Optimistic
      
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) {
          alert('Erreur de suppression')
          setExpenses(prevExpenses) // Revert
      }
  }

  async function settleUp() {
    if (!couple?.id || expenses.length === 0) return
    if (!confirm('Tout marquer comme remboursé ? Cette action est irréversible.')) return
    
    const prevExpenses = [...expenses];
    setExpenses([]) 

    const { error } = await supabase
        .from('expenses')
        .update({ is_settled: true })
        .eq('couple_id', couple.id)
        .eq('is_settled', false)

    if (error) {
        alert('Erreur')
        setExpenses(prevExpenses)
    }
  }

  return (
    <main className="relative z-10 space-y-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-24 px-4">
        {/* Header */}
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">Dépenses</h1>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setAmount(''); setIsReimburseOpen(true) }} 
                className="opacity-50 hover:opacity-100"
            >
               <HandCoins className="h-6 w-6" />
            </Button>
        </div>

        {/* Balance Card */}
        <div className="relative">
             {loading ? (
                <Card className="p-8 border-none bg-neutral-100 dark:bg-neutral-900 shadow-sm min-h-[200px] flex flex-col items-center justify-center animate-pulse">
                    <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded mb-4"></div>
                    <div className="h-12 w-48 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                </Card>
             ) : (
               <Card className={`p-8 border-none shadow-lg relative overflow-hidden min-h-[200px] flex flex-col justify-center items-center text-center transition-colors duration-500 ${
                   Math.abs(balance || 0) < 0.01 
                     ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30'
                     : (balance || 0) > 0 
                        ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30'
                        : 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30'
               }`}>
                  {Math.abs(balance || 0) < 0.01 ? (
                     <div className="space-y-4">
                        <div className="mx-auto bg-white/50 dark:bg-white/10 p-4 rounded-full w-fit backdrop-blur-sm">
                            <Check className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-neutral-800 dark:text-white mb-1">Tout est à l'équilibre</h2>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Aucune dette en cours</p>
                        </div>
                     </div>
                  ) : (
                    <div className="space-y-6 relative z-10 w-full">
                       <div>
                          <p className="text-sm font-bold uppercase tracking-widest text-neutral-500/80 mb-2">
                            {(balance || 0) > 0 ? "On te doit" : "À rembourser"}
                          </p>
                          <div className="flex flex-col items-center justify-center">
                              <span className={`text-6xl font-black tracking-tighter mb-2 ${
                                  (balance || 0) > 0 
                                  ? 'text-emerald-600 dark:text-emerald-400 drop-shadow-sm' 
                                  : 'text-rose-600 dark:text-rose-400 drop-shadow-sm'
                              }`}>
                                  {Math.abs(balance || 0).toFixed(2)}€
                              </span>
                          </div>
                       </div>
                       
                       <Button 
                        onClick={settleUp}
                        variant="secondary"
                        className="w-full max-w-[200px] h-10 font-semibold shadow-sm hover:scale-105 active:scale-95 transition-all rounded-full bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 backdrop-blur-xl border border-black/5"
                       >
                         Solder les comptes
                       </Button>
                    </div>
                  )}
               </Card>
             )}
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Dernières dépenses</h3>
                <span className="text-xs font-medium text-neutral-400">{expenses.length} non remboursées</span>
             </div>

             {expenses.length === 0 && !loading && (
                <div className="text-center py-12 opacity-40">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3" />
                    <p className="text-sm">Aucune dépense en cours</p>
                </div>
             )}

             <div className="space-y-3 overflow-hidden">
                {expenses.map(expense => (
                     <SwipeableExpenseItem 
                        key={expense.id} 
                        expense={expense} 
                        meId={user?.id || ''} 
                        onDelete={handleDelete}
                     />
                ))}
             </div>
        </div>

        {/* FAB Add Button */}
        <div className="fixed bottom-24 right-6 sm:right-[35%] z-40">
            <button 
                onClick={() => { setAmount(''); setDescription(''); setIsAddOpen(true) }}
                className="h-14 w-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            >
                <Plus className="h-8 w-8" />
            </button>
        </div>

        {/* ADD EXPENSE DRAWER */}
        <Drawer open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DrawerContent className="bg-white dark:bg-neutral-900">
             <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <DrawerTitle>Nouvelle dépense</DrawerTitle>
                <DrawerDescription>J'ai payé pour mon partenaire</DrawerDescription>
              </DrawerHeader>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Montant (€)</label>
                    <Input 
                        type="number" 
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00" 
                        className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 text-3xl font-bold h-16 text-center"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
                
                <div className="space-y-2">
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (ex: Courses)"
                        className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 text-lg font-medium"
                    />
                </div>
              </div>

              <DrawerFooter>
                <button
                  onClick={handleAddExpense}
                  disabled={submitting || !amount || !description}
                  className="w-full rounded-xl bg-black text-white dark:bg-white dark:text-black h-12 text-base font-medium disabled:opacity-50 active:scale-95 transition"
                >
                  {submitting ? 'Ajout...' : 'Ajouter'}
                </button>
                <DrawerClose asChild>
                  <button className="w-full rounded-xl border border-black/10 dark:border-white/10 h-12 text-base font-medium">Annuler</button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>

        {/* REIMBURSE DRAWER */}
        <Drawer open={isReimburseOpen} onOpenChange={setIsReimburseOpen}>
          <DrawerContent className="bg-white dark:bg-neutral-900">
             <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <DrawerTitle>Remboursement</DrawerTitle>
                <DrawerDescription>J'ai remboursé mon partenaire</DrawerDescription>
              </DrawerHeader>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Montant remboursé (€)</label>
                    <Input 
                        type="number" 
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00" 
                        className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 text-3xl font-bold h-16 text-center text-emerald-500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        autoFocus
                    />
                </div>
              </div>

              <DrawerFooter>
                <button
                  onClick={handleReimburse}
                  disabled={submitting || !amount}
                  className="w-full rounded-xl bg-emerald-500 text-white h-12 text-base font-medium disabled:opacity-50 active:scale-95 transition hover:bg-emerald-600"
                >
                  {submitting ? 'Envoi...' : 'Valider le remboursement'}
                </button>
                <DrawerClose asChild>
                  <button className="w-full rounded-xl border border-black/10 dark:border-white/10 h-12 text-base font-medium">Annuler</button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>

    </main>
  )
}

function SwipeableExpenseItem({ expense, meId, onDelete }: { expense: Expense, meId: string, onDelete: (id: string) => void }) {
    const x = useMotionValue(0)
    const isShared = expense.type !== 'reimbursement'
    const isMine = expense.paid_by === meId
    const bgOpacity = useTransform(x, [-100, 0], [1, 0])
    
    // Only allow swipe if IT IS MINE
    // User requested: "supprimer les dépenses qui LUI sont associés (pas celles de son partenaire)"
    const canDelete = isMine

    if (!canDelete) {
        return <ExpenseItem expense={expense} meId={meId} />
    }

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Background Delete Layer */}
            <motion.div 
                style={{ opacity: bgOpacity }}
                className="absolute inset-0 bg-red-500 flex items-center justify-end px-6 z-0"
            >
                <Trash2 className="text-white h-6 w-6" />
            </motion.div>

            {/* Foreground Item */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.5, right: 0 }} // Only pull left
                onDragEnd={(e, info) => {
                    if (info.offset.x < -100) {
                        onDelete(expense.id)
                    }
                }}
                whileTap={{ cursor: "grabbing" }}
                style={{ x }}
                className="relative z-10 bg-white dark:bg-neutral-900"
            >
                 <ExpenseItem expense={expense} meId={meId} />
            </motion.div>
        </div>
    )
}

function ExpenseItem({ expense, meId }: { expense: Expense, meId: string }) {
    const isShared = expense.type !== 'reimbursement'
    const partnerName = 'Partenaire'
    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5 shadow-sm h-full">
            <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                expense.paid_by === meId 
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' 
                : 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400'
            }`}>
                {expense.paid_by === meId ? (meId ? 'M' : 'M') : 'P'}
            </div>
            <div>
                <p className="font-semibold text-neutral-900 dark:text-white text-base line-clamp-1">{expense.description}</p>
                <p className="text-xs text-neutral-500">
                    {new Date(expense.created_at).toLocaleDateString('fr-FR')} 
                    {!isShared && ' • Remboursement'}
                </p>
            </div>
            </div>
            <div className="text-right shrink-0">
                <span className={`block font-bold text-lg ${
                    isShared
                    ? (expense.paid_by === meId ? 'text-emerald-500' : 'text-rose-500')
                    : 'text-blue-500'
                }`}>
                    {isShared 
                        ? (expense.paid_by === meId ? '+' : '-') 
                        : (expense.paid_by === meId ? '→' : '←')
                    }
                    {Number(expense.amount).toFixed(2)}€
                </span>
                <span className="text-[10px] uppercase font-bold text-neutral-400">
                    {expense.paid_by === meId ? 'Payé par toi' : `Payé par ${partnerName}`}
                </span>
            </div>
        </div>
    )
}
