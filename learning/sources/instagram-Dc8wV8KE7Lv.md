# Fuente: Instagram p/Dc8wV8KE7Lv (intento 06/09/2026, iter-177) — BLOQUEADO, cero contenido extraído

URL pedida: https://www.instagram.com/p/Dc8wV8KE7Lv/?stkn=NTc4MTIwNjQ2YQ==
 shortcode: Dc8wV8KE7Lv · stkn: NTc4MTIwNjQ2YQ== (base64 de "578120646a", parece ID de app/usuario, NO sesión)

## Intentos keyless (todos verificados, nada inventado)

1. `webfetch markdown` del post → solo "Instagram" + 2 PNG placeholder en data-uri (iconos de login-wall). Sin caption, sin meta, sin enlaces.
2. `GET instagram.com/api/v1/oembed/?url=...` → **403** (oEmbed ahora exige auth/token).
3. `GET /p/Dc8wV8KE7Lv/embed/captioned/` → HTML 617.430 bytes analizado por subagente explore:
   - CERO `og:*` / `twitter:*` / `display_url` / `video_url` / `edge_media_to_caption` / `owner` / `taken_at`.
   - `title` = "Instagram" genérico; únicas `https://` = `static.cdninstagram.com/rsrc.php` (iconos/css/js).
   - Marcadores de error: `"page_logging":{"name":"httpErrorPage"}`, `"show_lox_redesigned_404_page":true`, `"pageID":"httpErrorPage"`, `"is_logged_out_user":true`.
4. `websearch "Dc8wV8KE7Lv"` → sin índice del shortcode (solo scrapers genéricos de pago: Apify, Xbyte, SociaVault, Meta Content Library con research-env).

## Veredicto

Post NO accesible sin sesión: 404 de embed para logged-out + 403 de oEmbed. Causas posibles: cuenta privada,
post eliminado/expirado, o share con token `stkn` válido solo en sesión del destinatario. Mismo precedente que
IG DcL0G4MDiKV y FB share 807 (STATE.md): requiere ACCIÓN HUMANA.

## Acción humana requerida (una de)

- Abrir el enlace en Instagram logueado y pegar aquí: texto del caption + enlaces que contenga + descripción de las imágenes; o
- Autorizar sesión para `instaloader --login` o `yt-dlp --cookies-from-browser` (ver `docs/RAZONAMIENTO-*` pendiente); o
- Pasar capturas del post (se analizan con `video_edit`/`imaging` una vez visibles).

## Regla reafirmada

Scrapers IG públicos sin API (`?__a=1&__d=dis`, KoDelioDa, instaloader) solo sirven CON sesión válida.
Sin ella, documentar el bloqueo y pedir el contenido al humano — jamás inventar caption, autor ni enlaces.
