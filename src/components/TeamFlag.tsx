import { getTeamFlagEmoji } from '@/lib/team-flags'

export default function TeamFlag({ teamCode, className = '' }: { teamCode: string; className?: string }) {
  const code = teamCode.toUpperCase()
  const title = `Bandera ${code}`
  const emoji = getTeamFlagEmoji(code)
  if (!emoji) return null

  return (
    <span role="img" aria-label={title} className={`inline-flex text-[1.35rem] leading-none ${className}`}>
      {emoji}
    </span>
  )
}
