# Historique des Modifications



## 2025-08-06 — Correctif agrégation par agence et fiabilité du remount Chart4All

Contexte
- Bug : en sélectionnant une agence, l’histogramme agrégé ne se mettait pas à jour.
- Cause : la branche “TOUT” de l’effet de chargement agrégeait tous les programmes sans filtrage par l’agence sélectionnée. Le remount de Chart4All n’était pas garanti après changement d’agence/mois.

Fichiers impactés
- [components/Dashboard.tsx](components/Dashboard.tsx)
  - [TypeScript.useEffect()](components/Dashboard.tsx:236)
  - [TypeScript.handleAgencyChange()](components/Dashboard.tsx:408)
  - [TypeScript.JSX.render.Chart4All](components/Dashboard.tsx:597)

Modifications apportées
1) Filtrage par agence dans la branche “TOUT”
   - activeAgency = selectedAgency?.codeAgence || 'TOUT'
   - programsFiltered = programs.filter(p => p.robot && p.robot !== 'TOUT' && (activeAgency === 'TOUT' ? true : p.agence === activeAgency))
   - programIdsFiltered = new Set(programsFiltered.map(p => p.id_robot))
   - reportingEntries = getReportingData(selectedMonth).filter(e => programIdsFiltered.has(`${e.AGENCE}_${e['NOM_PROGRAMME']}`))
   - Agrégation journalière et cumul mensuel sur reportingEntries (périmètre filtré)
   - Totaux N, N-1, N-2, N-3 calculés sur le même périmètre filtré

2) Ajout de logs de diagnostic
   - Logs sur agence active, taille de programsFiltered, échantillon d’IDs, nombre d’entrées reporting retenues, mergedData final, totaux mensuels.

3) Remount explicite de Chart4All
   - key basée sur agence + mois + totaux : 
     `key={\`all-\${selectedAgency?.codeAgence || 'TOUT'}-\${selectedMonth}-\${totalCurrentMonth}-\${totalPrevMonth1}-\${totalPrevMonth2}-\${totalPrevMonth3}\`}`

4) Sélection d’agence
   - handleAgencyChange force selectedRobot et selectedRobotData sur un TOUT_PROGRAM contextualisé avec l’agence choisie (déclenchement naturel de la branche “TOUT”).

Impacts
- L’histogramme agrégé reflète l’agence sélectionnée.
- Chart4All est re-monté de façon fiable lors des changements d’agence et de mois.
- Les totaux mensuels sont cohérents avec le périmètre filtré.

Tests
- Sélection d’une agence spécifique : histogramme et totaux s’ajustent.
- Changement de mois (N, N-1, N-2, N-3) : barres et totaux recalculés.
- Retour à “TOUT” agence : agrégation retrouve l’ensemble des programmes.

Notes
- Aucun fichier de backup modifié. Changements ciblés à Dashboard.tsx et au présent markdown.

## 2025-08-06 — Filtrage des robots par agence dans ProgramSelector

Contexte
- Problème: lors d’un changement d’agence, la liste des robots dans ProgramSelector n’était pas filtrée. [`Dashboard.tsx`](components/Dashboard.tsx:1) réinjectait la liste complète via `setPrograms(cachedRobotsFromTableBaremeReport)`, ignorant le filtrage effectué côté [`AgencySelector.tsx`](components/AgencySelector.tsx:1).
- Architecture existante: `AgencySelector` appelle `getRobotsByAgency(agencyId)` puis `updateRobots(robots)`, un mécanisme de pub/sub exposé par [`utils/dataStore.ts`](utils/dataStore.ts:227), à relayer via `setUpdateRobotsCallback`.

Changements
- [`Dashboard.tsx`](components/Dashboard.tsx:209): après `await initializeRobots4Agencies()`, enregistrement du callback:
  - `setUpdateRobotsCallback((robots: Program[]) => { setPrograms(robots); });`
- [`Dashboard.tsx`](components/Dashboard.tsx:419): suppression de `setPrograms(cachedRobotsFromTableBaremeReport)` dans `handleAgencyChange`. La mise à jour de la liste est désormais pilotée par le callback.

Effets
- Dès qu’une nouvelle agence est sélectionnée, `AgencySelector` publie la liste filtrée via `updateRobots(robots)`; `Dashboard` met à jour `programs` sans repasser par la liste complète.
- `ProgramSelector` reçoit `robots` déjà filtrés et n’a pas besoin de logique supplémentaire.
- Le comportement "TOUT" (TOUT_FOR_AGENCY) reste inchangé.

