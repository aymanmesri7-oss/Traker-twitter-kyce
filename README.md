# Kyce Twitter Tracker

Dashboard pour suivre les comptes Twitter/X de vos VA (assistants virtuels).

## Setup Google Sheets

### 1. Créer un Google Cloud Project

1. Aller sur [Google Cloud Console](https://console.cloud.google.com)
2. Créer un nouveau projet (ex: "Kyce Tracker")
3. Activer l'API **Google Sheets API** :
   - Menu > APIs & Services > Library
   - Chercher "Google Sheets API" > Enable

### 2. Créer un Service Account

1. Menu > APIs & Services > Credentials
2. "Create Credentials" > "Service Account"
3. Nom : `kyce-tracker`
4. Cliquer "Done"
5. Cliquer sur le service account créé
6. Onglet "Keys" > "Add Key" > "Create new key" > JSON
7. Télécharger le fichier JSON — c'est votre `GOOGLE_SERVICE_ACCOUNT_KEY`

### 3. Préparer la Google Sheet

1. Créer une nouvelle Google Sheet
2. Partager la sheet avec l'email du service account (format: `kyce-tracker@votreprojet.iam.gserviceaccount.com`) — donner l'accès **Éditeur**
3. Copier l'ID de la sheet depuis l'URL : `https://docs.google.com/spreadsheets/d/SHEET_ID_ICI/edit`
4. Créer une feuille par VA (ex: "GROUP", "GROUP 1", "GROUP 3", etc.)
5. Dans chaque feuille, mettre ces headers en ligne 1 :

| Handle | Statut | Dernier tweet | Lien bio | Followers | Abonnements | Dernière vérification | Notes |
|--------|--------|---------------|----------|-----------|-------------|----------------------|-------|

6. Ajouter les handles des comptes à partir de la ligne 2

## Installation locale

```bash
# Installer les dépendances
npm install
cd client && npm install && cd ..

# Copier le fichier d'env
cp .env.example .env

# Éditer .env avec vos valeurs :
# GOOGLE_SHEET_ID=votre_id_de_sheet
# GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  (le JSON entier sur une ligne)
# PASSWORD=votre_mot_de_passe

# Lancer en dev
npm run dev
```

L'app sera sur `http://localhost:3000` (frontend) et `http://localhost:5000` (API).

## Déploiement Railway

1. Créer un repo Git et pousser le code
2. Sur [Railway](https://railway.app), créer un nouveau projet depuis le repo
3. Ajouter les variables d'environnement :
   - `GOOGLE_SHEET_ID` — l'ID de votre Google Sheet
   - `GOOGLE_SERVICE_ACCOUNT_KEY` — le contenu JSON du service account (tout sur une ligne)
   - `PASSWORD` — le mot de passe d'accès au dashboard
   - `NODE_ENV` — mettre `production`
4. Railway détecte automatiquement Node.js et build le projet
5. L'app est live !

## Fonctionnalités

- Dashboard dark mode avec stats en temps réel
- Groupes par VA (accordéon dépliable)
- Scan automatique toutes les heures
- Filtres : shadowban, inactifs, sans lien bio
- Recherche par handle
- Vue liste ou cartes
- Bouton "Edit in Google Sheet"
- Protection par mot de passe

## Stack

- **Backend** : Node.js + Express
- **Frontend** : React
- **Data** : Google Sheets API
- **Hosting** : Railway
