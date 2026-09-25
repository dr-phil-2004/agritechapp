# CLAUDE.md — AgriVeille (nom de travail)

> Ce fichier est la source de vérité du projet. Toute décision ci-dessous a été validée en cadrage.
> En cas de doute ou de conflit avec une demande ponctuelle, signaler le conflit avant d'agir.

---

## 1. Contexte

- **Cadre :** challenge « Agriculture intelligente » d'une sélection de développeurs, **3 jours**.
- **Délai réel : rendu le samedi 26 septembre 2026 à 20h.** Le planning (§ 13) est recalé sur ce délai ; le périmètre est inchangé.
- **Livrables obligatoires :** dépôt GitHub (code complet) + plateforme déployée en ligne, testable en live.
- **Exigences non négociables de l'énoncé :**
  1. Solution fonctionnelle et inclusive, utilisable **quel que soit le niveau d'instruction**.
  2. Interface claire et accessible, **pensée pour une connectivité limitée**.
  3. Une fonctionnalité de **monitoring qui marche de bout en bout** (ici : phytosanitaire).
  4. Une **gestion de contenu**, même basique, avec des données fictives ou réelles.
- **Critères du jury :** (1) profondeur de la réflexion sur les usages, (2) design, (3) fonctionnement, (4) analyse du code.

## 2. Le produit en une phrase

Une plateforme de **veille phytosanitaire participative** : un producteur signale un ravageur par photo et voix (ou par appel), un conseiller agricole le confirme, et tous les producteurs de la zone sont alertés automatiquement, par le canal adapté à chacun et dans leur langue.

**Indicateur clé à afficher partout :** délai entre le signalement et l'alerte.

---

## 3. Personas

| Code | Persona | Équipement / contraintes | Parcours |
|---|---|---|---|
| `producteur_smartphone` | **Bio**, 38 ans, maïs 2 ha, N'Dali (Borgou) | Android d'entrée de gamme parfois partagé, 2G/3G intermittente, lit difficilement le français, parle bariba | Signaler (photo + voix), recevoir les alertes, vendre |
| `producteur_basique` | **Adjara**, 52 ans, maïs + soja, près de N'Dali, dans le même rayon d'alerte que Bio | Téléphone à touches, pas d'internet, ne lit pas | Recevoir les alertes par appel vocal en bariba, signaler par menu vocal (touche + message) |
| `conseiller` | **Serge**, 34 ans, technicien ATDA | Smartphone + ordinateur, à l'aise | Carte des signalements, qualification, déclenchement d'alerte, publication de fiches |
| `acheteur` | **Mme Houénou**, commerçante de céréales à Parakou | Smartphone | Consulter les annonces par produit et zone, appeler le producteur |
| `admin` | Agent de la direction départementale / ministère | Ordinateur | Tableau de bord, gestion des contenus et fiches réglementaires, recettes |

Hors périmètre en tant que personas : exportateur (traité comme un acheteur), coopérative (rôle tenu par le conseiller).

---

## 4. Périmètre

### Priorité 1 — la boucle d'alerte phytosanitaire (à construire à fond)

1. **Signaler (Bio)** : photo compressée < 100 Ko, note vocale (Opus), GPS automatique, **mise en file d'attente hors ligne** puis synchronisation.
2. **Signaler (Adjara)** : appel entrant simulé, menu vocal « tapez 1 si… », puis message vocal.
3. **Qualifier (Serge)** : carte temps réel, écoute de la note, choix du ravageur et de la gravité, ou rejet.
4. **Alerter (système)** : tous les producteurs dans le rayon reçoivent l'alerte sur leur canal (voir § 6).
5. **Suivre** : statuts `signale → confirme → traite → clos` (ou `rejete`). Le producteur peut indiquer « j'ai appliqué le conseil ».
6. **Piloter (admin)** : carte des foyers, nombre d'alertes, producteurs prévenus, délai signalement → alerte, par zone.

### Priorité 2 — le reste de l'énoncé, en version simple

| Exigence | Version livrée |
|---|---|
| Climat et planification du semis | Météo 7 jours de la commune via Open-Meteo, traduite en un conseil simple avec pictogramme + audio |
| Vendre | Annonce (photo, quantité, prix) + bouton « Appeler ». Pas de paiement en ligne |
| Réglementation | Fiches audio + pictogrammes gérées par l'admin |
| Recettes de l'État | Registre des ventes déclarées, redevance fictive de 1 %, reçu généré, paiement simulé |
| Gestion de contenu | Back-office : fiches ravageurs, fiches réglementaires, audios par langue, zones, utilisateurs |