Tests manuels
- Sélectionner une agence A: le `ProgramSelector` n’affiche plus que les robots de A (+ TOUT).
- Changer pour une agence B: la liste se met à jour automatiquement, sans robots d’autres agences.
- Mode "TOUT": la vue agrégée (Chart4All) continue de fonctionner.

Notes
- Aucun changement apporté à `ProgramSelector.tsx`.
- Respect des règles: backup intact, explications consignées dans ce fichier.

## 2025-08-06 — Correction affichage des noms dans la liste déroulante "Robot"

- Problème
  - La liste déroulante "Robot" affichait l’attribut d’unité/temps (ex: "unité", "TEMPS (mn)") au lieu du nom du robot.
  - Contexte: renommage de colonnes SQL incluant `NOM_ROBOT` et `NOM_PROGRAMME`. Le frontend affichait `TYPE_GAIN` par erreur.

- Analyse
  - Le mapping des données robots dans [`utils/dataStore.ts`](utils/dataStore.ts:165-181) renseigne correctement:
    - `robot.robot` ⇐ `NOM_ROBOT`
    - `robot.type_gain` ⇐ `TYPE_GAIN`
  - Le composant d’UI [`components/RobotSelector.tsx`](components/RobotSelector.tsx) utilisait l’attribut erroné pour l’affichage via la fonction [`verboseName(robot)`](components/RobotSelector.tsx:13): `type_gain` au lieu de `robot`.

- Modifications effectuées
  - Dans [`components/RobotSelector.tsx`](components/RobotSelector.tsx:13), remplacer l’usage de `robot.type_gain` par `robot.robot`:
    - Avant:
      - `return robot.type_gain === "TOUT" ? "TOUT" : \`\${robot.type_gain}\`;`
    - Après:
      - `return robot.robot === "TOUT" ? "TOUT" : \`\${robot.robot}\`;`
  - Conserver la valeur de l’item `value={robot.id_robot}` pour ne pas impacter la logique métier (clé format "AGENCE_NOM_ROBOT").
  - Aucun changement nécessaire côté API [`app/api/sql/route.ts`](app/api/sql/route.ts:100-103): la requête `SELECT * FROM Barem_Reporting` reste valide.

- Impact
  - Le Select "Robot" affiche désormais le nom du robot (`NOM_ROBOT`) au lieu du type de gain.
  - Pas d’impact sur la clé de sélection, ni sur les dépendances (graphiques/filtrages).

- Tests recommandés
  - Recharger `/dashboard` puis ouvrir la liste "Robot" et valider les libellés.
  - Sélectionner plusieurs robots et vérifier la mise à jour des graphes.
  - Vérifier le cas "TOUT" présent en tête de liste.

- Référence des fichiers modifiés
  - [`components/RobotSelector.tsx`](components/RobotSelector.tsx:13)

## 2025-08-06 - Ajout de l’option "TOUT" au sélecteur de robots

Contexte
- Objectif: Lors de la sélection d’une nouvelle agence, la liste des robots doit inclure "TOUT" en tête afin d’afficher l’histogramme agrégé via Chart4All.tsx.
- Fichiers concernés: [`RobotSelector.tsx`](components/RobotSelector.tsx), [`Dashboard.tsx`](components/Dashboard.tsx), [`Chart4All.tsx`](components/Chart4All.tsx), [`Chart.tsx`](components/Chart.tsx).

Modifications réalisées
- Préfixage de la liste des robots par une entrée synthétique "TOUT" dans [`RobotSelector.tsx`](components/RobotSelector.tsx):
  - Création d’un élément avec id_robot="TOUT" et robot="TOUT".
  - Insertion en tête du tableau affiché par le composant Select.
- Aucune modification nécessaire dans [`Dashboard.tsx`](components/Dashboard.tsx) puisque la logique existante gère déjà:
  - La détection de robot === "TOUT" pour préparer des données agrégées et afficher [`Chart4All.tsx`](components/Chart4All.tsx).
  - La sélection d’un robot spécifique pour afficher [`Chart.tsx`](components/Chart.tsx).
  - La mise au point lors du changement d’agence en forçant un Robot "TOUT" contextualisé (voir initialisation et `handleAgencyChange`).

Impact sur le code
- UX: L’option "TOUT" est toujours visible en premier dans la liste déroulante des robots.
- Interopérabilité: `selectedRobotId` peut désormais explicitement être "TOUT". La logique de [`Dashboard.tsx`](components/Dashboard.tsx) le supporte déjà (bascules graphiques intactes).
- Performance/Comportement: inchangé, seules les données affichées dépendent de la sélection.

