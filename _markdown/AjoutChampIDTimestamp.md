# Ajout du champ ID timestamp - 07/08/2025

## Contexte
Le client a demandé d'ajouter le champ 'ID' (timestamp) dans l'enregistrement des demandes dans la table 'Evolutions'.

## Modifications nécessaires

### 1. API SQL (app/api/sql/route.ts)
**Lignes 170-178** : Modifier la requête d'insertion pour inclure le champ ID

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

**Lignes 179-189** : Ajouter le paramètre ID

```typescript
// Ajouter cette ligne avant les autres paramètres
params.push({ name: 'ID', type: sql.NVarChar(50), value: data.ID });

// Les autres paramètres restent identiques
params.push({ name: 'INTITULE', type: sql.NVarChar(50), value: data.INTITULE });
// ... etc
```

### 2. Composant MergedRequestForm (components/MergedRequestForm.tsx)

**Lignes 179-190** : Modifier l'objet evolutionData pour inclure l'ID

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

## Structure de la table Evolutions mise à jour
- **ID** (nvarchar(50)) : Timestamp unique pour chaque demande
- **INTITULE** (nvarchar(50))
- **DESCRIPTION** (nvarchar(MAX))
- **DATE_MAJ** (nvarchar(50))
- **NB_OPERATIONS_MENSUELLES** (nvarchar(50))
- **ROBOT** (nvarchar(50))
- **STATUT** (nchar(10))
- **TEMPS_CONSOMME** (nchar(10))
- **TYPE_DEMANDE** (nchar(10))
- **TYPE_GAIN** (nchar(10))

## Tests recommandés
1. Vérifier que chaque nouvelle demande a un ID unique
2. S'assurer que l'ID est bien enregistré dans la base de données
3. Tester la récupération des demandes avec l'ID
4. Vérifier qu'il n'y a pas de conflit d'ID entre les demandes

## Notes techniques
- L'ID est généré côté client avec `Date.now().toString()` pour garantir l'unicité
- Le format string permet de stocker facilement le timestamp
- Aucune modification de la structure de la table n'est nécessaire si la colonne ID existe déjà