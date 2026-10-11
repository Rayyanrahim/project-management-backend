# Frontend Breaking Change: Workspace → Company

Backend ne `workspace` ko `company` rename kar diya hai.  
Agar frontend purane keys use karega to **UI / login / me API phat sakti hai**.

Please update frontend in the **same release** as this backend.

---

## Affected APIs

Ye endpoints ab naya shape return karte hain:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-otp`
- `GET /api/v1/auth/me`

Auth cookies / tokens same hain. Sirf user payload ke andar membership fields change hue hain.

---

## Response: Old vs New

### Old (break karega)
```json
{
  "data": {
    "id": "1",
    "name": "Ali",
    "email": "ali@example.com",
    "workspaceMemberships": [
      {
        "id": "1",
        "workspaceId": "1",
        "userId": "1",
        "role": "OWNER",
        "status": "ACTIVE",
        "workspace": {
          "id": "1",
          "name": "Ali",
          "slug": "ali-xxxxxxxx"
        }
      }
    ]
  }
}
```

### New (use this)
```json
{
  "data": {
    "id": "1",
    "name": "Ali",
    "email": "ali@example.com",
    "companyMemberships": [
      {
        "id": "1",
        "companyId": "1",
        "userId": "1",
        "role": "OWNER",
        "status": "ACTIVE",
        "company": {
          "id": "1",
          "name": "Ali",
          "slug": "ali-xxxxxxxx"
        }
      }
    ]
  }
}
```

---

## Exact field renames

| Old key | New key | Kahan break hoga |
|---|---|---|
| `workspaceMemberships` | `companyMemberships` | login/register/me parsing, lists, maps |
| `workspaceMemberships[].workspace` | `companyMemberships[].company` | name/slug show, selected org |
| `workspaceId` | `companyId` | filters, API params, localStorage |
| type/interface `Workspace` | `Company` | TypeScript types |
| type/interface `WorkspaceUser` / membership | `CompanyUser` | TypeScript types |

Roles same hain: `OWNER`, `ADMIN`, `MEMBER`, `GUEST`  
Status same: `ACTIVE`, `INACTIVE`

---

## Frontend checklist (must)

- [ ] Saari jagah `workspaceMemberships` → `companyMemberships`
- [ ] Nested `workspace` → `company`
- [ ] `workspaceId` → `companyId`
- [ ] Types/interfaces rename
- [ ] Redux/Zustand/Context: `currentWorkspace` → `currentCompany` (agar hai)
- [ ] localStorage / sessionStorage keys update
- [ ] React Query / SWR cache keys update
- [ ] Routes/URLs: `/workspaces/...` → `/companies/...` (agar hain)
- [ ] UI copy: “Workspace” → “Company” (optional, product decision)

---

## Quick search (frontend repo)

In frontend project, search and replace carefully:

```text
workspaceMemberships
workspaceId
.workspace
currentWorkspace
Workspace
/workspaces
```

---

## Example code change

```ts
// Before
const workspace = user.workspaceMemberships?.[0]?.workspace;

// After
const company = user.companyMemberships?.[0]?.company;
```

```ts
// Before
localStorage.setItem('workspaceId', id);

// After
localStorage.setItem('companyId', id);
```

---

## Deploy note

Backend + frontend **ek saath** release karo.  
Purana frontend + naya backend = blank company list / undefined errors.

---

## Questions?

Backend contact se confirm kar lo agar koi custom workspace API frontend pe call ho rahi ho. Ab membership nested object `company` hai.