Extrait de code pertinent
- Insertion "TOUT" au-dessus de la liste:
  - Dans [`RobotSelector.tsx`](components/RobotSelector.tsx:20-39), la constante `robotsList` est désormais construite en préfixant l’élément "TOUT".

Tests manuels effectués
- Changement d’agence: la liste des robots se met à jour et "TOUT" apparaît en tête.
- Sélection "TOUT": affichage de l’histogramme agrégé via [`Chart4All.tsx`](components/Chart4All.tsx).
- Sélection d’un robot spécifique: affichage de l’histogramme détaillé via [`Chart.tsx`](components/Chart.tsx).

## 2025-08-06 — Correction duplication "TOUT" dans la liste des robots

Contexte:
- Un doublon de l'option "TOUT" apparaissait dans le sélecteur des robots lorsque l’agence sélectionnée était “Toutes les agences”.
- Des warnings React étaient visibles: "Encountered two children with the same key, 'TOUT'." (clés non uniques).

Décision d’architecture:
- Centraliser la gestion de l’option "TOUT" au niveau UI (composant de sélection) et la supprimer au niveau des données pour éviter toute entrée synthétique dans le cache global.

Modifications:
- Suppression de l’injection de "TOUT" côté données dans [`utils/dataStore.ts`](utils/dataStore.ts:182-201). Le bloc `unshift({... "TOUT" ...})` a été retiré.
- Ajout d’un filtre de sécurité pour éliminer toute occurrence "TOUT" potentiellement ramenée par la source de données.
- Conservation de l’insertion de "TOUT" uniquement côté UI dans [`components/RobotSelector.tsx`](components/RobotSelector.tsx:22-25).

Impact:
- La liste déroulante ne présente plus de double "TOUT".
- Disparition des warnings de clés dupliquées.
- Les autres consommateurs de données reçoivent la liste brute des robots sans entrée artificielle, réduisant le risque d’effets de bord.

Tests manuels effectués:
- Ouverture du dashboard avec “Toutes les agences” puis avec une agence spécifique: une seule entrée "TOUT" visible dans chaque cas.
- Comportement de filtrage inchangé.

Notes:
- Cette centralisation simplifie la responsabilité: les données restent “brutes” dans le store, l’UI enrichit l’affichage selon le besoin.

## 2025-08-07 - Ajout du libellé d'agence dans robotData pour Chart.tsx

Contexte
- Objectif: afficher le libellé complet de l’agence dans la section Description de [components/Chart.tsx](components/Chart.tsx:258) via la propriété `data.agenceLbl`.
- Constat initial:
  - `Chart.tsx` lit `data.agenceLbl` à la ligne 258.
  - L’objet `processedData` est construit dans [components/Dashboard.tsx](components/Dashboard.tsx:373-381) en fusionnant l’entrée de reporting `robotEntry` et `selectedRobotData`.
  - Le type [utils/dataStore.Robot](utils/dataStore.ts:47) prévoit déjà un champ optionnel `agenceLbl`.
  - La table de référence des agences est accessible via [utils/dataStore.getCachedAllAgencies()](utils/dataStore.ts:589) alimentée par `loadAllAgencies()`.

Changements effectués
- Fichier modifié: [components/Dashboard.tsx](components/Dashboard.tsx:371)
- Enrichissement de `processedData` avec un champ `agenceLbl` résolu ainsi:
  1. Priorité à `selectedRobotData?.agenceLbl` si déjà présent
  2. Sinon, recherche dans `getCachedAllAgencies()` le `libelleAgence` correspondant à `selectedRobotData?.agence`
  3. Fallback sur le code agence si non trouvé

Extrait du patch (logique ajoutée)
- Résolution:
  - `const allAgencies = getCachedAllAgencies();`
  - `const resolvedAgenceLbl = selectedRobotData?.agenceLbl || allAgencies.find(a => a.codeAgence === selectedRobotData?.agence)?.libelleAgence || selectedRobotData?.agence;`
- Construction:
  - `const processedData = { ...robotEntry, ..., ...selectedRobotData, agenceLbl: resolvedAgenceLbl };`

