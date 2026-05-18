# Inquiries API

CRUD + lifecycle actions for `ProcurementInquiry`. All endpoints live under `/api/v1/procurement/inquiries/`.

- View: `ProcurementInquiryViewSet` (`sdelka_django/procurement/api_views.py:54`)
- Serializer: `ProcurementInquirySerializer` (`sdelka_django/procurement/serializers.py:13`)
- Filterset: `ProcurementInquiryFilter` (`sdelka_django/procurement/filters.py:13`)
- Model: `ProcurementInquiry` (`sdelka_django/procurement/models.py:45`)
- Router basename: `procurement-inquiry`

A `ProcurementInquiry` groups procurement items created together that share the same suppliers. Items, supplier inquiries (KPs), and tasks all attach to it.

## Conventions

Shared conventions (auth, workspace scoping, pagination, camelCase, ordering) are documented once in [`docs/api/list-endpoints.md`](./list-endpoints.md#conventions-all-endpoints). Inquiries-specific behavior:

- **Workspace scoping.** `workspace_lookup = "company__workspace"`. Rows outside the requester's workspace are invisible — detail/action calls against them return `404`, not `403`.
- **Cross-workspace FK guard.** Writes that reference a foreign-workspace `company`, `folder`, `copy_suppliers_from_inquiry`, or `delivery_address` return `400` with a field-level error like `{"companyId": "Object does not belong to your workspace."}` — enforced by `workspace_fk_checks` on the viewset.
- **Field-name conversion.** Request/response JSON is camelCase (`createdAt`, `isArchived`, `companyId`). Query-string filter names are camelCase as authored in the FilterSet (`isArchived`, `createdAtFrom`); `djangorestframework-camel-case` only rewrites JSON bodies, not the URL.

## Endpoints

| Method | Path | Action |
|---|---|---|
| `GET` | `/api/v1/procurement/inquiries/` | List |
| `POST` | `/api/v1/procurement/inquiries/` | Create |
| `GET` | `/api/v1/procurement/inquiries/{id}/` | Retrieve |
| `PUT` | `/api/v1/procurement/inquiries/{id}/` | Update (full) |
| `PATCH` | `/api/v1/procurement/inquiries/{id}/` | Update (partial) |
| `DELETE` | `/api/v1/procurement/inquiries/{id}/` | Destroy |
| `POST` | `/api/v1/procurement/inquiries/{id}/archive/` | Set `is_archived=true` |
| `POST` | `/api/v1/procurement/inquiries/{id}/unarchive/` | Set `is_archived=false` |

## Resource shape

| Field (wire) | Type | R/W | Notes |
|---|---|---|---|
| `id` | UUID | R | |
| `name` | string (≤255) | R/W | Blank allowed; `__str__` falls back to `Inquiry {pk}`. |
| `companyId` | UUID | R/W | Required on create. Must be in caller's workspace. |
| `folderId` | UUID | R/W, nullable | Workspace-scoped `Folder`. |
| `copySuppliersFromInquiryId` | UUID | R/W, nullable | Another inquiry whose supplier list should be copied; must be in the same workspace. |
| `status` | enum | R/W | `InquiryStatus`: `searching` (default), `searching_completed`, `negotiating`, `completed`. |
| `deadline` | ISO date | R/W, nullable | Bid-collection deadline. |
| `additionalInfo` | string | R/W | Free-form comment, defaults to `""`. |
| `deliveryAddressId` | UUID | R/W, nullable | `companies.Address`, must be in caller's workspace. |
| `unloading` | enum | R/W | `Unloading`: `supplier`, `self`, or `""`. |
| `analoguesNotAllowed` | bool | R/W | Defaults `false`. |
| `cashAllowed` | bool | R/W | Defaults `false`. |
| `emailSubject` | string (≤255) | R/W | RFQ email subject template. |
| `emailBody` | string | R/W | RFQ email body template. |
| `sendRequestsAutomatically` | bool | R/W | Defaults `false`. |
| `isArchived` | bool | R/W | Prefer the `archive`/`unarchive` actions; this field accepts direct writes too. |
| `kpCount` | int | R | Annotated: distinct `inquiry_offers` (KPs received). |
| `positionsCount` | int | R | Annotated: distinct `items` in the inquiry. |
| `tasksCount` | int | R | Annotated: distinct `tasks` with status `ASSIGNED` or `IN_PROGRESS` only. Completed/archived tasks are excluded. |
| `suppliersCount` | int | R | Annotated: distinct non-archived suppliers across `inquiry_offers` (excludes offers with `archived_at` set). |
| `createdAt` | ISO datetime | R | MSK (Europe/Moscow). |
| `updatedAt` | ISO datetime | R | MSK. |

All four annotated counts are computed on the list/retrieve queryset and are also refreshed on the `archive`/`unarchive` response.

## List — `GET /api/v1/procurement/inquiries/`

Cursor-paginated. Default ordering `(-created_at, pk)`. Page size `?pageSize=` (default 50, max 200).

### Query params

| Param | Type | Meaning |
|---|---|---|
| `q` | string | `name__icontains` |
| `company` | UUID | `company_id` exact |
| `folder` | UUID | `folder_id` exact |
| `folder__isnull` | bool | `true` returns only inquiries with no folder; `false` returns only inquiries that have one. Use alongside or instead of `folder=<uuid>`. |
| `status` | enum | exact `InquiryStatus` |
| `isArchived` | bool | `is_archived` |
| `createdAtFrom` | ISO datetime | `created_at >= value` |
| `createdAtTo` | ISO datetime | `created_at <= value` |
| `deadlineFrom` | ISO date | `deadline >= value` |
| `deadlineTo` | ISO date | `deadline <= value` |
| `ordering` | enum | `kp_count`, `positions_count`, `tasks_count`, `suppliers_count`, `deadline`, `created_at`, `updated_at` (prefix `-` for desc) |
| `pageSize` | int | 1–200 |

### Response

```json
{
  "next": "https://.../inquiries/?cursor=...",
  "previous": null,
  "results": [ /* array of inquiry objects */ ]
}
```

A user with no workspace gets `200` with `"results": []` (not `403`).

## Retrieve — `GET /api/v1/procurement/inquiries/{id}/`

Returns the full resource shape. `404` if the inquiry is outside the caller's workspace.

## Create — `POST /api/v1/procurement/inquiries/`

Minimum body:

```json
{
  "companyId": "<uuid>",
  "name": "Q3 cleaning supplies",
  "items": [{ "name": "Paper towels" }]
}
```

`name` is technically optional (blank allowed) but recommended. `items` is **required and must be non-empty** — an inquiry without positions makes no domain sense, and rejecting empty submissions at the API surface keeps the FE from ever showing the «В этом запросе пока нет позиций» empty-state on a freshly-created row. Defaults: `status="searching"`, `analoguesNotAllowed=false`, `cashAllowed=false`, `sendRequestsAutomatically=false`, `isArchived=false`.

### Nested `items[]` shape (write-only on create)

Each entry mirrors the writable fields of `ProcurementItemSerializer`; `company` is inherited from the parent inquiry, `inquiry` is set during create. `name` is required.

| Field (wire) | Type | Notes |
|---|---|---|
| `name` | string (≤255) | Required. |
| `description` | string | Defaults to `""`. |
| `status` | enum | `ItemStatus`; defaults to `searching`. |
| `annualQuantity` | decimal string | Nullable. |
| `unit` | enum | `Unit`; blank allowed. |
| `quantityPerDelivery` | decimal string | Nullable. |

The whole create is wrapped in a single `transaction.atomic` — if any item fails validation, the inquiry is not created.

Response: `201` with the created resource and `positionsCount` set to the number of just-inserted items (`kpCount=0`, `tasksCount=0`, `suppliersCount=0`). The `items` payload itself is **not** echoed back — it's write-only.

### Errors

- `400` — `companyId` missing or referencing a foreign workspace.
- `400` — `folderId` / `copySuppliersFromInquiryId` / `deliveryAddressId` in a foreign workspace.
- `400` — `items` missing or empty (`{"items": "Запрос должен содержать хотя бы одну позицию."}`).
- `400` — any nested item fails validation (e.g. blank `name`).
- `401` — no JWT.

## Update — `PUT|PATCH /api/v1/procurement/inquiries/{id}/`

Same field set as create, minus `id`, `createdAt`, `updatedAt`, and the annotated counts. The `items` field is silently dropped — items have their own endpoints (`/procurement/items/`) once the items HTTP integration lands. The same cross-workspace FK guard applies on `PATCH` too. Returns the updated resource; note that `perform_update` does **not** re-fetch through the annotated queryset, so on a `PATCH` response the counts reflect the row's state *as last read* — call `GET` if you need fresh counts after a related write.

## Destroy — `DELETE /api/v1/procurement/inquiries/{id}/`

Hard delete. Cascades to `items`, `generated_questions`, and (depending on related models' on_delete) downstream supplier inquiries and tasks. Prefer `archive` for non-destructive removal. Returns `204`.

## Archive — `POST /api/v1/procurement/inquiries/{id}/archive/`

Sets `is_archived=true` and re-saves `updated_at`. Idempotent: if already archived, the row is not re-written but the response is still `200` with the current serialized state.

The response is the full inquiry, re-fetched through the annotated queryset, so `kpCount` / `positionsCount` / `tasksCount` are guaranteed fresh.

`404` if the target is outside the caller's workspace.

## Unarchive — `POST /api/v1/procurement/inquiries/{id}/unarchive/`

Symmetric to `archive` — sets `is_archived=false`. Same response shape, same 404 rule.

## Example: create → archive

```http
POST /api/v1/procurement/inquiries/
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "companyId": "8b3e...",
  "name": "Q3 cleaning supplies",
  "deadline": "2026-06-30",
  "analoguesNotAllowed": true
}
```

```http
201 Created

{
  "id": "0a91...",
  "name": "Q3 cleaning supplies",
  "companyId": "8b3e...",
  "folderId": null,
  "copySuppliersFromInquiryId": null,
  "status": "searching",
  "deadline": "2026-06-30",
  "additionalInfo": "",
  "deliveryAddressId": null,
  "unloading": "",
  "analoguesNotAllowed": true,
  "cashAllowed": false,
  "emailSubject": "",
  "emailBody": "",
  "sendRequestsAutomatically": false,
  "isArchived": false,
  "kpCount": 0,
  "positionsCount": 0,
  "tasksCount": 0,
  "suppliersCount": 0,
  "createdAt": "2026-05-15T14:22:00+03:00",
  "updatedAt": "2026-05-15T14:22:00+03:00"
}
```

```http
POST /api/v1/procurement/inquiries/0a91.../archive/
Authorization: Bearer <jwt>
```

```http
200 OK

{ "id": "0a91...", "isArchived": true, /* ...full resource with fresh counts... */ }
```
