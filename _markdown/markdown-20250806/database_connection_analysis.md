
# Analyse de la Connexion à la Base de Données de l'Application

Ce document détaille la manière dont l'application se connecte à sa base de données, en identifiant les composants, fichiers, variables, données, tables SQL, frameworks et librairies impliqués.

## 1. Vue d'ensemble de l'Architecture

L'application utilise une architecture en couches pour gérer l'accès aux données :

1.  **Composants UI (React/Next.js)** : Interagissent avec les utilitaires de récupération de données.
2.  **Utilitaires de Récupération de Données (`utils/dataFetcher.ts`)** : Effectuent des appels aux API Next.js.
3.  **API Routes Next.js (`app/api/sql/route.ts`, `app/api/auth/*`)** : Contiennent la logique métier et interagissent directement avec la base de données.
4.  **Librairie d'Accès aux Données (`mssql/msnodesqlv8`)** : La librairie Node.js utilisée pour communiquer avec SQL Server.

## 2. Connexion à la Base de Données

*   **Type de Base de Données** : SQL Server.
*   **Serveur** : `myreport01.alltransports.fr`
*   **Base de Données** : `BD_RPA_TEST`
*   **Pilote ODBC** : `{ODBC Driver 17 for SQL Server}`
*   **Authentification** : `Trusted_Connection=yes` (Authentification Windows). L'application s'exécute sous un compte utilisateur Windows ayant les permissions nécessaires pour accéder à la base de données.

## 3. Librairies et Frameworks Clés

*   **Frameworks** :
    *   **Next.js** : Utilisé pour les API routes et le rendu côté client/serveur.
    *   **React** : Pour la construction de l'interface utilisateur.
    *   **Node.js** : Environnement d'exécution pour les API routes et les scripts de test.
*   **Librairies** :
    *   **`mssql/msnodesqlv8`** : La librairie principale pour interagir avec SQL Server depuis Node.js.
    *   `next/server` (`NextResponse`, `NextRequest`) : Pour la gestion des requêtes et réponses API.
    *   `next/navigation` (`useRouter`) : Pour la navigation côté client.
    *   `next/image` : Pour l'affichage des images.
    *   Composants UI personnalisés (ex: `Dialog`, `Input`, `Button`) et hooks (`use-toast`).

## 4. Fichiers Pertinents

*   **`app/api/sql/route.ts`** :
    *   Contient la logique principale pour les opérations SQL (GET et POST).
    *   Définit la configuration de connexion (`config`) et la liste blanche des tables (`ALLOWED_TABLES`).
    *   Expose des endpoints pour récupérer des données de diverses tables (`Citations`, `Reporting`, `Services`, `Statuts`, `Utilisateurs`, `Agences`, `Evolutions`).
    *   Gère l'insertion de données dans la table `Reporting`.
*   **`utils/dataFetcher.ts`** :
    *   Fonctions utilitaires côté client pour appeler les API Next.js.
    *   Exemples : `fetchRandomQuote`, `fetchAgenciesByIds`, `fetchAllReportingData`.
*   **`utils/dataStore.ts`** :
    *   Gère le cache des données (agences, robots, reporting).
    *   Initialise les données au premier chargement (`initializeData`).
    *   Effectue des calculs et des transformations de données.
*   **`components/LoginForm.tsx`** :
    *   Composant UI pour la connexion et la réinitialisation du mot de passe.
    *   Appelle `fetchRandomQuote` pour afficher une citation.
    *   Appelle `/api/auth/login` pour l'authentification.
    *   Appelle `/api/auth/forgot-password` pour la réinitialisation du mot de passe.
    *   Utilise `updateFirstLoginStatus` de `utils/dataStore.ts`.
*   **`test-sql-connection.js`** :
    *   Script de démonstration direct de la connexion à SQL Server avec `mssql/msnodesqlv8`.
    *   Confirme la chaîne de connexion et la méthode d'exécution des requêtes.

## 5. Variables et Données

*   **Variables de Configuration** :
    *   `config` : Objet contenant la chaîne de connexion.
    *   `ALLOWED_TABLES` : Tableau des noms de tables autorisées pour prévenir l'injection SQL.
*   **Données Utilisateur** :
    *   Identifiant (`username`), mot de passe (`password`).
    *   Informations utilisateur récupérées après connexion (stockées dans `localStorage`).
*   **Données Métier** :
    *   Citations et auteurs.
    *   Données de reporting (unités, dates, programmes, agences).
    *   Informations sur les agences (ID, nom, libellé).
    *   Détails des robots RPA (nom, agence, service, statut, etc.).
*   **Cache** : `utils/dataStore.ts` maintient des caches pour les agences, les robots et les données de reporting.

## 6. Tables SQL Concernées

Les tables suivantes sont explicitement mentionnées ou implicitement utilisées via les API :

*   `BD_RPA_TEST` (Nom de la base de données)
*   `Citations`
*   `Reporting`
*   `Services`
*   `Statuts`
*   `Utilisateurs`
*   `Agences`
*   `Evolutions`
*   `robots_et_baremes` (Implicitement utilisé par `utils/dataStore.ts`)

En résumé, l'application utilise une approche sécurisée et structurée pour accéder à sa base de données SQL Server, en passant par des API Next.js qui encapsulent la logique de connexion et de requête, tout en utilisant des utilitaires côté client pour la gestion des données et l'interface utilisateur.
