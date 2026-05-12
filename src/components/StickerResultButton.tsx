import type { Sticker } from '@/lib/types'

export default function StickerResultButton({
  sticker,
  onClick,
}: {
  sticker: Sticker
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-950">{sticker.code}</p>
        <p className="truncate text-sm font-semibold text-slate-700">{sticker.name}</p>
        <p className="text-xs font-medium text-slate-500">{sticker.team}</p>
      </div>
      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
        {sticker.teamCode}
      </span>
    </button>
  )
}
