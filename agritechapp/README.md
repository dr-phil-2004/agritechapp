# AgriVeille - Veille phytosanitaire participative

Une plateforme de veille phytosanitaire participative pour l'agriculture au Bénin.

## 🎯 Objectif

Un producteur signale un ravageur par photo et voix (ou par appel), un conseiller agricole le confirme, et tous les producteurs de la zone sont alertés automatiquement, par le canal adapté à chacun et dans leur langue.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Un compte Supabase (gratuit)

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/dr-phil-2004/agritechapp.git
cd agritechapp

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés Supabase
```

### Variables d'environnement

Créez un fichier `.env` avec les variables suivantes :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_supabase

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Notification Provider (simulated ou africastalking)
NOTIFICATION_PROVIDER=simulated

# Demo password pour les personas
DEMO_PASSWORD=demo123
```

### Lancer le développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Base de données

```bash
# Générer les migrations
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Peupler la base de données avec les données de test
npm run db:seed
```

### Tests

```bash
# Tests unitaires
npm test

# Tests E2E
npm run test:e2e

# Linting
npm run lint

# Formatage
npm run format
```

## 📋 Personas

### Bio (Producteur smartphone)
- **Rôle** : Producteur avec smartphone
- **Connexion** : Numéro + code à 6 chiffres
- **Fonctionnalités** : Signaler (photo + voix), recevoir alertes, vendre

### Adjara (Producteur basique)
- **Rôle** : Producteur sans smartphone
- **Connexion** : Aucune (reconnue par numéro)
- **Fonctionnalités** : Recevoir alertes par appel vocal, signaler par appel

### Serge (Conseiller)
- **Rôle** : Conseiller agricole
- **Connexion** : E-mail + mot de passe
- **Fonctionnalités** : Carte des signalements, qualification, inscription assistée

### Mme Houénou (Acheteur)
- **Rôle** : Commerçante de céréales
- **Connexion** : Numéro + code à 6 chiffres
- **Fonctionnalités** : Consulter annonces, appeler producteurs

### Admin
- **Rôle** : Direction départementale
- **Connexion** : E-mail + mot de passe
- **Fonctionnalités** : Tableau de bord, gestion contenus, recettes

## 🔧 Stack technique

- **Framework** : Next.js (App Router) + TypeScript strict
- **Base de données** : Supabase (PostgreSQL + PostGIS)
- **ORM** : Drizzle ORM
- **Authentification** : Supabase Auth + Row Level Security
- **UI** : Tailwind CSS + shadcn/ui
- **Tests** : Vitest (unitaires), Playwright (E2E)
- **Accessibilité** : @axe-core/playwright
- **Hébergement** : Vercel + Supabase

## 📱 Page de démo

Une page `/demo` permet de tester l'application avec les différents personas sans mot de passe. Tous les personas utilisent le mot de passe défini dans `DEMO_PASSWORD`.

## 🌐 Déploiement

### Vercel

Le projet est configuré pour être déployé sur Vercel. Les variables d'environnement suivantes doivent être configurées dans Vercel :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `NOTIFICATION_PROVIDER`
- `DEMO_PASSWORD`

## 📝 Structure du projet

```
src/
  domains/          # Logique métier par domaine
    signalements/
    alertes/
    vente/
    recettes/
    contenus/
    meteo/
  infrastructure/   # Infrastructure technique
    notifications/
    supabase/
    offline/
app/               # Pages Next.js
  (producteur)/
  (conseiller)/
  (acheteur)/
  (admin)/
  demo/
db/                # Base de données
  schema.ts
  migrations/
  seed/
tests/             # Tests
  unit/
  e2e/
  a11y/
```

## 🔐 Sécurité

- Row Level Security activé sur toutes les tables
- Politiques d'accès par rôle
- Sessions persistantes de 90 jours pour les producteurs
- Blocage après 5 tentatives échouées (15 minutes)

## ♿ Accessibilité

- Interface pensée pour les faibles niveaux d'instruction
- Compatible lecteur d'écran
- PWA installable, hors ligne
- Audio dans les langues locales (fon, bariba)
- Cibles tactiles ≥ 48×48 px
- Aucune information portée uniquement par la couleur

## 📄 Licence

Ce projet est développé dans le cadre du challenge « Agriculture intelligente ».

## 🤝 Contribution

Ce projet est en développement actif. Pour toute question ou contribution, veuillez contacter l'équipe de développement.
