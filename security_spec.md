# Firestore Security Specification — Aqua PC Parts

## 1. Data Invariants

1. **Private PII Ownership**: Every `/users/{userId}` document and `/orders/{orderId}` document contains customer PII (`email`, optional `phone`, `city`) and may only be read by the authenticated, email-verified owner (`request.auth.uid == ownerId`) or a verified admin. Listing `/users` is admin-only; listing `/orders` strictly filters by `resource.data.ownerId == request.auth.uid` (or verified bootstrap admin).
2. **Master Gate for Subcollections**: A `/users/{userId}/savedQuotes/{quoteId}` document may only be accessed when the parent `/users/{userId}` document exists and the caller is the authenticated owner (`request.auth.uid == userId`).
3. **Public Non-PII Live Inventory**: `/inventoryOverrides/{sku}` contains only public hardware SKUs, LKR prices, and stock quantities (zero PII). Any visitor may `get` or `list` live stock counts, while `create`, `update`, and `delete` are strictly restricted to verified admins (`isAdmin()`).
4. **Order State-Machine & Terminal Lock**: Customers creating `/orders/{orderId}` must set `ownerId == request.auth.uid`, `status == 'received'`, and empty/omitted `statusNote`. After creation, customers may only transition `status` from `'received'` to `'cancelled'` (modifying only `['status', 'updatedAt']`) and cannot modify or cancel once bench testing has started or the order is terminal (`'delivered'`/`'cancelled'`). Only admins can advance order stages (`received` -> `bench_testing` -> `packed` -> `dispatched` -> `delivered`) or write technician `statusNote` telemetry.
5. **Immutable Identity, Timestamps & Bounded Sizes**: `uid`, `ownerId`, `orderId`, `orderNumber`, `sku`, and `createdAt` can never be mutated. `createdAt` on create and `updatedAt` on create/update must equal `request.time`. All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string and number enforces strict blueprint bounds.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated PII Read**: Anonymous caller attempts `get /users/uid_victim` or `get /orders/ord_victim`. Expected: `PERMISSION_DENIED`.
2. **Cross-User Order Snooping**: Authenticated `uid_attacker` attempts `get` or `list` `/orders` belonging to `uid_victim`. Expected: `PERMISSION_DENIED`.
3. **Unauthorized Stock Tampering**: Non-admin authenticated user attempts `create` or `update` on `/inventoryOverrides/AQ-VGA-0001` to drop price to `1 LKR`. Expected: `PERMISSION_DENIED`.
4. **Order Status Self-Promotion**: Customer creates `/orders/ord_1` with `status: "delivered"` or updates their own order to `status: "dispatched"`. Expected: `PERMISSION_DENIED`.
5. **Post-Testing Cancellation Bypass**: Customer attempts to cancel `/orders/ord_1` after admin moved it to `status: "bench_testing"` or `"delivered"`. Expected: `PERMISSION_DENIED`.
6. **Price / Total Tampering on Order Update**: Customer updates `totalLkr: 0` or `itemsSummary` while cancelling `/orders/ord_1`. Expected: `PERMISSION_DENIED`.
7. **Technician Note Forgery**: Customer writes `statusNote: "Free upgrade approved"` on order create or update. Expected: `PERMISSION_DENIED`.
8. **Shadow / Privilege Escalation Field**: Caller injects ghost fields (`isAdmin: true`, `role: "admin"`, `discountOverride: 100`) into `/users`, `/orders`, or `/inventoryOverrides`. Expected: `PERMISSION_DENIED`.
9. **Email Verification Spoof**: Unverified token (`email_verified: false`) attempts any write or admin action. Expected: `PERMISSION_DENIED`.
10. **Timestamp Forgery**: Caller writes `createdAt` or `updatedAt` with a spoofed past/future timestamp instead of `request.time`. Expected: `PERMISSION_DENIED`.
11. **ID Poisoning**: Caller attempts path traversal IDs (`..%2Fevil`) or mismatched `orderId != path` / `sku != path`. Expected: `PERMISSION_DENIED`.
12. **Denial-of-Wallet String Bloat**: Caller submits a 50KB `itemsSummary` or 500-char `statusNote` exceeding blueprint `maxLength`. Expected: `PERMISSION_DENIED`.