### Priorité 3 — bonus, uniquement si la priorité 1 est terminée au jour 3

Pré-diagnostic IA sur la photo, affiché au conseiller comme **aide**, jamais comme décision. La démo ne doit jamais en dépendre.

### Hors périmètre (assumé, à mentionner dans le README)

Paiement réel, place de marché complète (négociation, logistique, export), capteurs et drones, téléphonie réelle obligatoire, USSD, WhatsApp.

---

## 5. Langues

- **Interface écrite en français uniquement**, doublée de pictogrammes. Ne jamais traduire l'écrit en langue locale.
- **Langues locales en audio** : `fon` et `bariba`. Chaque écran clé, chaque alerte et chaque fiche a un bouton « Écouter ».
- Les audios sont **enregistrés par de vrais locuteurs** (pas de synthèse vocale en langue locale). Environ 15 à 20 audios courts par langue, plus les chiffres de 0 à 9 pour le pavé de connexion (§ 6 bis).
- Une langue = un ensemble de fichiers audio géré dans le back-office. **Ajouter une langue ne doit demander aucun code.**
- Tant qu'un audio manque, afficher un fallback explicite (audio français + indicateur « audio à enregistrer »), jamais un bouton cassé.

## 6. Canaux

| Canal | Destinataires | Usage |
|---|---|---|
| PWA installable, hors ligne | Bio, Serge, acheteur, admin | Tous les parcours |
| Notification dans l'app | Producteurs avec smartphone | Alertes |
| SMS | Tous les producteurs | Alerte courte + consigne |
| Appel vocal sortant | Producteurs `a_smartphone = false` et tous ceux dont la langue préférée n'est pas le français | Alerte dans la langue du producteur |
| Appel entrant + menu vocal | Producteurs sans smartphone | Signalement |

**Choix du canal par profil :** smartphone → notification + SMS ; téléphone basique → appel vocal + SMS.

### Téléphonie : couche abstraite obligatoire

```ts
interface NotificationGateway {
  sendSms(to: string, message: string): Promise<DeliveryResult>;
  placeVoiceCall(to: string, audioUrl: string, lang: Lang): Promise<DeliveryResult>;
}
```

- `SimulatedGateway` (**par défaut**) : alimente un panneau « téléphone virtuel » visible à l'écran (SMS reçus, appel entrant avec lecture audio, clavier 1/2).
- `AfricasTalkingGateway` (optionnel) : activé par variable d'environnement `NOTIFICATION_PROVIDER=africastalking`.
- Le code métier ne connaît que l'interface.

---

## 6 bis. Connexion et inscription

Une méthode adaptée à chaque persona. **L'e-mail + mot de passe n'est jamais imposé aux producteurs.**

| Persona | Inscription | Connexion |
|---|---|---|
| Bio (`producteur_smartphone`) | **Assistée par le conseiller** sur le terrain : numéro, langue, type de téléphone, position de la parcelle. Bio choisit ensuite son code. | **Numéro de téléphone + code à 6 chiffres** |
| Adjara (`producteur_basique`) | Inscrite par le conseiller | **Aucune connexion** : reconnue par son numéro lors des appels |
| Serge (`conseiller`) | Compte créé par l'admin ; **le rôle conseiller ne peut être attribué que par l'admin** | E-mail + mot de passe |
| Mme Houénou (`acheteur`) | Auto-inscription | Numéro de téléphone + code à 6 chiffres |
| Admin | Compte initial créé par le seed | E-mail + mot de passe |

### Écran de connexion producteur / acheteur
- Pavé numérique géant (touches ≥ 48 px).
- Chaque chiffre est **prononcé à l'appui** dans la langue choisie (audios 0 à 9).
- Bouton « Écouter » expliquant l'écran.
- **Aucune limite de temps** de saisie.
- Erreur signalée par icône + son + vibration + texte, jamais par la couleur seule.
- Compatible lecteur d'écran.

