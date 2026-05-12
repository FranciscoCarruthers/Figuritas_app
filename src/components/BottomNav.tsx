'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BookOpen, ScanLine, Tags } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/album', label: 'Album', Icon: BookOpen },
  { href: '/scan', label: 'Escanear', Icon: ScanLine },
  { href: '/repetidas', label: 'Repetidas', Icon: Tags },
  { href: '/actividad', label: 'Actividad', Icon: Activity },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href === '/album' && pathname.startsWith('/album'))

          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition ${
                active ? 'bg-slate-900 text-white' : 'text-slate-500 active:bg-slate-100'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
