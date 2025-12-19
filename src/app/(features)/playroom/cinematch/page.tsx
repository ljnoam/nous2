"use client";

import { useEffect, useState } from "react";
import SetupForm from "@/components/cinematch/SetupForm";
import SwipeDeck from "@/components/cinematch/SwipeDeck";
import MatchOverlay from "@/components/cinematch/MatchOverlay";
import { getActiveMatchSession, deleteMatchSession } from "@/lib/actions";
import { supabase } from "@/lib/supabase/client";
import { X, AlertCircle } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export default function CineMatchPage() {
  const [session, setSession] = useState<any>(null);
  const [matchMedia, setMatchMedia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQuitAlert, setShowQuitAlert] = useState(false);

  useEffect(() => {
    // Check for existing active session
    (async () => {
       try {
         const active = await getActiveMatchSession();
         if (active) {
            setSession(active);
         }
         setLoading(false);
       } catch (e) {
         console.error(e);
         setLoading(false);
       }
    })();
  }, []);

  // Realtime Listener for new/deleted sessions
  useEffect(() => {
    const channel = supabase
      .channel('cinematch-session')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'match_sessions' },
        (payload) => {
           if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
              setSession(payload.new);
           }
           if (payload.eventType === 'DELETE') {
              // Check if deleted session is the current one
              if (session && payload?.old?.id === session.id) {
                 setSession(null);
                 setMatchMedia(null);
                 setShowQuitAlert(false);
              }
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleQuitSession = async () => {
    if (!session) return;
    try {
      await deleteMatchSession(session.id);
      setSession(null);
      setShowQuitAlert(false);
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center font-bold bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white gap-4">
        <span className="text-4xl animate-bounce">🍿</span>
        <span>Chargement...</span>
      </div>
    );
  }

  // If match found locally or via partner
  if (matchMedia) {
    return (
      <MatchOverlay 
        media={matchMedia} 
        onClose={() => {
            setMatchMedia(null);
            handleQuitSession();
        }} 
      />
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] w-full overflow-hidden bg-neutral-50 dark:bg-black text-black dark:text-white relative">
      {/* Header with Quit button if session active */}
      {session && (
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={() => setShowQuitAlert(true)}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md shadow-lg transition-all active:scale-95 border border-white/10"
          >
            <X className="w-5 h-5 text-neutral-900 dark:text-white" />
          </button>
        </div>
      )}

      {!session ? (
        <SetupForm onSessionStarted={setSession} />
      ) : (
        <SwipeDeck 
          session={session} 
          onMatch={(media) => setMatchMedia(media)} 
        />
      )}

      <Drawer open={showQuitAlert} onOpenChange={setShowQuitAlert}>
        <DrawerContent className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="text-center pt-8">
              <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <DrawerTitle className="text-2xl font-bold mb-2">Arrêter la session ?</DrawerTitle>
              <DrawerDescription className="text-base px-4">
                Cette action est irréversible et mettra fin à la partie pour vous deux.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pb-8 px-4 gap-3">
              <Button 
                variant="destructive" 
                onClick={handleQuitSession}
                className="w-full h-14 text-lg rounded-2xl bg-red-600 hover:bg-red-700 font-semibold"
              >
                Quitter la session
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full h-14 text-lg rounded-2xl border-neutral-200 dark:border-neutral-800 font-medium">
                  Annuler
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
