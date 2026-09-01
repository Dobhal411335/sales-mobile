# Tasty Bites Mobile POS — Architecture

## 1. Application Architecture

The mobile application is a client of the existing Tasty Bites backend.

Architecture:

React Native
    ↓
Existing HTTPS API
    ↓
Existing Backend
    ↓
PostgreSQL

Realtime:

React Native
    ↕
Socket.IO
    ↕
Existing Backend

The mobile application must NEVER connect directly to PostgreSQL.

---

## 2. Backend

Do NOT create a second backend.

Reuse the existing Tasty Bites backend.

The backend remains responsible for:

- Authentication
- Orders
- Products
- Tables
- Customers
- Payments
- Discounts
- Gift cards
- Tax calculations
- KOT
- Bar tickets
- Bills
- Printing logic
- Business rules
- Authorization

---

## 3. Mobile Structure

src/

navigation/
screens/
components/
services/
socket/
printer/
store/
hooks/
types/
constants/
utils/

---

## 4. Screens

Current screens:

Login
Floor
Create Order
Payment
Orders
Order Details
Reports
Notifications

Additional screens may be added only when required by the actual workflow.

---

## 5. Navigation

AppNavigator
    ↓
AuthNavigator
    ↓
Login

After successful authentication:

AppNavigator
    ↓
SalesNavigator
    ├── Floor
    ├── Orders
    ├── Create Order
    ├── Payment
    ├── Reports
    └── Notifications

---

## 6. State Management

Use Zustand for application state.

Initial stores:

- authStore
- orderStore
- cartStore

Do not create a new store for every component.

Only create a new store when shared application state genuinely requires it.

---

## 7. API

API communication belongs in:

src/services/

Example:

api.ts
orderService.ts
productService.ts
tableService.ts
paymentService.ts

Components and screens should not contain large Axios request implementations.

---

## 8. Realtime

Socket.IO belongs in:

src/socket/

The mobile application should reuse the existing backend Socket.IO infrastructure.

Do not create a second realtime server.

---

## 9. Printing

Printing belongs in:

src/printer/

The printer architecture must remain isolated from UI components.

Do not assume the client's exact printer architecture.

The client's actual:

- Printer models
- Network setup
- Master device
- Star SDK requirements

must be verified before implementing production printer integration.

---

## 10. Business Logic

Do not duplicate backend business logic inside UI components.

Examples:

Do not independently implement:

- Tax calculation
- Discount calculation
- Gift-card balance rules
- Payment authorization
- Order state transitions

The mobile client should request and display backend results.

---

## 11. Offline

Offline mode is NOT part of the initial implementation.

Do not add:

- SQLite synchronization
- Offline queues
- Conflict resolution
- Offline payment processing

These may be implemented in a future phase.

---

## 12. Native Integrations

Native functionality should be isolated.

Potential future integrations:

- Star printers
- Payment terminals
- Device permissions
- Notifications

Do not spread native-specific code throughout screens.