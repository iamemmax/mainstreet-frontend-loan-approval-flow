# MoneyLot Loan Approval Flow: how to write code here

A loan approval flow for Mainstreet MFB. Staff capture an application, verify it,
assess it, take it through approval, send an offer, and hand the accepted loan to finance.
Write code a junior developer can open, understand and change safely. Prefer clear and
boring over clever, and match the code around you.

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind 4 · shadcn/ui (radix-ui)
· TanStack Query · react-hook-form + zod · date-fns · Jest. Package manager: pnpm.
Before using a framework API you're unsure about, check the installed version's docs in
`node_modules/next/dist/docs/`.

## Product rules

- **One staff app.** Every role signs into the same shell; navigation, dashboard, reports and
  actions adapt to the role. Customers only ever see the offer link (`/offer/[token]`).
- **Each team does its own step.** Verification officers verify, analysts assess, approvers
  decide, finance hands over. Never give a role an action from another team's step.
- **Production-looking UI.** No "demo", "test", "mock" or "coming soon" labels or placeholders.
- **Financial or irreversible actions** go through the PIN confirm (`usePinConfirm`) and end
  with a toast.

## Folder structure

| Folder                    | What goes there                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/...`             | Routes only. `page.tsx` sets metadata and renders one feature component. No logic.                                                                                             |
| `src/components/ui/`      | shadcn primitives. Generated; rarely edited.                                                                                                                                   |
| `src/components/shared/`  | Reusable building blocks: `PageHeader`, `StatCard`, `DataTable`, `filter-bar/`, `NumberInput`, `SegmentedControl`, `EmptyState`/`ErrorState`, `MoneyText`, badges, PIN confirm |
| `src/components/shell/`   | App shell, sidebar, top bar, notifications, navigation config                                                                                                                  |
| `src/features/<feature>/` | `api/`, `hooks/`, `components/`, `schemas/`, `types/`, `utils/` for one feature                                                                                                |
| `src/lib/`                | Framework-free helpers: `format/` (money, dates), `rbac/` (roles, permissions, role profiles), `navigation/intent`, `export/csv`, `api/`                                       |
| `src/hooks/`              | Generic hooks only (`useNow`, `useDebouncedValue`, `useMobile`)                                                                                                                |
| `src/mocks/`              | The stand-in backend: JSON data, handlers and `mockRequest`. Replaced by the real API later.                                                                                   |

## Where the rules live (use these, don't redefine them)

- **Statuses and status groups**: `features/applications/schemas/status.ts`
  (`OPEN_STATUSES`, `RETURNED_STATUSES`, `APPROVED_STATUSES`, `ASSESSABLE_STATUSES`).
- **Permissions**: `lib/rbac/permissions.ts`. Check with `useCan()` / `<Can>` / `can()`.
- **What differs by role** (dashboard, report, steps owned, insights): `ROLE_PROFILE` in
  `lib/rbac/profiles.ts`. Add role behaviour there, not in another `Record<Role, …>`.
- **Who can see an application**: `mocks/handlers/visibility.ts`.
- **When an application reached a step**: `mocks/handlers/timeline.ts`.
- **Money** is integer kobo everywhere. Convert with `nairaToKobo`/`koboToNaira`, and
  display with `formatNaira`/`<MoneyText>`. Counts use `formatCount`/`pluralize`.

## API layer

1. Each feature's `api/<feature>.ts` holds its request functions and query keys. Each
   function calls `mockRequest(schema, handler, { permission })` and has a comment with the
   real call, e.g. `// Real backend: apiFetch("/reports/summary", { params, schema })`.
2. Hooks live in `hooks/use-<feature>.ts`: `useX` (useQuery) or `useDoX` (useMutation).
3. Query keys are a `xKeys` object per feature, extended with the params:
   `reportsKeys.summary(params)`.
4. Set a `staleTime` that suits the data: live data 30 s–2 min; reference lists and settings
   5–10 min. Never `Infinity` or hours.
5. Mutations invalidate what they affect in `onSuccess` (the dashboard included).
6. Errors show in the global error modal. A component opts out only when it shows its own.
7. Responses are validated with zod. Request and response shapes live in the feature's
   `schemas/`; types are `z.infer` of those schemas in `types/`.
8. New mock handlers enforce the same permission and visibility rules the real API will.

## Types

