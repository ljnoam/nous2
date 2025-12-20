"use client";

import { useEffect, useState, useCallback } from "react";
import MoodCard from "./MoodCard";
import MoodSelector, { MoodType } from "./MoodSelector";
import { supabase } from "@/lib/supabase/client";
import { upsertMood } from "@/lib/actions";
import { useAppStore } from "@/lib/store/useAppStore";

interface MoodData {
  user_id: string;
  mood_value: string;
  mood_date: string;
}

export default function MoodWidget() {
  const { todayMoods, setTodayMoods } = useAppStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Derive display values from store or fallback
  const today = new Date().toISOString().split('T')[0];
  const isDateMatch = todayMoods.date === today;
  
  const myMood = isDateMatch ? todayMoods.my : null;
  const partnerMood = isDateMatch ? todayMoods.partner : null;

  // Combined fetch function
  const fetchMoods = useCallback(async (uid: string) => {
    try {
      const { data: moods, error } = await supabase
        .from('daily_moods')
        .select('user_id, mood_value')
        .eq('mood_date', today);

      if (error) {
        console.error('Error fetching moods:', error);
      } else if (moods) {
        const myEntry = moods.find(m => m.user_id === uid);
        const partnerEntry = moods.find(m => m.user_id !== uid);
        
        setTodayMoods({
            date: today,
            my: myEntry?.mood_value || null,
            partner: partnerEntry?.mood_value || null
        });
      }
    } catch (e) {
        console.error("Fetch error", e);
    } finally {
        setLoading(false);
    }
  }, [today, setTodayMoods]);

  useEffect(() => {
    let mounted = true;
    const channelName = 'mood-updates';

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const uid = session.user.id;
        if (mounted) setCurrentUserId(uid);

        // Initial fetch
        await fetchMoods(uid);

        // Subscribe to Realtime
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'daily_moods'
            },
            (payload) => {
              // console.log("Realtime Mood Event:", payload);
              const newRecord = payload.new as MoodData;
              
              // Handle INSERT or UPDATE for TODAY
              if (newRecord && newRecord.mood_date === today) {
                 const isMe = newRecord.user_id === uid;
                 
                 // Get fresh state from store to avoid stale closure
                 const currentStored = useAppStore.getState().todayMoods;
                 
                 const newMy = isMe 
                    ? newRecord.mood_value 
                    : (currentStored.date === today ? currentStored.my : null);
                    
                 const newPartner = !isMe 
                    ? newRecord.mood_value 
                    : (currentStored.date === today ? currentStored.partner : null);

                 // Update store directly
                 useAppStore.getState().setTodayMoods({
                     date: today,
                     my: newMy,
                     partner: newPartner
                 });
              }
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
  }, [fetchMoods, today]); // Removed setTodayMoods from deps as we use getState()

  const handleSelectMood = async (mood: MoodType) => {
    // Optimistic update
    if (currentUserId) {
        setTodayMoods({
            date: today,
            my: mood,
            partner: todayMoods.date === today ? todayMoods.partner : null
        });
    }
    
    try {
      await upsertMood(mood);
    } catch (e) {
      console.error('Error saving mood:', e);
      // Ideally show toast here
    }
  };

  return (
    <div className="h-full w-full flex gap-3 md:gap-4 box-border p-1">
      <div className="flex-1 h-full min-h-[140px]">
        <MoodCard
          title="Partenaire"
          moodValue={partnerMood}
          interactive={false}
          loading={loading && !partnerMood} 
        />
      </div>
      <div className="flex-1 h-full min-h-[140px]">
        <MoodCard
          title="Moi"
          moodValue={myMood}
          interactive={true}
          onClick={() => setIsModalOpen(true)}
          loading={loading && !myMood}
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
