# FiguritasApp

[English](README.en.md)

Una app web instalable para llevar el álbum del Mundial 2026, organizar repetidas y coordinar intercambios con amigos. Nació para compartir un álbum en familia y resolver una pregunta cotidiana: **¿cuáles nos faltan?**

**[Abrir FiguritasApp →](https://figuritasappcarru.vercel.app)** · Requiere registro gratuito.

## Vista previa

| Álbum | Estadísticas | Intercambios |
| :---: | :---: | :---: |
| ![Álbum con progreso y figuritas marcadas](docs/images/album.png) | ![Resumen del progreso del álbum](docs/images/estadisticas.png) | ![Propuesta de intercambio entre amigos](docs/images/intercambios.png) |

*Interfaz real con datos ficticios de demostración.*

## Qué podés hacer

- **Llevar tu álbum:** marcar figuritas, consultar imágenes y ver el progreso por selección.
- **Organizar repetidas y faltantes:** cargar cantidades, importar listas y compartirlas como texto.
- **Intercambiar con amigos:** comparar álbumes y armar propuestas con las repetidas que le sirven a cada uno.
- **Seguir el progreso:** consultar estadísticas, actividad y recibir notificaciones en dispositivos compatibles.
- **Cargar desde el celular:** usar el scanner con cámara o ingreso manual e instalar la app desde el navegador.

## Cómo está construida

**Next.js · React · TypeScript · Tailwind CSS · Supabase · Vercel**

La **PWA** permite instalarla en el iPhone sin pasar por la App Store. **Supabase** reúne autenticación, PostgreSQL, permisos por fila y sincronización en tiempo real. El scanner procesa las imágenes en el navegador con **OpenCV.js y Tesseract.js**.

## Más información

[Instalación y desarrollo](docs/DEVELOPMENT.md) · [Arquitectura y decisiones técnicas](docs/ARCHITECTURE.md)

Desarrollado por [Francisco Carruthers](https://github.com/FranciscoCarruthers).

*Proyecto independiente, no afiliado a Panini, FIFA ni Coca-Cola. Las marcas e imágenes de terceros pertenecen a sus respectivos titulares. Licencia del código pendiente de definición.*
