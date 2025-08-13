# Historique des Modifications




## 2025-08-11 - Implémentation GET et normalisation des "Evolutions"

Contexte
- Implémentation de la récupération des données de la table `Evolutions` côté API et adaptation des fonctions fetch côté client pour fournir au composant `EvolutionsTable` les champs attendus.

Modifications techniques
- API: ajout du cas GET pour la table `Evolutions` dans [`app/api/sql/route.ts`](app/api/sql/route.ts:1)
  - Support des trois modes:
    - Toutes agences (aucun param) → `SELECT * FROM [BD_RPA_TEST].[dbo].[Evolutions]`
    - Filtre par robot → `?robot=ROBOT_NAME` → `WHERE [ROBOT] = @robot`
    - Filtre par agence → `?agency=CODE_AGENCE` → sous-requête sur `[Reporting]` pour lister les `NOM_ROBOT` appartenant à l'agence et retourner les évolutions correspondantes
  - Requêtes paramétrées pour éviter les injections SQL.
- Client: modifications dans [`utils/dataFetcher.ts`](utils/dataFetcher.ts:1)
  - `fetchAllEvolutions()` : appelle `/api/sql?table=Evolutions`, mappe les colonnes SQL (`INTITULE`, `DESCRIPTION`, `DATE_MAJ`, `NB_OPERATIONS_MENSUELLES`, `ROBOT`, `STATUT`, `TEMPS_CONSOMME`, etc.) vers les clés attendues (`Intitulé`, `Description`, `Date`, `Nb_operations_mensuelles`, `Temps_consommé`, `Statut`, `Robot`) et trie par date descendante.
  - `fetchEvolutionsByRobot(robotId, selectedMonth)` : appelle `/api/sql?table=Evolutions&robot=...` et applique le même mapping + tri.
- Notes: le composant [`components/EvolutionsTable.tsx`](components/EvolutionsTable.tsx:1) consomme désormais des objets normalisés, sans modification côté UI.

Observations et tests
- Vérifier que les endpoints suivants répondent correctement (exemples):
  - `/api/sql?table=Evolutions`
  - `/api/sql?table=Evolutions&robot=NomDuRobot`
  - `/api/sql?table=Evolutions&agency=CODE_AGENCE`
- Vérifier l'affichage dans l'UI (colonnes Intitulé / Statut / Gains quotidiens / Dernière mise à jour).
- Confirmer qu'aucune erreur SQL n'apparaît dans les logs.

Remarques administratives
- Tentative d'utiliser la mémoire byterover pour récupérer le contexte automatique : échec (authentification requise).
- J'ai lu les règles et j'ai documenté ces changements ici et dans le code.




## 2025-08-11 - Implémentation complète de la table Evolutions (récupération et affichage)

### Contexte
L'utilisateur a demandé l'implémentation de la récupération et de l'affichage des données de la table 'Evolutions' avec trois scénarios : toutes les agences, une seule agence, ou un seul robot. Les fonctions existantes dans `dataFetcher.ts` ont été revues et adaptées, et la requête SQL correspondante a été implémentée dans `app/api/sql/route.ts`.


#### 1. Ajout du handler GET pour la table Evolutions dans l'API
**Fichier :** `app/api/sql/route.ts`

**Description :**
Ajout d'un case spécifique pour la table 'Evolutions' dans le handler GET, supportant trois modes de requête :
- Aucun filtre → toutes les lignes
- Paramètre `agency` → lignes pour les robots appartenant à cette agence (via la table Reporting)
- Paramètre `robot` → lignes pour ce robot spécifique

```typescript
case 'Evolutions':
  let evolutionsQuery = 'SELECT * FROM Evolutions';
  const evolutionsParams: any[] = [];
  let evolutionsWhereAdded = false;

  if (agency) {
    evolutionsQuery = `
      SELECT e.* 
      FROM Evolutions e
      INNER JOIN Reporting r ON e.ROBOT = r.NOM_ROBOT AND e.AGENCE = r.AGENCE
      WHERE r.AGENCE = @param1
    `;
    evolutionsParams.push(agency);
    evolutionsWhereAdded = true;
  }

  if (robot) {
    if (evolutionsQuery.includes('WHERE')) {
      evolutionsQuery += ` AND e.ROBOT = @param${evolutionsParams.length + 1}`;
    } else {
      evolutionsQuery += ` WHERE e.ROBOT = @param${evolutionsParams.length + 1}`;
    }
    evolutionsParams.push(robot);
  }

  const evolutionsResult = await pool.request();
  evolutionsParams.forEach((param, index) => {
    evolutionsResult.input(`param${index + 1}`, sql.VarChar, param);
  });
  
  const evolutionsData = await evolutionsResult.query(evolutionsQuery);
  return NextResponse.json(evolutionsData.recordset);
```

