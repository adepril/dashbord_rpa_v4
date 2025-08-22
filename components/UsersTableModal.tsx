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