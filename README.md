# LABURAPP

Marketplace de changas en Bahía Blanca. Conserva el diseño y la publicación asistida del prototipo, con identidad de ChatGPT y registros compartidos en D1.

## Acceso

- Sin cuenta: listado, filtros y detalle de una publicación, incluido un enlace para compartir.
- Con cuenta: perfiles y CV, publicaciones, postulaciones, mensajes, acuerdos, calificaciones, Me gusta y reportes.
- La identidad proviene de los encabezados verificados de Sites. El cliente no puede elegir su identidad o el dueño de una publicación.
- Los correos no se guardan ni se exponen. El teléfono opcional se entrega solamente al dueño y a su postulante preseleccionado o con una propuesta vigente.
- Las conversaciones solo se entregan a las dos partes. El servidor aplica las mismas reglas del flujo, además de controles de origen, validación y límites de cuerpo.

## Auditoría visual con Claude

Sitio publicado: https://dale-bahia-changas.meanderingpitch1.chatgpt.site

Leé [AUDITORIA_VISUAL.md](AUDITORIA_VISUAL.md) antes de empezar. Este repositorio es una copia para revisión del código de la versión publicada el 11/11/2026. Los cambios acá no publican automáticamente el sitio.

## Desarrollo

Requiere Node.js 22.13 o superior (se recomienda Node.js 24 para ejecutar las pruebas de SQLite). Instalá con `npm ci`. Antes de ejecutar `npm run dev` o compilar con `npm run build`, ejecutar `node scripts/prepare-laburapp.mjs`: genera módulos ESM de las reglas probadas de `public/` y la respuesta HTML de la portada.

- Pruebas: `node --test tests/*.test.cjs tests/server.test.mjs`.
- Generar migraciones: `npm run db:generate`.
- Compilar en una copia independiente: `npm run build`. En el sitio administrado, usar el script `build-site.mjs` del plugin Sites.
- Migraciones locales: usar los comandos de D1 local del starter, en orden, sin repetir las aplicadas.

Los registros reales nunca se importan del prototipo local. Los borradores sin publicar siguen en el dispositivo. No se insertan avisos ficticios en producción.

Las mutaciones usan una revisión optimista con reintentos y lotes atómicos de D1. Los cupos y acuerdos se verifican dentro de esa revisión para impedir carreras. El listado tiene paginación estable y búsqueda compartida. Los CV opcionales son PDF de hasta 5 MB, se guardan en R2 y se descargan con identidad y como adjunto.

## Límites explícitos

Los mensajes se consultan al abrir una conversación o con Actualizar conversación; no hay notificaciones push ni entrega en tiempo real. Los reportes quedan pendientes; esta entrega no incluye un panel de moderación ni revisión automática. Las habilidades son declaradas, no verificadas. No se procesan pagos.

## Copia independiente

El identificador del sitio publicado fue retirado de `.openai/hosting.json` en esta copia. Se conservan los nombres lógicos de los recursos para compilar y probar localmente. No se incluyen credenciales, sesiones ni bases de datos. Los cambios propuestos deben revisarse antes de integrarlos al sitio administrado.
