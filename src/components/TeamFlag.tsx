import { TEAM_FLAG_EMOJIS } from '@/lib/team-flags'

function EnglandFlag({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 60 36" role="img" aria-label={title} className="h-5 w-7 overflow-hidden rounded-sm shadow-sm ring-1 ring-slate-200">
      <rect width="60" height="36" fill="#fff" />
      <rect x="25" width="10" height="36" fill="#cf142b" />
      <rect y="13" width="60" height="10" fill="#cf142b" />
    </svg>
  )
}

function ScotlandFlag({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 60 36" role="img" aria-label={title} className="h-5 w-7 overflow-hidden rounded-sm shadow-sm ring-1 ring-slate-200">
      <rect width="60" height="36" fill="#005eb8" />
      <polygon points="0,0 7,0 60,31 60,36 53,36 0,5" fill="#fff" />
      <polygon points="60,0 53,0 0,31 0,36 7,36 60,5" fill="#fff" />
    </svg>
  )
}

export default function TeamFlag({ teamCode, className = '' }: { teamCode: string; className?: string }) {
  const code = teamCode.toUpperCase()
  const title = `Bandera ${code}`

  if (code === 'ENG') return <span className={`inline-flex align-[-0.1em] ${className}`}><EnglandFlag title={title} /></span>
  if (code === 'SCO') return <span className={`inline-flex align-[-0.1em] ${className}`}><ScotlandFlag title={title} /></span>

  const emoji = TEAM_FLAG_EMOJIS[code]
  if (!emoji) return null

  return (
    <span role="img" aria-label={title} className={`inline-flex text-[0.9em] leading-none ${className}`}>
      {emoji}
    </span>
  )
}
