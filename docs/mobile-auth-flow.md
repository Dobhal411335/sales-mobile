# Mobile Authentication Flow

This document describes the **existing** Tasty Bites web sales authentication behavior that the mobile POS must reproduce. Source of truth: `Web/src/app/sales/login/page.js` and `Web/src/app/api/employee/auth/*`.

---

## 1. Login Endpoint

`POST /api/employee/auth/login`

---

## 2. HTTP Method

`POST` for login, activate-device, refresh, logout. `GET` for device-status and me.

---

## 3. Login Request Body

**Mode A — Employee ID + password:**

```json
{
  "employeeId": "EMP-001",
  "password": "string",
  "browserFingerprint": "abc123..."
}
```

`employeeId` matches either the employee code or `username` (case-insensitive lookup on backend).

**Mode B — Passcode (registered device only):**

```json
{
  "passcode": "1234",
  "browserFingerprint": "abc123..."
}
```

**Web fingerprint:** `btoa(navigator.userAgent + navigator.language).substring(0, 32).toLowerCase()`

**Mobile:** stable per-install fingerprint stored in Keychain (not a push token).

---

## 4. Login Response Body

**Success (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "employee": {
      "id": "EMP-001",
      "firstName": "...",
      "lastName": "...",
      "role": "Staff",
      "tipPercent": 0,
      "receiveOwnTips": false
    }
  }
}
```

**Set-Cookie headers:** `employee_access_token` (1 hour), `employee_refresh_token` (7 days)

**Device activation required (403):**

```json
{
  "success": false,
  "action": "DEVICE_ACTIVATION_REQUIRED",
  "message": "Device activation required."
}
```

**Other errors:** `400` missing fields, `401` invalid credentials, `403` inactive account / shift blocked / wrong restaurant.

---

## 5. Access Token Handling

- Cookie name: `employee_access_token`
- JWT type: `access`
- Lifetime: 1 hour (`maxAge` in `employeeAuthCookies.js`)
- HttpOnly, SameSite=Lax, Secure in production
- Payload includes: `employeeId`, `sessionId`, `restaurantId`, `role`, `type: "access"`
- Mobile: extract from `Set-Cookie`, store in Keychain, send as `Cookie` header on every API request

---

## 6. Refresh Token Handling

- Cookie name: `employee_refresh_token`
- JWT type: `refresh`
- Lifetime: 7 days
- Endpoint: `POST /api/employee/auth/refresh` (no body; reads refresh cookie)
- Success: new access cookie (+ rotated refresh cookie)
- Failure: clears employee cookies; may expire DB session on token reuse
- Mobile: on `401`, call refresh once (deduped), retry original request; on refresh failure → logout

**Proactive refresh:** web refreshes every 45 minutes via `useEmployeeSessionRefresh`.

---

## 7. Cookie Usage

All employee auth tokens are **HttpOnly cookies** on web. Middleware reads **only cookies** — no `Authorization: Bearer` header support.

| Cookie | Purpose | Cleared on logout? |
|--------|---------|-------------------|
| `employee_access_token` | Active employee session | Yes |
| `employee_refresh_token` | Session refresh | Yes |
| `device_token` | POS device binding | **No** |
| `token` | Admin login (separate) | N/A for sales mobile |

Mobile emulates cookies by sending:

```
Cookie: employee_access_token=...; employee_refresh_token=...; device_token=...
```

---

## 8. Employee / User Information

After login, fetch full profile via:

`GET /api/employee/auth/me` (requires access + device tokens + active session)

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id", "id", "employeeId", "firstName", "lastName", "email",
      "phoneNumber", "role", "restaurant", "joinDate", "profileImage",
      "tipPercent", "receiveOwnTips",
      "permissions": ["CREATE_ORDER", ...]
    },
    "shift": {
      "id", "startTime", "assignedFloor", "assignedSection"
    }
  }
}
```

Web `SalesAppShell` also calls `GET /api/auth/me` (dual-cookie `withAuth`); mobile uses `/api/employee/auth/me` for richer shift/permission data.

---

## 9. Restaurant / Tenant Information

- Resolved from JWT `restaurantId` in access token
- Employee document includes `restaurant` field (ObjectId)
- Device `RegisteredDevice.restaurant` must match employee restaurant on login
- Single-tenant per session — not user-selected
- Multi-restaurant deployment model: **UNKNOWN — needs verification**

---

## 10. Permission Information

- Stored on `Employee.permissionGroup.permissions`
- Enum: `CREATE_ORDER`, `EDIT_ORDER`, `CANCEL_ORDER`, `APPLY_DISCOUNT`, `KITCHEN_ACCESS`, `VIEW_REPORTS`, `MANAGE_SETTINGS`, `PROCESS_REFUND`, `CREATE_TABLE`, `VIEW_DASHBOARD`
- Returned via `/api/employee/auth/me`
- Server enforcement on sales APIs is primarily **role-based** (`withAuth`); fine-grained permissions not widely enforced server-side yet

---

## 11. Device Token Endpoint

