@AGENTS.md

# CLAUDE.md

## Rules for the AI

- Keep this file accurate: update it in the same change that alters structure, stack, commands, conventions or design rules.
- Code, identifiers, docs and commit messages are in English. User-facing copy is in Brazilian Portuguese (pt-BR).
- No comments in code unless the reason is not obvious from the code itself.
- Every new environment variable goes into `.env.example`.
- Next.js 16 differs from older versions (Proxy instead of Middleware, Cache Components): read `node_modules/next/dist/docs/` before using an API.

## Project

Web UI for `project-study-api` (FastAPI, `../project-study-api`): teachers create study plans, students follow them.

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (tokens in `src/app/globals.css` `@theme`)
- pnpm is the only package manager (`packageManager` + `preinstall: only-allow pnpm`); never use npm or yarn
- Cache Components and Partial Prefetching are on: anything reading `cookies()` must be inside `<Suspense>`
- Firebase Auth (client SDK) for Google and email/password; `jose` verifies ID tokens on the server
- Tests: Vitest + Testing Library (jsdom); Firebase, `next/navigation` and `next/headers` are mocked

## Auth flow

1. The client signs in with Firebase (`signInWithPopup` Google or email/password), then POSTs the ID token to `/api/session`.
2. `/api/session` verifies it (Google JWKS, issuer/audience = project id) and stores it in the httpOnly `session` cookie,
   expiring with the token. `DELETE /api/session` clears it.
3. Server code calls the API through `apiFetch` (`src/lib/api/client.ts`), which sends `Authorization: Bearer <cookie>`.
   The API base URL (`API_BASE_URL`) stays server-only; the browser never calls the API directly.
4. `SessionRefresher` (on authenticated pages) posts refreshed tokens from `onIdTokenChanged`; the login page restores a
   persisted Firebase user without asking for credentials again.
5. `src/proxy.ts` only does optimistic redirects by cookie presence (`PROTECTED_PATHS`); pages re-verify via
   `loadCurrentAccount()` (session + `GET /me`), which calls `connection()` before verifying the token.

## Onboarding and profiles

- `/inicio` sends users without a role to `/cadastro` (choose teacher or student; one role per account).
- `/cadastro/professor` and `/cadastro/aluno` → `POST /teachers|/students` via `RoleSignup`; `/perfil` shows the
  profile, `/perfil/editar` → `PATCH /<role>s/me`. Teacher and student share every profile field, so all profile code
  is role-generic (`lib/profile/roles.ts`, `lib/api/profiles.ts`, `lib/profile/actions.ts`).
- API rules mirrored in `fields.ts`: names ≤ 100/150 chars, birth date 1900..today, CEP 8 digits, BR mobile
  `DDD + 9 + 8 digits` (sent as digits; the API stores E.164). UI requires first and last name; the rest is optional.
- The API rejects explicit nulls, so saved fields can't be cleared (`locked`); empty fields are omitted from payloads.
- 409 "already registered" → home; 409 other role → explain one role per account; 422 `detail[].loc` → field errors.
- CEP shows the address from ViaCEP (browser fetch, non-blocking). Success → `/inicio?bem-vindo=<role>` or `/perfil?salvo=1`.
- Pass `today` from the server to client components; never call `new Date()` while rendering a client component.
- `loadCurrentAccount` is wrapped in React `cache()`, so header and page share one `GET /me` per request.

## Invites and students

- Teacher `/alunos` ("Seus alunos", never "turma"): student list (all pages fetched, filtered client-side: accent-insensitive name/phone search,
  "Perfil incompleto" filter, A–Z/Z–A sort) + invite panel (validity 7/30 days or none, copy/share, revoke).
- Invite links are built by the UI as `<origin>/convite/<token>` (`lib/invites/links.ts`), not from the API `url`.
- `/convite/[token]`: preview (404 not found, 410 expired/revoked) → student accepts; no role → `/cadastro/aluno?convite=`
  and back after signup; teacher → explanation. Logged-out visitors go to `/?next=…` and return after login (`safeNextPath`).
- "Remover" ends the enrollment (`DELETE /teachers/me/students/{id}`), never deletes the account. Destructive actions
  always go through `ConfirmDialog` (native `<dialog>`), and mutations call `refresh()` from `next/cache`.
- Student home lists their teachers (`GET /students/me/teachers`); teacher home summarizes the class.

