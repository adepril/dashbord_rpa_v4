'use client'

interface DashboardProps {
  // Add any props if needed
}

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation';
import ProgramSelector from './ProgramSelector'
import Chart from './Chart'
import EvolutionsTable from './EvolutionsTable'
import Chart4All from './Chart4All'
import MergedRequestForm from './MergedRequestForm'
import AgencySelector from './AgencySelector'
import ServiceSelector from './ServiceSelector'
import Image from 'next/image';
import {
  // fetchAllEvolutions,
  // fetchEvolutionsByProgram,
  formatNumber
} from '../utils/dataFetcher'

import {
  initializeReportingData,
  getCachedAgencies,
  getCachedAllAgencies, // Ajouté pour accéder aux toutes agences

  Agency,
  Program,
  isDataInitialized,
  resetCache,
  isFirstLoginSession,
  setUpdateRobotsCallback,
  getReportingData,
  ReportingEntry,
  loadAllAgencies,
  cachedReportingData,
  getMonthLabelCurrentMonth,
  getMonthLabelPrevMonth1,
  getMonthLabelPrevMonth2,
  getMonthLabelPrevMonth3
} from '../utils/dataStore'

// ============================================================
// Interfaces
// ------------------------------------------------------------
// DataEntry : Représente une entrée de reporting pour l'affichage des graphiques.
// MergedRequestFormProps : Interface pour les propriétés passées lors de l'ouverture du formulaire.
// ==
interface DataEntry {
  AGENCE: string;
  'NOM PROGRAMME': string;
  'NB UNITES DEPUIS DEBUT DU MOIS': string;
  'NB UNITES MOIS N-1': string;
  'NB UNITES MOIS N-2': string;
  'NB UNITES MOIS N-3': string;
  [key: string]: any;
}

interface MergedRequestFormProps {
  onClose: () => void;
  type?: 'evolution' | 'new' | 'edit';
  formData?: {
    Intitulé: string;
    Description: string;
    Programme: string;
    Nb_operations_mensuelles: string;
    Temps_consommé: string;
    Statut: string;
    Date: string;
    type: 'new' | 'evolution' | 'edit';
  };
}

