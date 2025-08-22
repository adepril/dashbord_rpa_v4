# Plan d'ajout du bouton et fenêtre modale "Tableau des utilisateurs Douane"

## Objectif
Ajouter un bouton dans le coin supérieur droit de Chart4All.tsx, à la même hauteur que "Gain de temps", qui ouvre une fenêtre modale affichant un tableau des statistiques des utilisateurs Douane.

## Structure technique

### 1. Création du composant UsersTableModal

**Fichier**: `components/UsersTableModal.tsx`

```typescript
"use client"

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserStats {
  id: string;
  nom: string;
  email: string;
  agence: string;
  derniereConnexion: string;
  nbRobotsActifs: number;
  tempsTotalEconomise: string;
}

interface UsersTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UsersTableModal: React.FC<UsersTableModalProps> = ({ open, onOpenChange }) => {
  // Données statiques pour le moment
  const usersData: UserStats[] = [
    {
      id: "1",
      nom: "Jean Dupont",
      email: "jean.dupont@douane.finances.gouv.fr",
      agence: "Paris Nord",
      derniereConnexion: "22/08/2025 09:15",
      nbRobotsActifs: 5,
      tempsTotalEconomise: "2h 45min"
    },
    {
      id: "2",
      nom: "Marie Martin",
      email: "marie.martin@douane.finances.gouv.fr",
      agence: "Lyon Part-Dieu",
      derniereConnexion: "22/08/2025 08:30",
      nbRobotsActifs: 3,
      tempsTotalEconomise: "1h 20min"
    },
    {
      id: "3",
      nom: "Pierre Bernard",
      email: "pierre.bernard@douane.finances.gouv.fr",
      agence: "Marseille",
      derniereConnexion: "21/08/2025 16:45",
      nbRobotsActifs: 7,
      tempsTotalEconomise: "3h 15min"
    },
    {
      id: "4",
      nom: "Sophie Leroy",
      email: "sophie.leroy@douane.finances.gouv.fr",
      agence: "Bordeaux",
      derniereConnexion: "22/08/2025 10:00",
      nbRobotsActifs: 4,
      tempsTotalEconomise: "2h 10min"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tableau des utilisateurs Douane</DialogTitle>
          <DialogDescription>
            Statistiques d'utilisation des robots par utilisateur
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="text-center">Robots actifs</TableHead>
                <TableHead>Temps économisé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersData.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nom}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.agence}</TableCell>
                  <TableCell>{user.derniereConnexion}</TableCell>
                  <TableCell className="text-center">{user.nbRobotsActifs}</TableCell>
                  <TableCell>{user.tempsTotalEconomise}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UsersTableModal;
```

### 2. Modifications dans Chart4All.tsx

**Ajout des imports nécessaires :**
```typescript
import { Button } from "@/components/ui/button";
import UsersTableModal from './UsersTableModal';
```

**Ajout de l'état pour la modale :**
```typescript
const [showUsersTableModal, setShowUsersTableModal] = useState(false);
```

**Ajout du bouton dans le coin supérieur droit :**
Localisation : Ligne 256, juste après `<div className="ml-[10%] text-left text-xl font-bold mb-4">Gain de temps</div>`

Structure HTML modifiée :
```typescript
<div className="h-[300px] relative">
  <div className="flex justify-between items-center mb-4">
    <div className="ml-[10%] text-left text-xl font-bold">Gain de temps</div>
    <Button 
      onClick={() => setShowUsersTableModal(true)}
      className="mr-4 bg-[#3498db] hover:bg-[#3333db] text-white"
    >
      Tableau des utilisateurs Douane
    </Button>
  </div>
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

**Ajout du composant modale :**
Localisation : Avant la fermeture du `</>` final

```typescript
<UsersTableModal 
  open={showUsersTableModal} 
  onOpenChange={setShowUsersTableModal} 
/>
```

### 3. Structure CSS et positionnement

Le bouton sera positionné :
- Dans le coin supérieur droit du conteneur du graphique
- À la même hauteur que "Gain de temps"
- Avec un espacement de `mr-4` pour ne pas coller au bord
- Utilisant les mêmes couleurs que les autres boutons du projet (#3498db et #3333db)

### 4. Structure du tableau

Le tableau affichera les colonnes suivantes :
- **Nom** : Nom complet de l'utilisateur
- **Email** : Adresse email professionnelle
- **Agence** : Nom de l'agence douanière
- **Dernière connexion** : Date et heure de la dernière connexion
- **Robots actifs** : Nombre de robots actifs pour cet utilisateur
- **Temps économisé** : Temps total économisé grâce aux robots

### 5. Étapes d'implémentation

1. **Créer le fichier** `components/UsersTableModal.tsx`
2. **Modifier Chart4All.tsx** :
   - Ajouter les imports nécessaires
   - Ajouter l'état `showUsersTableModal`
   - Ajouter le bouton dans le header du graphique
   - Ajouter le composant UsersTableModal à la fin du JSX
3. **Tester l'ouverture/fermeture** de la modale
4. **Vérifier le style** et le positionnement du bouton

### 6. Notes pour l'évolution future

- Les données statiques seront remplacées par une requête API vers la base de données
- Ajouter des filtres et des options de tri dans la modale
- Possibilité d'exporter les données en CSV ou PDF
- Ajouter des graphiques de répartition par agence

## Validation

- [ ] Le bouton s'affiche correctement dans le coin supérieur droit
- [ ] Le bouton est à la même hauteur que "Gain de temps"
- [ ] La modale s'ouvre au clic sur le bouton
- [ ] La modale se ferme correctement
- [ ] Le tableau affiche les données statiques
- [ ] Le style est cohérent avec le reste de l'application