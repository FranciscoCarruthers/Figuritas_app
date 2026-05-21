'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, BarChart3, BookOpen, ScanLine, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/album', label: 'Album', Icon: BookOpen },
  { href: '/estadisticas', label: 'Estadisticas', Icon: BarChart3 },
  { href: '/scan', label: 'Escanear', Icon: ScanLine },
  { href: '/amigos', label: 'Amigos', Icon: Users },
  { href: '/actividad', label: 'Actividad', Icon: Activity },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-64 lg:border-r lg:border-t-0 lg:pb-0 lg:shadow-[10px_0_30px_rgba(15,23,42,0.06)]">
      <div className="hidden px-5 pb-4 pt-8 lg:block">
        <p className="text-xs font-black tracking-[0.16em] text-red-700">FiguritasApp</p>
        <p className="mt-1 text-xs font-bold text-slate-500">by Carru</p>
      </div>
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 pt-2 lg:mx-0 lg:flex lg:max-w-none lg:flex-col lg:gap-1 lg:px-3 lg:pt-0">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href ||
            (href === '/album' && pathname.startsWith('/album')) ||
            (href === '/amigos' && pathname.startsWith('/amigos'))

          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold transition sm:text-[11px] lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-sm ${
                active ? 'bg-red-700 text-white' : 'text-slate-500 active:bg-slate-100'
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