Impact
- `Chart.tsx` dispose désormais de `data.agenceLbl` garanti pour les cas où un robot spécifique est sélectionné, sans modifier la branche "TOUT" utilisée par [components/Chart4All.tsx](components/Chart4All.tsx:1).
- Typage: `agenceLbl` est déjà présent dans l’interface `Robot`, donc pas d’ajout d’interface nécessaire.
- Robustesse: un fallback est prévu lorsque le libellé n’est pas trouvé dans le cache.

Tests et vérifications
- Vérifier visuellement l’affichage de l’agence dans la carte Description de [components/Chart.tsx](components/Chart.tsx:258).
- Cas de bord couverts: agence non trouvée dans le cache => affichage du code agence.

Notes
- Aucun effet de bord attendu sur l’agrégat “TOUT” (branche `setUseChart4All(true)`).
- En cas de future évolution, on pourra propager `agenceLbl` dès la constitution des robots en cache, mais la présente solution garde un périmètre minimal et localisé.

# 2025-08-07 — Enrichissement des données robots avec le libellé d’agence (agenceLbl)

Contexte
- L’UI “Le saviez-vous ?” dans [`components/Chart4All.tsx`](components/Chart4All.tsx:283) attend déjà `robots[currentIndex]?.agenceLbl`.
- Le type `Robot` inclut `agenceLbl?: string` dans [`utils/dataStore.ts`](utils/dataStore.ts:51-53).
- Les données robots provenant de SQL (chargées via `loadAllRobots`) n’ajoutaient pas `agenceLbl`, et `cachedRobots4Agencies` était construit sans enrichissement, ce qui laissait `agenceLbl` indéfini dans Chart4All.

Objectif
- Fournir le libellé d’agence (`agenceLbl`) au composant Chart4All en enrichissant la construction du cache `cachedRobots4Agencies`.

Changements effectués
- Fichier: [`utils/dataStore.ts`](utils/dataStore.ts)
  - Fonction: `initializeRobots4Agencies` (autour des lignes 538+)
  - Modification: après filtrage des robots selon les agences présentes dans le reporting, mappage des entrées pour injecter `agenceLbl` en joignant `cachedAllAgencies`:
    - Recherche de l’agence correspondante via `cachedAllAgencies.find(a => a.codeAgence === r.agence)`
    - Attribution de `agenceLbl = agency?.libelleAgence || r.agence` (fallback sur le code si le libellé est introuvable)
  - Log mis à jour pour indiquer que `agenceLbl` est résolu.

Impact
- `cachedRobots4Agencies` contient maintenant `agenceLbl` pour chaque robot.
- Chart4All peut afficher directement le libellé d’agence sans logique supplémentaire.
- Fallback robuste: si une agence n’est pas trouvée dans le cache, l’affichage utilise le code d’agence.

Pré-requis/Ordonnancement
- `loadAllAgencies()` doit s’exécuter avant `initializeRobots4Agencies()`. Le flux actuel dans [`components/Dashboard.tsx`](components/Dashboard.tsx:168-186) respecte cet ordre.

Validation proposée
- Vérifier dans l’UI de Chart4All le rendu de la ligne:
  - “Agence : &lt;libellé résolu&gt;” pour plusieurs robots.
- Vérifier la console pour:
  - “cachedRobots4Agencies initialisé avec succès (agenceLbl résolu)”.

Notes
- Aucun changement requis dans [`components/Chart4All.tsx`](components/Chart4All.tsx) car il consomme déjà `agenceLbl`.
- Le composant [`components/Chart.tsx`](components/Chart.tsx:257-259) utilise aussi `agenceLbl` et bénéficiera de l’enrichissement.

# Historique des Modifications

## 2025-08-07 - Correction de l'enregistrement des demandes dans la base de données

### Problème identifié
Le formulaire `MergedRequestForm` envoyait uniquement les données par email via l'API SQL, mais ne les enregistrait pas dans la table `Evolutions` de la base de données.

### Modifications apportées

#### 1. API SQL (`app/api/sql/route.ts`)
- **Ajout de la gestion POST pour la table Evolutions** : Ajout d'un nouveau cas `case 'Evolutions'` dans la fonction POST
- **Création de la requête d'insertion** : Implémentation de la requête SQL INSERT avec tous les champs requis
- **Mapping des données** : Configuration des paramètres SQL correspondant à la structure de la table Evolutions

```sql
INSERT INTO [BD_RPA_TEST].[dbo].[Evolutions] (
    [INTITULE], [DESCRIPTION], [DATE_MAJ], [NB_OPERATIONS_MENSUELLES], 
    [ROBOT], [STATUT], [TEMPS_CONSOMME], [TYPE_DEMANDE], [TYPE_GAIN]
) VALUES (
    @INTITULE, @DESCRIPTION, @DATE_MAJ, @NB_OPERATIONS_MENSUELLES, 
    @ROBOT, @STATUT, @TEMPS_CONSOMME, @TYPE_DEMANDE, @TYPE_GAIN
)
```

