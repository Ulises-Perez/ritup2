# RitupVuejs — Contexto para Claude

## Package manager

**Solo pnpm.** `npm` y `yarn` están bloqueados por el script `preinstall`. Usar siempre `pnpm install`, `pnpm add`, etc.

## Arquitectura general

- **Datos musicales**: Deezer API pública (sin auth, sin OAuth). Ningún endpoint requiere token.
- **Audio**: yt-dlp + `<audio>` nativo. El backend Node (`src/api/youtube_search.js`) recibe `?query=` o `?id=` y devuelve la URL directa del stream. Reproducción alternativa vía Invidious (toggleable en `configStore`).
- **No hay Spotify, no hay Python, no hay FastAPI** en la versión actual. El directorio `src/py/` y `src/services/spotifyAuth.ts` son vestigios eliminados.

## Fuente de verdad de los datos

Todo pasa por `src/store/deezerNormalize.ts` antes de llegar a la UI. La forma normalizada que leen todas las vistas es estilo Spotify:

```ts
// Track
{ id: string, name: string, duration_ms: number, preview_url: string,
  artists: [{id, name}], album: {id, name, images: [{url}]} }

// Artist
{ id: string, name: string, images: [{url}], followers: {total: number} }

// Album
{ id: string, name: string, images: [{url}], artists: [{id,name}],
  release_date: string, total_tracks: number }

// Playlist
{ id: string, name: string, images: [{url}],
  owner: {id, display_name}, tracks: {total: number} }

// Genre / Radio (no entran en el pipeline de tracks)
{ id: string, name/title: string, image: string }   // image es string, no images[]
```

Diferencias clave Deezer vs la forma Spotify que ya asumen las vistas:
- `duration` en segundos → multiplicar × 1000 para `duration_ms`
- `title` del track/álbum → `name`
- `contributors[]` o `artist` único → `artists[]`
- `cover_big/medium/small` → `images[0].url`
- IDs numéricos → `String()` siempre

## Stores

| Store | Responsabilidad |
|---|---|
| `deezerStore` | Todos los endpoints de Deezer. Único punto de acceso a la API. |
| `deezerNormalize` | Solo tipos y funciones de normalización, sin estado. |
| `playerStore` | Cola, índice, shuffle, repeat, autoplay. Persiste en localStorage. |
| `apiStore` | Abstracción: delega en `audioStore` o `invidiousStore` según `configStore.useInvidious`. |
| `audioStore` | Reproduce via yt-dlp. Llama al backend en `http://localhost:8000/audio`. |
| `invidiousStore` | Reproduce via IFrame de Invidious. |
| `youtubeStore` | Búsqueda de videos via YouTube Data API (para metadatos, no para audio). |
| `libraryStore` | Playlists locales del usuario. Solo localStorage, sin backend. |
| `configStore` | `isDarkMode` + `useInvidious`. Persiste en localStorage. |

## Rutas

```
/                   HomeView (componente en src/components/HomeView.vue)
/artist/:id         ArtistView
/album/:id          AlbumView
/playlist/:id       PlaylistView (playlist pública de Deezer)
/genre/:id          GenreView
/library            LibraryView
/library/:id        PlaylistView (playlist local, route name = 'library-playlist')
/search             SearchView
/profile            ProfileView
```

`PlaylistView` detecta si es local con `route.name === 'library-playlist'`. Para playlists de Deezer muestra el botón "Añadir a tus playlists" y no para las locales.

## Biblioteca local

`libraryStore` almacena `{ id, name, tracks[], sourceId? }`. La carátula se deriva en tiempo real del primer track con imagen (`coverImages()`), nunca se persiste. `sourceId` es el ID de la playlist de Deezer de la que se importó; `hasImported(sourceId)` evita duplicados.

## Proxy Deezer

- **Dev**: Vite reescribe `/deezer/*` → `https://api.deezer.com/*` (ver `vite.config.ts`).
- **Prod**: Express reescribe `/deezer/*` en `src/api/youtube_search.js`.
- En el store se usa `const BASE = import.meta.env.VITE_DEEZER_PROXY_BASE || '/deezer'`.

## Convenciones de componentes UI

Los componentes de `src/components/ui/` son de shadcn/ui basados en reka-ui. Se importan siempre desde el barrel: `import { Button } from '@/components/ui/button'`.

Clases de utilidad con `cn()` de `src/lib/utils.ts`.

Iconos de `@lucide/vue`: `import { Play, Plus, Check } from '@lucide/vue'`.

## Patrones recurrentes en vistas

```vue
<!-- Skeleton durante carga -->
<template v-if="loading">
  <Skeleton v-for="i in N" :key="i" class="..." />
</template>

<!-- Reproducir desde contexto (playerStore) -->
playerStore.playFromContext(track, { type: 'playlist'|'album'|'search', name?, tracks[] })

<!-- Añadir canción a playlist local -->
<AddToPlaylistMenu :track="track">
  <Button ...><Plus /></Button>
</AddToPlaylistMenu>
```

## Puertos de desarrollo

| Servicio | Puerto |
|---|---|
| Frontend (Vite) | 8888 |
| Backend Node | 8000 |

## Type-check y formato

```bash
pnpm type-check   # vue-tsc --build (sin emitir)
pnpm format       # prettier --write src/
pnpm lint         # eslint --fix
```

## Orquestación de agentes (selección de modelo por tarea)

Al delegar trabajo con la herramienta `Agent` (subagentes), **elige el modelo según la fase de la tarea**, no uno fijo. Pasa `model` en la llamada (`sonnet` = `claude-sonnet-4-6`, `opus` = `claude-opus-4-8`, `haiku` = `claude-haiku-4-5`). Regla general: **opus para decisiones de arquitectura, sonnet para implementación/lectura/validación, haiku para tareas mecánicas o de copia.**

| Fase            | Modelo  | Motivo                                         |
|-----------------|---------|------------------------------------------------|
| `sdd-explore`   | sonnet  | Lee código, estructural — no arquitectónico    |
| `sdd-propose`   | opus    | Decisiones de arquitectura                     |
| `sdd-spec`      | sonnet  | Redacción estructurada                          |
| `sdd-design`    | opus    | Decisiones de arquitectura                     |
| `sdd-tasks`     | sonnet  | Desglose mecánico                              |
| `sdd-apply`     | sonnet  | Implementación                                  |
| `sdd-verify`    | sonnet  | Validación contra la spec                       |
| `sdd-archive`   | haiku   | Copiar y cerrar                                 |
| `sdd-onboard`   | haiku   | Guía paso a paso, pedagógica                    |
| `jd-judge-a`    | sonnet  | Revisión adversarial — juez ciego A             |
| `jd-judge-b`    | sonnet  | Revisión adversarial — juez ciego B             |
| `jd-fix-agent`  | sonnet  | Correcciones quirúrgicas de issues confirmados  |
| `default`       | sonnet  | Delegación general (no-SDD)                      |

**SDD** = Spec-Driven Development (explorar → proponer → especificar → diseñar → tareas → aplicar → verificar → archivar). **JD** = Judge — revisión adversarial con dos jueces ciegos independientes (`jd-judge-a`/`jd-judge-b`) y un agente de corrección (`jd-fix-agent`).

Cuando no encaje ninguna fase, usa `default` (sonnet). Sube a `opus` solo si la tarea implica decisiones de diseño o trade-offs arquitectónicos reales; baja a `haiku` para trabajo puramente mecánico (renombrados, copias, formato).
