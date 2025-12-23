'use client'

import Link from 'next/link'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Sparkles, Gamepad2, Play, Flame, Film, Clapperboard, Mic2 } from 'lucide-react'
import { useRef } from 'react'

export default function PlayroomHub() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden selection:bg-purple-500/30 font-sans">
      
      {/* Deep Space Background */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black">
        <div 
            className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" 
            style={{ animationDuration: '4s' }}
        />
        <div 
            className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" 
            style={{ animationDuration: '6s' }}
        />
      </div>

      <main className="relative z-10 px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-32 max-w-lg mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-4 pt-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="p-3 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <Gamepad2 className="w-8 h-8 text-purple-400" />
          </motion.div>

          <div>
             <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-black tracking-tighter text-white mb-2"
            >
              Playroom
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base font-medium text-white/50"
            >
              Votre espace de jeu privé
            </motion.p>
          </div>
        </header>

        {/* Immersive Game Grid */}
        <div className="space-y-6">
          
          {/* CINEMATCH - The Movie Theater */}
          <ImmersiveGameCard
            href="/playroom/cinematch"
            title="CinéMatch"
            subtitle="Le film parfait, ce soir."
            theme="cinema"
            delay={0.1}
          >
            {/* 3D Floating Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Popcorn Bucket */}
                <motion.div 
                    animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-4 top-10 text-[80px] drop-shadow-2xl z-10 opacity-90 grayscale-[0.2]"
                >
                    🍿
                </motion.div>
                {/* Film Strip */}
                <div className="absolute -left-10 bottom-[-20%] w-[150%] h-[120px] bg-neutral-900/50 -rotate-12 blur-[1px] border-y-4 border-dashed border-white/20 flex items-center justify-around opacity-40">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="w-16 h-12 bg-black/50 rounded" />
                    ))}
                </div>
                {/* Spotlight */}
                <div className="absolute -top-20 right-10 w-40 h-[100%] bg-gradient-to-b from-purple-500/20 to-transparent rotate-[20deg] blur-xl" />
            </div>
          </ImmersiveGameCard>
          
          {/* DEBATE ARENA - The Hot & Cold Ring */}
          <ImmersiveGameCard
            href="/playroom/debate"
            title="Debate Arena"
            subtitle="Ça va chauffer."
            theme="debate"
            delay={0.2}
          >
             {/* 3D Floating Elements */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Fire & Ice Emoji */}
                <motion.div 
                    animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-2 top-4 text-[70px] drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10"
                >
                    🔥
                </motion.div>
                <motion.div 
                    animate={{ y: [0, 10, 0], rotate: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -left-4 bottom-10 text-[60px] drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10"
                >
                    🧊
                </motion.div>
                
                {/* Microphone */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 scale-[3]">
                    <Mic2 className="w-24 h-24 text-white" />
                </div>
            </div>
          </ImmersiveGameCard>

           {/* Coming Soon */}
           <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center p-8 rounded-[2.5rem] border border-white/5 bg-white/5"
           >
              <div className="flex flex-col items-center gap-2 text-white/30">
                  <Sparkles className="w-6 h-6" />
                  <span className="text-sm font-medium">Bientôt...</span>
              </div>
           </motion.div>

        </div>
      </main>
    </div>
  )
}

function ImmersiveGameCard({ href, title, subtitle, theme, children, delay }: any) {
    const ref = useRef<HTMLDivElement>(null)
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const mouseXSpring = useSpring(x)
    const mouseYSpring = useSpring(y)

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"])
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"])

    const bgGradient = theme === 'cinema' 
        ? 'bg-gradient-to-br from-[#2E1065] via-[#4C1D95] to-[#1e1b4b]' // Deep Purple/Indigo
        : 'bg-gradient-to-br from-[#BE123C] via-[#9F1239] to-[#881337]' // Deep Rose/Red

    const glowColor = theme === 'cinema' ? 'group-hover:shadow-[0_0_50px_-10px_rgba(139,92,246,0.5)]' : 'group-hover:shadow-[0_0_50px_-10px_rgba(244,63,94,0.5)]'
    const buttonColor = theme === 'cinema' ? 'bg-purple-500 text-white' : 'bg-rose-500 text-white'

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const xPct = mouseX / width - 0.5
        const yPct = mouseY / height - 0.5
        x.set(xPct)
        y.set(yPct)
    }

    const handleMouseLeave = () => {
        x.set(0)
        y.set(0)
    }

    return (
        <Link href={href} className="block group perspective-1000">
            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.6, type: "spring" }}
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className={`relative h-[280px] w-full rounded-[2.5rem] overflow-hidden ${bgGradient} border border-white/10 shadow-2xl ${glowColor} transition-shadow duration-500`}
            >
                {/* Content Layer */}
                {children}

                {/* Glass Overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

                {/* Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 z-20 flex flex-col items-start translate-z-20">
                    <div className="mb-4">
                        <h2 className="text-4xl font-black text-white drop-shadow-xl tracking-tighter leading-none mb-2">
                            {title}
                        </h2>
                        <p className="text-lg text-white/80 font-medium drop-shadow-md leading-tight max-w-[80%]">
                            {subtitle}
                        </p>
                    </div>

                    <motion.div 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-8 py-3 rounded-full ${buttonColor} shadow-lg flex items-center gap-2 font-bold text-sm tracking-wide uppercase`}
                    > 
                        <Play className="w-4 h-4 fill-current" />
                        Jouer
                    </motion.div>
                </div>
            </motion.div>
        </Link>
    )
}
