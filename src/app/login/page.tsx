'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail, UserRound, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import InstallHint from '@/components/InstallHint'

type AuthMode = 'login' | 'create' | 'reset'

export default function LoginPage() {
  const router = useRouter()
  const { session, isLoading, signIn, signUp, requestPasswordReset, updatePassword } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [checkedResetLink, setCheckedResetLink] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetIdentifier, setResetIdentifier] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('reset') === '1') setMode('reset')
    setCheckedResetLink(true)
  }, [])

  useEffect(() => {
    if (checkedResetLink && !isLoading && session && mode !== 'reset') router.replace('/album')
  }, [checkedResetLink, isLoading, mode, router, session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    try {
      if (mode === 'create') {
        await signUp(username, password, email)
      } else if (mode === 'reset') {
        await updatePassword(password)
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

  async function handleForgotPassword() {
    setError(null)
    setMessage(null)
    setSubmitting(true)

    try {
      await requestPasswordReset(resetIdentifier || username)
      setMessage('Listo. Si ese usuario tiene mail real, le mandamos un link para cambiar la contrasena.')
      setForgotOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mail.')
    } finally {
      setSubmitting(false)
    }
  }

  const title = mode === 'reset'
    ? 'Nueva contrasena'
    : mode === 'create'
      ? 'Crear album'
      : 'Entrar'

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto grid min-h-dvh max-w-6xl gap-8 px-5 pb-8 pt-8 lg:grid-cols-[1fr_440px] lg:items-center lg:px-8">
        <section className="safe-top lg:pb-20">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-red-200">Mundial 2026</p>
          <h1 className="mt-3 text-5xl font-black leading-none tracking-tight lg:text-7xl">FiguritasApp</h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-300 lg:text-lg">
            Tu album compartido de figuritas Panini para marcar lo que tenes, ver lo que falta y sincronizarlo con quien comparte el album.
          </p>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-300 sm:grid-cols-3 lg:max-w-2xl">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Checklist visual por pais y seccion.</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Cambios sincronizados al instante.</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">Instalable en iPhone sin App Store.</div>
          </div>
        </section>

        <section>
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-4 text-slate-950 shadow-2xl lg:p-5">
            {mode !== 'reset' ? (
              <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                    setMessage(null)
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-black ${mode === 'login' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('create')
                    setError(null)
                    setMessage(null)
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-black ${mode === 'create' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
                >
                  Crear album
                </button>
              </div>
            ) : null}

            <h2 className="text-2xl font-black text-slate-950">{title}</h2>

            {mode !== 'reset' ? (
              <>
                <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="username">
                  {mode === 'login' ? 'Usuario o mail' : 'Usuario'}
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="username"
                    value={username}
                    onChange={event => setUsername(event.target.value)}
                    autoCapitalize="none"
                    autoComplete="username"
                    placeholder={mode === 'login' ? 'usuario o mail@ejemplo.com' : 'usuario'}
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
                  />
                </div>
              </>
            ) : null}

            {mode === 'create' ? (
              <>
                <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="email">
                  Mail opcional
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder="mail@ejemplo.com"
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
                  />
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  El mail se usa solo si algun dia queres recuperar la contrasena. Los usuarios viejos siguen funcionando igual.
                </p>
              </>
            ) : null}

            <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="password">
              {mode === 'reset' ? 'Nueva contrasena' : 'Contrasena'}
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <Lock className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                id="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'create' || mode === 'reset' ? 'new-password' : 'current-password'}
                className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                onClick={() => setShowPassword(value => !value)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 active:bg-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === 'create' ? (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">
                <p className="font-black text-slate-950">Como funciona</p>
                <p>Creas un usuario, marcas cada circulo cuando tenes esa figurita y la otra persona ve los cambios con el mismo usuario.</p>
              </div>
            ) : null}

            {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
            {message ? <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{message}</p> : null}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-base font-black text-white shadow-lg shadow-red-700/20 active:bg-red-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'create' ? 'Crear y entrar' : mode === 'reset' ? 'Guardar nueva contrasena' : 'Entrar al album'}
            </button>

            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true)
                  setResetIdentifier(username)
                  setError(null)
                  setMessage(null)
                }}
                className="mt-3 w-full rounded-lg px-4 py-2 text-sm font-black text-slate-500 active:bg-slate-100"
              >
                Olvide mi contrasena
              </button>
            ) : null}
          </form>

          <div className="mt-6 text-slate-950">
            <InstallHint />
          </div>
        </section>
      </div>

      {forgotOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-4 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Recuperar contrasena</h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                  Escribi tu usuario o mail. Si tiene un mail real asociado, te mandamos un link.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setForgotOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="resetIdentifier">
              Usuario o mail
            </label>
            <input
              id="resetIdentifier"
              value={resetIdentifier}
              onChange={event => setResetIdentifier(event.target.value)}
              autoCapitalize="none"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold outline-none"
            />
            {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleForgotPassword()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Mandar link
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