### Règles
- **Session persistante de 90 jours** : indispensable pour signaler hors ligne au champ sans se reconnecter.
- **Code oublié → réinitialisation par le conseiller** depuis son espace. Pas de SMS.
- **5 codes erronés → blocage de 15 minutes** pour ce numéro.
- La page `/demo` (§ 12) reste disponible en plus de ces connexions.

### Note technique
- Le code à 6 chiffres respecte le minimum de 6 caractères de Supabase Auth : pas d'authentification sur mesure.
- Les comptes producteurs sont créés côté serveur (clé `service_role`) lors de l'inscription assistée.
- Si l'authentification par téléphone de Supabase exige un fournisseur SMS configuré, utiliser un identifiant technique dérivé du numéro (ex. `22901XXXXXXXX@producteurs.local`) avec le code comme mot de passe, **et le signaler**. L'utilisateur ne voit jamais cet identifiant.

---

## 7. Zone et données

- **Zone principale : Borgou** — N'Dali, Parakou, Tchaourou. Bio et Adjara y sont dans le même rayon d'alerte.
- **Zone secondaire : Zou** — Djidja (langue fon, tableau de bord multi-zones).
- **Culture : maïs.** Ennemis retenus :
  1. Chenille légionnaire d'automne (cas phare de la démo)
  2. Foreurs de tiges
  3. Striure du maïs (virus)
  4. Striga (plante parasite)
  5. Charançons et grand capucin (stockage)

| Donnée | Source | Statut |
|---|---|---|
| Limites des communes | geoBoundaries / OpenStreetMap (GeoJSON) | Réel |
| Météo | Open-Meteo sur coordonnées réelles | Réel, en direct |
| Description des ravageurs | Littérature publique (INRAB, FAO) | Réel |
| Producteurs, parcelles, signalements, ventes | Script de seed | Fictif |
| Conseils de lutte | Rédigés à partir de fiches publiques | Marqués « à valider par l'INRAB » |

### ⚠️ Règle absolue sur les conseils

**Aucun nom de pesticide, aucune matière active, aucun dosage**, même dans les données fictives. Les conseils restent génériques : inspection, pratiques culturales, contacter le conseiller.

### Volumes du seed

- ~120 producteurs dans des villages réels, dont ~30 % sans smartphone
- ~40 signalements historiques sur 3 mois, statuts variés
- 3 conseillers (2 Borgou, 1 Zou), 3 acheteurs
- ~20 annonces, ~15 ventes déclarées
- 4 à 5 fiches réglementaires

Le seed est **déterministe** (graine fixe) et relançable à tout moment.

---

## 8. Stack technique

| Besoin | Choix |
|---|---|
| Framework | Next.js (App Router) + TypeScript `strict` |
| Base | Supabase : PostgreSQL + PostGIS |
| Temps réel | Supabase Realtime |
| Fichiers | Supabase Storage (photos, notes vocales, audios de contenu) |
| Auth et droits | Supabase Auth + Row Level Security par rôle. Numéro + code à 6 chiffres pour producteurs et acheteurs, e-mail + mot de passe pour conseiller et admin (§ 6 bis) |
| ORM et migrations | Drizzle ORM |
| Validation | Zod |
| Hors ligne | Serwist (service worker) + Dexie (IndexedDB) |
| Carte | Leaflet + react-leaflet + tuiles OpenStreetMap, tuiles de la zone mises en cache |
| UI | Tailwind + shadcn/ui (primitives Radix) |
| Médias | MediaRecorder (Opus) + compression d'image côté navigateur |
| Météo | Open-Meteo (sans clé) |
| Tests | Vitest (unitaires), Playwright (E2E), @axe-core/playwright (accessibilité), Lighthouse CI |
| CI | GitHub Actions |
| Hébergement | Vercel + Supabase (offres gratuites) |

**Ne pas ajouter de dépendance hors de cette liste sans justification écrite dans la PR / le commit.**

---

## 9. Architecture

### Organisation par domaine

```
src/
  domains/
    signalements/   # règles, accès données, schémas Zod
    alertes/        # calcul du rayon, choix des canaux, journal d'envois
    vente/
    recettes/
    contenus/       # fiches ravageurs, réglementaires, audios par langue
    meteo/
  infrastructure/
    notifications/  # NotificationGateway, SimulatedGateway, AfricasTalkingGateway
    supabase/
    offline/        # service worker, file d'attente Dexie
  app/
    (producteur)/
    (conseiller)/
    (acheteur)/
    (admin)/
    demo/           # connexion en un clic par persona, reset
db/
  migrations/
  seed/
tests/
  unit/
  e2e/
  a11y/
```

