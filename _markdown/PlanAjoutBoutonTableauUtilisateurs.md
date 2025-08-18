# Plan d'ajout du bouton "Tableau des utilisateurs Douane"

## Objectif
Ajouter un bouton dans `Chart4All.tsx` qui ouvre une modale affichant un tableau statique des utilisateurs Douane.

## Positionnement
- Coin supérieur droit du conteneur principal
- À la même hauteur que "Gain de temps"
- Style cohérent avec les autres boutons de l'application

## Structure des fichiers à créer/modifier

### 1. Création du composant UsersTableModal
**Fichier**: `components/UsersTableModal.tsx`

```typescript
'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

interface UsersTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface User {
  id: string
  nom: string
  email: string
  role: string
  agence: string
  derniereConnexion: string
}

const UsersTableModal: React.FC<UsersTableModalProps> = ({ open, onOpenChange }) => {
  // Données statiques pour le moment
  const users: User[] = [
    {
      id: '1',
      nom: 'Jean Martin',
      email: 'jean.martin@douane.finances.gouv.fr',
      role: 'Administrateur',
      agence: 'Paris Nord',
      derniereConnexion: '18/08/2025 14:30'
    },
    {
      id: '2',
      nom: 'Marie Dubois',
      email: 'marie.dubois@douane.finances.gouv.fr',
      role: 'Utilisateur',
      agence: 'Lyon Part-Dieu',
      derniereConnexion: '18/08/2025 10:15'
    },
    {
      id: '3',
      nom: 'Pierre Bernard',
      email: 'pierre.bernard@douane.finances.gouv.fr',
      role: 'Superviseur',
      agence: 'Marseille',
      derniereConnexion: '17/08/2025 16:45'
    },
    {
      id: '4',
      nom: 'Sophie Petit',
      email: 'sophie.petit@douane.finances.gouv.fr',
      role: 'Utilisateur',
      agence: 'Bordeaux',
      derniereConnexion: '18/08/2025 09:00'
    },
    {
      id: '5',
      nom: 'Lucas Moreau',
      email: 'lucas.moreau@douane.finances.gouv.fr',
      role: 'Analyste',
      agence: 'Paris Sud',
      derniereConnexion: '17/08/2025 18:20'
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tableau des utilisateurs Douane</DialogTitle>
          <DialogDescription>
            Liste des utilisateurs ayant accès au système de reporting RPA
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Dernière connexion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nom}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.agence}</TableCell>
                  <TableCell>{user.derniereConnexion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UsersTableModal
```

### 2. Modification de Chart4All.tsx

**Ajout des imports nécessaires :**
```typescript
import { useState } from 'react'
import UsersTableModal from './UsersTableModal'
```

**Ajout de l'état pour la modale :**
```typescript
const [showUsersTable, setShowUsersTable] = useState(false)
```

**Ajout du bouton dans le rendu :**
Positionner le bouton dans le coin supérieur droit, à la même hauteur que "Gain de temps".

**Modification de la section principale :**
```typescript
<div className="w-full flex justify- gap-4 items-center ">
  <div className="w-2/3 pt-4 pb-2 bg-white rounded-lg shadow ml-2 relative">
    
    {/* Bouton Tableau des utilisateurs Douane */}
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setShowUsersTable(true)}
        className="bg-neutral-950 text-neutral-100 border border-neutral-400 border-b-4 font-medium overflow-hidden relative px-4 py-2 rounded-lg hover:brightness-150 hover:border-t-4 hover:border-b active:opacity-75 outline-none duration-300 group"
      >
        <span className="bg-neutral-400 shadow-neutral-400 absolute -top-[150%] left-0 inline-flex w-80 h-[5px] rounded-lg opacity-50 group-hover:top-[150%] duration-500 shadow-[0_0_10px_10px_rgba(0,0,0,0.3)]"></span>
        Tableau des utilisateurs Douane
      </button>
    </div>

    <div className="h-[300px] relative">
      <div className="ml-[10%] text-left text-xl font-bold mb-4">Gain de temps</div>
      {/* Reste du contenu existant... */}
    </div>
    
    {/* Intégration de la modale */}
    <UsersTableModal 
      open={showUsersTable} 
      onOpenChange={setShowUsersTable} 
    />
  </div>
</div>
```

## Étapes d'implémentation

1. **Créer le fichier** `components/UsersTableModal.tsx`
2. **Modifier** `components/Chart4All.tsx` pour ajouter le bouton et l'état
3. **Tester** l'affichage du bouton
4. **Vérifier** l'ouverture/fermeture de la modale
5. **Valider** le style et la position du bouton

## Données futures
À terme, les données seront récupérées depuis la base de données via une API. Le composant UsersTableModal pourra être modifié pour :
- Remplacer les données statiques par un appel API
- Ajouter des fonctionnalités de tri et filtrage
- Inclure des actions (éditer, supprimer, activer/désactiver utilisateur)
- Ajouter un export CSV/Excel

## Notes techniques
- Le composant utilise les mêmes composants UI que le reste de l'application
- La modale est responsive et s'adapte aux différentes tailles d'écran
- Les styles sont cohérents avec le design system existant