## Subjects

- Teacher `/assuntos`: subjects are study topics (Trigonometria, Inglês…). Cards with search (name/description),
  A–Z / recent sort, create/edit in a `Modal` form, delete via `ConfirmDialog`. Empty state offers suggestion chips;
  "no results" offers to create the searched name.
- API: name 1–100 chars, unique per teacher ignoring case (checked client-side too, 409 → name field error);
  description ≤ 2000 (empty → null). Delete 409 = subject used by a study plan.
- Teacher home shows overview cards (students, subjects); new teacher features add a card and a `MainNav` item.

## Exercises

- Teacher `/exercicios` (list: search title/statement, type chips, subject select incl. "Sem assunto", recent/A–Z),
  `/exercicios/novo` and `/exercicios/[id]` (full-page `ExerciseEditor`, sticky save bar, discard confirmation and
  `beforeunload` guard when dirty). Draft model, payload mapping and validation live in `lib/exercises/`.
- API rules mirrored: title ≤ 200, texts ≤ 10000, hours 0 < h ≤ 168 (typed as "0,5"), ≤ 20 subjects, ≤ 20 images;
  multiple choice = 2–10 options, each with text or image, ≥ 1 correct, no expected answer; open answer = no options.
  Saving uses `PUT` (full replace). Delete 409 = used by a study plan or has progress.
- Images: browser → `POST /api/images` (route handler re-checks type/size and forwards multipart with the bearer
  token) → API `POST /images`; referenced by id with placement `statement` | `attachment` or on an option.
  Images uploaded in the editor and then removed/discarded are deleted best-effort (`DELETE /api/images/[id]`).
  Render with `next/image` `unoptimized` (`ImageThumb`); `url` may be null when storage is not configured.

## Study plans

- Teacher `/planos` (cards with weekly goal, subjects, exercises and active student count), `/planos/novo`,
  `/planos/[id]` (assign to students, per-student progress this week + overall, end assignment, delete if never
  assigned) and `/planos/[id]/editar`. Draft/payload/validation in `lib/plans/`.
- `PlanEditor` must let teachers create what they forgot without leaving: "Novo assunto" opens `SubjectFormDialog`,
  "Criar exercício" opens `ExerciseEditor` in `embedded` mode inside an `xl` locked `Modal`
  (`saveExerciseAction(..., { stay: true })` returns the exercise). Created items join the plan immediately.
- It also suggests adding subjects used by the plan's exercises, shows totals (weekly goal, allocated hours,
  estimated weeks) and pre-selects the plan's subjects for new exercises.
- API rules mirrored: title ≤ 200, description ≤ 5000, ≤ 50 subjects (weekly 0 < h ≤ 168, sum ≤ 168, optional
  weekdays), ≤ 200 ordered exercises; empty allocated hours = exercise estimate, required when it has none.
  `PUT` replaces the plan; editing affects every assigned student (the editor says so).