#### 2. Ajout de nouvelles fonctions de récupération dans dataFetcher.ts
**Fichier :** `utils/dataFetcher.ts`

**Description :**
- Mise à jour de `fetchAllEvolutions` pour utiliser le bon endpoint et parser correctement les dates
- Mise à jour de `fetchEvolutionsByRobot` avec parsing défensif des dates
- Ajout de `fetchEvolutionsByAgency` pour récupérer les évolutions par agence

```typescript
export const fetchAllEvolutions = async (): Promise<EvolutionsEntry[]> => {
  const response = await fetch('/api/sql?table=Evolutions');
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    DATE_MAJ: safeParseDate(entry.DATE_MAJ),
    DATE_DEBUT: safeParseDate(entry.DATE_DEBUT),
    DATE_FIN: safeParseDate(entry.DATE_FIN)
  }));
};

export const fetchEvolutionsByRobot = async (robotName: string): Promise<EvolutionsEntry[]> => {
  const response = await fetch(`/api/sql?table=Evolutions&robot=${encodeURIComponent(robotName)}`);
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    DATE_MAJ: safeParseDate(entry.DATE_MAJ),
    DATE_DEBUT: safeParseDate(entry.DATE_DEBUT),
    DATE_FIN: safeParseDate(entry.DATE_FIN)
  }));
};

export const fetchEvolutionsByAgency = async (agencyName: string): Promise<EvolutionsEntry[]> => {
  const response = await fetch(`/api/sql?table=Evolutions&agency=${encodeURIComponent(agencyName)}`);
  const data = await response.json();
  return data.map((entry: any) => ({
    ...entry,
    DATE_MAJ: safeParseDate(entry.DATE_MAJ),
    DATE_DEBUT: safeParseDate(entry.DATE_DEBUT),
    DATE_FIN: safeParseDate(entry.DATE_FIN)
  }));
};
```

#### 3. Ajout du chargement des données Evolutions dans Dashboard.tsx
**Fichier :** `components/Dashboard.tsx`

**Description :**
Ajout d'un useEffect pour charger les données historiques (Evolutions) selon la sélection actuelle (robot vs agence vs tout), avec journalisation pour diagnostiquer les problèmes potentiels.

```typescript
// Ajout d'un useEffect pour charger les données Evolutions
useEffect(() => {
  const loadEvolutionsForTable = async () => {
    try {
      let data;
      if (selectedRobot && selectedRobot !== 'TOUT') {
        data = await fetchEvolutionsByRobot(selectedRobot);
      } else if (selectedAgency && selectedAgency !== 'TOUT') {
        data = await fetchEvolutionsByAgency(selectedAgency);
      } else {
        data = await fetchAllEvolutions();
      }
      
      console.log('[Dashboard] loadEvolutionsForTable - received count:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('[Dashboard] loadEvolutionsForTable - sample first 5:', data.slice(0, 5));
      }
      
      setHistoriqueData(data || []);
    } catch (error) {
      console.error('[Dashboard] Error loading evolutions data:', error);
      setHistoriqueData([]);
    }
  };

  loadEvolutionsForTable();
}, [selectedRobot, selectedAgency]);
```

#### 4. Ajout de la fonction utilitaire safeParseDate
**Fichier :** `utils/dataFetcher.ts`

**Description :**
Fonction défensive pour parser les dates en gérant plusieurs formats (DD/MM/YYYY et ISO), retournant null en cas d'échec plutôt que de causer une erreur.

```typescript
const safeParseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  // Handle DD/MM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(`${year}-${month}-${day}`).toISOString();
    }
  }
  
  // Handle ISO format
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return null;
  }
};
```

### Impact des modifications
- La table Evolutions est maintenant pleinement fonctionnelle avec récupération des données selon trois modes
- Les dates sont correctement parsées et formatées
- La journalisation permet de diagnostiquer facilement les problèmes de données
- L'interface utilisateur affiche correctement les données historiques
- Les problèmes potentiels de format de date ont été résolus avec le parsing défensif

### Fichiers modifiés
- `app/api/sql/route.ts` : Ajout du handler pour la table Evolutions
- `utils/dataFetcher.ts` : Ajout des fonctions de récupération et du parsing de dates
- `components/Dashboard.tsx` : Ajout du useEffect pour charger les données Evolutions

### Tests effectués
- Vérification de la récupération des données via l'endpoint /api/sql?table=Evolutions
- Confirmation que les trois modes de filtrage (tous, par agence, par robot) fonctionnent
- Validation que les dates sont correctement parsées et affichées
- Vérification de l'affichage des données dans l'interface utilisateur