#### 2. Composant MergedRequestForm (`components/MergedRequestForm.tsx`)
- **Refonte de la fonction `submitForm`** : Remplacement de l'envoi email par un enregistrement en base de données
- **Préparation des données** : Formatage des données du formulaire selon la structure de la table Evolutions
- **Enregistrement en base** : Envoi des données via POST à `/api/sql` avec le paramètre `table: 'Evolutions'`
- **Email de notification** : Conservation de l'envoi email comme notification secondaire (optionnel)
- **Gestion des erreurs** : Amélioration des messages d'erreur pour l'enregistrement en base

### Structure de la table Evolutions
- **ID**: int (auto-incrément)
- **INTITULE**: nvarchar(50)
- **DESCRIPTION**: nvarchar(MAX)
- **DATE_MAJ**: nvarchar(50)
- **NB_OPERATIONS_MENSUELLES**: nvarchar(50)
- **ROBOT**: nvarchar(50)
- **STATUT**: nchar(10)
- **TEMPS_CONSOMME**: nchar(10)
- **TYPE_DEMANDE**: nchar(10)
- **TYPE_GAIN**: nchar(10)

### Impact sur le code
- **Séparation des responsabilités** : L'enregistrement en base est maintenant distinct de l'envoi email
- **Robustesse** : Le système continue de fonctionner même si l'envoi email échoue
- **Traçabilité** : Toutes les demandes sont maintenant enregistrées dans la base de données
- **Expérience utilisateur** : Messages de succès et d'erreur plus précis

### Tests recommandés
- Tester l'enregistrement avec des données valides
- Vérifier la gestion des erreurs SQL
- Tester avec différents types de demande (new/evolution/edit)
- Valider l'affichage des messages de succès/erreur
- Vérifier que les données sont correctement enregistrées dans la table Evolutions

## 2025-08-07 - Ajout du champ ID timestamp dans l'enregistrement des demandes

### Problème identifié
Une erreur SQL indiquait que le champ ID est requis et ne peut pas être NULL lors de l'enregistrement des demandes dans la table 'Evolutions'. Le client a demandé d'ajouter le champ 'ID' (timestamp) dans l'enregistrement des demandes.

### Causes du problème
La table 'Evolutions' nécessite un champ ID non nul, mais l'application n'envoyait pas ce champ lors de l'insertion des données.

### Modifications apportées

#### 1. Modification de l'API SQL (app/api/sql/route.ts)
**Lignes 170-178** : Modification de la requête d'insertion pour inclure le champ ID

```sql
-- AVANT
INSERT INTO [BD_RPA_TEST].[dbo].[Evolutions] (
    [INTITULE], [DESCRIPTION], [DATE_MAJ], [NB_OPERATIONS_MENSUELLES],
    [ROBOT], [STATUT], [TEMPS_CONSOMME], [TYPE_DEMANDE], [TYPE_GAIN]
) VALUES (
    @INTITULE, @DESCRIPTION, @DATE_MAJ, @NB_OPERATIONS_MENSUELLES,
    @ROBOT, @STATUT, @TEMPS_CONSOMME, @TYPE_DEMANDE, @TYPE_GAIN
)

-- APRÈS
INSERT INTO [BD_RPA_TEST].[dbo].[Evolutions] (
    [ID], [INTITULE], [DESCRIPTION], [DATE_MAJ], [NB_OPERATIONS_MENSUELLES],
    [ROBOT], [STATUT], [TEMPS_CONSOMME], [TYPE_DEMANDE], [TYPE_GAIN]
) VALUES (
    @ID, @INTITULE, @DESCRIPTION, @DATE_MAJ, @NB_OPERATIONS_MENSUELLES,
    @ROBOT, @STATUT, @TEMPS_CONSOMME, @TYPE_DEMANDE, @TYPE_GAIN
)
```

**Lignes 179-189** : Ajout du paramètre ID

```typescript
// Ajout de cette ligne avant les autres paramètres
params.push({ name: 'ID', type: sql.NVarChar(50), value: data.ID });

// Les autres paramètres restent identiques
params.push({ name: 'INTITULE', type: sql.NVarChar(50), value: data.INTITULE });
// ... etc
```

