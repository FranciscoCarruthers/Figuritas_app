# Arquitectura y decisiones técnicas

[Volver al README](../README.md) · [Instalación y desarrollo](DEVELOPMENT.md)

## Organización

| Directorio | Responsabilidad |
| --- | --- |
| `src/app` | Rutas de Next.js App Router, pantallas y endpoints de autenticación y push. |
| `src/context` | Sesión, perfil y estado compartido del álbum. |
| `src/components` | Navegación, controles de figuritas, instalación y componentes reutilizables. |
| `src/lib` | Lógica de álbum, listas, intercambios, estadísticas, scanner, caché y clientes de servicios. |
| `src/data` | Catálogo tipado de figuritas, selecciones y secciones. |
| `supabase` | Esquema SQL, políticas RLS, funciones y catálogo inicial. |
| `public` | Imágenes, manifiesto PWA, íconos y service worker. |
| `scripts` | Generación y validación de datos, utilidades de imágenes y pruebas. |

## Flujo de datos

La interfaz usa React y contextos para compartir la sesión y el álbum entre pantallas. Supabase Auth mantiene la sesión; el perfil relaciona al usuario con su álbum. El navegador consulta y actualiza datos con la clave pública y el token del usuario, sujeto a las políticas RLS de PostgreSQL.

Al abrir el álbum, se muestra la caché local disponible y luego se consulta Supabase. Las actualizaciones usan cambios optimistas en la interfaz y las suscripciones Realtime reciben cambios de otros dispositivos. La caché mejora el arranque; no constituye una cola de operaciones offline.

Las amistades y los intercambios utilizan funciones SQL para consultar álbumes autorizados, crear propuestas y aplicar movimientos. Los endpoints de Next.js resuelven operaciones de autenticación y envío de push que necesitan credenciales del servidor. Los endpoints push verifican la sesión antes de operar; la clave `service_role` permanece del lado servidor.

## Decisiones

- **PWA en lugar de una app nativa:** permite distribuir una sola aplicación web e instalarla desde el navegador, con especial atención al uso desde iPhone.
- **Supabase como backend:** reúne Auth, PostgreSQL, RLS y Realtime. Las reglas de acceso viven junto a los datos, y las operaciones de intercambio se resuelven mediante funciones SQL.
- **Scanner en el navegador:** OpenCV.js procesa la imagen y Tesseract.js reconoce el código. No requiere un servicio propio de OCR; la carga inicial de sus recursos y el rendimiento dependen del dispositivo y la conexión.
- **Catálogo separado del progreso:** los datos tipados alimentan la interfaz y generan el seed SQL. El porcentaje principal usa 980 figuritas; las 14 bonus de Coca-Cola se contabilizan por separado.
- **Lógica comprobable fuera de las pantallas:** los helpers concentran cálculos, importación de listas y reglas de intercambio, con scripts de validación en el repositorio.

## Límites actuales

- Se necesita una cuenta para utilizar el álbum. Las capturas del README muestran la interfaz real con respuestas de datos simuladas localmente; no representan cuentas de producción ni una modalidad demo pública.
- La PWA almacena ciertos recursos estáticos y datos recientes. La autenticación, sincronización y operaciones del servidor necesitan conexión; no se ofrece funcionamiento completo sin internet.
- Cámara, instalación y push dependen de permisos y soporte del navegador. El reconocimiento puede requerir corrección manual según luz, enfoque o calidad de la imagen.
- Compartir un mismo álbum entre dispositivos se realiza usando la misma cuenta. La función Amigos compara álbumes de cuentas distintas.
- Las pruebas actuales cubren datos y helpers; la integración completa con Auth, RLS, Realtime y push requiere un proyecto Supabase configurado.

## Recursos de terceros

El proyecto incluye imágenes de figuritas en `public/stickers` y referencias al álbum Panini FIFA World Cup 2026 y al bonus Coca-Cola. Esas imágenes y marcas pertenecen a sus respectivos titulares; el proyecto no está afiliado a ellos y no les atribuye una licencia de reutilización propia. La licencia del código está pendiente de definición.

Las bibliotecas utilizadas conservan sus propias licencias, disponibles en sus paquetes. La aplicación también integra Vercel Analytics y Speed Insights.