Règle : `app/` appelle `domains/`, `domains/` appelle des interfaces, `infrastructure/` les implémente. Pas d'appel direct à Supabase depuis un composant d'écran.

### Flux central

1. Bio envoie un signalement → stocké dans IndexedDB s'il est hors ligne → synchronisé au retour du réseau.
2. Insertion dans `signalements` avec position `geography(Point)`.
3. Realtime → apparition sur la carte de Serge.
4. Serge confirme → fonction serveur `triggerZoneAlert(signalementId)`.
5. Requête PostGIS `ST_DWithin` → producteurs dans le rayon.
6. Pour chacun, `NotificationGateway` selon le profil et la langue.
7. Chaque envoi est journalisé dans `envois` → indicateurs du tableau de bord.

### Modèle de données (esquisse)

- `communes` (id, nom, departement, geom)
- `profils` (id, role, nom, telephone, langue, a_smartphone, commune_id, position, inscrit_par)
- `tentatives_connexion` (telephone, nb_echecs, bloque_jusqu_a)
- `ravageurs` (id, nom, culture, description, pictogramme)
- `signalements` (id, producteur_id, position, photo_url, audio_url, canal_origine, statut, ravageur_id, gravite, conseiller_id, created_at, confirme_at, traite_at, clos_at)
- `alertes` (id, signalement_id, rayon_km, declenchee_par, created_at)
- `envois` (id, alerte_id, destinataire_id, canal, langue, statut, sent_at)
- `contenus` (id, type, titre, texte, pictogramme) + `contenus_audio` (contenu_id, langue, audio_url)
- `annonces` (id, producteur_id, produit, quantite, prix, photo_url, statut)
- `ventes_declarees` (id, annonce_id, acheteur_id, montant, redevance, numero_recu)

### Règles métier

- Rayon d'alerte par défaut : **10 km**, paramétrable par l'admin.
- Gravité : `faible` | `moyenne` | `forte`.
- Transitions de statut autorisées uniquement : `signale → confirme | rejete`, `confirme → traite`, `traite → clos`.
- Seul un conseiller de la zone peut confirmer ou rejeter un signalement de sa zone.
- Un producteur n'est alerté qu'une fois par foyer.
- Redevance = 1 % du montant déclaré (valeur fictive, paramétrable).
- Connexion : 5 codes erronés → blocage 15 min ; session producteur de 90 jours ; seul l'admin attribue le rôle `conseiller` ; seul un conseiller réinitialise le code d'un producteur de sa zone (§ 6 bis).

---

## 10. Accessibilité — exigences de réalisation

### Faible alphabétisation
- Une action principale par écran, trois grandes icônes maximum sur l'accueil producteur.
- Bouton « Écouter » sur chaque écran clé.
- Saisie par photo et voix, jamais de texte libre obligatoire côté producteur.
- Chaque action confirmée par **son + icône + vibration**.
- Connexion par numéro + code sur pavé numérique géant avec chiffres prononcés, sans limite de temps (§ 6 bis).

### Handicap visuel
- HTML sémantique, labels ARIA, ordre de focus logique, navigation complète au clavier.
- Compatible TalkBack (Android) et NVDA.
- Contraste WCAG AA minimum, texte agrandissable à 200 % sans casse.
- **Jamais d'information portée uniquement par la couleur** (toujours couleur + icône + texte).
- La carte n'est jamais le seul chemin : liste des signalements accessible en alternative.

### Handicap auditif
- Aucune information uniquement sonore : chaque audio a son équivalent texte ou pictogramme.
- Alertes doublées d'un SMS et d'un signal visuel + vibration.
- Notes vocales transcrites côté conseiller (champ texte saisi par le conseiller au minimum).

### Connectivité limitée
- PWA installable, écrans producteur disponibles hors ligne.
- File d'attente locale avec indicateur visible « en attente d'envoi » / « envoyé ».
- Photo < 100 Ko, audio en Opus.
- Canaux SMS et appel vocal pour les téléphones sans internet.

### Budgets à tenir (vérifiés en CI)
- Lighthouse mobile : Accessibilité ≥ 95, Performance ≥ 85, PWA installable.
- axe-core : **0 violation** critique ou sérieuse sur les parcours E2E.
- Cibles tactiles ≥ 48 × 48 px.
- Poids de la page d'accueil producteur < 300 Ko transférés.