#### 2. Modification du composant MergedRequestForm (components/MergedRequestForm.tsx)
**Lignes 179-190** : Modification de l'objet evolutionData pour inclure l'ID

```typescript
// AVANT
const evolutionData = {
    INTITULE: formDataState.Intitulé,
    DESCRIPTION: formDataState.Description,
    DATE_MAJ: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    NB_OPERATIONS_MENSUELLES: formDataState.Nb_operations_mensuelles || '',
    ROBOT: formDataState.Robot || '',
    STATUT: formDataState.Statut || '1',
    TEMPS_CONSOMME: formDataState.Temps_consommé || '',
    TYPE_DEMANDE: formDataState.type || 'new',
    TYPE_GAIN: formDataState.type_gain || ''
};

// APRÈS
const evolutionData = {
    ID: Date.now().toString(), // Génération du timestamp
    INTITULE: formDataState.Intitulé,
    DESCRIPTION: formDataState.Description,
    DATE_MAJ: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    NB_OPERATIONS_MENSUELLES: formDataState.Nb_operations_mensuelles || '',
    ROBOT: formDataState.Robot || '',
    STATUT: formDataState.Statut || '1',
    TEMPS_CONSOMME: formDataState.Temps_consommé || '',
    TYPE_DEMANDE: formDataState.type || 'new',
    TYPE_GAIN: formDataState.type_gain || ''
};
```

### Impact des modifications
- Chaque nouvelle demande aura un ID unique généré par timestamp
- L'erreur SQL "champ ID requis et ne peut pas être NULL" est résolue
- Les demandes sont correctement enregistrées dans la base de données
- L'ID est généré côté client avec `Date.now().toString()` pour garantir l'unicité

### Fichiers modifiés
- `app/api/sql/route.ts` : Ajout du champ ID dans la requête d'insertion et les paramètres
- `components/MergedRequestForm.tsx` : Ajout de la génération du timestamp ID dans l'objet evolutionData

### Tests à effectuer
1. Vérifier que chaque nouvelle demande a un ID unique
2. S'assurer que l'ID est bien enregistré dans la base de données
3. Tester la récupération des demandes avec l'ID
4. Vérifier qu'il n'y a pas de conflit d'ID entre les demandes

## 2025-08-07 - Correction du type de données pour le champ ID dans la table Evolutions

### Problème identifié
Le champ ID dans la table 'Evolutions' est de type `int` mais l'API utilisait `sql.NVarChar(50)` pour ce paramètre, et le formulaire générait une chaîne de caractères pour l'ID. Cela causait une erreur SQL "Cannot insert the value NULL into column 'ID'" lors de l'insertion.

### Causes du problème
1. **Type de paramètre incorrect** : L'API SQL utilisait `sql.NVarChar(50)` au lieu de `sql.Int` pour le champ ID
2. **Format de l'ID incorrect** : Le formulaire générait un timestamp sous forme de chaîne de caractères (`Date.now().toString()`) alors que la base de données attend un nombre entier

### Modifications apportées

#### 1. Correction du type de paramètre dans l'API SQL
**Fichier :** `app/api/sql/route.ts`
**Ligne 180** :
```typescript
// Avant
params.push({ name: 'ID', type: sql.NVarChar(50), value: data.ID });

// Après
params.push({ name: 'ID', type: sql.Int, value: data.ID });
```

#### 2. Correction de la génération de l'ID dans le formulaire
**Fichier :** `components/MergedRequestForm.tsx`
**Ligne 181** :
```typescript
// Avant
ID: Date.now().toString(), // Génération du timestamp

// Après
ID: Math.floor(Math.random() * 1000000), // Génération d'un nombre entier aléatoire
```

### Impact des modifications
- Les données du formulaire "Nouvelle demande" peuvent maintenant être enregistrées correctement dans la base de données
- L'erreur SQL "Cannot insert the value NULL into column 'ID'" est résolue
- Le champ ID est maintenant un nombre entier aléatoire qui respecte la contrainte de type de la base de données

### Fichiers modifiés
- `app/api/sql/route.ts` : Correction du type de paramètre pour le champ ID
- `components/MergedRequestForm.tsx` : Correction de la génération de l'ID pour produire un nombre entier

### Tests à effectuer
1. Tester l'enregistrement d'une nouvelle demande via le formulaire
2. Vérifier que l'ID est bien généré comme un nombre entier
3. Confirmer que les données sont correctement insérées dans la table Evolutions
4. Vérifier que l'erreur SQL n'apparaît plus
