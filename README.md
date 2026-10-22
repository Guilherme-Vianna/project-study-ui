# project-study-ui

Web UI for [project-study-api](../project-study-api), built with Next.js 16 (App Router, server-side rendering), React 19 and Tailwind CSS v4.

## Getting started

1. In the Firebase console, open the same project the API uses (`FIREBASE_PROJECT_ID`), enable the **Google** and **Email/Password** sign-in providers, and register a Web app.
2. Copy the environment file and fill in the Web app config:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `API_BASE_URL` | API URL, server-only (default `http://localhost:8080`) |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web app API key |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `my-project.firebaseapp.com` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Must match the API's `FIREBASE_PROJECT_ID` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app id |

3. Make sure `localhost` is listed under Authentication → Settings → Authorized domains.
4. Run:

   ```bash
   pnpm install
   pnpm dev
   ```

Open http://localhost:3000. After signing in you land on `/inicio`, which loads `GET /api/v1/me` from the API.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm test` | Unit and component tests (Vitest) |
| `pnpm lint` | ESLint |

Architecture, auth flow, design system and usability rules: [CLAUDE.md](CLAUDE.md).
