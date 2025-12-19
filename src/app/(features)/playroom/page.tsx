import Link from 'next/link';
import { Clapperboard, Mic2 } from 'lucide-react';

export default function PlayroomHub() {
  return (
    <div className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-32 space-y-8">
      
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black font-display tracking-tight bg-gradient-to-br from-purple-600 to-pink-500 bg-clip-text text-transparent">
          Playroom 🎮
        </h1>
        <p className="text-lg text-neutral-500 dark:text-neutral-400 font-medium">
          Détendez-vous et jouez ensemble
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* CINEMATCH CARD */}
        <Link 
          href="/playroom/cinematch"
          className="group relative overflow-hidden rounded-[2rem] bg-indigo-500 p-8 shadow-xl transition-transform active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 h-48 w-48 rounded-full bg-white/10 blur-3xl transition-all group-hover:scale-150" />
          
          <div className="relative z-10 flex flex-col items-start gap-4">
            <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <Clapperboard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">CinéMatch</h2>
              <p className="mt-1 text-indigo-100 font-medium">Trouvez votre film du soir sans dispute.</p>
            </div>
            <div className="mt-2 text-xs font-bold uppercase tracking-wider text-white/60">
              Outil Utile
            </div>
          </div>
        </Link>
        
        {/* DEBATE ARENA CARD */}
        <Link 
          href="/playroom/debate"
          className="group relative overflow-hidden rounded-[2rem] bg-rose-500 p-8 shadow-xl transition-transform active:scale-[0.98]"
        >
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-48 w-48 rounded-full bg-black/10 blur-3xl transition-all group-hover:scale-150" />

          <div className="relative z-10 flex flex-col items-start gap-4">
             <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
              <Mic2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Debate Arena</h2>
              <p className="mt-1 text-rose-100 font-medium">Questions pour briser la glace ou aller plus loin.</p>
            </div>
            <div className="mt-2 text-xs font-bold uppercase tracking-wider text-white/60">
              Fun & Discussion
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