**Not a push notification endpoint.**

Device registration uses:

`POST /api/employee/auth/activate-device`

Pre-check:

`GET /api/employee/auth/device-status` → `{ success, registered: boolean }`

---

## 12. Device Token Request Body (Activation)

```json
{
  "employeeId": "EMP-001",
  "password": "string",
  "activationCode": "EMP-XXXX-XXXX"
}
```

Activation code is uppercased on client before submit (web behavior).

---

## 13. Device Token Response

**Success (200):**

```json
{
  "success": true,
  "message": "Device activated successfully"
}
```

**Set-Cookie:** `device_token` (365 days, JWT `type: "device"`)

Payload: `{ deviceId, version, type: "device" }` bound to `RegisteredDevice` record.

---

## 14. Logout Endpoint

`POST /api/employee/auth/logout`

---

## 15. Logout Behavior

1. Terminates active `EmployeeSession` (status `Terminated`)
2. Finalizes attendance
3. Creates `EMPLOYEE_LOGOUT` notification
4. Clears `employee_access_token` and `employee_refresh_token` cookies
5. **Does NOT clear `device_token`** — device stays registered for passcode login
6. Mobile: call logout API, clear access + refresh from Keychain, reset auth state

---

## 16. Token Expiration Behavior

| Token | Lifetime | On expiry |
|-------|----------|-----------|
| Access | 1 hour | Auto-refresh via refresh token |
| Refresh | 7 days | Redirect to login; session may be expired in DB |
| Device | 365 days | Re-activation required if revoked/reset |

Device reset (`POST /api/devices/[id]/reset`) increments `deviceTokenVersion` and invalidates existing device tokens.

Day close (`POST /api/employees/close-restaurant`) expires all sessions and emits `auth:force-logout` socket event.

---

## 17. Authentication Error Responses

| Status | Typical message |
|--------|-----------------|
| 400 | Missing required fields |
| 401 | Invalid credentials / Authentication required |
| 403 | Employee account is not active / Device activation required |
| 403 + action | `DEVICE_ACTIVATION_REQUIRED` |
| 429 | Too many login attempts (rate limited) |
| 500 | Internal Server Error |

Mobile maps network errors to user-friendly messages; does not expose stack traces or raw axios errors.

---

## 18. Existing Security Behavior

- HttpOnly cookies on web (tokens not in localStorage)
- Rate limiting on login and activation (IP + account keyed)
- Password comparison via bcrypt
- Active session check in DB on every protected request
- Device token version check (reset invalidates old tokens)
- Refresh token rotation with reuse detection
- Shift window validation (±15 min) on clock-in
- Duty change (leave/absent) blocks login
- Socket.IO auth via `Cookie` header in handshake
- No FCM/APNs/push token registration in backend

---

## Token Concept Separation

| Concept | What it is | What it is NOT |
|---------|-----------|----------------|
| `device_token` | POS terminal JWT (365d) | Push notification token |
| `employee_access_token` | Employee session JWT (1h) | Device identifier |
| `employee_refresh_token` | Session refresh JWT (7d) | Access token |
| `browserFingerprint` | Session metadata in login body | Device token |
| FCM/APNs token | **Not used by backend** | Required for login |

---

## Mobile Device Token Status

**DEVICE TOKEN REGISTRATION = POS terminal activation JWT, not FCM/APNs.**

Push notification infrastructure is not required for login. The mobile app obtains and persists the backend `device_token` via device activation. No fake push tokens are generated.

**DEVICE TOKEN REGISTRATION BLOCKED — notification/device push infrastructure not configured** applies only to OS-level push (FCM/APNs), which the backend does not use for sales auth.

---

## API Base URL Configuration

Set `API_BASE_URL` in [`Mobile/src/constants/apiConfig.ts`](../src/constants/apiConfig.ts):

| Environment | Example |
|-------------|---------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Physical device (dev) | `http://<LAN-IP>:3000` |
| Production | `https://sales.tastybitesrestaurant.com` |

**UNKNOWN — needs verification:** staging URL if separate from production.

---

## Mobile Login Flow

```
App start
  → Check Keychain for tokens
  → If session exists: GET /me (refresh on 401)
  → If valid: SalesNavigator (Floor)
  → Else: LoginScreen

LoginScreen mount
  → GET /api/employee/auth/device-status
  → Restore rememberedEmployeeId from AsyncStorage

User submits Employee ID + password
  → POST /api/employee/auth/login
  → If DEVICE_ACTIVATION_REQUIRED: show activation modal
  → POST /api/employee/auth/activate-device → device_token stored
  → Retry login
  → GET /api/employee/auth/me
  → Navigate to Floor

Registered device: passcode login
  → POST /api/employee/auth/login { passcode, browserFingerprint }
```

---

## Backend Gaps

| Item | Status |
|------|--------|
| Cookie-only auth for mobile | Not a gap — mobile sends `Cookie` header |
| Push token registration | Not in backend — not needed |
| Mobile-specific login endpoint | Not needed |
| Authorization header support | Not supported — use cookies |
