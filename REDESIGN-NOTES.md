# Fudz Hub redesign handoff

## What changed

- Applied a shared modern admin design system across the app shell and all routes: clearer typography, quieter surfaces, restrained separators, responsive spacing/tables, and reusable metric/settings patterns.
- Refreshed the navigation and top bar, added an account workspace available to restaurant staff, made global search submit into order search, and connected profile/notification shortcuts.
- Added role-aware routes and navigation: day-to-day operations remain available to restaurant staff; catalog, promotions, restaurant settings, and staff administration remain owner/admin-only.
- Completed the verified-email OTP onboarding path for a new restaurant owner, including password confirmation, restaurant identity/address fields, and immediate session creation.
- Added account profile editing (first/last name and phone), notification preference controls, and API-backed refresh-token revocation on logout.
- Added pagination to categories, staff, promotions, and reviews; connected order search/status filters and delivery status/search filters to the backend.
- Corrected category CRUD to use owner-scoped nested endpoints; corrected staff identity display, delivery courier assignment, and owner profile access for restaurants not yet listed publicly.
- Preserved existing pages and workflows such as orders, menu items, deliveries, analytics, promotions, staff, reviews, and restaurant settings while aligning their API calls with the supplied backend.

## Backend changes included separately

The companion backend package adjusts owner/staff scoping and response contracts for restaurant profiles, orders, deliveries, promotions, reviews, staff, and user profile preferences. It adds a review-response migration.

**Deploy the backend package and run `python manage.py migrate` before enabling the review-reply feature.** Review replies use the new `response` and `responded_at` columns.

## Validation

- Frontend production build: **passed**.
- Frontend tests: **passed** (the project currently contains one example test).
- ESLint on changed frontend areas: **0 errors**; one existing Fast Refresh warning remains in `AuthContext.tsx`.
- Backend changed Python modules: **syntax compilation passed**.
- Django `check` / migration consistency could not run in this sandbox because Django is not installed (`ModuleNotFoundError: django`). Run them in the backend environment after installing `requirements.txt`.
- Vite reports a non-blocking large-chunk warning for the existing single-page bundle.
