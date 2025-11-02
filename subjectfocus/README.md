# SubjectFocus

Minimal Vite + React app wired to Supabase with Tailwind and React Router.

## Env Vars
Frontend (Vite):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend (serverless for ChatKit):
- `OPENAI_API_KEY` (required)
- `CHATKIT_WORKFLOW_ID` (optional; defaults to the provided workflow)

Create `.env.local` in project root for Vite. For serverless in local dev, use `netlify dev` or `vercel dev` with env vars set.

## Run (Vite only)
```
npm install
npm run dev
```

## Run with Chat (Netlify)
```
# set envs for functions
netlify dev --env OPENAI_API_KEY=sk-... --env CHATKIT_WORKFLOW_ID=wf_...
```
This serves frontend and maps `/api/chatkit/session` to `/.netlify/functions/chatkit-session`.

## Run with Chat (Vercel)
```
vercel dev
```
This serves `/api/chatkit/session` from `api/chatkit/session.js`.

## Build
```
npm run build
```

## Pages
- `/login`, `/signup`
- `/` (dashboard)
- `/study-set/new` (create set + inline cards)
- `/study-set/:id` (detail + right sidebar actions + ChatKit)

## Optimistic Flashcard Adds
When your agent returns a flashcard, call in browser:
```
window.handleNewFlashcard({ term: '...', definition: '...' })
```
The list updates immediately without a refresh.

