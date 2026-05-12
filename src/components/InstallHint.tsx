'use client'

import { Share } from 'lucide-react'

export default function InstallHint() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700">
          <Share className="h-4 w-4" />
        </div>
        <div>
          <p className="font-bold text-slate-950">Instalar en iPhone</p>
          <p className="mt-1 leading-snug text-slate-600">
            En Safari: Compartir, Agregar a inicio. Vercel usa HTTPS, asi que la camara funciona.
          </p>
        </div>
      </div>
    </div>
  )
}
