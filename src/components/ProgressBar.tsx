export default function ProgressBar({ value, color = '#0F172A' }: { value: number; color?: string }) {
  const width = Math.max(0, Math.min(100, value))

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  )
}
