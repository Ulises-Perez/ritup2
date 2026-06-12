# RitupVuejs — Reproductor de Música

Aplicación de música construida con Vue.js 3, TypeScript y Tailwind CSS. Usa la API pública de **Deezer** para catálogo y metadatos, y **yt-dlp** (vía un backend Node.js) para extraer el stream de audio real de YouTube, evitando el bloqueo de incrustación.

No requiere cuenta ni credenciales de ningún servicio de música.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 |
| pnpm | 11 (`corepack enable pnpm`) |
| Python | 3.8+ (en el PATH) |
| yt-dlp | última (`pip install -U yt-dlp`) |

> Este proyecto se gestiona **exclusivamente con pnpm**. `npm` y `yarn` están bloqueados por el script `preinstall`.

---

## Instalación

```bash
git clone <url-del-repo>
cd ritupVuejs

# Dependencias del frontend
pnpm install

# Instalar/actualizar yt-dlp (necesario para el backend de audio)
pip install -U yt-dlp
```

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# YouTube Data API v3 — para búsqueda de videos (opcional si usas Invidious)
YOUTUBE_API_KEY=tu_api_key_aqui

# Intérprete de Python si no está en el PATH estándar
# YTDLP_PYTHON=C:/Users/tu-usuario/AppData/Local/Programs/Python/Python311/python.exe
```

La API key de YouTube se obtiene en [Google Cloud Console](https://console.cloud.google.com/) habilitando **YouTube Data API v3**.

---

## Ejecutar el proyecto

```bash
# Frontend (Vite, puerto 8888) + backend de audio (Node, puerto 8000) en paralelo
pnpm dev:full

# Solo frontend
pnpm dev