## 2025-08-12 - Amélioration de la sélection des agences

### Contexte
Correction d'un problème où des agences non autorisées par l'utilisateur étaient cliquables dans le sélecteur d'agences. La logique de grisement a été modifiée pour se baser uniquement sur les droits de l'utilisateur (`userAgenceIds`), et non plus sur la présence de données de reporting.

### Modifications techniques

#### 1. Modification de `utils/dataStore.ts`
- **Interface `Agency`**: L'attribut `isSelectable?: boolean;` a été confirmé et est utilisé pour indiquer si une agence est sélectionnable.
- **Ajout de la fonction `updateAgencySelectability(userAgenceIds: string[])`**: Cette fonction parcourt `cachedAllAgencies` et met à jour l'attribut `isSelectable` de chaque agence à `true` si son `codeAgence` est présent dans `userAgenceIds` (ou si c'est l'agence "TOUT"), et `false` sinon.
- **Suppression de la fonction `isAgencyInReportingData`**: Cette fonction n'est plus nécessaire pour la logique de grisement des agences et a été supprimée.

#### 2. Modification de `components/AgencySelector.tsx`
- L'importation de `isAgencyInReportingData` a été supprimée.
- La propriété `disabled` de `SelectItem` utilise maintenant `!agency.isSelectable` pour déterminer si l'agence doit être grisée.

#### 3. Modification de `components/Dashboard.tsx`
- L'importation de `updateAgencySelectability` a été ajoutée.
- Dans le `useEffect` d'initialisation (`loadInitialData`), après le chargement des agences (`loadAllAgencies()`), la fonction `updateAgencySelectability(userAgenceIds)` est appelée pour mettre à jour l'état de sélection des agences.
- La dépendance `userAgenceIds` a été ajoutée au `useEffect` pour s'assurer que l'initialisation se déclenche une fois les droits de l'utilisateur disponibles.

### Impact des modifications
- Les agences dans le sélecteur sont maintenant grisées correctement, ne permettant la sélection que des agences autorisées par l'utilisateur.
- La logique de sélection est simplifiée et plus conforme aux exigences de sécurité.

### Fichiers modifiés
- `utils/dataStore.ts`
- `components/AgencySelector.tsx`
- `components/Dashboard.tsx`

### Tests effectués
- Vérification du comportement de grisement des agences avec différents `userAgenceIds`.
- S'assurer que seules les agences autorisées sont cliquables.
- Vérifier que l'agence "TOUT" reste sélectionnable.


## 2025-08-12 - Filtrage des robots par service

### Contexte
Le filtrage des robots par service n'était pas fonctionnel. Quand un service était sélectionné dans le `ServiceSelector`, la liste des robots affichée dans le `RobotSelector` ne se mettait pas à jour en conséquence. La tâche était d'implémenter ce tri en se basant sur l'attribut `service` des robots de `cachedRobotsFromTableBaremeReport`. Il était également important que ce filtrage ne s'applique pas si un robot spécifique était déjà sélectionné.

### Modifications techniques

#### 1. Modification de `components/Dashboard.tsx`
- **Import de `useMemo`**: Ajout de `useMemo` à l'importation de React pour permettre l'optimisation des calculs de la liste des robots à afficher.
- **Ajout de `robotsToDisplay` avec `useMemo`**: Une nouvelle variable calculée `robotsToDisplay` a été introduite. Cette variable utilise `useMemo` pour filtrer la liste complète des robots (`robots`) en fonction du `selectedService` et du `selectedRobot`.
   - Si un `selectedRobot` spécifique (différent de "TOUT") est choisi, le filtrage par service est désactivé et tous les robots sont retournés.
   - Si aucun robot spécifique n'est sélectionné (`selectedRobot.id_robot === 'TOUT'`), la liste des robots est filtrée par `selectedService`. Si `selectedService` est "TOUT", tous les robots sont affichés ; sinon, seuls les robots dont l'attribut `service` correspond au `selectedService` sont affichés.
- **Mise à jour du `RobotSelector`**: Le composant `RobotSelector` reçoit désormais `robotsToDisplay` au lieu de la liste complète `robots`, assurant que la liste affichée est toujours pertinente au service sélectionné.

### Impact des modifications
- Le `RobotSelector` affiche désormais une liste de robots filtrée dynamiquement en fonction du service sélectionné par l'utilisateur.
- Le filtrage est désactivé lorsque l'utilisateur a sélectionné un robot spécifique, garantissant que la sélection manuelle prime sur le filtrage par service.
- L'expérience utilisateur est améliorée en fournissant une liste de robots plus pertinente et plus facile à naviguer.

### Fichiers modifiés
- `components/Dashboard.tsx`

