'use client'

import React, { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { Button } from "./ui/button"
import { fetchStatuts, allRobotsByAgency, fetchEvolutionsByProgram } from '../utils/dataFetcher'
import MergedRequestForm from './MergedRequestForm'

interface EvolutionsTableProps {
  robot: string;
  data: any[];
  typeGain: string;  
  useChart4All: boolean;
  user: {
    userId: string;
    userName: string;
    userEmail: string;
    userSuperieur: string;
    userValidateur: string;
    password: string;
    userAgenceIds: string[];
  };
}


export default function EvolutionsTable({robot, data, typeGain, useChart4All, user}: EvolutionsTableProps): JSX.Element {
  const enhancedUser = {
    ...user,
    userEmail: 'default@example.com',
    superieur: 'defaultSuperieur',
    validateur: 'oui'
  };
  //console.log('(EvolutionsTable) robot:', robot, ' data:', data, '  useChart4All:', useChart4All, );
  const [showForm, setShowForm] = useState(false);
  const [popupInfo, setPopupInfo] = useState<{ row: any; position: { x: number; y: number } | null }>({ row: null, position: null });
  const [statuts, setStatuts] = useState<{ [key: string]: string }>({});
  const [selectedRobot, setselectedRobot] = useState({
    Intitulé: '',
    Description: '',
    Programme: robot,
    Temps_consommé: '',
    Statut: '',
    Nb_operations_mensuelles: '' ,
    Date: '',
    type_gain: ''
  });

  // État pour contrôler l'ouverture du formulaire de demande d'évolution
  const [OpenFormRequestEvolution, setIsFormOpen_Evolution] = useState(false); 
  // État pour contrôler l'ouverture du formulaire pour l'édition
  const [OpenFormEdit, setIsFormOpen_Edit] = useState(false); 

  useEffect(() => {
    const loadStatuts = async () => {
      const statutsData = await fetchStatuts();
      const statutsMap: { [key: string]: string } = {};
      statutsData.forEach((statut: any) => {
        statutsMap[statut.numero] = statut.label;
      });
      setStatuts(statutsMap);
    };
    loadStatuts();
  }, []);

/**
 * Returns a JSX element representing the label and icon for a given statut number.
 * If the statut number is not found, it returns a paragraph indicating "Statut inconnu".
 *
 * @param {string} statutNumero - The number of the statut to retrieve the label and icon for.
 * @returns {JSX.Element} The JSX element containing the statut label and icon, or a message indicating the statut is unknown.
 */
  const getStatutLabel = (statutNumero: string) => {
    if (!statuts[statutNumero]) {
      return <p>Statut inconnu</p>; 
    }
    
    return (
      <div className='icon flex items-center'> 
        <svg className="w-5 h-5"> 
          <use xlinkHref={`statusIcons.svg#${statuts[statutNumero]}`}></use>
        </svg>
        <span className='ml-2'>{statuts[statutNumero]}</span>
      </div>
    );
  };

  //ouverture de la popoup pour la demande d'évolution
  const handleOpenForm_Evolution = () => {
    console.log('OpenFormRequestEvolution:', OpenFormRequestEvolution);
    setIsFormOpen_Evolution(true);
  };

  //fermeture de la popoup 
  // pour la demande d'évolution ou la demande d'édition
  const handleCloseForm = () => {
    setIsFormOpen_Evolution(false);
    setIsFormOpen_Edit(false);
  };

  //Ouvre la pop-up pour éditer une demande
  const handleOpenForm_Edit = (
    Intitulé: string,
    Description: string,
    Programme: string,
    Temps_consommé: string,
    Statut: string,
    Nb_operations_mensuelles: string,
    Date: string,
    type_gain: string
  ) => {
    setselectedRobot({
      Intitulé,
      Description,
      Programme,
      Temps_consommé,
      Statut,
      Nb_operations_mensuelles,
      Date,
      type_gain
    });
    setIsFormOpen_Edit(true);
  };

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Evolutions du robot</h2>
          {robot != 'TOUT' && (  
          <button onClick={handleOpenForm_Evolution}
            className="bg-neutral-950 text-neutral-100 border border-neutral-400 border-b-4 font-medium overflow-hidden relative px-4 py-2 rounded-lg hover:brightness-150 hover:border-t-4 hover:border-b active:opacity-75 outline-none duration-300 group">
            <span className="bg-neutral-400 shadow-neutral-400 absolute -top-[150%] left-0 inline-flex w-80 h-[5px] rounded-lg opacity-50 group-hover:top-[150%] duration-500 shadow-[0_0_10px_10px_rgba(0,0,0,0.3)]"></span>
            Demande d'évolution
          </button>
          )}
        </div>

        <div className="rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Intitulé</TableHead>
              {/* <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Type</TableHead> */}
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Statut</TableHead>
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Gains quotidiens</TableHead>
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Dernière mise à jour</TableHead>
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className='bg-white h-[100px] text-center'>
              <TableCell className="text-xl text-gray-800 whitespace-normal" colSpan={10}>
                Aucune donnée disponible sur l'évolution de ce robot.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

        {OpenFormRequestEvolution && (
          <MergedRequestForm
            onClose={handleCloseForm}
            type="evolution"
            typeGain={typeGain}
            user={enhancedUser}
            formData={{
              Intitulé: '',
              Description: '',
              Robot: robot,
              Temps_consommé: '',
              Nb_operations_mensuelles: '',
              Statut: '1', 
              Date: new Date().toISOString(),
              //Date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              type: 'evolution',
              type_gain: typeGain,
              Validateur: user.userName
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center h-[40px]">
        <h2 className="text-2xl font-bold">Evolutions du robot</h2>

        {robot != 'TOUT' && (  
        <button onClick={handleOpenForm_Evolution}
          className="bg-neutral-950 text-neutral-100 border border-neutral-400 border-b-4 font-medium overflow-hidden relative px-4 py-2 rounded-lg hover:brightness-150 hover:border-t-4 hover:border-b active:opacity-75 outline-none duration-300 group">
          <span className="bg-neutral-400 shadow-neutral-400 absolute -top-[150%] left-0 inline-flex w-80 h-[5px] rounded-lg opacity-50 group-hover:top-[150%] duration-500 shadow-[0_0_5px_5px_rgba(0,0,0,0.3)]"></span>
          Demande d'évolution
        </button>
        )}
      </div>

      <div className="rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Intitulé</TableHead>
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Statut</TableHead>
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Gains quotidiens</TableHead>
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b">Dernière mise à jour</TableHead>
              <TableHead className="py-2 px-3 text-sm font-bold text-gray-700 border-b"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={row.id || Math.random().toString(36).substr(2, 9)}
                className={`${data.indexOf(row) % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 h-[49px]`}
              >
                <TableCell className="py-2 px-3 text-xs text-gray-800 whitespace-normal break-words">{row.Intitulé}</TableCell>
                <TableCell className="py-2 px-3 text-xs text-gray-800 whitespace-normal break-words">
                  {getStatutLabel(row.Statut)}
                </TableCell>
                      {/* <TableCell className="py-2 px-3 text-xs text-gray-800 whitespace-normal break-words">
                        {typeGain === 'temps' ? row.Temps_consommé : row.Nb_operations_mensuelles}
                      </TableCell> */}
                {row.Nb_operations_mensuelles === '' ? (
                  <TableCell className="py-2 px-3 text-xs text-gray-800 whitespace-normal break-words">
                    {row.Temps_consommé}
                  </TableCell>
                ) : (
                <TableCell className="py-2 px-3 text-xs text-gray-800 whitespace-normal break-words">
                  {row.Nb_operations_mensuelles}
                </TableCell>
                )}
                
                
                <TableCell className="py-2 px-3 text-xs text-gray-800 whitespace-normal break-words">{row.Date}</TableCell>
                <TableCell className="py-2 px-3 text-xs text-gray-800 whitespace-normal break-words">
                  <button onClick={() => handleOpenForm_Edit(row.Intitulé, row.Description, row.Robot, row.Temps_consommé, row.Statut, row.Nb_operations_mensuelles, row.Date, row.Nb_operations_mensuelles === '' ? 'temps' : 'autre') }
                    className="bg-neutral-950 text-neutral-100 border border-neutral-400 border-b-4 font-medium overflow-hidden relative px-3 py-1 rounded-lg hover:brightness-150 hover:border-t-4 hover:border-b active:opacity-75 outline-none duration-300 group">
                    <span className="bg-neutral-400 shadow-neutral-400 absolute -top-[150%] left-0 inline-flex w-80 h-[5px] rounded-lg opacity-50 group-hover:top-[150%] duration-500 "></span>
                    Détails
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {OpenFormRequestEvolution && (
          <MergedRequestForm
            onClose={handleCloseForm}
            type="evolution"
            typeGain={typeGain}
            user={enhancedUser}
            formData={{
              Intitulé: '',
              Description: '',
              Robot: selectedRobot.Programme,
              Temps_consommé: '',
              Nb_operations_mensuelles: '',
              Statut: '1', 
              Date: new Date().toISOString(),
              //Date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
              type: 'evolution',
              type_gain: typeGain,
              Validateur: ''
            }}
        />
      )}

      {OpenFormEdit && (
          <MergedRequestForm
            onClose={handleCloseForm}
            type="edit"
            typeGain={typeGain}
            user={enhancedUser}
            formData={{
              Intitulé: selectedRobot.Intitulé,
              Description: selectedRobot.Description,
              Robot: selectedRobot.Programme,
              Temps_consommé: selectedRobot.Temps_consommé,
              Statut: selectedRobot.Statut,
              Nb_operations_mensuelles: selectedRobot.Nb_operations_mensuelles,
              Date: selectedRobot.Date,
              type_gain: selectedRobot.type_gain,
              Validateur: user.userName,
              type: 'edit'
            }}
        />
      )}
    </div>
  );
}