# Solo backend de audio
pnpm dev:api
```

La app queda disponible en **http://127.0.0.1:8888**.

El backend Node ([src/api/youtube_search.js](src/api/youtube_search.js)) expone:

| Endpoint | Uso |
|---|---|
| `GET /audio?query=` | Extrae stream de audio con yt-dlp (búsqueda) |
| `GET /audio?id=` | Extrae stream de audio por ID de video |
| `GET /search?query=` | Busca videos vía YouTube Data API |
| `use /deezer/*` | Proxy de `api.deezer.com` (para producción; en dev lo maneja Vite) |

---

## Estructura del proyecto

```
src/
├── api/
│   └── youtube_search.js       # Backend Node: extracción de audio (yt-dlp) + proxy Deezer
│
├── components/
│   ├── layout/
│   │   ├── AppSidebar.vue      # Barra lateral con navegación y biblioteca
│   │   └── TopBar.vue          # Barra superior con historial y búsqueda rápida
│   ├── player/
│   │   ├── MiniPlayer.vue      # Dock del reproductor (siempre visible)
│   │   ├── NowPlaying.vue      # Panel "reproduciendo ahora" (overlay)
│   │   └── QueueSheet.vue      # Panel lateral con la cola de reproducción
│   ├── search/
│   │   └── CommandPalette.vue  # Paleta de búsqueda rápida (Cmd/Ctrl+K)
│   ├── HomeView.vue            # Contenido del home
│   ├── TrackList.vue           # Lista de canciones reutilizable
│   ├── SimilarTracks.vue       # Panel de canciones similares
│   ├── AddToPlaylistMenu.vue   # Dropdown para añadir canción a playlist local
│   └── CreatePlaylistDialog.vue # Diálogo para crear nueva playlist local
│
├── views/
│   ├── HomeView.vue            # Wrapper del home (layout externo)
│   ├── ArtistView.vue          # Artista: bio, top tracks, discografía
│   ├── AlbumView.vue           # Álbum: carátula, tracks
│   ├── PlaylistView.vue        # Playlist Deezer o local: tracks + guardar en biblioteca
│   ├── GenreView.vue           # Género/categoría: artistas y radios del género
│   ├── LibraryView.vue         # Biblioteca local del usuario
│   ├── SearchView.vue          # Búsqueda: canciones, artistas, álbumes, playlists
│   └── ProfileView.vue         # Ajustes de perfil y configuración
│
├── store/
│   ├── deezerStore.ts          # API de Deezer: búsqueda, charts, géneros, radios, editorial
│   ├── deezerNormalize.ts      # Normalización Deezer → forma común que lee la UI
│   ├── playerStore.ts          # Estado del reproductor: cola, shuffle, repeat, autoplay
│   ├── apiStore.ts             # Abstracción sobre audioStore / invidiousStore
│   ├── audioStore.ts           # Reproducción vía yt-dlp (backend Node)
│   ├── invidiousStore.ts       # Reproducción vía instancia de Invidious
│   ├── youtubeStore.ts         # Búsqueda de videos (YouTube Data API)
│   ├── libraryStore.ts         # Biblioteca local: playlists del usuario (localStorage)
│   └── configStore.ts          # Configuración: tema oscuro/claro, backend de audio
│
├── composables/
│   ├── useShell.ts             # Estado global de diálogos (crear playlist, etc.)
│   └── usePlayerControls.ts   # Atajos de teclado para el reproductor
│
├── lib/
│   └── utils.ts                # Utilidades (cn para clases Tailwind)
│
├── router/
│   └── index.ts                # Rutas: /, /artist/:id, /album/:id, /playlist/:id,
│                               #        /genre/:id, /library, /library/:id,
│                               #        /search, /profile
│
└── components/ui/              # Componentes de shadcn/ui (reka-ui base)
    ├── button/, card/, input/, dialog/, dropdown-menu/
    ├── sheet/, skeleton/, scroll-area/, slider/
    ├── tabs/, switch/, badge/, tooltip/
    └── avatar/, separator/, sonner/, popover/, command/
```

---

## Funcionalidades

### Home
- **Artistas populares** — top del chart global de Deezer
- **Top canciones** — top tracks del chart, reproducibles al instante
- **Géneros** — 23 categorías con imagen; navegan a su propia vista
- **Nuevos lanzamientos** — álbumes del chart
- **Playlists destacadas** — playlists del chart con portada de la primera canción
- **Selección** — álbumes curados por el equipo editorial de Deezer

### Reproductor
- Stream de audio real vía **yt-dlp** (resuelve por búsqueda `"artista cancion"`)
- Alternativa: **Invidious** (instancia configurable, sin clave de API)
- Cola de reproducción con shuffle, repeat (off / all / one) y autoplay
- Canciones similares automáticas al terminar la cola
- Estado persistido en `localStorage`

### Biblioteca local
- Crear, renombrar y eliminar playlists propias
- Añadir canciones individuales desde cualquier vista (botón `+`)
- **Importar cualquier playlist de Deezer** con "Añadir a tus playlists" (copia todos los tracks; detecta duplicados por `sourceId`)
- Portada derivada automáticamente de la primera canción con imagen

### Búsqueda
- Búsqueda multi-tipo: canciones, artistas, álbumes, playlists (4 requests en paralelo a Deezer)
- Paleta de búsqueda rápida con `Ctrl+K` / `Cmd+K`

### Géneros
- Vista `/genre/:id` con artistas del género y radios temáticas
- Al pulsar una radio, se resuelven sus tracks y se reproducen como cola

---

## Scripts

```bash
pnpm dev          # Frontend en http://127.0.0.1:8888
pnpm dev:api      # Solo backend Node (puerto 8000)
pnpm dev:full     # Frontend + backend en paralelo

pnpm build        # Build de producción (incluye type-check)
pnpm preview      # Preview del build

pnpm type-check   # vue-tsc sin emitir
pnpm lint         # ESLint con autofix
pnpm format       # Prettier sobre src/

pnpm test:unit    # Vitest
pnpm test:e2e     # Playwright
```

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + TypeScript + Vite |
| Estilos | Tailwind CSS v4 |
| Estado | Pinia |
| Routing | Vue Router 4 |
| UI components | shadcn/ui (reka-ui) |
| Iconos | Lucide Vue |
| Notificaciones | vue-sonner |
| Datos musicales | Deezer API (pública, sin auth) |
| Audio | yt-dlp vía Node.js (`<audio>` nativo) |
| Audio alternativo | Invidious (instancia propia) |
| Backend dev/prod | Express (Node.js) |

---

## Despliegue en producción

En producción, el proxy de Deezer lo gestiona el backend Express (ruta `/deezer/*` en `src/api/youtube_search.js`). Apunta la variable de entorno del frontend al servidor:

```env
VITE_DEEZER_PROXY_BASE=https://tu-servidor.com/deezer
```

En desarrollo el proxy lo gestiona Vite directamente (`vite.config.ts`), sin necesidad de la variable.
