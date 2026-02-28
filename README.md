# RitupVuejs - Reproductor de Música 🎵

Una aplicación de música moderna construida con Vue.js 3, TypeScript y Tailwind CSS que replica la experiencia de Spotify con funcionalidades avanzadas.

## ✨ Nuevas Funcionalidades Implementadas

### 🎯 Panel de Información Mejorado

- **ActiveFriends** ahora muestra información detallada de la canción actual
- Barra de progreso en tiempo real
- Lista de canciones en cola con navegación
- Información del álbum y artistas
- Interfaz más elegante y funcional

### 🔍 Búsqueda Rediseñada

- Diseño centrado similar a la interfaz de referencia
- Resultado más relevante destacado en el centro
- Canciones relacionadas en contenedor mejorado
- Transiciones y efectos visuales modernos
- Layout responsive y optimizado

### 🎵 Sistema de Canciones Similares

- **Nuevo componente SimilarTracks** para recomendaciones
- Integración con la API de Spotify para obtener recomendaciones
- Autoplay automático de canciones similares
- Contexto de reproducción inteligente (playlist/album/similar)
- Cola de reproducción avanzada

### 🎮 Reproductor Mejorado

- Soporte para contextos de reproducción (playlist, álbum, búsqueda)
- Autoplay inteligente al finalizar canciones
- Gestión automática de canciones similares
- Estado persistente en localStorage
- Navegación avanzada entre canciones

## 🚀 Características Principales

### 🎧 Reproducción

- Reproductor de audio integrado con controles completos
- Soporte para preview de Spotify y YouTube
- Cola de reproducción con navegación
- Modo autoplay con recomendaciones
- Control de volumen y silencio

### 🔎 Búsqueda Inteligente

- Búsqueda integrada con Spotify API
- Resultados categorizados (canciones, artistas, álbumes, playlists)
- Recomendaciones personalizadas
- Vista de resultado más relevante destacada

### 📱 Interfaz Moderna

- Diseño responsive y elegante
- Tema oscuro optimizado
- Animaciones y transiciones suaves
- Componentes reutilizables
- Layout de grid adaptativo

### 🔗 Integración API

- **Spotify Web API** para datos musicales
- **YouTube API** (opcional) para reproducción
- Autenticación OAuth2 con Spotify
- Gestión automática de tokens

## 🛠️ Configuración del Proyecto

### Prerrequisitos

```bash
Node.js 18+
npm o yarn
```

### Instalación

```bash
# Clonar el repositorio
git clone [url-del-repo]
cd ritupVuejs

# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend (API de YouTube)
cd src/py
pip install -r requirements.txt
```

### Configuración de APIs

#### Spotify API

1. Ve a [Spotify Developer Console](https://developer.spotify.com/dashboard)
2. Crea una nueva aplicación
3. Añade `http://localhost:5173/callback` a las URIs de redirección
4. Copia las credenciales en `src/services/spotifyAuth.ts`

#### YouTube API (Opcional)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto y habilita YouTube Data API v3
3. Crea una API Key
4. Crea archivo `.env` en `src/py/`:

```env
YOUTUBE_API_KEY=tu_api_key_aqui
```

### Ejecutar el Proyecto

#### Frontend (Vue.js)

```bash
npm run dev
```

#### Backend (API de YouTube - Opcional)

```bash
cd src/py
python youtube_search.py
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ActiveFriends.vue      # Panel de información mejorado
│   ├── SimilarTracks.vue      # Componente de recomendaciones
│   ├── Player.vue             # Reproductor principal
│   ├── TrackList.vue          # Lista de canciones
│   └── ...
├── store/
│   ├── playerStore.ts         # Estado del reproductor mejorado
│   ├── spotifyStore.ts        # Integración con Spotify API
│   └── ...
├── views/
│   ├── SearchView.vue         # Vista de búsqueda rediseñada
│   ├── HomeView.vue           # Vista principal
│   └── ...
└── py/
    ├── youtube_search.py      # API de YouTube
    └── requirements.txt       # Dependencias Python
```

## 🎨 Tecnologías Utilizadas

- **Frontend:** Vue.js 3, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Estado:** Pinia Store
- **Routing:** Vue Router
- **Backend:** FastAPI (Python)
- **APIs:** Spotify Web API, YouTube Data API

## 🌟 Funcionalidades Destacadas

### Panel Lateral Inteligente

- Información de reproducción actual
- Cola de canciones con navegación
- Recomendaciones automáticas
- Estado de autoplay

### Contexto de Reproducción

- Diferenciación entre playlist, álbum y búsqueda
- Canciones similares automáticas
- Navegación contextual
- Autoplay inteligente

### Búsqueda Avanzada

- Resultados centrados y destacados
- Categorización inteligente
- Vista de resultado principal
- Integración con recomendaciones

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Construcción
npm run build

# Vista previa de producción
npm run preview

# Linting
npm run lint

# Testing
npm run test

# Servidor Python (YouTube API)
cd src/py && python youtube_search.py
```

## 📱 Responsive Design

La aplicación está optimizada para:

- 💻 Desktop (1920px+)
- 💻 Laptop (1366px+)
- 📱 Tablet (768px+)
- 📱 Mobile (375px+)

## 🚀 Próximas Mejoras

- [ ] Integración completa con YouTube Music
- [ ] Soporte para playlists colaborativas
- [ ] Modo offline con cache
- [ ] Visualizaciones de audio
- [ ] Temas personalizables
- [ ] Integración con Last.fm

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🎵 ¡Disfruta la música!

Una experiencia musical moderna y completa construida con las mejores tecnologías web.
