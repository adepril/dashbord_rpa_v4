# Plan d'ajout conditionnel du bouton "Tableau des utilisateurs Douane"

## Objectif
Afficher le bouton "Tableau des utilisateurs Douane" uniquement lorsque le service sélectionné est "Douane", sur les deux composants Chart.tsx et Chart4All.tsx.

## Analyse des composants

### Chart.tsx
- **Accès au service**: via `data.service` (ligne 261)
- **Condition**: `data.service === 'Douane'`

### Chart4All.tsx
- **Accès au service**: via les données `data1` qui contiennent probablement le service
- **Recherche nécessaire**: Identifier où se trouve l'information du service

## Modifications requises

### 1. Chart.tsx - Ajout conditionnel du bouton

**Localisation**: Lignes 119-121, remplacer la div existante par une structure avec condition

**Code actuel**:
```typescript
<div className="ml-[10%] text-left text-xl font-bold mb-4">
  {robotType?.toLowerCase().includes('temps') ? 'Gain de temps  ('+data.temps_par_unite+' min / traitement)' : 'Sécurisation des processus'} 
</div>
```

**Code modifié**:
```typescript
<div className="flex justify-between items-center mb-4">
  <div className="ml-[10%] text-left text-xl font-bold">
    {robotType?.toLowerCase().includes('temps') ? 'Gain de temps  ('+data.temps_par_unite+' min / traitement)' : 'Sécurisation des processus'} 
  </div>
  {data?.service === 'Douane' && (
    <Button 
      onClick={() => setShowUsersTableModal(true)}
      className="mr-4 bg-[#3498db] hover:bg-[#3333db] text-white"
    >
      Tableau des utilisateurs Douane
    </Button>
  )}
</div>
```

**Ajouts nécessaires**:
```typescript
import { Button } from "@/components/ui/button";
import UsersTableModal from './UsersTableModal';
```

**État à ajouter**:
```typescript
const [showUsersTableModal, setShowUsersTableModal] = useState(false);
```

### 2. Chart4All.tsx - Identification du service et ajout conditionnel

**Recherche du service**: Examiner la structure de `data1` pour identifier où se trouve l'information du service.

**Hypothèses possibles**:
- `data1.service`
- `data1[0]?.service`
- Une propriété différente dans les données

**Code conditionnel similaire**:
```typescript
{data1?.service === 'Douane' && (
  <Button 
    onClick={() => setShowUsersTableModal(true)}
    className="mr-4 bg-[#3498db] hover:bg-[#3333db] text-white"
  >
    Tableau des utilisateurs Douane
  </Button>
)}
```

### 3. Structure de données attendue

Pour Chart4All.tsx, il faut identifier la structure exacte des données. Les options possibles sont:

1. **Si data1 est un objet unique**:
   ```typescript
   data1.service === 'Douane'
   ```

2. **Si data1 est un tableau**:
   ```typescript
   data1[0]?.service === 'Douane'
   ```

3. **Si le service est dans une propriété différente**:
   ```typescript
   data1.nomService === 'Douane'
   ```

### 4. Étapes d'implémentation

1. **Vérifier la structure de données dans Chart4All.tsx**
2. **Ajouter les imports nécessaires dans Chart.tsx**
3. **Ajouter l'état showUsersTableModal dans Chart.tsx**
4. **Modifier la structure HTML dans Chart.tsx avec condition**
5. **Ajouter le composant UsersTableModal dans Chart.tsx**
6. **Identifier la source du service dans Chart4All.tsx**
7. **Appliquer la même logique conditionnelle dans Chart4All.tsx**
8. **Tester les deux composants avec différents services**

### 5. Tests recommandés

- **Service = "Douane"**: Le bouton doit apparaître
- **Service = "Autre"**: Le bouton ne doit pas apparaître
- **Service = undefined/null**: Le bouton ne doit pas apparaître

### 6. Gestion des cas limites

- **Données manquantes**: Vérifier que la condition ne cause pas d'erreur si data ou data1 est undefined
- **Cas d'insensibilité à la casse**: Considérer `toLowerCase()` pour la comparaison
- **Espaces**: Utiliser `trim()` si nécessaire

## Code final recommandé

### Chart.tsx
```typescript
// Ajouts d'imports
import { Button } from "@/components/ui/button";
import UsersTableModal from './UsersTableModal';

// Dans le composant
const [showUsersTableModal, setShowUsersTableModal] = useState(false);

// Dans le JSX
<div className="h-[300px] relative">
  <div className="flex justify-between items-center mb-4">
    <div className="ml-[10%] text-left text-xl font-bold">
      {robotType?.toLowerCase().includes('temps') ? 'Gain de temps  ('+data.temps_par_unite+' min / traitement)' : 'Sécurisation des processus'} 
    </div>
    {data?.service === 'Douane' && (
      <Button 
        onClick={() => setShowUsersTableModal(true)}
        className="mr-4 bg-[#3498db] hover:bg-[#3333db] text-white"
      >
        Tableau des utilisateurs Douane
      </Button>
    )}
  </div>
  {/* ... reste du code ... */}
</div>

// À la fin du JSX
<UsersTableModal 
  open={showUsersTableModal} 
  onOpenChange={setShowUsersTableModal} 
/>
```

### Chart4All.tsx
```typescript
// Structure similaire avec la bonne référence au service
{data1?.service === 'Douane' && (
  <Button 
    onClick={() => setShowUsersTableModal(true)}
    className="mr-4 bg-[#3498db] hover:bg-[#3333db] text-white"
  >
    Tableau des utilisateurs Douane
  </Button>
)}
```

## Validation finale
- [ ] Le bouton apparaît uniquement quand service === 'Douane'
- [ ] Le bouton est positionné correctement dans les deux composants
- [ ] La modale fonctionne correctement dans les deux composants
- [ ] Aucune erreur n'est générée si le service est manquant