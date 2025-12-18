"use client";

import { useEffect, useState } from "react";
import MoodCard from "./MoodCard";
import MoodSelector, { MoodType } from "./MoodSelector";
import { supabase } from "@/lib/supabase/client";
import { upsertMood } from "@/lib/actions";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface MoodData {
  user_id: string;
  mood_value: string;
}

export default function MoodWidget() {
  const [myMood, setMyMood] = useState<string | null>(null);
  const [partnerMood, setPartnerMood] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const channelName = 'mood-updates';

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;
        if (mounted) setCurrentUserId(uid);

        const fetchMoods = async () => {
          const today = new Date().toISOString().split('T')[0];
          const { data: moods, error } = await supabase
            .from('daily_moods')
            .select('user_id, mood_value')
            .eq('mood_date', today);

          if (error) {
            console.error('Error fetching moods:', error);
          } else if (moods && mounted) {
            const myEntry = moods.find(m => m.user_id === uid);
            const partnerEntry = moods.find(m => m.user_id !== uid);
            
            setMyMood(myEntry?.mood_value || null);
            setPartnerMood(partnerEntry?.mood_value || null);
            setLoading(false);
          }
        };

        // Initial fetch
        await fetchMoods();

        // Subscribe to Realtime
        const today = new Date().toISOString().split('T')[0];
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'daily_moods',
              filter: `mood_date=eq.${today}`
            },
            () => {
              // On any change, just re-fetch to be safe and simple
              fetchMoods();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };

      } catch (e) {
        console.error('MoodWidget init error:', e);
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const handleSelectMood = async (mood: MoodType) => {
    // Optimistic update
    setMyMood(mood);
    
    try {
      await upsertMood(mood);
      // Success toast?
    } catch (e) {
      console.error('Error saving mood:', e);
      // Revert on error?
      // setMyMood(previousMood); 
      // Simplified: just let it stay or refetch
    }
  };

  return (
    <div className="h-full w-full flex gap-3 md:gap-4 box-border p-1">
      <div className="flex-1 h-full min-h-[140px]">
        <MoodCard
          title="Partenaire"
          moodValue={partnerMood}
          interactive={false}
          loading={loading}
        />
      </div>
      <div className="flex-1 h-full min-h-[140px]">
        <MoodCard
          title="Moi"
          moodValue={myMood}
          interactive={true}
          onClick={() => setIsModalOpen(true)}
          loading={loading}
        />
      </div>

      <MoodSelector
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSelect={handleSelectMood}
        currentMood={myMood}
      />
    </div>
  );
}
