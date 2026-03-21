# Manual Testing Suite — Camp Support Issue Tracker

This document covers the full manual testing checklist for each phase of the application. Run through these steps before every deployment.

---

## Phase 0 — Static App Rendering

| # | Test Case | Expected Result | Pass / Fail |
|---|-----------|-----------------|-------------|
| 0.1 | Run `npm run dev` and open `http://localhost:5173/camp-support/` | App renders without console errors | |
| 0.2 | All camp location images load correctly | No broken image placeholders | |
| 0.3 | Search input filters the camp list by name | Matching locations are shown; non-matching hide | |
| 0.4 | Category / filter controls narrow the displayed locations | Correct subset rendered | |

---

## Phase 1 — Supabase Infrastructure

| # | Test Case | Expected Result | Pass / Fail |
|---|-----------|-----------------|-------------|
| 1.1 | `.env.local` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` | No "missing env" warnings in console | |
| 1.2 | Open Network tab — Supabase REST calls return `200` or `201` | No `401` / `403` responses | |
| 1.3 | Insert a dummy ticket via the temporary test button | Row appears immediately in Supabase dashboard | |

---

## Phase 2 — Staff Portal & Core UI

| # | Test Case | Expected Result | Pass / Fail |
|---|-----------|-----------------|-------------|
| 2.1 | Click "Staff Login" and enter an **invalid** PIN | Error message shown; dashboard NOT accessible | |
| 2.2 | Enter a **valid** PIN (seeded in `staff` table) | Login succeeds; ticket dashboard rendered | |
| 2.3 | Submit a ticket via the Issue Reporting form | Ticket saved to Supabase; appears in Open list | |
| 2.4 | Location dropdown is populated from `campData.ts` | All camp locations listed; no hardcoded strings | |

---

## Phase 3 — Offline-First Sync Engine

| # | Test Case | Expected Result | Pass / Fail |
|---|-----------|-----------------|-------------|
| 3.1 | In DevTools → Network → set to **Offline**; submit a ticket | Status indicator turns 🔴; ticket queued locally (`localStorage → pending_tickets`) | |
| 3.2 | Verify ticket appears in the UI as "Pending Sync" | Ticket is visible with pending badge | |
| 3.3 | Restore Network to **Online** | Status indicator turns 🟡 then 🟢; pending ticket auto-pushes to Supabase | |
| 3.4 | Confirm `localStorage.pending_tickets` is cleared | `getItem('pending_tickets')` returns `null` or `[]` | |

---

## Phase 4 — Admin Controls & Real-Time

| # | Test Case | Expected Result | Pass / Fail |
|---|-----------|-----------------|-------------|
| 4.1 | Open app in **two separate browser windows** (both logged in) | Both windows show the same live ticket list | |
| 4.2 | Submit a ticket in **Window A** | Ticket appears in **Window B** within ~1 second, no manual refresh | |
| 4.3 | Admin reassigns/resolves a ticket in **Window A** | Status change reflected in **Window B** in real time | |
| 4.4 | Close and reopen Window B (test unsubscribe / remount) | No duplicate events; connection re-established cleanly | |

---

## Phase 5 — Deployment

| # | Test Case | Expected Result | Pass / Fail |
|---|-----------|-----------------|-------------|
| 5.1 | Push to `main`; GitHub Action triggers automatically | Workflow completes with green ✅ | |
| 5.2 | Navigate to `https://ajarihantjain54.github.io/camp-support/` | App loads correctly, no 404 on refresh | |
| 5.3 | Staff login works on the live URL | Supabase env vars read correctly from GitHub Secrets | |
| 5.4 | Submit a ticket on the live URL | Ticket saved to Supabase production table | |
| 5.5 | Open live URL in two windows — real-time sync works | Changes in one tab appear in the other | |

---

## Regression Checklist (run before every release)

- [ ] Static render OK (Phase 0 tests pass)
- [ ] Authentication OK (Phase 2 tests pass)
- [ ] Offline queueing OK (Phase 3 tests pass)
- [ ] Real-time sync OK (Phase 4 tests pass)
- [ ] Deployment OK (Phase 5 tests pass)
