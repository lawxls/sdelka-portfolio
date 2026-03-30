# API Contracts — Companies, Employees, Addresses & Procurement Changes

All requests require `Authorization: Bearer <token>` and `X-Tenant: <subdomain>` headers.

---

## Companies (`/api/v1/companies/`)

### GET `/api/v1/companies/` — List companies

Returns companies the authenticated user belongs to.

**Query params:**

| Param  | Type   | Description                                              |
|--------|--------|----------------------------------------------------------|
| q      | string | Search by name (case-insensitive substring)              |
| sort   | string | `"name"` \| `"employeeCount"` \| `"procurementItemCount"` |
| dir    | string | `"asc"` \| `"desc"` (default `"asc"`)                   |
| cursor | string | Offset for pagination (pass `nextCursor` from response)  |
| limit  | number | Page size (default 25)                                   |

Main company (`isMain: true`) always sorts first regardless of sort field.

**Response 200:**

```json
{
  "companies": [
    {
      "id": "uuid",
      "name": "string",
      "isMain": true,
      "responsibleEmployeeName": "string | null",
      "addresses": [
        {
          "id": "uuid",
          "name": "string",
          "type": "warehouse | office | production",
          "address": "string"
        }
      ],
      "employeeCount": 3,
      "procurementItemCount": 12
    }
  ],
  "nextCursor": "string | null"
}
```

---

### GET `/api/v1/companies/{id}/` — Company detail

**Response 200:**

```json
{
  "id": "uuid",
  "name": "string",
  "industry": "string",
  "website": "string",
  "description": "string",
  "preferredPayment": "string",
  "preferredDelivery": "string",
  "additionalComments": "string",
  "isMain": true,
  "employeeCount": 3,
  "procurementItemCount": 12,
  "addresses": [
    {
      "id": "uuid",
      "name": "string",
      "type": "warehouse | office | production",
      "postalCode": "string",
      "address": "string",
      "contactPerson": "string",
      "phone": "string"
    }
  ],
  "employees": [
    {
      "id": "integer",
      "firstName": "string",
      "lastName": "string",
      "patronymic": "string",
      "position": "string",
      "role": "admin | user",
      "phone": "string",
      "email": "string",
      "isResponsible": true,
      "permissions": {
        "id": "uuid",
        "employeeId": "integer",
        "analytics": "none | view | edit",
        "procurement": "none | view | edit",
        "companies": "none | view | edit",
        "tasks": "none | view | edit"
      }
    }
  ]
}
```

**Error 404:** `{ "detail": "Not found" }`

---

### POST `/api/v1/companies/` — Create company

**Permission:** Any authenticated user.

**Body:**

```json
{
  "name": "string (required)",
  "industry": "string",
  "website": "string (URL)",
  "description": "string",
  "preferredPayment": "string",
  "preferredDelivery": "string",
  "additionalComments": "string",
  "address": {
    "name": "string (required)",
    "type": "warehouse | office | production (required)",
    "postalCode": "string (required)",
    "address": "string (required)",
    "contactPerson": "string (required)",
    "phone": "string (required)"
  }
}
```

**Response 200:** Full company detail object (same shape as GET detail). New company has `isMain: false`, `employeeCount: 1` (the creator), `procurementItemCount: 0`.

---

### PATCH `/api/v1/companies/{id}/` — Update company

**Permission:** `companies: edit` for that company.

**Body (all fields optional):**

```json
{
  "name": "string",
  "industry": "string",
  "website": "string",
  "description": "string",
  "preferredPayment": "string",
  "preferredDelivery": "string",
  "additionalComments": "string"
}
```

**Response 200:** Updated company detail object.

---

### DELETE `/api/v1/companies/{id}/` — Delete company

**Permission:** `companies: edit` for that company.

**Response 204:** No content.

**Error 403:** `{ "detail": "Cannot delete main company" }` — when `isMain: true`.

**Error 409:** `{ "detail": "Company has active procurement items" }` — when `procurementItemCount > 0`.

---

## Addresses (`/api/v1/companies/{id}/addresses/`)

**Permission:** All address endpoints require `companies: edit`.

### POST `/api/v1/companies/{id}/addresses/` — Create address

**Body:**

```json
{
  "name": "string (required)",
  "type": "warehouse | office | production (required)",
  "postalCode": "string (required)",
  "address": "string (required)",
  "contactPerson": "string (required)",
  "phone": "string (required)"
}
```

**Response 200:** Created address object with `id`.

```json
{
  "id": "uuid",
  "name": "string",
  "type": "warehouse | office | production",
  "postalCode": "string",
  "address": "string",
  "contactPerson": "string",
  "phone": "string"
}
```

---

### PATCH `/api/v1/companies/{id}/addresses/{addressId}/` — Update address

**Body (all fields optional):** Same fields as create.

**Response 200:** Updated address object.

---

### DELETE `/api/v1/companies/{id}/addresses/{addressId}/` — Delete address

**Response 204:** No content.

**Error 409:** `{ "detail": "Cannot delete the last address" }` — company must retain at least one address.

---