// ============================================================
// Composant Dashboard
// ------------------------------------------------------------
// Vue principale du tableau de bord qui gère :
// - L'authentification et la redirection si l'utilisateur n'est pas connecté
// - L'initialisation des données utilisateur, agences et robots via Firestore
// - La gestion des sélections (agence, service et robot)
// - L'affichage de graphiques et d'un tableau d'évolution
// - L'ouverture de formulaires pour les demandes
// ============================================================
export default function Dashboard() {
  // ------------------------------------------------------------------
  // États pour divers paramètres et données
  // ------------------------------------------------------------------
  const [showAllRobots, setShowAllRobots] = useState(isFirstLoginSession());
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('N'); // 'N', 'N-1', 'N-2', 'N-3'
  const [userData, setUserData] = useState<any>(null);
  
  // Définir userId et userName en fonction de userData à chaque rendu
  const userId = userData?.userId || '';
  const userName = userData?.userName || '';
  const userAgenceIds = userData?.userAgenceIds || []; 
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>({
    codeAgence: 'TOUT',
    libelleAgence: 'TOUT'
  });
  const [selectedService, setSelectedService] = useState<string>('TOUT');
  const [availableServices, setAvailableServices] = useState<Set<string>>(new Set(['TOUT']));
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedRobot, setSelectedRobot] = useState<Program | null>(null);
  const [selectedRobotData, setSelectedRobotData] = useState<Program | null>(null);
  const [historiqueData, setHistoriqueData] = useState<any[]>([]);
  const [robotData, setRobotData] = useState<any>(null);
  const [robotData1, setRobotData1] = useState<any>(null);
  const [robotData2, setRobotData2] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [OpenFormNewOrder, setIsFormOpen] = useState(false);
  const [useChart4All, setUseChart4All] = useState(true);
  const [isUserSelectingService, setIsUserSelectingService] = useState(false);

  const [totalCurrentMonth, setTotalCurrentMonth] = useState<number>(0);
  const [totalPrevMonth1, setTotalPrevMonth1] = useState<number>(0);
  const [totalPrevMonth2, setTotalPrevMonth2] = useState<number>(0);
  const [totalPrevMonth3, setTotalPrevMonth3] = useState<number>(0);

  const [totalCurrentMonth_Chart, setTotalCurrentMonth_Chart] = useState<number>(0);
  const [totalPrevMonth1_Chart, setTotalPrevMonth1_Chart] = useState<number>(0);
  const [totalPrevMonth2_Chart, setTotalPrevMonth2_Chart] = useState<number>(0);
  const [totalPrevMonth3_Chart, setTotalPrevMonth3_Chart] = useState<number>(0);

  // Récupère l'objet router de Next.js pour rediriger l'utilisateur si besoin
  const router = useRouter();

  // ------------------------------------------------------------------
  // Redirection si l'utilisateur n'est pas connecté
  // ------------------------------------------------------------------
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    } else {
      localStorage.removeItem('userData'); // Supprimer les données utilisateur du localStorage
      router.replace('/');
    }
  }, [router]);

  // ------------------------------------------------------------------
  // Initialisation des données (utilisateur, agences, robots, reporting)
  // ------------------------------------------------------------------
  const initialized = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    console.log('(Dashboard) -userName:', userName, ' -userId:', userId, ' -userAgenceIds:', userAgenceIds);  
    console.log('isDataInitialized:', isDataInitialized());
    if (!initialized.current && userId) {
      initialized.current = true;

      const loadInitialData = async () => {
        try {
          setIsLoading(true);

          // Étape 1: Charger toutes les données nécessaires dans le cache de manière séquentielle
          await loadAllAgencies();
          console.log('Toutes les agences chargées en cache:', getCachedAllAgencies());

          // Charger les données de reporting pour 4 mois
          await initializeReportingData();
          console.log('(Dashboard) initializeReportingData - cachedReportingData.currentMonth:', cachedReportingData.currentMonth);
          console.log('(Dashboard) initializeReportingData - cachedReportingData.prevMonth1:', cachedReportingData.prevMonth1);
          console.log('(Dashboard) initializeReportingData - cachedReportingData.prevMonth2:', cachedReportingData.prevMonth2);
          console.log('(Dashboard) initializeReportingData - cachedReportingData.prevMonth3:', cachedReportingData.prevMonth3);

          // Étape 2: Une fois les données mises en cache, les récupérer et définir l'état du composant
          const userAgencies = userId === '0' ? getCachedAllAgencies() : getCachedAgencies();
          setAgencies(userAgencies);
          //console.log('(Dashboard / initializeReportingData) - Agences récupérées:', userAgencies);

          // Définir l'agence par défaut
          const defaultAgency = userAgencies.find(a => a.codeAgence === 'TOUT') || userAgencies[0] || { codeAgence: 'TOUT', libelleAgence: 'TOUT' };
          setSelectedAgency(defaultAgency);
          console.log('(Dashboard / initializeReportingData) loadInitialData - Agence par défaut:', defaultAgency);

          // Définir le service par défaut
          setSelectedService('TOUT');
          console.log('(Dashboard / initializeReportingData) loadInitialData - Service par défaut: TOUT');


        } catch (error) {
          console.error('Erreur lors du chargement des données initiales:', error);
          setError('Erreur lors du chargement des données');
        } finally {
          setIsLoading(false);
        }
      };

      loadInitialData();
    }

    return () => {
      resetCache();
    };
  }, [userId]);


  // ------------------------------------------------------------------
  // Chargement des données pour le programme (robot) sélectionné
  // ------------------------------------------------------------------
  useEffect(() => {
    const loadProgramData = async () => {
      if (selectedRobotData) {
        if (selectedRobotData.robot === "TOUT") {
          // ****** Chart4All.tsx ******
          const allRobotsEvolution: any[] = [];
          let oneRobotEvolution: any[] = [];
          const arrJoursDuMois: string[] = new Array(31).fill("0");
          const arrJoursDuMois_Type1: string[] = [...arrJoursDuMois];
          const arrJoursDuMois_Type2: string[] = [...arrJoursDuMois];
          let rawData: DataEntry[] = [];

          let totalUnitesMoisCourant_Type1 = 0;
          let totalUnitesMoisCourant_Type2 = 0;

          // Calculer le mois et l'année en fonction du selectedMonth
          const currentDate = new Date();
          let displayMonth = currentDate.getMonth() + 1;
          let displayYear = currentDate.getFullYear();
          
          //console.log(`[Dashboard] Avant ajustement - selectedMonth: ${selectedMonth}, currentDate: ${currentDate.toLocaleDateString()}, displayMonth: ${displayMonth}, displayYear: ${displayYear}`);

          if (selectedMonth !== 'N') {
            const monthOffset = parseInt(selectedMonth.split('-')[1]);
            displayMonth -= monthOffset;
            if (displayMonth < 1) {
              displayMonth += 12;
              displayYear -= 1;
            }
          }
          
          console.log(`[Dashboard] Après ajustement selectedMonth - displayMonth: ${displayMonth}, displayYear: ${displayYear}`);

          // Ajustement si on est le 1er du mois et mois courant
          if (currentDate.getDate() === 1) {  
            //console.log(`[Dashboard] Règle spéciale 1er du mois appliquée (selectedMonth: N)`);
            if (displayMonth === 1) {
              displayMonth = 12;
              displayYear -= 1;
            } else {
              displayMonth -= 1;
            }
          }
          
          const currentMonth = displayMonth.toString().padStart(2, '0');
          const currentYear = displayYear;
          //console.log(`[Dashboard] Final - currentMonth (padded): ${currentMonth}, currentYear: ${currentYear}`);

          for (const robot of programs) {
            if (robot.robot === "TOUT" || robot.robot === null) 
              continue;
            // Récupérer les données pour le mois sélectionné
            rawData = getReportingData(selectedMonth)
              .filter((entry: ReportingEntry) => entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === robot.id_robot)
              .map((entry: any) => ({
                ...entry,
                'NB UNITES DEPUIS DEBUT DU MOIS': String(entry['NB UNITES DEPUIS DEBUT DU MOIS']),
              }));

            if (robot.agence === selectedAgency?.codeAgence || selectedAgency?.codeAgence === "TOUT") {
              const currentProgram = programs.find(p => p.robot === robot.robot);
              const robotType = currentProgram?.type_gain;

              for (const entry of rawData) {
                const unitFactor = robot.type_unite !== 'temps' || robot.temps_par_unite === '0' ? 1 : Number(robot.temps_par_unite);
                if (robotType === 'temps') {
                  totalUnitesMoisCourant_Type1 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0) * unitFactor;
                } else { 
                  totalUnitesMoisCourant_Type2 += (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
                }
                for (let i = 1; i <= 31; i++) {
                  const dateKey = i.toString().padStart(2, '0') + '/' + currentMonth + '/' + currentYear;
                  if (entry[dateKey]) {
                    const value = entry[dateKey];
                    const idx = i - 1;
                    if (robotType === 'temps') {
                      arrJoursDuMois_Type1[idx] = `${Number(arrJoursDuMois_Type1[idx]) + Number(value)}`;
                    } else { 
                      arrJoursDuMois_Type2[idx] = `${Number(arrJoursDuMois_Type2[idx]) + Number(value)}`;
                    }
                  }
                }
              }

              // if (selectedAgency.nomAgence !== 'TOUT') {
              //   oneRobotEvolution = await fetchEvolutionsByProgram(robot.robot, selectedMonth);
              //   allRobotsEvolution.push(...oneRobotEvolution);
              // }
            }
          }

          const mergedDataType1: DataEntry = {
            ...rawData[0],
            'NB UNITES DEPUIS DEBUT DU MOIS': formatNumber(totalUnitesMoisCourant_Type1),
          };

          for (let i = 1; i <= 31; i++) {
            const dateKey = i.toString().padStart(2, '0') + '/' + currentMonth + '/' + currentYear;
            mergedDataType1[dateKey] = arrJoursDuMois_Type1[i - 1];
          }

          // if (selectedAgency && selectedAgency.nomAgence === 'TOUT') {
          //   oneRobotEvolution = await fetchAllEvolutions();
          //   allRobotsEvolution.push(...oneRobotEvolution);
          // }

          setRobotData1(mergedDataType1);
          //setHistoriqueData(allRobotsEvolution);
          setUseChart4All(true);

          // Recalculer les totaux pour les widgets en fonction des filtres actuels
          const programIds = new Set(programs.map(p => p.id_robot));
          const calculateFilteredTotal = (monthKey: 'N' | 'N-1' | 'N-2' | 'N-3') => {
            const reportingData = getReportingData(monthKey);
            return reportingData.reduce((acc, entry) => {
              const entryId = `${entry.AGENCE}_${entry['NOM PROGRAMME']}`;
              if (programIds.has(entryId)) {
                return acc + (Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0);
              }
              return acc;
            }, 0);
          };

          setTotalCurrentMonth(calculateFilteredTotal('N'));
          setTotalPrevMonth1(calculateFilteredTotal('N-1'));
          setTotalPrevMonth2(calculateFilteredTotal('N-2'));
          setTotalPrevMonth3(calculateFilteredTotal('N-3'));
          // *****************Fin  Chart4All.tsx ************************

        } else {

          // ***************** Chart.tsx ************************
          setUseChart4All(false);
          const tpsParUnit = selectedRobotData.temps_par_unite === '0' ? '0' : selectedRobotData.temps_par_unite;
          // Search in current month data first
          const currentMonthData = cachedReportingData.currentMonth.filter((entry: ReportingEntry) => {
            return entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
          });
          const prevMonth1Data = cachedReportingData.prevMonth1.filter((entry: ReportingEntry) => {
            return entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
          });
          const prevMonth2Data = cachedReportingData.prevMonth2.filter((entry: ReportingEntry) => {
            return entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
          });
          const prevMonth3Data = cachedReportingData.prevMonth3.filter((entry: ReportingEntry) => {
            return entry['AGENCE'] + "_" + entry['NOM_PROGRAMME'] === selectedRobotData.agence + "_" + selectedRobotData.robot;
          });

          // Récupérer les données pour le robot sélectionné et pour le mois sélectionné
          const robotEntry = (() => {
            switch(selectedMonth) {
            case 'N':
              return currentMonthData[0];
            case 'N-1':
              return prevMonth1Data[0];
            case 'N-2':
              return prevMonth2Data[0];
            case 'N-3':
              return prevMonth3Data[0];
            default:
              return currentMonthData[0];
            }
          })();

          if (robotEntry) {
            const unitFactor = selectedRobotData.temps_par_unite === '0' ? 1 : Number(selectedRobotData.temps_par_unite);
   
            // Préparer les données pour l'histogramme
            const processedData = {
              ...robotEntry,
              'NB UNITES DEPUIS DEBUT DU MOIS': tpsParUnit !== '0'
                ? String(Number(robotEntry['NB UNITES DEPUIS DEBUT DU MOIS']))
                : String(robotEntry['NB UNITES DEPUIS DEBUT DU MOIS']),
              ...selectedRobotData
            };
            setRobotData(processedData);
          } else {
            setRobotData(null); // Réinitialiser robotData si aucune entrée n'est trouvée
          }

          setTotalCurrentMonth(currentMonthData[0] ? Number(currentMonthData[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
          setTotalPrevMonth1(prevMonth1Data[0] ? Number(prevMonth1Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
          setTotalPrevMonth2(prevMonth2Data[0] ? Number(prevMonth2Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);
          setTotalPrevMonth3(prevMonth3Data[0] ? Number(prevMonth3Data[0]['NB UNITES DEPUIS DEBUT DU MOIS']) : 0);

          // const oneRobotEvolution = await fetchEvolutionsByProgram(selectedRobotData.robot, selectedMonth);
          // setHistoriqueData(oneRobotEvolution);
        }
      }
    };

    loadProgramData();
  }, [selectedRobotData, selectedMonth]);

  // ------------------------------------------------------------------
  // Gestion du changement d'agence
  // ------------------------------------------------------------------
  const handleAgencyChange = (agencyCode: string) => {
    const agencySelected = agencies.find(a => a.codeAgence === agencyCode);
    console.log('--- AGENCY CHANGE BEGIN ---');


    console.log('--- AGENCY CHANGE END ---');
  };

  // ------------------------------------------------------------------
  // Gestion du changement de robot (programme)
  // ------------------------------------------------------------------
  const handleProgramChange = (robotID: string) => {
    console.log('--- BEGIN ROBOT CHANGE - robotID:', robotID, '---');
    const program = programs.find(p => p.id_robot === robotID);
    if (program && selectedAgency) {
      setSelectedRobot(program);
      setSelectedRobotData(program);
    } else {
      console.log('_Programme ou agence non trouvé');
      //setSelectedRobot(null);
      //setSelectedRobotData(null);
    }
    console.log('--- END ROBOT CHANGE - ', robotID, '---');
  };

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const updateService = (filteredRobots: Program[]) => {
    const services = new Set<string>();
    services.add("TOUT");

    filteredRobots.forEach(robot => {
      if (robot.service) {
        services.add(robot.service);
      } else {
        services.add("TOUT");
      }
    });

    if (!isUserSelectingService) {
      setAvailableServices(services);

      if (selectedService && !services.has(selectedService)) {
        setSelectedService("TOUT");
      }
    } else {
      setIsUserSelectingService(false);
    }
  };



    if (!userId) {
      return <div className="text-red-500">Pas d'utilisateur connecté</div>;
    }

    return (
      <>
        <div className="flex flex-col w-full">

          <div className="flex justify-between items-start w-full">

            <div className="flex items-center">
              {/* Logo et informations utilisateur */}
              <div className="flex-none">
                <Image src="/logo_bbl-groupe.svg" alt="Logo BBL Groupe" width={100} height={70} onClick={() => router.push('/')} />
              </div>
              <div className=" flex mb-10">
                <span className="text-black flex items-center ml-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-user w-5 h-5 mr-2 text-gray-600 cursor-pointer"
                    onClick={() => router.push('/')}
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg> {userData.userName}
                </span>            
              </div>
            </div>

            <div className="flex-1 flex justify-center mt-5 mr-8 bg--200">
              {/* Sélecteurs d'agence, service et robot */}
              <div className="flex space-x-8 items-center">
                <div className="flex items-center space-x-2">
                  <span>Agence:</span>
                  <AgencySelector
                    agencies={agencies}
                    selectedAgencyId={selectedAgency?.codeAgence || ''}
                    onAgencyChange={handleAgencyChange}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span>Service:</span>
                  <ServiceSelector
                    selectedService={selectedService}
                    onServiceChange={(service) => {
                      setSelectedService(service);
                      setIsUserSelectingService(true);
                    }}
                    availableServices={availableServices}
                    setIsUserSelectingService={setIsUserSelectingService}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span>Robot:</span>
                  <ProgramSelector
                    robots={programs}
                    selectedProgramId={selectedRobot?.id_robot || ''}
                    onProgramChange={handleProgramChange}
                  />
                  <div className="w-[80px]"></div>
                  <div className="flex justify-end">
                    <button onClick={handleOpenForm} className="bg-neutral-950 text-neutral-100 border border-neutral-400 border-b-4 font-medium relative px-4 py-1 rounded-lg hover:brightness-150 hover:border-t-4 active:opacity-75 duration-300">
                      Nouvelle Demande
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        
          <div>
            {/* Bouton + Formulaire de Nouvelle Demande */}
            {OpenFormNewOrder &&
              <MergedRequestForm
                onClose={handleCloseForm}
                type="new"
                user={userData}
                formData={{
                  Intitulé: '',
                  Description: '',
                  Robot: selectedRobot ? selectedRobot.robot : '',
                  Temps_consommé: '',
                  Nb_operations_mensuelles: '',
                  Statut: '1',
                  Validateur: '',
                  Date: new Date().toISOString(),
                  type: 'new'
                }}
              />
            }
          </div>
        
          <div className="container mx-auto min-h-screen bg-x-100">
            {selectedRobot && (
              <div className="p-4 bg-x-200">

                <div className="grid grid-cols-4 gap-4 bg-x-100">
                  <div className="col-span-4 pb-8">
                    {/* Graphique général dpour tous les robots */}
                    {selectedRobot?.robot === 'TOUT' ? (
                      <Chart4All
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        key={`all-${selectedAgency?.codeAgence}-${selectedRobot?.type_gain}`}
                        robotType={selectedRobot?.type_gain}
                        data1={robotData1}
                        totalCurrentMonth={totalCurrentMonth}
                        totalPrevMonth1={totalPrevMonth1}
                        totalPrevMonth2={totalPrevMonth2}
                        totalPrevMonth3={totalPrevMonth3}                      
                        monthLabelCurrent={getMonthLabelCurrentMonth()}
                        monthLabelPrev1={getMonthLabelPrevMonth1()}
                        monthLabelPrev2={getMonthLabelPrevMonth2()}
                        monthLabelPrev3={getMonthLabelPrevMonth3()}
                      />
                    ) : (
                      /* Graphique pour un robot spécifique */
                      <Chart
                        robotType={selectedRobot?.type_gain}
                        data={robotData}
                        selectedAgency={selectedAgency?.codeAgence || ''}
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        totalCurrentMonth={totalCurrentMonth}
                        totalPrevMonth1={totalPrevMonth1}
                        totalPrevMonth2={totalPrevMonth2}
                        totalPrevMonth3={totalPrevMonth3}
                        monthLabelCurrent={getMonthLabelCurrentMonth()}
                        monthLabelPrev1={getMonthLabelPrevMonth1()}
                        monthLabelPrev2={getMonthLabelPrevMonth2()}
                        monthLabelPrev3={getMonthLabelPrevMonth3()}
                      />
                    )}
                  </div>
                  
                </div>

                {/* Tableau d'historique des données */}
                <div className="grid grid-cols-4 gap-4 bg-x-300 mt-5">
                  <div className="col-span-4 w-full">
                    <EvolutionsTable
                      robot={selectedRobot?.robot || ''}
                      data={historiqueData}
                      typeGain={selectedRobot?.type_gain}
                      useChart4All={useChart4All}
                      user={userData}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  
}