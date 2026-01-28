# EvoShape

Phase 1: suivi régime avec Next.js App Router, Supabase, et OneSignal.

## Prérequis
- Node.js 18+
- Supabase CLI (projet déjà linké)

## Setup local
1) Installer les dépendances:
```bash
npm install
```

2) Configurer les variables d'environnement:
```bash
cp .env.example .env.local
```

Renseigner au minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_ONESIGNAL_APP_ID` (optionnel)
- `ONESIGNAL_REST_API_KEY` (server only, requis pour l'envoi test)
- `USDA_FDC_API_KEY` (server only, requis pour la recherche alimentaire)

3) Appliquer les migrations Supabase:
```bash
supabase db push
```

4) Lancer le projet:
```bash
npm run dev
```

## Scripts utiles
- `npm run lint`
- `npm run build`

## Notes
- Les secrets ne doivent jamais être committés. Utiliser uniquement `.env.local` et les variables Vercel.
- Si OneSignal n'est pas configuré, l'UI désactive l'activation des notifications.

## GitHub Actions (optionnel)
Un workflow peut pousser les migrations Supabase automatiquement sur `main`.

Secrets requis dans GitHub:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` (ex: `pktqulzpsfezqnccwlud`)
- `SUPABASE_DB_PASSWORD` (si requis par votre projet)
