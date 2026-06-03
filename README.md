# FiguritasApp

FiguritasApp es una PWA para llevar el álbum de figuritas Panini de la FIFA World Cup 2026 entre varias personas, pensada para usar desde el iPhone sin pasar por la App Store.

La app está disponible en: [figuritasappcarru.vercel.app](https://figuritasappcarru.vercel.app)

## Qué permite hacer

- Registrar el progreso del álbum compartido con usuario y contraseña.
- Marcar rápidamente qué figuritas están pegadas y cuáles faltan.
- Ver el álbum por secciones, países y figuritas bonus de Coca Cola.
- Consultar imagen, código, nombre y estado de cada figurita.
- Cargar repetidas en una pantalla rápida dedicada.
- Compartir listas de faltantes y repetidas en formato texto.
- Importar listas de faltantes desde otras apps o desde mensajes compartidos.
- Ver estadísticas de progreso, actividad diaria, brillantes faltantes y secciones más avanzadas.
- Agregar amigos, comparar álbumes y ver hace cuánto actualizaron su progreso.
- Proponer intercambios con amigos usando repetidas de ambos lados.
- Recibir notificaciones push por intercambios y cambios hechos desde otro dispositivo.
- Usar scanner manual y cámara para cargar figuritas.

## PWA para iPhone

FiguritasApp está preparada para instalarse desde Safari con **Compartir > Agregar a inicio**. Una vez agregada, se abre como web app independiente, con ícono propio, pantalla completa y sin necesidad de App Store ni cuenta de Apple Developer.

## Stack

- **Next.js + React** para la app web.
- **Vercel** para hosting, HTTPS y deploys.
- **Supabase** para autenticación, base de datos, realtime, RLS y funciones SQL.
- **Web Push** para notificaciones en dispositivos compatibles.
- **OpenCV.js + Tesseract.js** para el scanner local en navegador.
- **PWA + Service Worker** para instalación, caché de assets e íconos.

## Datos del álbum

El catálogo principal incluye 980 figuritas, 48 selecciones, secciones FWC y grupos A-L. Además, la app incluye una sección bonus de 14 figuritas Coca Cola sin afectar el progreso principal del álbum.

El progreso principal se calcula sobre las 980 figuritas base. Las figuritas bonus se muestran y se pueden marcar, compartir, cargar como repetidas e incluir en intercambios, pero no cambian el porcentaje principal.

## Filosofía del proyecto

La app nació como una herramienta familiar para compartir un álbum real y evitar tener que preguntar todo el tiempo qué figuritas faltan, cuáles están repetidas o si el álbum de otra persona está actualizado.

La prioridad es que sea rápida, clara y gratis de mantener: una web app instalable, con datos sincronizados, sin App Store y sin servicios pagos obligatorios.
