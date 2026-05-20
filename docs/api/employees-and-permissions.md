# Workspace employees & 7-module permissions

Backend commit `18ce52d` (PR #96) introduces a workspace-scoped employees app and a seven-module access-control system that replaces the old per-company `companies.Employee` model. This page is the integration contract for the SPA.

- Viewset: `WorkspaceEmployeeViewSet` (`sdelka_django/employees/api_views.py:80`)
- Auth views: `InviteAcceptView`, `CheckEmailInvitableView` (same file)
- Permission class: `HasModulePermission` (`sdelka_django/employees/permissions.py`)
- Serializers: `sdelka_django/employees/serializers.py`
- Models: `Employee`, `EmployeeCompany`, `EmployeePermissions` (`sdelka_django/employees/models.py`)

## Conventions

Shared rules (auth, workspace scoping, pagination, camelCase, ordering) match `docs/api/list-endpoints.md`. Specific to this surface:

- **Workspace scoping.** All rows are filtered by the caller's active workspace before any further check. Rows in another workspace are invisible — they return `404`, not `403`.
- **Field-name conversion.** JSON bodies are camelCase (`firstName`, `isArchived`, `registeredAt`, `permissions.procurementInquiries`). Query-string filters (`q`, `role`, `company`, `archived`) are bare.
- **Soft delete.** `bulk_delete` flips `isArchived=true`; archived rows are hidden from `list` by default but reachable via `retrieve` and `?archived=true`.

## Domain model — quick reference

| Concept | Wire | Notes |
|---|---|---|
| `Employee` | one row per `(workspace, user)` | Replaces the old per-company employee row. A user can belong to several companies inside the workspace via the M2M. |
| `EmployeeRole` | `"admin" \| "user"` | Admins bypass the permission matrix (effective `edit` everywhere). |
| `EmployeePermissions` | 7 fields, each `"none" \| "view" \| "edit"` | One row per employee, auto-created on invite/register. |
| Workspace owner | `workspace.owner_id == user.id` | Always effective `edit`, can never be modified or archived. |
| Module keys | `procurementInquiries`, `positions`, `tasks`, `workspaceSettings`, `companies`, `employees`, `emails` | Exact wire spelling. Used in `/users/me/`, employee detail, and 403 error bodies. |

## Endpoints

### `/api/v1/workspace/employees/` — `WorkspaceEmployeeViewSet`

Gated by `HasModulePermission` with `permissionModule = "employees"`. `GET` requires `employees:view`, `PATCH`/`POST` require `employees:edit`. Owner & admin role bypass the matrix.

| Method | Path | Action | Required role/perm |
|---|---|---|---|
| `GET` | `/workspace/employees/` | List | `employees:view` |
| `GET` | `/workspace/employees/{id}/` | Retrieve (includes `permissions`) | `employees:view` |
| `PATCH` | `/workspace/employees/{id}/` | Update info / role / companies | `employees:edit` (+ admin role for `role` field) |
| `POST` | `/workspace/employees/invite/` | Bulk invite (atomic) | `employees:edit` |
| `PATCH` | `/workspace/employees/{id}/permissions/` | Update permission matrix | **Admin role required** (not just `employees:edit`) |
| `POST` | `/workspace/employees/delete/` | Bulk soft-archive | `employees:edit` |

#### Resource shape — list (`WorkspaceEmployeeSerializer`)

| Field (wire) | Type | R/W | Notes |
|---|---|---|---|
| `id` | UUID | R | |
| `firstName` | string | R | From `user.first_name`. |
| `lastName` | string | R | From `user.last_name`. |
| `patronymic` | string | R | From `user.patronymic`. |
| `position` | string | R | On the Employee row. |
| `role` | `"admin" \| "user"` | R | |
| `phone` | string | R | From `user.phone`. |
| `email` | string | R | From `user.email`. |
| `registeredAt` | ISO datetime | R | `user.date_joined`. Use as a proxy for "the user has accepted the invite" — an unaccepted invitee is `is_active=False` on the User row; the SPA already keys "Приглашение отправлено" off this elsewhere. |
| `isArchived` | bool | R | |
| `companies` | `{id, name}[]` | R | The companies the employee belongs to inside the workspace. |

#### Resource shape — detail

Same as list, plus:

```ts
permissions: {
  procurementInquiries: "none" | "view" | "edit";
  positions: "none" | "view" | "edit";
  tasks: "none" | "view" | "edit";
  workspaceSettings: "none" | "view" | "edit";
  companies: "none" | "view" | "edit";
  employees: "none" | "view" | "edit";
  emails: "none" | "view" | "edit";
}
```

#### `GET /workspace/employees/` — list

Cursor-paginated (`CursorWithPkTiebreakPagination`). Default ordering `(-created_at, pk)`. Page size via `?pageSize=` (default 50, max 200).

Query params:

| Param | Type | Meaning |
|---|---|---|
| `q` | string | `icontains` on first/last/patronymic/email/position |
| `role` | `"admin" \| "user"` | Exact role |
| `company` | UUID | Members of a given company |
| `archived` | bool | `true` includes archived rows; default hides them |
| `ordering` | enum | `user__last_name`, `user__first_name`, `user__email`, `role`, `created_at` (prefix `-` for desc) |
| `pageSize` | int | 1–200 |

Response:

```json
{ "next": "https://.../workspace/employees/?cursor=...",
  "previous": null,
  "results": [ /* WorkspaceEmployee */ ] }
```

#### `PATCH /workspace/employees/{id}/`

Any subset of these fields. Identity fields (`firstName`, `lastName`, `patronymic`, `phone`) write through to the `User` row; the rest land on the Employee row.

```ts
{
  firstName?: string;
  lastName?: string;
  patronymic?: string;       // blank allowed
  position?: string;          // blank allowed
  role?: "admin" | "user";    // admin-role-required on the caller
  phone?: string;             // blank allowed
  companies?: string[];       // UUIDs; full replace, dedup-preserve-order
}
```

Owner protections: if the target is the workspace owner, including `role`, `companies`, or `isArchived` in the body returns `403` `cannot_modify_workspace_owner`. Workspace owners are intentionally immutable — the SPA's role/company editors should be disabled when `isWorkspaceOwner` is true for the row.

Returns the full `WorkspaceEmployeeDetail` resource (with permissions).

##### Errors

| Status | Body | Cause |
|---|---|---|
| `400` | `{"companies": "Unknown company id or company does not belong to your workspace."}` | Any `companies[]` UUID is missing or in another workspace |
| `400` | `{"code": "employee_archived", "detail": "..."}` | Target row has `isArchived=true` |
| `403` | `{"code": "cannot_modify_workspace_owner", "detail": "..."}` | Trying to change `role`/`companies`/`isArchived` on the owner |
| `403` | `{"code": "admin_role_required", "detail": "..."}` | Caller has `employees:edit` but not admin role, and the payload includes `role` |
| `403` | `{"code": "permission_denied_module", "module": "employees", "required": "edit", "detail": "..."}` | Caller lacks `employees:edit` |
| `404` | DRF default | Row not in workspace, or `{id}` not a valid UUID |

#### `POST /workspace/employees/invite/`

```ts
{
  invites: Array<{
    email: string;
    firstName: string;
    lastName: string;
    patronymic?: string;        // default ""
    position?: string;           // default ""
    role?: "admin" | "user";     // default "user"
    companies?: string[];        // default []
  }>
}
```

Behavior:

- The whole batch is atomic. If one entry fails validation, none are created and the response is a 400 with a per-row error array (same length as `invites`, each entry either `{}` or `{field: [code]}`).
- Existing user with `is_active=False` (a prior invite that wasn't accepted) is **re-invited**: identity fields refresh, role/position/companies replace, `isArchived` is cleared, and a fresh email is sent.
- Existing user with `is_active=True` (already accepted into any workspace) or with any active membership in another workspace is rejected with `{"email": ["already_belongs_to_a_workspace"]}`. Use `POST /auth/check-email-invitable/` to surface this in the UI before submitting.
- A 201 response returns the created/refreshed `WorkspaceEmployee[]` (list shape, no permissions). Use it to optimistically insert the rows into the table.
- Emails are dispatched on `transaction.on_commit`, so a rollback doesn't fire phantom emails.

##### Errors

| Status | Body | Cause |
|---|---|---|
| `400` | `{"invites": [{"email": ["already_belongs_to_a_workspace"]}, {}]}` | Per-row errors aligned with the input array. Render alongside each row. |
| `400` | `{"invites": [{"companies": "..."}]}` | Any `companies[]` UUID is missing or foreign. |
| `400` | `{"invites": "Duplicate emails in the same batch are not allowed."}` | Two rows with the same email. |
| `400` | `{"invites": "At least one invite is required."}` | Empty array. |
| `403` | `permission_denied_module` (`employees:edit`) | |

#### `PATCH /workspace/employees/{id}/permissions/`

Body — any subset of the seven keys:

```ts
{
  procurementInquiries?: "none" | "view" | "edit";
  positions?: "none" | "view" | "edit";
  tasks?: "none" | "view" | "edit";
  workspaceSettings?: "none" | "view" | "edit";
  companies?: "none" | "view" | "edit";
  employees?: "none" | "view" | "edit";
  emails?: "none" | "view" | "edit";
}
```

Returns the full `EmployeePermissions` row. Note this is **stricter** than `employees:edit` — only admin role (or the workspace owner) can call it. A user with `employees:edit` but `role: "user"` will get `403 admin_role_required`.

The target also can't be the workspace owner (`403 cannot_modify_workspace_owner`) or archived (`400 employee_archived`).

#### `POST /workspace/employees/delete/`

```ts
{ ids: string[] }    // UUIDs, dedup-preserve-order
```

Response shape (always `200`, partial success):

```ts
{
  archived: string[];                  // IDs that ended up archived (including no-ops)
  failed: Array<{ id: string; code: "not_found" | "cannot_archive_owner" | "cannot_archive_admin" }>;
}
```

Rules:
- Workspace owner → `cannot_archive_owner`.
- Any `role: "admin"` employee → `cannot_archive_admin`. (Demote first via `PATCH /:id/` with `{ role: "user" }`.)
- Already-archived rows are no-ops counted as `archived`.

Render `failed[]` as a per-row toast/inline message; don't fail the whole bulk action.

### `/api/v1/auth/invite/accept/` — invite-acceptance landing page

Public, unauthenticated. Backs the SPA route the invite email links to.

```ts
// POST /api/v1/auth/invite/accept/
{
  uid: string;       // from the email link
  token: string;     // from the email link
  password: string;
  passwordConfirm: string;
}
```

Returns `200` with the same `LoginResponseSerializer` shape as `/auth/login/`:

```ts
{
  access: string;
  refresh: string;
  user: CurrentEmployee;   // now includes role, permissions, isWorkspaceOwner
}
```

Behavior:
- The invitee is activated (`is_active=True`) and their password is set.
- Any outstanding refresh tokens for the user are blacklisted (defence against a leaked invite link).
- The link is **single-use** — `InviteAcceptTokenGenerator` invalidates itself the moment `has_usable_password()` becomes true. A second submit returns `400 {"token": "Invalid or expired invitation link."}`.

##### Errors

| Status | Body | Cause |
|---|---|---|
| `400` | `{"token": "Invalid or expired invitation link."}` | `uid`/`token` mismatch, link reused, link expired |
| `400` | `{"passwordConfirm": "Passwords do not match."}` | |
| `400` | `{"password": ["..."]}` | Standard Django password validators |

### `/api/v1/auth/check-email-invitable/` — pre-flight check

Authed. Use it inside the invite-employees drawer (debounced) to disable the row's submit button before the user fills the rest of the form.

```ts
// POST
{ email: string }

// 200 OK
{ invitable: boolean; reason: string }   // reason is "" when invitable
```

Currently emits one reason — `"already_belongs_to_a_workspace"` — covering both active users and active memberships in other workspaces. Archived memberships in other workspaces do **not** block invitation.

### `/api/v1/users/me/` — now carries role + permissions

`UserSerializer` gained three read-only fields. The `/users/me/`, `/auth/login/`, `/auth/register/`, and `/auth/invite/accept/` responses all include them.

```ts
{
  // existing fields …
  role: "admin" | "user" | null;          // null when the user has no Employee row
  permissions: EmployeePermissions | null; // 7-module matrix, null when no row
  isWorkspaceOwner: boolean;
}
```

Resolution rules:
- Workspace owner → `role: "admin"`, `permissions` is the stored row (all `edit` from the register hook), `isWorkspaceOwner: true`.
- Multi-workspace user → resolves to the **oldest non-archived** Employee row (`created_at`, `pk`) — the SPA isn't yet workspace-pickable, so a stable choice keeps the UI deterministic.
- Archived-only user → `null` / `null` / `false`. Block module access at the route level.

## Effective-permission resolution (client-side mirror)

To gate UI before firing requests, mirror the backend's `resolve_effective_level`:

```ts
type Level = "none" | "view" | "edit";
function effectiveLevel(me: CurrentEmployee, module: PermissionModuleKey): Level {
  if (me.isWorkspaceOwner) return "edit";
  if (me.role === "admin") return "edit";
  return me.permissions?.[module] ?? "none";
}
function canView(me, module) { return effectiveLevel(me, module) !== "none"; }
function canEdit(me, module) { return effectiveLevel(me, module) === "edit"; }
```

This must match the backend exactly — drift will let the SPA render an action that then 403s. The rule of thumb: never invent local exceptions to the matrix.

## 403 error shape

Module-gated endpoints return a stable JSON body:

```json
{ "code": "permission_denied_module",
  "module": "employees",
  "required": "edit",
  "detail": "Required permission 'edit' for module 'employees'." }
```

The SPA's HTTP layer maps 403 to `AuthError(403)`. To surface a useful "недостаточно прав" toast (and to keep Sentry grouping coherent), extend the error mapper to detect the `code: "permission_denied_module"` shape and attach `module` / `required` to the thrown error.

Other domain 403s use a similar `{code, detail}` envelope: `cannot_modify_workspace_owner`, `admin_role_required`. Both are non-retryable; surface as inline form errors, not network retries.

---

# What the frontend needs to do to integrate

The SPA already has the scaffolding (`workspace-employees-client.ts`, `workspace-employees-in-memory.ts`, `WorkspaceEmployee` / `EmployeePermissions` domain types, `PermissionModuleKey` constants, the seven-module matrix UI, employee/invite drawers, `useWorkspaceEmployees`, `useMe`, etc.). The work below wires the HTTP adapter to the new endpoints, expands `useMe` to surface role/permissions, and adds the missing auth flows.

## 1. Fix `workspace-employees-http.ts`

Current state (`src/data/clients/workspace-employees-http.ts:6`) is mostly there but has issues:

- All paths are missing trailing slashes — Django will 301 unless you keep them consistent with the rest of the adapters (`/auth/login/`, `/users/me/`). Add the trailing `/`.
- `list()` returns `WorkspaceEmployee[]` but the endpoint is **cursor-paginated** — it returns `{ next, previous, results }`. Either unwrap `.results` in the adapter (sufficient for the current MVP since the UI loads the whole roster) or thread a paginator like `useInfiniteQuery` does elsewhere.
- `invite()` is typed as `Promise<void>` but the backend returns `WorkspaceEmployee[]` on 201. Change the return type and use the response to optimistically populate the table.
- `delete()` is typed as `Promise<void>` but the backend returns `{ archived: string[], failed: {id, code}[] }`. Plumb `failed[]` through to the bulk-delete toolbar so partial failures surface per-row.
- The shape signatures `UpdateWorkspaceEmployeeData` and `InviteEmployeeData` should add `companies?: string[]`.

Suggested patch:

```ts
list: async () => {
  const page = await http.get<{ results: WorkspaceEmployee[] }>(`/workspace/employees/`);
  return page.results;
},
get: (id) => http.get<WorkspaceEmployeeDetail>(`/workspace/employees/${id}/`),
invite: (invites) =>
  http.post<WorkspaceEmployee[]>(`/workspace/employees/invite/`, { body: { invites } }),
update: (id, data) =>
  http.patch<WorkspaceEmployeeDetail>(`/workspace/employees/${id}/`, { body: data }),
delete: (ids) =>
  http.post<{ archived: string[]; failed: { id: string; code: string }[] }>(
    `/workspace/employees/delete/`, { body: { ids } }),
updatePermissions: (id, data) =>
  http.patch<EmployeePermissions>(`/workspace/employees/${id}/permissions/`, { body: data }),
```

Update `WorkspaceEmployeesClient` (the interface), `useInviteEmployees`, and `useDeleteWorkspaceEmployees` to match the new return types and to render `failed[]` toasts.

## 2. Drop the `role?` `TODO` on `CurrentEmployee`

`src/data/domains/profile.ts:23` carries:

```ts
// TODO(api): role isn't on /users/me/ yet — drop `?` once the backend exposes it.
role?: EmployeeRole;
```

`/users/me/` now returns `role`, `permissions`, `isWorkspaceOwner`. Extend the type:

```ts
export interface CurrentEmployee {
  // … existing fields …
  role: EmployeeRole | null;
  permissions: EmployeePermissions | null;
  isWorkspaceOwner: boolean;
}
```

…and drop the TODO. Same shape lives on the `user` payload returned by `/auth/login/`, `/auth/register/`, and `/auth/invite/accept/`, so `LoginResult` / `RegisterResult` get the same fields for free.

## 3. Add the permission helpers + route gate

Add a tiny module — `src/data/permissions.ts` — exporting:

```ts
export type Level = PermissionLevel;          // re-export for ergonomics
export function effectiveLevel(me, module): Level;
export function canView(me, module): boolean;
export function canEdit(me, module): boolean;
```

Then:

- Add a `<RequireModule module="employees" level="view">{children}</RequireModule>` route wrapper (or hook) backed by `useMe`. Use it on the employees, companies, tasks, emails, workspace-settings, procurement-inquiries, and positions screens.
- In the sidebar, hide nav items the user can't view.
- On action buttons (Edit, Invite, Delete, …), disable when `canEdit` is false and add a tooltip ("Недостаточно прав").

`PERMISSION_MODULE_KEYS` and `PERMISSION_MODULE_LABELS` already exist in `src/data/types.ts:277`.

## 4. Map the structured 403 in `errors.ts`

In `src/data/errors.ts` (or wherever `AuthError(403)` is constructed in `http-client.ts:236`), inspect the response body. If it carries `code: "permission_denied_module"`, expose `error.module` and `error.required` on the thrown error so the UI toast can be specific ("Недостаточно прав: модуль «Сотрудники»"). Same trick for `cannot_modify_workspace_owner` and `admin_role_required` — surface them as inline form errors, not toasts.

## 5. Build the invite-accept route

A new public page that the invite email's `?uid=…&token=…` link lands on. Reuse the password-reset / register form components.

- Render two password fields. Submit posts `{uid, token, password, passwordConfirm}` to `/auth/invite/accept/`.
- On 200, stash `access`/`refresh` via the same session-bootstrap path `login` uses, set `["me"]` query data from `response.user`, and redirect to the workspace shell.
- On 400, surface field errors (`token`, `password`, `passwordConfirm`) under the inputs. The `token` error means the link is dead — show "Срок действия приглашения истёк" + a "request a new invite" CTA that pings the inviting workspace admin.
- The route must be reachable even when the SPA has a stale session — call `clearTokens()` before mounting the form so the user doesn't end up authenticated as the wrong account mid-accept.

Add `inviteAccept` to `SessionClient` (alongside `register`, `resetPassword`):

```ts
inviteAccept: (input: InviteAcceptInput) =>
  http.post<LoginResult>(`/auth/invite/accept/`, { body: input, skipRefresh: true }),
```

…and matching `LoginResult` typing.

## 6. Wire `check-email-invitable` into the invite drawer

In `src/components/invite-employees-drawer.tsx`:

- Debounce the email field (≈300 ms).
- On blur or after debounce, call `/auth/check-email-invitable/`. If `invitable === false && reason === "already_belongs_to_a_workspace"`, show an inline error under the email input ("Этот email уже принадлежит другому рабочему пространству"). Disable submit for that row only.
- This is a pure UX nicety — the backend rejects the same case on `POST /invite/` with `{"email": ["already_belongs_to_a_workspace"]}`, so the drawer must still handle that rejection alongside the per-row error array.

Add to `SessionClient`:

```ts
checkEmailInvitable: (email: string) =>
  http.post<{ invitable: boolean; reason: string }>(
    `/auth/check-email-invitable/`, { body: { email } }),
```

## 7. Bulk-archive UX

`useDeleteWorkspaceEmployees` should pattern-match the new response:

- Treat `archived[].length === ids.length` as a clean success.
- For every entry in `failed[]`, find the row by `id` and decorate it with the failure reason: `cannot_archive_owner` → "Владелец пространства", `cannot_archive_admin` → "Сначала измените роль на «Пользователь»", `not_found` → silently drop (the row was already gone).

## 8. Archived view

Add a `?archived=true` toggle on the employees page. The backend already hides archived rows from `list` by default; flip the query param when the user opens the "Архив" tab. Detail/edit endpoints still work on archived rows, so the read-only archive view can hydrate via `useWorkspaceEmployeeDetail`.

## 9. Test-double parity

`src/data/clients/workspace-employees-in-memory.ts` and the contract test (`workspace-employees-contract.test.ts`) need updates to reflect:

- `invite()` returns `WorkspaceEmployee[]`.
- `delete()` returns `{ archived, failed }`.
- `update()` rejects with the correct error shape when targeting the workspace owner or changing role without admin.

Keep contract parity — the HTTP adapter and the in-memory client should pass the same suite.

## 10. Drop the legacy per-company `EmployeesClient`

The old `companies/employees/` endpoint is gone — `companies/api_urls.py` no longer mounts it, and the model is deleted in migration `companies/0006_delete_employee.py`. Anything still importing `src/data/clients/employees-client.ts` against HTTP will 404.

- Delete `employees-client.ts`, `employees-http.ts`, `employees-in-memory.ts`, `employees-contract.test.ts`, the `EmployeesClient` provider in `clients-context.tsx`, and `useCompanyEmployees`. Use `useWorkspaceEmployees({ company: companyId })` for the per-company view.
- Migrate any component reading employee permissions from the old domain to the new `permissions` field on `WorkspaceEmployeeDetail`.
- Keep `src/data/domains/employees.ts` only as a type re-export (`Employee`, `EmployeePermissions`, `EmployeeRole`, `PermissionLevel`, `PermissionModuleKey`) — drop `CreateEmployeeData` and the standalone `UpdatePermissionsData` (the workspace-employees domain defines them).

## Suggested rollout order

1. `useMe` carries the new fields (#2) + permission helpers (#3) — unblocks gating on every other screen.
2. Error mapper (#4) — needed before any 403-heavy UI changes ship.
3. Fix `workspace-employees-http.ts` + in-memory parity (#1, #9) — unblocks the employees page end-to-end.
4. Bulk-archive UX (#7) + archived view (#8).
5. Invite drawer pre-flight check (#6).
6. Invite-accept route (#5).
7. Legacy cleanup (#10) — last, so feature work isn't blocked by a refactor.