---

## 11. Qualité et conventions

- TypeScript `strict`, aucun `any` non justifié.
- Chaque règle métier du § 9 a un test unitaire.
- Chaque persona a au moins un parcours E2E Playwright, avec audit axe intégré.
- Test E2E du mode hors ligne (contexte Playwright `offline: true`, puis retour en ligne).
- CI GitHub Actions à chaque push : lint → typecheck → tests unitaires → E2E + axe → Lighthouse CI.
- Commits au format Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`…).
- Tous les libellés visibles en français, centralisés (pas de chaînes en dur dispersées).
- Secrets uniquement en variables d'environnement, `.env.example` à jour.

---

## 12. Exigences pour la démo et les tests du jury

- Page `/demo` : **connexion en un clic par persona** (« Entrer comme Bio », « Entrer comme Serge »…), sans mot de passe.
- Bouton **« Réinitialiser la démo »** (admin uniquement) qui relance le seed.
- Bannière discrète : « Données fictives — téléphonie simulée ».
- Panneau « téléphone virtuel » d'Adjara visible depuis l'écran du conseiller ou dans un onglet dédié.
- QR code vers l'application dans le README.

### Scénario de référence (7 min) — doit fonctionner parfaitement

1. Le problème et les personas (0:45).
2. Bio passe en mode avion, signale, voit « en attente », réactive le réseau → le signalement apparaît sur la carte de Serge (1:45).
3. Serge confirme « chenille légionnaire, forte » → le téléphone virtuel d'Adjara sonne, message en bariba ; Bio reçoit la notification (1:00).
4. Tableau de bord : foyer, producteurs prévenus, délai (0:45).
5. Survol : météo réelle, vente, fiche réglementaire, reçu de redevance (1:00).
6. Preuve d'accessibilité : TalkBack sur le signalement, SMS + pictogramme, score Lighthouse / axe (1:00).
7. Preuve de qualité : CI verte, rapports de tests ; feuille de route (0:45).

---

## 13. Planning

Rendu le **samedi 26 septembre 2026 à 20h**. Les trois phases d'origine sont conservées à l'identique et recalées sur ce délai.

| Phase | Quand | Objectif | Critère de fin |
|---|---|---|---|
| **J1** | Vendredi soir → nuit | Socle, auth par rôle (connexions et inscription assistée du § 6 bis), page `/demo`, seed, signalement hors ligne, carte temps réel du conseiller | Déployé en ligne ; un signalement hors ligne remonte sur la carte |
| **J2** | Samedi matin | Alerte de zone multi-canal + téléphone virtuel, tableau de bord, back-office contenus, météo | La boucle complète tourne de bout en bout |
| **J3 matin** | Samedi début d'après-midi | Vente, réglementation, recettes | Tous les points de l'énoncé sont démontrables |
| **J3 après-midi** | Samedi fin d'après-midi → 20h | Audit accessibilité et performance, corrections, README, vidéo de secours, répétition | Budgets du § 10 tenus, CI verte ; bonus IA seulement s'il reste du temps |

À faire dès ce soir, hors code : faire enregistrer les audios fon et bariba par des locuteurs.

---

## 14. Garde-fous pour l'agent

- **Priorité 1 d'abord.** Ne pas démarrer la priorité 2 tant que la boucle d'alerte n'est pas fonctionnelle de bout en bout.
- Ne jamais inventer de nom de pesticide, de dosage ou de donnée agronomique présentée comme vraie.
- Ne jamais faire dépendre la démo d'un service externe non indispensable (IA, téléphonie réelle).
- Toute nouvelle interface doit passer axe sans violation avant d'être considérée terminée.
- En cas d'ambiguïté sur le périmètre, se référer à ce fichier ; si le fichier ne tranche pas, demander.

### Définition de « terminé » pour une fonctionnalité

- [ ] Règles métier testées (Vitest)
- [ ] Parcours E2E passant (Playwright), y compris hors ligne si concerné
- [ ] 0 violation axe critique ou sérieuse
- [ ] Fonctionne au clavier et au lecteur d'écran
- [ ] Aucune information portée uniquement par la couleur ou uniquement par le son
- [ ] Déployé et vérifié sur l'environnement en ligne
