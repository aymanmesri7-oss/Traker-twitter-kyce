# Agence CRM — suivi VA & comptes Instagram

Dashboard Next.js 14 + Supabase pour superviser les VA et leurs comptes Instagram jetables.
Tout est saisi à la main ; le dashboard calcule les échéances (story, check des vues, Reels de routine) en heure de Paris.

## Lancer en local

```bash
cp .env.example .env.local   # puis renseigner l'URL et la clé publishable Supabase
npm install
npm run dev
```

## Supabase

- Projet : `ig-crm` (eu-west-3). Schéma dans `supabase/migrations/`.
- Pas d'authentification : toute personne ayant l'URL voit et modifie les données (RLS ouverte au rôle anon).
- Règles en base : un @username ne peut être actif qu'une fois, et un VA ne peut pas dépasser `max_accounts_per_va` comptes actifs.

## Pages

| Route | Rôle |
|---|---|
| `/` | Quoi faire maintenant : urgences triées, rafraîchi toutes les 60 s |
| `/vas` | Liste des VA, recherche, filtres, tri |
| `/vas/[id]` | Fiche VA : comptes actifs + actions rapides, historique, timeline |
| `/comptes` | Tableau global des comptes |
| `/parametres` | Règles de calcul |

## Déploiement Railway

Build `npm run build`, start `npm start`, variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
