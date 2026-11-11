# Pedido para Claude: auditoría visual de LABURAPP

Quiero una auditoría visual y de experiencia de usuario basada en el navegador y en este código. Primero entregá el diagnóstico; no hagas cambios todavía.

## Producto y decisiones que se deben conservar

LABURAPP conecta personas y comercios que necesitan contratar changas en Bahía Blanca con personas que pueden realizarlas. Mantener el nombre, el lenguaje argentino sencillo y la identidad visual actual inspirada en colores de la bandera de Bahía Blanca.

- Cualquiera puede buscar, filtrar, leer el detalle de un aviso y compartir su enlace, sin cuenta.
- Publicar, postularse, ver perfiles y CV, conversar, dar Me gusta y reportar requieren iniciar sesión. El ingreso actual es con ChatGPT.
- Publicar debe sentirse como una conversación: la persona escribe una idea, el sistema interpreta rubro y datos, y pregunta únicamente lo que falta. Las sugerencias son reglas locales; no afirmar que consulta un servicio de IA.
- Solo se publican tareas para contratar, sin ventas de productos ni propaganda de emprendimientos. Particulares y comercios pueden contratar.
- No se permite la autopostulación. Hay límites de postulaciones y candidatos, presentación específica y disponibilidad para evitar postulaciones indiscriminadas.
- No mostrar el teléfono antes de la preselección o propuesta. No exponer correos o conversaciones ajenas.
- Las habilidades son declaradas; no prometer verificaciones de identidad o de experiencia inexistentes.

## Sitio y alcance de las pruebas

URL: https://dale-bahia-changas.meanderingpitch1.chatgpt.site

Revisá primero la página pública. No insertes avisos, perfiles, postulaciones ni reportes ficticios en producción. El listado real empieza vacío; para revisar tarjetas y otros estados, usá datos ilustrativos únicamente en una base local separada. Las migraciones de `drizzle/` solo crean el esquema y no incluyen esos datos.

Si necesitás entrar a una cuenta real o no contás con navegador, indicá qué pudiste comprobar y qué quedó pendiente. No presentes una lectura del CSS como una prueba visual realizada.

Probá al menos 390×844 y 360×800 (celular vertical), 844×390 (horizontal), 768×1024 (tablet), 1366×768 y 1920×1080 (computadora). Revisá además zoom de 200 % y navegación con teclado.

## Recorridos a revisar

1. Primer acceso sin cuenta: entender qué ofrece la app y distinguir buscar trabajo de contratar.
2. Buscar por texto, rubro, zona y duración; listado vacío, resultados y paginación.
3. Abrir el detalle de una changa sin iniciar sesión.
4. Intentar postularse, ver un perfil, publicar, dar Me gusta o reportar: claridad del pedido de ingreso y opción de seguir mirando sin cuenta.
5. Volver después de ingresar: conservar la changa elegida y el borrador, sin enviar acciones automáticamente.
6. Publicación asistida: interpretación, preguntas faltantes, revisión, edición y confirmación.
7. Perfil, selección de rubros y CV opcional; postulación y errores de validación.
8. Mi actividad, revisión de candidatos, preselección, conversaciones y acuerdo. Si usás datos de prueba, solo en local.
9. Diálogos con teclado del celular abierto, contenido largo, cierre y desplazamiento; barra inferior y elementos fijos.
10. Carga, fallo de conexión, sesión vencida y botones mientras se guarda.

## Qué evaluar

Jerarquía visual, densidad, espacios, legibilidad, contraste, tamaños táctiles, consistencia de iconos y botones, textos, foco visible, etiquetas accesibles, scroll, desbordamientos, superposiciones, claridad de los estados y confianza del usuario. Evaluá si la interfaz ayuda a publicar y a elegir oportunidades adecuadas sin volverla un formulario pesado.

## Entrega esperada

- Capturas reales de cada problema, con tamaño de pantalla y pasos para reproducirlo.
- Tabla: prioridad (alta/media/baja), pantalla, problema observado, consecuencia y solución propuesta.
- Diferenciar errores comprobados de opiniones de diseño y de recorridos no verificados.
- Cinco mejoras prioritarias y una propuesta visual coherente con la identidad existente.
- Señalar archivo y selector o función implicados cuando corresponda.

Después de mostrarme el diagnóstico, esperá mi aprobación para implementar. Si autorizo cambios, creá una rama propia y un PR; no publiques, no toques datos reales y no cambies reglas de negocio ni autenticación como parte de un ajuste visual.

## Referencias de código

La interfaz visible está principalmente en `public/index.html`, `public/style.css`, `public/app.js` y `public/publish.js`. `scripts/prepare-laburapp.mjs` genera `app/landing.ts` y los módulos de reglas de `lib/domain/`; no edites solo esos archivos generados. El servidor y la privacidad están en `lib/api.mjs`; las pruebas en `tests/`.

Base exportada del sitio: commit `80a7ecacd99fa81249b53fd4ff0219afaa7d0239`. Esta copia no tiene publicación automática ni acceso a datos del sitio.
