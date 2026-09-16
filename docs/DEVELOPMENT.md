# Instalación y desarrollo

[Volver al README](../README.md) · [Arquitectura](ARCHITECTURE.md)

## Requisitos

- **Node.js 24** y npm. Aunque `package.json` declara Node >=20, las pruebas `test:app` usan la ejecución nativa de TypeScript; usar Node 24 permite ejecutar todos los comandos indicados.
- Un proyecto propio de **Supabase** para autenticación y base de datos.

## Preparar el proyecto

```bash
git clone https://github.com/FranciscoCarruthers/Figuritas_app.git
cd Figuritas_app
npm ci
```

Copiar `.env.example` a `.env.local` y completar las variables. En PowerShell: `Copy-Item .env.example .env.local`; en macOS/Linux: `cp .env.example .env.local`.

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. Obligatoria. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública `anon` del proyecto. Obligatoria; el acceso a los datos depende de las políticas RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada del servidor para registro administrado, resolución de usuarios, recuperación de contraseña y notificaciones push. Recomendada para el flujo completo. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID, necesaria para activar push. |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID, solo en el servidor. |
| `VAPID_SUBJECT` | Contacto del emisor de push, por ejemplo `mailto:tu-correo@example.com`. |

Las variables `NEXT_PUBLIC_*` se incluyen en el cliente durante el build. No poner claves privadas bajo ese prefijo ni subir `.env.local` al repositorio.

## Configurar Supabase

Para un proyecto **nuevo**, ejecutar en el SQL Editor, en este orden:

1. [`supabase/schema.sql`](../supabase/schema.sql): tablas, funciones, políticas RLS y publicación de cambios para Realtime.
2. [`supabase/seed.sql`](../supabase/seed.sql): catálogo de 980 figuritas principales y 14 bonus.

El esquema y el seed actuales ya incluyen los cambios de `user-announcements.sql`, `cancel-accepted-trades.sql` y `coca-cola-bonus.sql`. Esos scripts sirven para actualizar instalaciones anteriores; no son pasos adicionales de una instalación nueva. Revisar cada script antes de aplicarlo a una base existente.

En Authentication, habilitar el proveedor Email y el registro de usuarios. Configurar la URL del sitio y permitir el retorno a `http://localhost:3000/login?reset=1`; añadir también la URL equivalente del despliegue para recuperar contraseñas.

Con `SUPABASE_SERVICE_ROLE_KEY`, el servidor crea las cuentas con usuario y contraseña. El correo de recuperación es opcional: sin un correo real no se puede recuperar la contraseña por email. Sin esa clave, el registro usa el flujo público de Supabase; para entrar inmediatamente con los correos sintéticos `@figuritas.local`, se necesita desactivar la confirmación de email. Ese modo no ofrece todas las funciones del servidor.

## Ejecutar

```bash
npm run dev
```

Abrir [localhost:3000](http://localhost:3000), crear un usuario de prueba y comenzar el álbum. Para comprobar la versión de producción:

```bash
npm run build
npm start
```

La cámara necesita permiso del navegador y un contexto seguro (HTTPS o localhost). Para probar desde un teléfono, usar un despliegue HTTPS; una dirección HTTP de la red local no equivale a localhost.

## Notificaciones e instalación

Para usar push, generar un par de claves con la dependencia instalada:

```bash
npx web-push generate-vapid-keys
```

Completar las tres variables VAPID y la clave de servidor de Supabase. Sin esa configuración, push no estará disponible. La recepción depende del soporte del navegador, de la instalación cuando corresponda y del permiso del usuario.

En iPhone, abrir la app en Safari y usar **Compartir → Agregar a inicio**. El service worker se registra en producción, por lo que `npm run dev` no sirve para comprobar toda la experiencia PWA. Usar el build de producción o el despliegue.

## Comprobaciones

```bash
npm run lint
npm run validate:stickers
npm run test:parser
npm run test:scan
npm run test:image-mapping
npm run test:app
npm run test:auth
npm run build
```

Estos scripts comprueban catálogo, parser, helpers del scanner, mapeo de imágenes y lógica de la app. `test:auth` ejecuta los endpoints de autenticación con Supabase simulado y verifica que los errores no expongan correos ni credenciales. No sustituyen pruebas de cámara en un teléfono ni pruebas integradas con Supabase y Web Push.

Si ESLint encuentra directorios temporales locales ajenos al proyecto, se pueden excluir en esa ejecución:

```bash
npm run lint -- --ignore-pattern '.tmp-pydeps/**' --ignore-pattern 'tmp/**'
```

El catálogo fuente vive en `src/data/sticker-data.ts`. Tras modificarlo, regenerar el seed con `node scripts/generate-supabase-seed.mjs` y revisar el diff. `npm run audit:images` genera un informe local del mapeo de imágenes.

## Despliegue en Vercel

Importar el repositorio como proyecto Next.js, seleccionar Node 24 y cargar las variables de entorno para el ambiente correspondiente. Añadir el dominio HTTPS del despliegue a la configuración de autenticación de Supabase. Los cambios en variables públicas requieren un nuevo build.

Después del despliegue, comprobar registro e ingreso, persistencia del álbum al recargar, sincronización entre dos sesiones y, si se configuró, recepción de push. Usar cuentas de prueba propias.

## Presentación en GitHub

Descripción sugerida para **About**:

> PWA para organizar el álbum del Mundial 2026, llevar repetidas e intercambiar figuritas con amigos. Next.js, TypeScript y Supabase.

Website: [figuritasappcarru.vercel.app](https://figuritasappcarru.vercel.app)

Temas sugeridos: `nextjs`, `react`, `typescript`, `supabase`, `pwa`, `sticker-album`, `world-cup-2026`.

La licencia del código está pendiente de definición. Los recursos de terceros se describen en [Arquitectura](ARCHITECTURE.md#recursos-de-terceros).