- Assigning: "Atribuir plano" opens a modal with a searchable, multi-select student list; it disables students already following another plan (computed
  from every plan's active assignments); 409 explains it. Ending keeps progress.

## App shell

- Authenticated pages: full-width sticky header (logo + role `MainNav` left, `AccountMenu` right; below `md` the nav
  drops to a scrollable second row: avatar initials, name, role;
  menu with "Meu perfil" and "Sair"), content in `max-w-7xl`, left-aligned. Never center the whole app in a narrow column.
- Every page starts with `PageHeader` (optional back link, eyebrow, `h1`, description, actions on the right).
- Forms stay at `max-w-2xl` inside a `rounded-3xl` card; lists and dashboards may use the full width.
- Menus follow the ARIA menu pattern: `aria-haspopup`/`aria-expanded`, arrow keys, Escape returns focus, click outside closes.

## Forms

- Controlled inputs, `noValidate`, own pt-BR messages; on error focus the first invalid field (or the form alert).
- Masks format while typing (`formatMobilePhone`, `formatPostalCode`); mark optional fields with `optional`.
- Server Actions return `{ fieldErrors, formError }`; call `redirect()` outside `try`/`catch`.

## Layout

```
src/
  app/            page.tsx (login, "/"), api/session/route.ts, api/images/ (upload proxy + delete)
  app/(app)/      authenticated: layout (AppHeader, SessionRefresher), inicio/, cadastro/ (+ professor/, aluno/),
                  perfil/ (+ editar/), alunos/, assuntos/, exercicios/ (+ novo/, [id]/),
                  planos/ (+ novo/, [id]/, [id]/editar/),
                  convite/[token]/
  components/ui/  button, text-field, text-area-field, alert, spinner, copy-button, modal, confirm-dialog,
                  icons (reuse before creating new ones)
  components/     app/ (header, account menu, page header, loading, API error), auth/, brand/,
                  profile/ (form, role signup, summary, completion card, CEP lookup), invites/, students/,
                  subjects/, exercises/ (editor, board, subject picker, image upload/thumb),
                  plans/ (editor, exercise picker, weekday picker, assign button + student picker modal, actions)
  lib/            auth/ (constants, session, current account, errors), api/ (client + fetchAll, account, profiles, enrollments, subjects, exercises, plans),
                  profile/ (fields, roles, actions, action state), invites/ (actions, links, validity), subjects/ (actions,
                  validation), exercises/ (model, validation, actions, upload, from-api, teacher-guard),
                  plans/ (model, validation, actions, from-api), people, firebase/
  proxy.ts
tests/            vitest setup and stubs; test files live next to the code as *.test.ts(x)
```

## Design system

Palette (60-30-10): 60% backgrounds, 30% text/structure, 10% action colors. Use the Tailwind tokens, never raw hex.

| Token | Hex | Use |
| --- | --- | --- |
| `primary` | #2563EB | Main actions, highlighted buttons, progress (`primary-hover` #1D4ED8, `primary-soft` #DBEAFE) |
| `success` | #10B981 | Completed tasks, correct answers, streaks. Fills only; text uses `success-strong` #047857 |
| `accent` | #F59E0B | Warnings, pomodoro/timer, pending reviews. Fills only; text uses `accent-strong` #B45309 |
| `canvas` | #F8FAFC | App background |
| `surface` | #FFFFFF | Cards, flashcards, modals, inputs |
| `ink` | #0F172A | Headings and long reading |
| `muted` | #64748B | Metadata, dates, placeholders, captions |
| `border` / `border-strong` | #E2E8F0 / #94A3B8 | Dividers / input borders |
| `danger` | #DC2626 | Errors only (`danger-soft` #FEF2F2 background) |

- Shapes: pill buttons and inputs (`rounded-full`, `h-12`), cards `rounded-3xl`, alerts `rounded-2xl`.
- Typography: Geist; one `h1` per page; headings `font-semibold tracking-tight`; body text `text-base`.
- One primary button per view; secondary actions use `variant="secondary"` or `variant="link"`. `Button` is
  full-width for primary/danger unless `block={false}`; never override width with conflicting classes.
- Light theme only for now. Layout must work at 375px with a 16px gutter (`px-4`) and no horizontal scroll.
- Decorative visuals are `aria-hidden` and hidden on small screens when they push the task below the fold.

## Usability rules (Nielsen's 10 heuristics)

1. Visibility of status: every async action shows a spinner and a verb label ("Entrando…"); disable the control meanwhile.
2. Match the real world: plain pt-BR, the user's words (plano, matéria, exercício), no error codes or jargon.
3. Control and freedom: always offer a way back (switch sign in / sign up, sign out, "tente de novo"); closing a popup is not an error.
4. Consistency: reuse `components/ui` primitives and tokens; same wording for the same action everywhere.
5. Error prevention: right `type`, `autoComplete`, `inputMode`; validate before sending; show requirements up front (hints).
6. Recognition over recall: visible labels above inputs (placeholders are examples, never labels); show/hide password.
7. Flexibility: keyboard works end to end (Enter submits, visible `focus-visible` outline), restore sessions automatically.
8. Minimalist design: only what the task needs; no links to pages that do not exist yet.
9. Recover from errors: say what happened and how to fix it, next to the field (`aria-invalid` + `aria-describedby`), keep typed values, focus the first invalid field. Auth errors never reveal whether an email exists.
10. Help: short contextual hints and recovery paths (e.g. "Esqueceu a senha?") instead of separate docs.

Accessibility baseline: WCAG AA contrast, `role="alert"` for errors and `role="status"` for progress, touch targets ≥ 40px,
`lang="pt-BR"`, respects `prefers-reduced-motion`.

## Commands

```bash
cp .env.example .env.local
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```
