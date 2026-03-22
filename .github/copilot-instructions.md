# Real-Time Issue Tracking — Implementation Plan (Supabase Edition)

This document outlines the phased implementation of a Real-Time Issue Tracking System for the Camp Map & Directory web app, powered by React, Vite, TypeScript, and Supabase. 

**CRITICAL INSTRUCTION FOR AI:** You must stop at every "🛑 VERIFICATION GATE" and ask the user to manually test the functionality before writing code for the next phase.

---

## Phase 0: Framework Transition & Configuration
- [ ] Scaffold Vite + React + TypeScript environment.
- [ ] **Vite Config:** Set `base: '/camp-support/'` in `vite.config.ts` for GitHub Pages routing.
- [ ] Port Vanilla JS logic to React Hooks (`useState`, `useMemo`).
- [ ] Migrate `data.js` to `src/data/campData.ts` with strict TypeScript interfaces.
- [ ] Convert global styles to `src/index.css` utilizing CSS variables.
- [ ] Move static assets (images, icons) to the `public/` directory.
- **🛑 VERIFICATION GATE 0:** Run `npm run dev`. Ensure the static app renders perfectly, images load, and the search/filter functions work before proceeding.

## Phase 1: Supabase Infrastructure & Data Schema
- [ ] **Database Setup:** Create a new Supabase project.
- [ ] **Schema Creation:** - Create a `staff` table with a custom `pin_access` (text) column.
  - Create a `tickets` table: `issue_description` (text), `location` (text), `status` (text), `creator_pin` (text), `assigned_to` (text).
- [ ] **Row Level Security (RLS):** Configure basic RLS policies allowing read/write access for testing.
- [ ] **Environment Variables:** Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] Initialize Supabase client in `src/lib/supabase.ts` using `@supabase/supabase-js`.
- **🛑 VERIFICATION GATE 1:** Write a temporary test button in the UI that successfully inserts a dummy ticket directly into the Supabase dashboard.

## Phase 2: Staff Portal & Core UI
- [ ] Build `useAuth` hook for PIN-based staff authentication against the Supabase `staff` table.
- [ ] Develop Staff Login Modal.
- [ ] Develop Issue Dashboard UI:
  - Dynamic issue reporting form with data-driven location dropdowns mapping to `campData.ts`.
  - Live list component for Open/Pending tickets.
- [ ] Implement Status Indicators (🟢 Online, 🔴 Offline, 🟡 Syncing).
- **🛑 VERIFICATION GATE 2:** Log in with a valid PIN, submit a ticket via the UI, and verify it appears in the Supabase database table.

## Phase 3: Offline-First Sync Engine
- [ ] Create `useSync` hook to passively monitor `window.navigator.onLine`.
- [ ] **Local Cache:** Intercept failed ticket submissions and aggressively store them in `localStorage` under a `pending_tickets` array.
- [ ] **Background Worker:** Implement a `useEffect` loop that attempts to push `pending_tickets` to Supabase automatically when connectivity is restored.
- [ ] Clear local cache precisely upon a successful Supabase insertion response.
- **🛑 VERIFICATION GATE 3:** Open Chrome DevTools, set Network to "Offline". Submit a ticket. Verify it stays in the UI as "Pending Sync". Turn Network to "Online". Verify it automatically pushes to Supabase and clears the local cache.

## Phase 4: Admin Controls & Supabase Realtime
- [ ] Build `AdminPanel.tsx` to handle ticket reassignment and global status management.
- [ ] **Real-Time Channels:** Implement `supabase.channel('custom-all-channel').on('postgres_changes', ...).subscribe()` inside a `useEffect` hook to live-update the ticket feed.
- [ ] **Memory Leak Prevention:** Strictly return an `.unsubscribe()` cleanup function within the `useEffect` to handle React 18 Strict Mode remounts.
- **🛑 VERIFICATION GATE 4:** Open the app in two separate browser windows. Submit a ticket in Window A. Verify it instantly appears in Window B without refreshing the page.

## Phase 5: Final Deployment
- [ ] Document manual testing suite in `tasks/testing.md`.
- [ ] Configure `.github/workflows/deploy.yml` to run `npm run build` and deploy the `dist` folder to GitHub Pages.
- [ ] Ensure Supabase Environment Variables are added to the GitHub Repository Secrets.
- **🛑 VERIFICATION GATE 5:** Push to GitHub, wait for the Action to complete, and verify the live public URL functions correctly.