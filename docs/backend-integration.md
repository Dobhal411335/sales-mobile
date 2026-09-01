# Tasty Bites Mobile — Backend Integration

## Source of Truth

The existing Tasty Bites web application and backend are the source of truth for backend behavior.

Before implementing an API in the mobile app:

1. Inspect the existing web implementation.
2. Identify the API endpoint.
3. Identify request parameters.
4. Identify authentication requirements.
5. Identify response structure.
6. Identify error behavior.
7. Identify Socket.IO events if applicable.
8. Implement the mobile client against the existing behavior.

Do not guess API contracts.

---

## Authentication

Mobile authentication must use the existing authentication system.

Do not create a separate mobile authentication system.

The mobile app should eventually receive whatever authentication/session/token format the existing backend expects.

Credentials must never be logged.

---

## API Client

All API requests should go through the shared API client.

Example:

src/services/api.ts

Feature-specific API functions should live in their service files.

---

## Tables

Table data must come from the backend.

The mobile app should not hardcode:

- Table IDs
- Table names
- Table positions
- Floor IDs
- Employee assignments
- Table status

The UI may contain development placeholders temporarily, but production data must come from the backend.

---

## Orders

Orders must use the existing order API.

Do not create a separate mobile order model unless required to map the API response.

---

## Payments

Payments must use the existing payment flow.

The mobile app must not independently decide:

- Tax
- Discount
- Final amount
- Payment validity
- Payment state

---

## Socket.IO

Use the existing Socket.IO server.

Before implementing events, inspect the web application for:

- Event names
- Payloads
- Rooms
- Authentication
- Connection behavior
- Reconnection behavior

Do not invent event names.

---

## API Changes

If the existing backend does not expose data required by the mobile UI:

DO NOT immediately create a new endpoint.

First determine whether the existing endpoint can provide the required data.

If a backend change is genuinely required:

Document it before implementing it.

---

## Error Handling

API errors should be converted into user-friendly UI states.

Never display raw backend errors directly to restaurant employees.