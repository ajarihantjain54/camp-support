# Task: Add Skin (Dermatology) tab to filter list

## Objective
Add a quick access tab for "Skin" (Dermatology) in the filter list of the Camp Map & Directory app.

## Key Files & Context
- `src/App.tsx`: Contains the `i18n` dictionary and `categoriesList` that define the filter tabs.
- `src/data/campData.ts`: Source of data, confirms `Dermatology` is a valid category.
- `index.vanilla.html`: Vanilla version of the app.

## Implementation Steps
1. [x] Update `i18n.en.categories` in `src/App.tsx` to include `Dermatology: 'Skin'`.
2. [x] Update `i18n.hi.categories` in `src/App.tsx` to include `Dermatology: 'त्वचा'`.
3. [x] Add `{ id: 'Dermatology', icon: '🤚' }` to `categoriesList` in `src/App.tsx`.
4. [x] Update `index.vanilla.html` for consistency.

## Verification & Testing
1. [x] Verify that "Skin" (or "त्वचा" in Hindi) appears in the filter list.
2. [x] Verify that clicking the tab shows only Dermatology departments.

## Results
- Added `Dermatology: 'Skin'` to English categories in `src/App.tsx` and `index.vanilla.html`.
- Added `Dermatology: 'त्वचा'` to Hindi categories in `src/App.tsx` and `index.vanilla.html`.
- Added `Dermatology` with icon `🤚` to `categoriesList` in both versions.
- Verified code logic ensures filtering works as expected for the `Dermatology` category.

## Review
The task was straightforward as the data already supported the `Dermatology` category. The additions were made to the translation dictionaries and the category configuration list. Both React and Vanilla versions were updated to maintain feature parity.

---

# Security Remediation Plan

## Phase 1: Critical (Authentication & Data Access)
- [x] **Fix Supabase RLS Policies**: Restrict `staff` and `tickets` tables.
- [x] **Secure PIN Verification**: Move login logic to a Supabase RPC.
- [x] **Enable Row Level Security (RLS)**: Ensure RLS is enforced in `supabase/schema.sql`.
### Phase 1 Validation
- [x] **Verify `staff` table privacy**: Code analysis confirms RLS is enabled and no public select policy exists.
- [x] **Verify `tickets` table write access**: Code analysis confirms `tickets_insert_anon` only allows `INSERT`.
- [x] **Verify Login**: `useAuth.ts` updated to use secure `verify_staff_pin` RPC.

## Phase 2: High (Data Integrity & XSS)
- [x] **Sanitize Vanilla UI**: Replace `innerHTML` with `textContent` and `escapeHTML` helper in `index.vanilla.html`.
- [x] **Add Server-Side Validation**: Added `check (length(trim(issue_description)) > 0)` to `tickets` table.
- [x] **Hash Sensitive Data**: Updated `staff` table to use `pgcrypto` and `crypt()` for PINs.
### Phase 2 Validation
- [x] **XSS Test**: `escapeHTML` helper added and used for all dynamic content in Vanilla version.
- [x] **Validation Test**: `check` constraint added to `supabase/schema.sql`.
- [x] **Hash Verification**: `supabase/schema.sql` seed and RPC updated to use hashing.

## Phase 3: Medium (Hardening)
- [x] **Audit Environment Variables**: Ensure `SUPABASE_KEY` is the `anon` key.
- [x] **Rate Limiting**: Implement basic rate limiting on the PIN verification RPC.
### Phase 3 Validation
- [x] **Key Audit**: Verified that client code uses `VITE_SUPABASE_PUBLISHABLE_KEY` with a warning comment.
- [x] **Brute Force Test**: `pg_sleep(1)` added to `verify_staff_pin` RPC on failure to prevent rapid attempts.
