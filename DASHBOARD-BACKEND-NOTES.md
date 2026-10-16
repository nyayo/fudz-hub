# Dashboard backend analysis

## Existing data contracts used

| Dashboard feature | Backend endpoint and behavior | Dashboard use |
|---|---|---|
| Orders and payments | `GET /api/v1/orders/orders/`; page-number pagination, 20 records per page, newest first. Order payload includes `status`, `payment_status`, `placed_at`, `total_amount`, and `items`. | Recent tickets, order-state counts, payment follow-up, and a recent sales/order trend. Three pages are queried. |
| Menu availability | `GET /api/v1/restaurants/items/?restaurant_id=<id>&is_available=true/false`; paginated response includes `count`. | Accurate available/paused menu counts, using the backend filter and total count. |
| Active promotions | `GET /api/v1/restaurants/promotions/active/`; returns active promotions. Restaurant owners are scoped in the viewset. | Current campaign list and end dates. |
| Restaurant feedback | `GET /api/v1/reviews/?restaurant=<id>`; paginated, newest first, filtered by restaurant. Review serializer exposes `customer_name`, `rating`, `comment`, and `created_at`. | Recent feedback preview; the average shown is explicitly based on the latest page (up to 20), while the total count comes from pagination metadata. |
| Restaurant context | The authenticated user payload includes a `profile` object; restaurant-owner profiles include `id` and `restaurant_name`. | Scopes menu and review requests, and labels the dashboard. Accounts without a restaurant profile are shown a scope notice instead of cross-restaurant menu/review totals. |

## Backend constraints reflected in the UI

- There is no aggregate dashboard/statistics endpoint. Order totals and trends are therefore calculated from the latest **three pages (up to 60 orders)**. The interface labels this window and does not present it as a complete historical report. Use the existing Analytics page for broader reporting, which also samples pages client-side.
- The backend’s `total_amount` is the sum of order-item prices; it excludes delivery fee and tax. The KPI is called **Item sales**, not total collected revenue.
- Order statuses are `placed`, `accepted`, `ready`, `picked_up`, `delivered`, and `cancelled`. There is no `preparing` order status in this backend.
- The order serializer exposes a customer ID rather than a customer display name, so the ticket list does not fabricate customer names.
- Delivery list endpoints are admin-only (`IsAdminUser`). The dashboard does not issue a delivery request for restaurant accounts; it uses order states for service flow and retains the Deliveries shortcut.
- Review payloads do not include a restaurant-response field in this backend version, so the dashboard does not show an unsupported response action.

## Future backend improvement

For exact dashboard KPIs over arbitrary time ranges, add an authenticated, restaurant-scoped summary endpoint that aggregates orders and payments by date/status and returns menu availability, active-promotion counts, and review aggregates. That avoids loading pages just to compute totals and makes all-time/period comparisons reliable at higher volume.
