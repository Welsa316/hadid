import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/calendar', name: 'calendar', component: () => import('@/views/CalendarView.vue') },
  { path: '/history', name: 'history', component: () => import('@/views/HistoryView.vue') },
  {
    path: '/history/:id',
    name: 'workout-detail',
    component: () => import('@/views/WorkoutDetailView.vue'),
  },
  { path: '/routines', name: 'routines', component: () => import('@/views/RoutinesView.vue') },
  { path: '/exercises', name: 'exercises', component: () => import('@/views/ExercisesView.vue') },
  {
    path: '/exercises/:id',
    name: 'exercise-detail',
    component: () => import('@/views/ExerciseDetailView.vue'),
  },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
  {
    path: '/settings/changelog',
    name: 'changelog',
    component: () => import('@/views/ChangelogView.vue'),
  },
  { path: '/workout', name: 'workout', component: () => import('@/views/WorkoutView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})
