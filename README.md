# Mainstreet MFB Loan Approval Flow (front end)

Built by MoneyLot Solutions for Mainstreet Microfinance Bank Limited.

Internal web app for taking Retail and SME loans from application through a configurable approval chain to an accepted offer, then handing them to Finance. Disbursement and repayment are out of scope.

This is currently **front end only**: all data comes from static mock JSON, loaded into an in-browser store. There is no backend.

## Setup

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

| Script                         | What it does                                                  |
| ------------------------------ | ------------------------------------------------------------- |
| `pnpm dev` / `build` / `start` | Next.js                                                       |
| `pnpm typecheck`               | `tsc --noEmit` (strict)                                       |
| `pnpm lint`                    | ESLint                                                        |
| `pnpm mock:generate`           | Regenerates `src/mocks/data/*.json` from `scripts/mock-data/` |

Optional settings are listed in `.env.example`. Copy it to `.env.local` to change them.

## Demo

Sign in at `/login`: choose a staff account, then enter its password (**Mainstreet@2026** for every demo account until changed in Settings). Every action that changes an application — approval decisions, running checks, saving the assessment, submitting, sending or re-sending an offer, handing over to finance — is confirmed with the user's PIN: **1234** for all demo users (three wrong tries lock the PIN for 15 minutes). Everyone lands on the **Dashboard**; navigation and actions change with the role.

**Documents** open in a full-screen viewer from the Applications sheet or the Applicant tab: PDFs in the browser's own PDF reader (with Open and Download, and a fallback where a browser can't show PDFs inline), images as images. Each document carries a `url`; a real backend returns a short-lived signed link. The demo's files live in `public/samples` and are regenerated with `python3 scripts/mock-data/sample-files.py`.

**Settings** (sidebar → Account, or the account menu) has each user's profile and access, a password change (every demo account starts with **Mainstreet@2026**), a PIN change (the new PIN signs every action from then on), Out of office delegation to a colleague in the same role (PIN-confirmed, up to 30 days), personal notification channels, and the theme.

**Who sees what.** Staff see only applications they own, have already worked on (decided, voted, assessed, messaged, sent an offer), or that are waiting on them right now: verification officers see the verification queue, credit analysts the assessment queue, approvers only loans at their own stage (the final committee never sees a loan still at the Credit Manager), and finance only accepted offers. Auditors and administrators see everything; the bank can grant that oversight to other roles with _See every application_ in Roles & permissions.

Each application has a review panel down the right-hand side: next step and actions, credit view, checklist, and a **discussion** where any staff member can message the team (everyone who has worked on the application gets a notification). During verification and assessment the team can **reject** the application or **return** it to the officer; both need a reason, a comment and the PIN, and the comment is posted to the discussion.

Customers never sign in: they review and accept their offer through a secure link (`/offer/<token>`). Every offer sent gets its own number (`OFR-YYMM-NNNNN`) and a random 48-character token that is unrelated to the application. Re-sending an offer issues a new number and link and retires the old one; only the newest, unexpired link (14 days) can be accepted. Use **Copy offer link** on an application in _Offer sent_ to open it.

To change user, sign out from the user menu.

| User              | Role                 | Worth trying                                                                                     |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| Ngozi Okafor      | Credit Manager       | Maker-checker block on her own application; covering Head of Credit approvals under a delegation |
| Olumide Adebayo   | Head of Credit       | Marked _away_; his approvals are delegated to Ngozi                                              |
| Adaeze Nwosu      | Relationship Officer | Sees only her own applications                                                                   |
| Aisha Mohammed    | Final Approver       | Committee member — casts the deciding vote on the 1–1 split (_ML-SME…01232_)                     |
| Chiamaka Okeke    | Final Approver       | Committee member — try _ML-SME…01221_, one vote already in                                       |
| Babatunde Fashola | Final Approver       | Committee member (2 of 3 votes decide)                                                           |
| Emeka Obi         | Finance Officer      | Handover queue                                                                                   |
| Segun Afolabi     | Admin                | Administration screens                                                                           |
| Halima Yusuf      | Auditor              | Read-only access with the audit log                                                              |

### Seeded edge cases

There are 351 applications across all 12 statuses, plus these deliberate cases:

- **Self-approval attempt:** created by Ngozi Okafor, now waiting at her own Credit Manager stage.
- **Duplicate applicant:** two live applications share one BVN.
- **Failed BVN checks:** some still in verification, some rejected.
- **SLA:** applications that are on track, due soon and breached, at every stage.
- **Auto-escalation:** three applications escalated after a Credit Manager SLA breach.
- **PEP screening hits:** two applications.
- **Returned and more-info-requested:** applications with reviewer comments.

Timestamps in the JSON are relative to an anchor date. On load they are shifted to "now", so SLA states stay live whenever you run the app.

## Folder conventions

```
src/
  app/
    (auth)/login              Mock sign-in
    (staff)/…                 Staff app; layout = auth gate + shell
    (public)/offer/[token]    Customer-facing offer page
  features/<feature>/
    api/          Data access + query key factory (the only layer that knows about mocks)
    hooks/        TanStack Query hooks and feature state
    components/   Feature UI
    schemas/      Zod schemas: the single source of truth for types, forms and API validation
    types/        z.infer'd types
  features/workflow/engine/   Pure workflow rules (routing, limits, SLA, maker-checker, transitions, validation)
  components/ui/              shadcn/ui primitives
  components/shared/          DataTable, FilterBar, StatusBadge, DecisionDialog, …
  components/shell/           Sidebar, top bar, ⌘K palette, notifications, user menu
  lib/                        Formatters (money is integer kobo → one formatter), RBAC, API client
  mocks/
    data/*.json               Static mock data
    store.ts                  Loads and validates the JSON into an in-memory store
    transport.ts              mockRequest(): latency, auth, permission check, Zod validation
    handlers/                 Query logic over the store (filtering, sorting, paging)
scripts/mock-data/            Deterministic generator for the JSON
```

Rules:

- The UI never decides workflow rules. It calls the engine (for example, `useApprovalEligibility`) and renders what comes back.
- Money is always integer kobo. Render it with `<MoneyText>` or `formatNaira`.
- List state (page, sort, filters) lives in the URL via nuqs.
- Permissions drive navigation (`components/shell/nav.ts`), route access (`lib/rbac/routes.ts`) and actions (`<Can>` / `useCan`).

## Swapping in the real backend

Every network-shaped call goes through a feature's `api/` module, for example:

```ts
// features/applications/api/applications.ts
export function fetchApplications(params: ApplicationListParams) {
  const parsed = applicationListParamsSchema.parse(params)
  return mockRequest(applicationListSchema, ({ store, session }) => listApplications(store, session, parsed))
}
```

To move a feature to the real API, replace the `mockRequest(...)` call with `apiFetch(...)` and keep the same response schema:

```ts
return apiFetch("/applications", { schema: applicationListSchema, query: params })
```

Hooks, components and query keys don't change. `apiFetch` (in `lib/api/client.ts`) validates every response with the same Zod schemas and throws a typed `ApiError`. Array query params are sent comma-separated.

Auth: replace `features/auth/api/session.ts` with calls to your identity provider. When there's a server, add Next.js middleware for redirects; the client-side gate in `components/shell/staff-shell.tsx` then becomes a fallback.
