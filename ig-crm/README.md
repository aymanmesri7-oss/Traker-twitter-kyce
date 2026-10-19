# Agence CRM — qui a quels comptes Insta

Une seule page pour lister les VA et leurs comptes Instagram :

- ajouter un VA avec juste son nom ;
- cliquer sur un VA pour coller un lien Instagram et voir ses comptes ;
- une note libre par VA (ex. « doit créer dans 24h ») ;
- supprimer un compte (2 clics) ou un VA (avec confirmation).

Pas de connexion : toute personne ayant l'URL voit et modifie les données.

## Lancer en local

```bash
cp .env.example .env.local   # puis renseigner l'URL et la clé publishable Supabase
npm install
npm run dev
```

## Supabase

Projet `ig-crm` (eu-west-3). Schéma dans `supabase/migrations/`.
Un même compte Insta ne peut pas être enregistré deux fois.

## Déploiement Railway

Build `npm run build`, start `npm start`, variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
