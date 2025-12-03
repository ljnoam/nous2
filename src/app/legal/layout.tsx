import HeartBackground from '@/components/home/HeartBackground'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <HeartBackground />
      <div className="relative z-10 min-h-screen p-6 md:p-12">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-black dark:hover:text-white transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
        <div className="max-w-3xl mx-auto bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-xl border border-black/5 dark:border-white/5">
          {children}
        </div>
      </div>
    </>
  )
}