## Employees (`/api/v1/companies/{id}/employees/`)

**Note:** Employee IDs are **integers** (User primary keys), not UUIDs.

**Permission:** All employee endpoints require `companies: edit`, except permissions update which requires `role: admin`.

### POST `/api/v1/companies/{id}/employees/` — Create employee

**Body:**

```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required)",
  "patronymic": "string",
  "position": "string",
  "role": "admin | user (default: user)",
  "phone": "string",
  "isResponsible": false
}
```

Creates a user account with no password (cannot log in until separately invited).

Default permissions based on role: `admin` → all `"edit"`, `user` → all `"none"`.

Setting `isResponsible: true` clears `isResponsible` on all other employees in this company.

**Response 200:** Employee object with nested permissions.

```json
{
  "id": "integer",
  "firstName": "string",
  "lastName": "string",
  "patronymic": "string",
  "position": "string",
  "role": "admin | user",
  "phone": "string",
  "email": "string",
  "isResponsible": false,
  "permissions": {
    "id": "uuid",
    "employeeId": "integer",
    "analytics": "none | view | edit",
    "procurement": "none | view | edit",
    "companies": "none | view | edit",
    "tasks": "none | view | edit"
  }
}
```

**Error 400:** `{ "email": ["User with this email already exists"] }` — if email is taken.

---

### PATCH `/api/v1/companies/{id}/employees/{employeeId}/` — Update employee

**Body (all fields optional):** Same fields as create.

Setting `isResponsible: true` clears `isResponsible` on all other employees in this company.

**Response 200:** Updated employee object with nested permissions.

---

### DELETE `/api/v1/companies/{id}/employees/{employeeId}/` — Delete employee (soft delete)

Soft-deletes the employee membership. If the user has no other active memberships, deactivates their account.

**Response 204:** No content.

**Error 409:** `{ "detail": "Cannot delete the only responsible employee" }` — if this is the sole `isResponsible: true` employee.

---

### PATCH `/api/v1/companies/{id}/employees/{employeeId}/permissions/` — Update permissions

**Permission:** User must have `role: admin`.

**Body (all fields optional):**

```json
{
  "analytics": "none | view | edit",
  "procurement": "none | view | edit",
  "companies": "none | view | edit",
  "tasks": "none | view | edit"
}
```

**Response 200:**

```json
{
  "id": "uuid",
  "employeeId": "integer",
  "analytics": "none | view | edit",
  "procurement": "none | view | edit",
  "companies": "none | view | edit",
  "tasks": "none | view | edit"
}
```

---

## Changed: Procurement Endpoints (`/api/v1/company/`)

### New query param on all list/filter endpoints

All these endpoints now accept an optional `company` query param:

| Endpoint               | Description           |
|------------------------|-----------------------|
| `GET /items/`          | Filter items          |
| `GET /items/totals`    | Filter totals         |
| `GET /items/export`    | Filter export         |
| `GET /folders/`        | Filter folders        |
| `GET /folders/stats`   | Filter folder stats   |

**Behavior:**
- `company={uuid}` — scope results to that company. Returns 403 if user has no membership.
- Omitted — returns results across all companies the user belongs to.

### New field on item responses: `companyId`

Both item list and item detail responses now include `companyId`:

**Item list (`GET /items/`) — each item now includes:**

```json
{
  "id": "uuid",
  "name": "string",
  "status": "awaiting_analytics | searching | negotiating | completed",
  "annualQuantity": 1000,
  "currentPrice": "150.00",
  "bestPrice": "120.00",
  "averagePrice": "135.00",
  "folderId": "uuid | null",
  "companyId": "uuid",
  "unit": "string"
}
```

**Item detail (`GET /items/{id}/`) — now includes:**

```json
{
  "companyId": "uuid",
  ...all existing fields unchanged...
}
```

---

## Changed: Authentication

### Login (`POST /api/v1/auth/login`)

Login now validates company membership via `EmployeePermissions` instead of `User.company`.

- A user must have an active (non-deleted) `EmployeePermissions` row for the tenant's company.
- Login without a tenant context (no `X-Tenant` header or subdomain) is rejected.
- Soft-deleted memberships (`is_deleted: true`) do not count.

No change to request/response shape.

### Registration (`POST /api/v1/auth/register`)

Registration now automatically creates an `EmployeePermissions` row linking the new user to the invitation code's company with default permissions based on role.

No change to request/response shape.

---

## Authorization Model

Endpoints check permissions via the `EmployeePermissions` join table:

| Action                        | Required                                    |
|-------------------------------|---------------------------------------------|
| List companies                | Authenticated + any active membership       |
| View company detail           | Active membership for that company          |
| Create company                | Any authenticated user                      |
| Update/delete company         | `companies: edit` for that company          |
| Create/update/delete address  | `companies: edit` for that company          |
| Create/update/delete employee | `companies: edit` for that company          |
| Update employee permissions   | User must have `role: admin`                |
| Procurement endpoints         | Active membership for queried company       |

A "membership" means an `EmployeePermissions` row with `is_deleted: false` for the user-company pair.
