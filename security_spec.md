# Firestore Security Specification — Aqua PC Parts

## 1. Data Invariants

1. **Private PII Ownership**: Every `/users/{userId}` document, `/orders/{orderId}` document, and `/payments/{paymentId}` document contains customer PII (`email`, optional `phone`, `city`) and may only be read by the authenticated owner (`request.auth.uid == ownerId`) or a verified admin. Listing `/users` is admin-only; listing `/orders` and `/payments` strictly filters by `resource.data.ownerId == request.auth.uid` (or verified bootstrap admin).
2. **Master Gate for Subcollections**: A `/users/{userId}/savedQuotes/{quoteId}` document may only be accessed when the parent `/users/{userId}` document exists and the caller is the authenticated owner (`request.auth.uid == userId`).
3. **Public Non-PII Live Inventory & Order Tracking**: `/inventoryOverrides/{sku}` and `/orderTracking/{orderNumber}` contain zero PII. Visitors may read live stock counts and lookup individual order statuses by `orderNumber`; writes are strictly restricted to owners/admins with atomic `existsAfter` enforcement.
4. **Login-Gated Bank Details**: `/storeSettings/bankTransfer` stores Aqua PC Parts official bank transfer details. Unauthenticated visitors cannot `get` or `list` `/storeSettings`. Only authenticated users (`isSignedIn()`) may `get` `/storeSettings/bankTransfer`, and only verified admins (`isAdmin()`) may write it.
5. **Order & Payment State Machines + Terminal Lock**:
   - Customers creating `/orders/{orderId}` must set `ownerId == request.auth.uid`, `status == 'received'`, and empty/omitted `statusNote`. After creation, customers may only cancel while `'received'`.
   - Customers creating `/payments/{paymentId}` must set `ownerId == request.auth.uid`, `status == 'pending_verification'`, and empty/omitted `adminNote`. After creation, customers may only cancel while `'pending_verification'`. Only verified admins may mark payments `'verified'` or `'rejected'` or write `adminNote`.
6. **Immutable Identity, Timestamps & Bounded Sizes**: `uid`, `ownerId`, `orderId`, `orderNumber`, `paymentId`, `paymentRef`, `sku`, and `createdAt` can never be mutated. `createdAt` on create and `updatedAt` on create/update must equal `request.time`. All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string and number enforces strict blueprint bounds.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated PII & Bank Details Read**: Anonymous caller attempts `get /users/uid_victim`, `get /orders/ord_victim`, `get /storeSettings/bankTransfer`, or `get /payments/pay_victim`. Expected: `PERMISSION_DENIED`.
2. **Cross-User Order & Payment Snooping**: Authenticated `uid_attacker` attempts `get` or `list` `/orders` or `/payments` belonging to `uid_victim`. Expected: `PERMISSION_DENIED`.
3. **Unauthorized Stock or Bank Details Tampering**: Non-admin authenticated user attempts `create` or `update` on `/inventoryOverrides/AQ-VGA-0001` or `/storeSettings/bankTransfer`. Expected: `PERMISSION_DENIED`.
4. **Order / Payment Status Self-Promotion**: Customer creates `/orders/ord_1` with `status: "delivered"` or `/payments/pay_1` with `status: "verified"`, or updates their own payment to `"verified"`. Expected: `PERMISSION_DENIED`.
5. **Post-Verification / Post-Testing Cancellation Bypass**: Customer attempts to cancel `/payments/pay_1` after admin marked it `"verified"`/`"rejected"`, or cancel `/orders/ord_1` after `"bench_testing"`. Expected: `PERMISSION_DENIED`.
6. **Amount / Reference Tampering on Update**: Customer mutates `amountLkr` or `bankReference` while cancelling `/payments/pay_1`, or mutates `totalLkr` while cancelling `/orders/ord_1`. Expected: `PERMISSION_DENIED`.
7. **Admin / Technician Note Forgery**: Customer writes `statusNote` on `/orders` or `adminNote` on `/payments`. Expected: `PERMISSION_DENIED`.
8. **Shadow / Privilege Escalation Field**: Caller injects ghost fields (`isAdmin: true`, `role: "admin"`, `discountOverride: 100`) into `/users`, `/orders`, `/payments`, `/storeSettings`, or `/inventoryOverrides`. Expected: `PERMISSION_DENIED`.
9. **Email Verification Spoof**: Unverified token (`email_verified: false`) matching admin email attempts any admin write to `/storeSettings/bankTransfer`, `/orders`, or `/payments`. Expected: `PERMISSION_DENIED`.
10. **Timestamp Forgery**: Caller writes `createdAt` or `updatedAt` with a spoofed timestamp instead of `request.time`. Expected: `PERMISSION_DENIED`.
11. **ID Poisoning**: Caller attempts path traversal IDs (`..%2Fevil`) or mismatched `orderId`/`paymentId`/`sku` vs path. Expected: `PERMISSION_DENIED`.
12. **Denial-of-Wallet String Bloat**: Caller submits oversized `itemsSummary`, `note`, or `instructions` exceeding blueprint `maxLength`. Expected: `PERMISSION_DENIED`.
