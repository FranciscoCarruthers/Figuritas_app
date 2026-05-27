'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, CircleDashed, Flag, Percent, Sparkles, Target, TrendingUp, Trophy } from 'lucide-react'
import { ALBUM_GROUPS, getTeamStickers, STICKERS } from '@/data/sticker-data'
import ProgressBar from '@/components/ProgressBar'
import { useAlbum } from '@/context/AlbumContext'
import { useAuth } from '@/context/AuthContext'
import { getProgress } from '@/lib/album'
import { buildAlbumInsights, type DailyMarkedStats } from '@/lib/stats-insights'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { ActivityEntry } from '@/lib/types'

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

function DailyMarkedChart({ days }: { days: DailyMarkedStats[] }) {
  const maxMarked = Math.max(1, ...days.map(day => day.marked))
  const totalMarked = days.reduce((total, day) => total + day.marked, 0)
  const bestDay = [...days].sort((a, b) => b.marked - a.marked)[0]

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Pegadas por dia</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{totalMarked} en 7 dias</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {bestDay && bestDay.marked > 0 ? `Mejor dia: ${bestDay.label} con ${bestDay.marked}.` : 'Todavia sin altas esta semana.'}
          </p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
          <BarChart3 className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-5 grid h-44 grid-cols-7 items-end gap-2 rounded-lg bg-slate-50 px-2 pb-3 pt-4 sm:gap-3 sm:px-4">
        {days.map(day => {
          const height = day.marked === 0 ? 6 : Math.max(18, Math.round((day.marked / maxMarked) * 112))

          return (
            <div key={day.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
              <p className="text-xs font-black text-slate-700">{day.marked}</p>
              <div
                className={`w-full max-w-10 rounded-t-lg transition-all ${
                  day.marked > 0 ? 'bg-red-700 shadow-sm' : 'bg-slate-200'
                }`}
                style={{ height }}
                aria-label={`${day.label}: ${day.marked} figuritas pegadas`}
                title={`${day.label}: ${day.marked} figuritas pegadas`}
              />
              <p className="w-full truncate text-center text-[11px] font-bold text-slate-500">{day.label}</p>
            </div>
          )
        })}
      </div>
    </article>
  )
}

export default function EstadisticasPage() {
  const { albumState } = useAlbum()
  const { profile } = useAuth()
  const [weeklyEntries, setWeeklyEntries] = useState<ActivityEntry[]>([])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!profile) return

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    let active = true

    supabase
      .from('activity_log')
      .select('*')
      .eq('album_id', profile.album_id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) setWeeklyEntries((data as ActivityEntry[]) ?? [])
      })

    const channel = supabase
      .channel(`stats-activity:${profile.album_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `album_id=eq.${profile.album_id}` },
        payload => {
          const entry = payload.new as ActivityEntry
          if (new Date(entry.created_at) < new Date(since)) return

          setWeeklyEntries(prev => {
            if (prev.some(item => item.id === entry.id)) return prev
            return [entry, ...prev]
              .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
              .slice(0, 300)
          })
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [profile])

  const stats = useMemo(() => {
    const overall = getProgress(albumState, STICKERS)
    const intro = getProgress(albumState, getTeamStickers('FWC'))
    const foil = getProgress(albumState, STICKERS.filter(sticker => sticker.isFoil))

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
    const bestTeam = [...teamStats]
      .sort((a, b) => b.progress.percent - a.progress.percent || b.progress.owned - a.progress.owned)
      .find(item => item.progress.owned > 0)
    const closestTeams = [...teamStats]
      .filter(item => item.progress.percent > 0 && item.progress.percent < 100)
      .sort((a, b) => b.progress.percent - a.progress.percent || a.progress.missing - b.progress.missing)
      .slice(0, 4)

    return { overall, intro, foil, groupStats, teamStats, completedTeams, bestTeam, closestTeams }
  }, [albumState])

  const insights = useMemo(
    () => buildAlbumInsights(STICKERS, ALBUM_GROUPS, albumState, weeklyEntries),
    [albumState, weeklyEntries],
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 lg:px-8 lg:pb-8">
      <header className="safe-top pb-5 pt-4">
        <p className="text-xs font-black tracking-[0.08em] text-red-700">FiguritasApp</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Estadisticas</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Resumen de como viene el album.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
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

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          value={`${insights.completedSections}/${stats.groupStats.length}`}
          detail="completas"
          icon={<Trophy className="h-5 w-5" />}
        />
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-3">
        <StatCard
          label="Brillantes"
          value={`${stats.foil.owned}/${stats.foil.total}`}
          detail={`${stats.foil.missing} faltan`}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          label="Mejor equipo"
          value={stats.bestTeam ? `${stats.bestTeam.team.code} ${stats.bestTeam.progress.percent}%` : '-'}
          detail={stats.bestTeam ? `${stats.bestTeam.progress.owned}/${stats.bestTeam.progress.total} tengo` : 'todavia sin empezar'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Ultimos 7 dias"
          value={String(insights.weeklyActivity.total)}
          detail={`${insights.weeklyActivity.marked} marcadas, ${insights.weeklyActivity.unmarked} desmarcadas`}
          icon={<CalendarDays className="h-5 w-5" />}
        />
      </section>

      <section className="mt-4">
        <DailyMarkedChart days={insights.dailyMarked} />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Proximos objetivos</h2>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">accionable</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {insights.recommendations.map(item => (
            <article key={`${item.kind}-${item.code ?? item.title}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-700">
                <Target className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-black text-slate-950">{item.title}</h3>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Por seccion</h2>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            {stats.intro.owned}/{stats.intro.total} intro
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
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
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
