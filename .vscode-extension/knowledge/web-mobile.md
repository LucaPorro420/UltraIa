# Web & Mobile Development Guide

## Web Development Stack
```
Frontend: React/Vue/Svelte + Next.js/Nuxt/SvelteKit
Backend: Node.js/Python/Go + PostgreSQL/Redis
Deployment: Vercel/Netlify/Cloudflare + Docker
```

## React / Next.js Patterns
```typescript
// App Router (Next.js 14+)
- Server Components: default, fetch data, no client JS
- Client Components: "use client", interactivity, hooks
- Layouts: shared UI across routes
- Loading: Suspense boundaries
- Error: error.tsx boundaries
- Metadata: SEO, OpenGraph, structured data

// State Management
- Server State: Server Components, Server Actions
- Client State: Zustand, Jotai, Context
- Form State: React Hook Form + Zod
- URL State: searchParams, nuqs

// Performance
- Dynamic Import: next/dynamic, code splitting
- Image: next/image, lazy loading, blur placeholder
- Font: next/font, automatic optimization
- Caching: revalidate, unstable_cache
```

## Vue / Nuxt Patterns
```vue
<!-- Composition API -->
<script setup lang="ts">
// Reactive state
const count = ref(0)
const doubled = computed(() => count.value * 2)

// Lifecycle
onMounted(() => { /* DOM ready */ })
onUnmounted(() => { /* cleanup */ })

// Props & Emits
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ change: [value: string] }>()
</script>

<!-- Nuxt 3 -->
- useFetch: SSR-compatible data fetching
- useAsyncData: cached data fetching
- useState: cross-request state
- useRuntimeConfig: environment variables
- middleware: route guards
- plugins: app lifecycle
```

## Mobile Development

### React Native / Expo
```typescript
// Core Components
- View: div equivalent
- Text: text display
- Image: image display
- ScrollView: scrollable container
- FlatList: optimized list
- TextInput: text input
- TouchableOpacity: press handler

// Navigation
- Expo Router: file-based routing
- Stack: screen stack
- Tabs: bottom navigation
- Drawer: side menu

// State & Data
- useState/useReducer: local state
- Context: shared state
- AsyncStorage: local persistence
- Zustand: client state
- React Query: server state

// Platform APIs
- Camera: expo-camera
- Location: expo-location
- Notifications: expo-notifications
- FileSystem: expo-file-system
- SecureStore: expo-secure-store
```

### Flutter (Dart)
```dart
// Core Widgets
Container, Column, Row, Stack
ListView, GridView, CustomScrollView
Text, TextField, ElevatedButton
Scaffold, AppBar, Drawer, BottomNavigationBar

// State Management
- Provider: simple dependency injection
- Riverpod: type-safe provider
- Bloc: business logic component
- GetX: simple state management

// Navigation
- Navigator 2.0: declarative routing
- GoRouter: declarative URL-based routing
```

### iOS (Swift)
```swift
// SwiftUI Basics
@State: local state
@Binding: child state
@ObservedObject: observable state
@StateObject: owned observable
@EnvironmentObject: shared state
@Environment: system values

// Layout
VStack, HStack, ZStack
List, ScrollView, LazyVStack
Grid, adaptive columns

// Navigation
NavigationStack: new navigation
.sheet: modal presentation
.alert: alert dialogs
```

### Android (Kotlin)
```kotlin
// Jetpack Compose
@Composable: UI function
remember: state preservation
mutableStateOf: observable state
LaunchedEffect: side effects
ViewModel: business logic

// Navigation
NavHost: navigation graph
composable("route"): screen
NavController.navigate("route")

// Material 3
MaterialTheme, Card, Button
LazyColumn, LazyRow
Scaffold, TopAppBar, BottomNavigation
```

## Responsive Design
```css
/* Breakpoints */
Mobile: < 640px
Tablet: 640-1024px
Desktop: > 1024px

/* Approach */
1. Mobile-first: design for small screens first
2. Progressive enhancement: add features for larger screens
3. Fluid typography: clamp() for font sizes
4. CSS Grid: auto-fill, minmax for responsive layouts
5. Container queries: component-level responsiveness
```

## CSS Architecture
```css
/* Modern CSS Features */
- Container Queries: @container
- Nesting: & selector
- Has(): :has(.child)
- View Transitions: @view-transition
- Subgrid: grid-template-columns: subgrid
- Anchor Positioning: anchor()

/* Performance */
- will-change: transform, opacity
- contain: layout, paint
- content-visibility: auto
- CSS Layers: @layer
```

## Accessibility (WCAG 2.1 AA)
```html
<!-- Semantic HTML -->
<header>, <nav>, <main>, <footer>
<article>, <section>, <aside>
<button>, <input>, <select>, <textarea>

<!-- ARIA -->
role="dialog", aria-modal="true"
aria-label, aria-describedby
aria-live="polite" (announcements)
aria-expanded, aria-hidden

<!-- Keyboard -->
 tabindex="0" (focusable)
 tabindex="-1" (programmatic focus)
 Escape to close modals
 Arrow keys for navigation

<!-- Testing -->
- Screen reader: NVDA, VoiceOver, TalkBack
- Keyboard: tab, shift+tab, enter, space
- Color: 4.5:1 contrast minimum
- Motion: prefers-reduced-motion
```
