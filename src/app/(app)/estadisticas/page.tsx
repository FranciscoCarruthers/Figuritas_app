'use client'

import { useMemo, type ReactNode } from 'react'
import { CheckCircle2, CircleDashed, Flag, Percent, Trophy } from 'lucide-react'
import { ALBUM_GROUPS, getTeamStickers, STICKERS } from '@/data/sticker-data'
import ProgressBar from '@/components/ProgressBar'
import { useAlbum } from '@/context/AlbumContext'
import { getProgress } from '@/lib/album'

type StatCardProps = {
  label: string
  value: string
  detail: string
  icon: ReactNode
}

function StatCard({ label, value, detail, icon }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-900">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
    </article>
  )
}

export default function EstadisticasPage() {
  const { albumState } = useAlbum()

  const stats = useMemo(() => {
    const overall = getProgress(albumState, STICKERS)
    const intro = getProgress(albumState, getTeamStickers('FWC'))

    const teamStats = ALBUM_GROUPS.flatMap(group =>
      group.teams
        .filter(team => team.code !== 'FWC')
        .map(team => {
          const stickers = getTeamStickers(team.code)
          return {
            team,
            group: group.label,
            progress: getProgress(albumState, stickers),
          }
        }),
    )

    const groupStats = ALBUM_GROUPS.map(group => {
      const stickers = group.teams.flatMap(team => getTeamStickers(team.code))
      return {
        label: group.label,
        progress: getProgress(albumState, stickers),
      }
    })

    const completedTeams = teamStats.filter(item => item.progress.percent === 100).length
    const closestTeams = [...teamStats]
      .filter(item => item.progress.percent > 0 && item.progress.percent < 100)
      .sort((a, b) => b.progress.percent - a.progress.percent || a.progress.missing - b.progress.missing)
      .slice(0, 4)

    return { overall, intro, groupStats, teamStats, completedTeams, closestTeams }
  }, [albumState])

  const completedGroups = stats.groupStats.filter(item => item.progress.percent === 100).length

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28">
      <header className="safe-top pb-5 pt-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">figuritasapp</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Estadisticas</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Resumen de como viene el album.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500">Album completo</p>
            <p className="mt-1 text-5xl font-black tracking-tight text-slate-950">{stats.overall.percent}%</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-700">
            <Percent className="h-6 w-6" />
          </span>
        </div>
        <div className="mt-4">
          <ProgressBar value={stats.overall.percent} color="#b91c1c" />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-black text-slate-600">
          <span>{stats.overall.owned}/{stats.overall.total} tengo</span>
          <span>{stats.overall.missing} faltan</span>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Tengo"
          value={String(stats.overall.owned)}
          detail="figuritas marcadas"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="Faltan"
          value={String(stats.overall.missing)}
          detail="para completar"
          icon={<CircleDashed className="h-5 w-5" />}
        />
        <StatCard
          label="Equipos"
          value={`${stats.completedTeams}/${stats.teamStats.length}`}
          detail="completos"
          icon={<Flag className="h-5 w-5" />}
        />
        <StatCard
          label="Secciones"
          value={`${completedGroups}/${stats.groupStats.length}`}
          detail="completas"
          icon={<Trophy className="h-5 w-5" />}
        />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Por seccion</h2>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {stats.intro.owned}/{stats.intro.total} intro
          </p>
        </div>
        <div className="space-y-3">
          {stats.groupStats.map(item => (
            <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-black text-slate-950">{item.label}</h3>
                <p className="text-sm font-black text-slate-600">{item.progress.percent}%</p>
              </div>
              <ProgressBar value={item.progress.percent} color="#b91c1c" />
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{item.progress.owned}/{item.progress.total} tengo</span>
                <span>{item.progress.missing} faltan</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-black tracking-tight text-slate-950">Mas cerca</h2>
        <div className="mt-3 space-y-3">
          {stats.closestTeams.length === 0 ? (
            <article className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-500">Todavia no hay equipos empezados.</p>
            </article>
          ) : (
            stats.closestTeams.map(item => (
              <article key={item.team.code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black text-slate-950">
                      {item.team.code} - {item.team.name}
                    </h3>
                    <p className="text-xs font-bold text-slate-500">{item.group}</p>
                  </div>
                  <p className="text-sm font-black text-red-700">{item.progress.percent}%</p>
                </div>
                <ProgressBar value={item.progress.percent} color="#b91c1c" />
                <p className="mt-2 text-xs font-bold text-slate-500">
                  {item.progress.missing} faltan para completar
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
