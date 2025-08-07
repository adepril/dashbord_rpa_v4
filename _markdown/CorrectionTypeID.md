# Correction du Type de Données pour le Champ ID

## Problème Identifié
Le champ ID dans la table 'Evolutions' est de type `int` mais l'API utilise actuellement `sql.NVarChar(50)` pour ce paramètre, ce qui cause une erreur lors de l'insertion.

## Modifications Requises

### 1. API SQL (app/api/sql/route.ts)
**Ligne 180** - Modifier le type de paramètre pour ID :

```typescript
// AVANT (incorrect)
params.push({ name: 'ID', type: sql.NVarChar(50), value: data.ID });

// APRÈS (correct)
params.push({ name: 'ID', type: sql.Int, value: data.ID });
```

### 2. Composant MergedRequestForm (components/MergedRequestForm.tsx)
**Ligne ~150** - Modifier la génération de l'ID pour produire un nombre entier aléatoire :

```typescript
// AVANT (génère une chaîne)
const evolutionData = {
  ID: Date.now().toString(),
  INTITULE: formData.title,
  DESCRIPTION: formData.description,
  DATE_MAJ: new Date().toLocaleDateString('fr-FR'),
  NB_OPERATIONS_MENSUELLES: formData.monthlyOperations || '',
  ROBOT: formData.robot || 'TOUT',
  STATUT: '1',
  TEMPS_CONSOMME: formData.timeSpent || '',
  TYPE_DEMANDE: formData.requestType || 'new',
  TYPE_GAIN: formData.gainType || ''
};

// APRÈS (génère un nombre entier)
const evolutionData = {
  ID: Math.floor(Math.random() * 1000000), // Génère un nombre aléatoire entre 0 et 999999
  INTITULE: formData.title,
  DESCRIPTION: formData.description,
  DATE_MAJ: new Date().toLocaleDateString('fr-FR'),
  NB_OPERATIONS_MENSUELLES: formData.monthlyOperations || '',
  ROBOT: formData.robot || 'TOUT',
  STATUT: '1',
  TEMPS_CONSOMME: formData.timeSpent || '',
  TYPE_DEMANDE: formData.requestType || 'new',
  TYPE_GAIN: formData.gainType || ''
};
```

## Alternative pour l'ID
Pour éviter les collisions, on peut utiliser une combinaison de timestamp et de nombre aléatoire :

```typescript
const evolutionData = {
  ID: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
  // ... reste des données
};
```

## Test de l'implémentation
Après ces modifications, le formulaire devrait :
1. Générer un ID numérique valide
2. L'API devrait accepter le paramètre sans erreur de type
3. L'enregistrement devrait être créé dans la base de données avec succès

## Fichiers à Modifier
1. `app/api/sql/route.ts` - Ligne 180
2. `components/MergedRequestForm.tsx` - Ligne où evolutionData est défini