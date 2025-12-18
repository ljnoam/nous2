import { createClient } from '@supabase/supabase-js'; // Use admin client
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications';

// Helper to create admin client
function getAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate Cron Request
    // Vercel Cron automatically adds this header. 
    // We can also use a custom secret if we want to be extra safe, 
    // but checking for 'Authorization' header bearing CRON_SECRET is good practice if set up.
    // For simplicity with Vercel Cron, usually we check:
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // If CRON_SECRET is not set in env, we might skip this check during dev,
        // but it is recommended for production.
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabase();
    const today = new Date().toISOString().split('T')[0];

    // 2. Get all couples (or just active users)
    // We want users who are part of a couple and haven't posted a mood today.
    
    // Strategy:
    // A. Get all users from profiles (or couple_members)
    // B. Get all mood entries for today
    // C. Filter users who are missing from B
    
    // Ideally, we only target users who are in the 'couple_members' table.
    const { data: members, error: membersError } = await supabase
        .from('couple_members')
        .select('user_id, couple_id');

    if (membersError) throw membersError;
    if (!members) return NextResponse.json({ success: true, count: 0 });

    // Get moods for today
    const { data: moods, error: moodsError } = await supabase
        .from('daily_moods')
        .select('user_id')
        .eq('mood_date', today);

    if (moodsError) throw moodsError;

    const postedUserIds = new Set(moods?.map(m => m.user_id) || []);
    
    // 3. Identify users to notify
    const usersToNotify = members.filter(m => !postedUserIds.has(m.user_id));

    console.log(`[MoodCron] Found ${usersToNotify.length} users to notify`);

    // 4. Send Notifications in parallel
    // We might want to limit concurrency if there are thousands, but for now Promise.all is fine.
    // Ideally use a queue for large scale.
    
    let sentCount = 0;

    await Promise.all(usersToNotify.map(async (member) => {
        try {
            // Check preferences ? The user requirement implies sending it to everyone basically.
            // But good practice to check if they have notifications enabled generally.
            // For this specific 'reminder', we might force it or check a 'notify_daily' pref if it existed.
            // We'll rely on the user having a push token in OneSignal.
            
            // Should we check 'notify_notes' or similar? 
            // The prompt says "assure toi que ça envoie bien une notif", implies it's important.
            // We will just send it.
            
            await sendNotification({
                type: 'note', // or new type 'reminder'
                targetUserId: member.user_id,
                title: "C'est l'heure du bilan ! 🌙",
                message: "Comment s'est passée ta journée ? Dis-le à ta moitié !",
                data: { type: 'mood_reminder' }
            });
            sentCount++;
        } catch (e) {
            console.error(`Failed to notify user ${member.user_id}`, e);
        }
    }));

    return NextResponse.json({ success: true, notified: sentCount });

  } catch (error: any) {
    console.error('Mood Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