- Prefer writing a response shape out over adding a new generic wrapper. Generics are fine in
  truly generic UI (`DataTable<T>`, `SegmentedControl<T>`).
- Field names mirror the API. Comment any field whose meaning or unit isn't obvious
  (`/** Kobo. */`, `/** ISO date, inclusive. */`).

## Components

- **One job per file; aim for under ~250 lines.** When a component grows, move its parts into
  a folder beside it and keep the import path stable. For example `tabs/assessment-tab.tsx`
  plus `tabs/assessment/affordability.tsx`, or `filter-bar/index.tsx` re-exporting `state.ts`.
- File names are kebab-case (`queue-card.tsx`). Name parts after what they show, and hooks
  after what they manage.
- Put repeated UI in arrays and `.map()` them: figures, columns, filter options, nav links.
- Every data area handles **loading** (skeleton), **error** (`ErrorState` with retry) and
  **empty** (`EmptyState` with a helpful line).
- Reuse `components/shared` before writing something new. If you build something reusable,
  put it there.
- **Number inputs** for amounts and counts use `NumberInput` (thousands separators as you
  type). BVN, NIN, phone numbers and PINs are identifiers: never group them.
- Pick-one-of-a-few views use `SegmentedControl`. Rows of buttons and badges that must line
  up across rows share one CSS grid (`grid-cols-subgrid`).
- Show a tab, card or action only when it applies to this application's status and the
  user's role. Don't show empty or disabled forms to people who can't use them.
- Hand state to the next screen with `setIntent()` (list filters, the tab to open), not the URL.
- Follow the hooks rules and lint. Derive values during render instead of syncing them with
  `setState` in `useEffect`.
- Forms: one zod schema per form plus react-hook-form. Disable Submit only while a request is
  in flight or when nothing has changed.
- Load heavy libraries (PDF, charts) on demand with `await import()` or `next/dynamic`.

## Keep it simple

The test for any code here: can a junior developer read it top to bottom and change it safely?

- **No nested ternaries.** `a ? b : c` is fine; `a ? b : c ? d : e` is not. Use `if` /
  `else if`, an early `return`, or a small named function (`groupStatus()`, `activityTone()`).
  The one accepted exception is the JSX loading/error/content switch, one branch per line.
- **Small named functions over clever expressions.** A helper with a clear name and a
  one-line JSDoc beats a dense chain of `.filter().map().reduce()` with inline logic.
- **A plain `for` loop is fine** when it's clearer than `reduce` or `flatMap`.
- **No functions defined inside other functions** except tiny local helpers. Pass what a
  function needs as arguments (see `mocks/handlers/dashboard/`: one `ctx`, one job per file).
- **Explicit names over abbreviations**: `daysAtStep`, `handedOverThisMonth`, not `d`, `hd`, `t`.
- **Lookup objects for value maps** (`DECISION_TONE[action]`), not repeated `===` checks.

## Writing style

- Comments explain **why**, or the contract, in one or two plain lines. Don't narrate the code.
- Every component and hook gets a one-line JSDoc saying what it shows or does.
- Clear names: `isPending`, `canEdit`, `breached`, `selectedIds`. Never `data2`, `tmp`, `flag`.
- UI text is short, specific and plain: "Couldn't load the dashboard." / "3 checks need review".
- Formatting is Prettier's job (`.prettierrc.json`: no semicolons, double quotes, trailing
  commas, 120 characters). Don't hand-format; run `pnpm format`.
- Import order: react/next → libraries → `@/components` → `@/features` → `@/lib` → relative.

## Mock data

- Seed data lives in `src/mocks/data/*.json`, generated by `pnpm mock:generate`. Dates shift
  so the data always looks current.
- Live actions write audit events named `application.<transition>`; the seed data uses older
  names (`verification.completed`, `handover.ready`). `timeline.ts` maps both. Keep it that way.

## Before you finish any task

Run these and fix everything they report:

    npx prettier --write <changed paths>
    npx tsc --noEmit
    npx eslint <changed paths>
    npx jest

`src/components/ui/` (shadcn) is excluded from formatting on purpose. For a change to a page,
also load it on the running dev server (or run `next build` in a separate copy of the repo,
never in the working one while `next dev` runs).

Then say what you changed, what you checked, and what you couldn't verify (for example,
"not tested in the browser").
