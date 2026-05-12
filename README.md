# Figuritas App

PWA gratis para llevar el album Panini FIFA World Cup 2026 desde iPhone, con Next.js, Vercel y Supabase Free.

## Setup

1. Crea un proyecto en Supabase Free.
2. Ejecuta `supabase/schema.sql` y luego `supabase/seed.sql` en el SQL editor.
3. En Authentication, deja habilitado Email provider. Si no cargas `SUPABASE_SERVICE_ROLE_KEY`, desactiva "Confirm email" para poder crear usuarios con emails sinteticos.
4. Copia `.env.example` a `.env.local` y completa las variables.
5. Para registro con usuario + contraseña sin email real, carga tambien `SUPABASE_SERVICE_ROLE_KEY` en Vercel y local.
6. Valida los datos base:

```bash
npm run validate:stickers
npm run test:parser
```

7. Instala dependencias y ejecuta la app:

```bash
npm install
npm run dev
```

## Datos del album

La checklist base vive en `src/data/sticker-data.ts` y el seed SQL se regenera con:

```bash
node scripts/generate-supabase-seed.mjs
```

El validador exige 980 figuritas, 48 equipos y 13 secciones.

## Deploy gratis

Sube el repo a GitHub y conectalo en Vercel Hobby. Vercel da HTTPS automaticamente, necesario para la camara del iPhone.

## Instalar en iPhone

Abre la URL de Vercel en Safari, toca Compartir y elige "Agregar a inicio". La app queda como PWA, sin App Store.
