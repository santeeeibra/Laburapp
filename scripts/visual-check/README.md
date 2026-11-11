# Chequeo visual local

Repite con un comando la verificación visual de LABURAPP en 6 tamaños (390×844, 360×800, 844×390, 768×1024, 1366×768 y 1920×1080).

```bash
npm i -D playwright && npx playwright install chromium   # una sola vez
npm run check:visual                                       # capturas y reporte en .visual-check/
npm run check:visual -- --out docs/capturas-verificacion/pantallas/despues
```

## Datos
- `server.mjs` levanta un servidor en `127.0.0.1` con una base **SQLite en memoria** (los esquemas salen de `drizzle/`) y datos ilustrativos: 3 changas, 4 perfiles, 3 postulaciones (una preseleccionada y otra con mensajes y una propuesta).
- Los datos desaparecen al cerrar el proceso. Nunca se conecta a producción y `--url` solo acepta direcciones locales.
- La sesión se simula con la cookie `dev_user` (`owner`, `worker`, `worker2`, `worker3`) y la API caída con `down=1`. Esto existe solo en el servidor de prueba; la autenticación real no cambia.
- Para mirar el sitio a mano: `node scripts/visual-check/server.mjs 4321`.

## Qué revisa
- 17 pantallas: portada, detalle sin cuenta, perfil propio y público, los seis pasos de la publicación asistida, Mi actividad (publicaciones y postulaciones), candidatos y preselección, conversación (de cada lado) y propuesta de acuerdo.
- Ningún texto por debajo de 11 px.
- Controles de al menos 44 px en celular y tablet (táctiles) y de al menos 24 px en computadora (WCAG 2.5.8). Quedan exceptuados los enlaces dentro de un párrafo.
- Sin desborde horizontal ni errores de JavaScript.
- Foco visible al navegar con Tab, incluido el buscador.
- API caída: no aparecen "Ingresar" y "Mi perfil" juntos, ni un aviso tapando el contenido.
- Barra inferior con sesión: dice "Mi actividad" y la abre.
- Postulación vacía: mensajes propios en castellano, sin el globo del navegador, que se actualizan y se borran al corregir.

Termina con código 1 si algo falla. El detalle queda en `reporte.md` y `reporte.json`.
