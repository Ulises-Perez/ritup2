import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SearchView from '../views/SearchView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/artist/:id',
      name: 'artist',
      component: () => import('../views/ArtistView.vue'),
    },
    {
      path: '/album/:id',
      name: 'album',
      component: () => import('../views/AlbumView.vue'),
    },
    {
      // Playlist pública de Deezer (catálogo).
      path: '/playlist/:id',
      name: 'playlist',
      component: () => import('../views/PlaylistView.vue'),
    },
    {
      // Categoría/género de Deezer: artistas y radios del género.
      path: '/genre/:id',
      name: 'genre',
      component: () => import('../views/GenreView.vue'),
    },
    {
      // Biblioteca del usuario (todas sus playlists).
      path: '/library',
      name: 'library',
      component: () => import('../views/LibraryView.vue'),
    },
    {
      // Playlist local creada por el usuario (biblioteca).
      path: '/library/:id',
      name: 'library-playlist',
      component: () => import('../views/PlaylistView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: SearchView,
      props: (route) => ({ query: route.query.q || '' }),
    },
  ],
})

export default router