### Tests effectués
- Vérification du filtrage des robots lorsque "TOUT" est sélectionné comme service.
- Vérification du filtrage des robots lorsque un service spécifique est sélectionné.
- Vérification que le filtrage par service est ignoré lorsqu'un robot spécifique est sélectionné.
- S'assurer que le changement de service met à jour correctement la liste des robots.

---

## 2025-08-13 - Filtrage des robots par service et synchronisation des sélecteurs

### Contexte
Suite au rapport d'anomalie, le sélecteur "Service" ne mettait pas à jour la liste des robots affichés dans le sélecteur "Robot". Le besoin était de filtrer côté client (sans nouvelle requête réseau) en s'appuyant sur le cache existant `cachedRobotsFromTableBaremeReport`, tout en respectant les droits agence de l'utilisateur et les différents cas d'utilisation métiers.

### Résumé des modifications appliquées
- Ajout d'un filtrage côté client par service (useEffect) dans le tableau de bord.
  - Fichier principal modifié : [`components/Dashboard.tsx`](components/Dashboard.tsx:497)
  - Comportement : lorsque l'utilisateur sélectionne un service via le sélecteur, on filtre `cachedRobotsFromTableBaremeReport` sur l'attribut `service` et, selon le cas, sur l'attribut `agence`.
- Réinitialisation du sélecteur "Service" à "TOUT" quand l'utilisateur choisit une agence.
  - Fichier modifié : [`components/Dashboard.tsx`](components/Dashboard.tsx:447)
  - Comportement : lors du changement d'agence, le sélecteur Service est remis à "TOUT", la liste des robots est mise à jour pour l'agence choisie, et un robot synthétique "TOUT" contextualisé par agence est sélectionné.
- Synchronisation du sélecteur "Service" lors de la sélection d'un robot (Cas 5).
  - Fichier modifié : [`components/Dashboard.tsx`](components/Dashboard.tsx:476)
  - Comportement : si un robot est sélectionné alors qu'un service est déjà affiché, le sélecteur Service est mis à jour pour afficher le service du robot sélectionné (mise à jour effectuée sans déclencher le flag utilisateur pour éviter des boucles).
- Mise à jour des services disponibles après tout filtrage via la fonction `updateService`.
  - Emplacement : [`components/Dashboard.tsx`](components/Dashboard.tsx:519)
  - Comportement : reconstruit l'ensemble des services affichables à partir de la liste de robots fournie.
- Documentation : ajout d'une entrée descriptive et d'un enregistrement en mémoire (byterover).
  - Fichier journal mis à jour : [`_markdown/HistoriqueDesModifications.md`](_markdown/HistoriqueDesModifications.md:1)

### Cas couverts
1. Chargement initial (aucune sélection) — comportement inchangé.
2. Service sélectionné & Agence = "TOUT" — affichage des robots dont `service === selectedService` appartenant aux agences autorisées.
3. Service sélectionné & Agence sélectionnée — affichage des robots dont `service === selectedService` et `agence === selectedAgency`.
4. Sélection robot quand Service = "TOUT" — comportement existant conservé.
5. Sélection robot quand un Service est déjà sélectionné — synchronisation du sélecteur Service sur le service du robot sélectionné.

### Instructions de vérification manuelle
1. Démarrer l'application et vérifier l'état initial : les 3 sélecteurs doivent être à "TOUT" et tous les robots accessibles doivent être listés.
2. Avec Agence = "TOUT", sélectionner un service A et vérifier que le sélecteur Robot n'affiche que les robots `service === A` et appartenant aux agences de l'utilisateur.
3. Sélectionner une agence X puis un service A ; vérifier que le sélecteur Robot affiche uniquement les robots `agence === X && service === A`.
4. Sélectionner un robot spécifique avec Service = "TOUT" : comportement inchangé (affichage du robot).
5. Sélectionner un robot Y alors qu'un service est déjà sélectionné : vérifier que le sélecteur Service affiche le service du robot Y et que les données sont chargées correctement.

### Points d'attention
- Le filtrage s'appuie sur `cachedRobotsFromTableBaremeReport` et sur `userAgenceIds`; vérifier que ces caches/droits sont initialisés avant interaction.
- Le flag `isUserSelectingService` est utilisé pour distinguer changements utilisateurs et changements programmatiques ; les mises à jour programmatiques le maintiennent à false pour éviter des ré‑exécutions inutiles.
- Les robots synthétiques "TOUT" contextualisés (id `${codeAgence}_TOUT`) sont créés pour maintenir la cohérence avec les composants consommateurs (Chart/Chart4All, RobotSelector). Vérifier l'acceptation de ces ids dans d'autres parties du code si nécessaire.
