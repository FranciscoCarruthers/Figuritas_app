'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, UserRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import InstallHint from '@/components/InstallHint'

export default function LoginPage() {
  const router = useRouter()
  const { session, isLoading, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'create'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && session) router.replace('/album')
  }, [isLoading, router, session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (mode === 'create') {
        await signUp(username, password)
      } else {
        await signIn(username, password)
      }
      router.replace('/album')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar al album.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-8 lg:grid lg:max-w-5xl lg:grid-cols-[1fr_420px] lg:items-center lg:gap-12 lg:px-8">
        <div className="safe-top lg:pb-20">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-red-200">Mundial 2026</p>
          <h1 className="mt-3 text-4xl font-black leading-tight lg:text-6xl">Figuritas</h1>
          <p className="mt-3 max-w-xs text-sm font-medium leading-6 text-slate-300 lg:max-w-md lg:text-base">
            Un album compartido para marcar las figuritas que ya tienen desde el iPhone.
          </p>
        </div>

        <div>
        <form onSubmit={handleSubmit} className="mt-8 rounded-lg bg-white p-4 text-slate-950 shadow-2xl lg:mt-0 lg:p-5">
          <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-md px-3 py-2 text-sm font-black ${mode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`rounded-md px-3 py-2 text-sm font-black ${mode === 'create' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
            >
              Crear album
            </button>
          </div>

          <label className="block text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="username">
            Usuario
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              id="username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="usuario"
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
            />
          </div>

          <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="password">
            Contraseña
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <Lock className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              id="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword(value => !value)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 active:bg-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-base font-black text-white shadow-lg shadow-red-700/20 active:bg-red-800 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'create' ? 'Crear y entrar' : 'Entrar al album'}
          </button>
        </form>

        <div className="mt-auto pt-6 text-slate-950">
          <InstallHint />
        </div>
        </div>
      </div>
    </main>
  )
}
