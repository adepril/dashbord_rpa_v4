'use client'

interface DashboardProps {
  // Add any props if needed
}

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation';
import RobotSelector from './RobotSelector'
import Chart from './Chart'
import EvolutionsTable from './EvolutionsTable'
import Chart4All from './Chart4All'
import MergedRequestForm from './MergedRequestForm'
import AgencySelector from './AgencySelector'
import ServiceSelector from './ServiceSelector'
import Image from 'next/image';
import {
  // fetchAllEvolutions,
  formatNumber
} from '../utils/dataFetcher'

import {
  initializeReportingData,
  initializeRobots4Agencies, // Importation ajoutée pour initialiser les robots des agences présentes dans le reporting
  getCachedAgencies,
  getCachedAllAgencies, // Ajouté pour accéder aux toutes agences
  loadAllServices, // Importation ajoutée
  loadAllRobots, // Importation ajoutée
  cachedServices, // Importation ajoutée
  cachedRobotsFromTableBaremeReport, // Importation ajoutée

  Agency,
  Robot,
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
  'NOM ROBOT': string;
  'NB UNITES DEPUIS DEBUT DU MOIS': string;
  [key: string]: any;
}

interface MergedRequestFormProps {
  onClose: () => void;
  type?: 'evolution' | 'new' | 'edit';
  formData?: {
    Intitulé: string;
    Description: string;
    Robotme: string;
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
// Constante pour représenter l'option "TOUT" comme un objet Robot valide
  const TOUT_ROBOT: Robot = {
    clef: 'TOUT',
    robot: 'TOUT',
    id_robot: 'TOUT',
    agence: 'TOUT',
    type_unite: 'unite',
    temps_par_unite: '0',
    type_gain: 'temps',
    service: 'TOUT'
  };
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
  const [availableServices, setAvailableServices] = useState<Set<string>>(new Set(cachedServices));
  const [robots, setRobots] = useState<Robot[]>(cachedRobotsFromTableBaremeReport);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [selectedRobotData, setSelectedRobotData] = useState<Robot | null>(null);
  const [historiqueData, setHistoriqueData] = useState<any[]>([]);
  const [robotData, setRobotData] = useState<any>(null);
  const [robotDataForBarChart, setRobotDataForBarChart] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [OpenFormNewOrder, setIsFormOpen] = useState(false);
  const [useChart4All, setUseChart4All] = useState(true);
  const [isUserSelectingService, setIsUserSelectingService] = useState(false);

  const [totalCurrentMonth, setTotalCurrentMonth] = useState<number>(0);
  const [totalPrevMonth1, setTotalPrevMonth1] = useState<number>(0);
  const [totalPrevMonth2, setTotalPrevMonth2] = useState<number>(0);
  const [totalPrevMonth3, setTotalPrevMonth3] = useState<number>(0);



  // Récupère l'objet router de Next.js pour rediriger l'utilisateur si besoin
  const router = useRouter();

  // ------------------------------------------------------------------
  // Redirection si l'utilisateur n'est pas connecté
  // ------------------------------------------------------------------
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    console.log('Dashboard - storedUserData:', storedUserData);
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

          //console.log('(Dashboard) Toutes les agences chargées en cache:', getCachedAllAgencies());
          // Une fois les données mises en cache, les récupérer et définir l'état du composant
          const userAgencies = getCachedAllAgencies();
          setAgencies(userAgencies);
          console.log('(Dashboard) initializeReportingData - Agences récupérées (userAgencies):', userAgencies);

          // Définir l'agence par défaut
          const defaultAgency = userAgencies.find(a => a.codeAgence === 'TOUT') || userAgencies[0] || { codeAgence: 'TOUT', libelleAgence: 'TOUT' };
          setSelectedAgency(defaultAgency);
          //console.log('(Dashboard / initializeReportingData) loadInitialData - Agence par défaut:', defaultAgency)

          // Étape 2: Charger tous les robots
          await loadAllRobots();
          console.log('(Dashboard) Tous les robots chargés en cache:', cachedRobotsFromTableBaremeReport);
          setRobots(cachedRobotsFromTableBaremeReport);

          //Etape 3: Charger les services de la table 'Services'
          await loadAllServices();
          console.log('Tous les services chargés en cache:', cachedServices);
          setAvailableServices(new Set(cachedServices));
          // Définir le service par défaut
          setSelectedService('TOUT'); //?
          //console.log('(Dashboard / initializeReportingData) loadInitialData - Service par défaut: TOUT');

          setSelectedMonth('N'); // Réinitialiser le mois sélectionné à 'N'
          //console.log('(Dashboard / initializeReportingData) loadInitialData - Mois sélectionné:', selectedMonth);

          // Étape 4: Charger les données de reporting pour 4 mois
          await initializeReportingData();
          //console.log('(Dashboard) initializeReportingData - cachedReportingData.currentMonth:', cachedReportingData.currentMonth);
          // console.log('(Dashboard) initializeReportingData - cachedReportingData.prevMonth1:', cachedReportingData.prevMonth1);
          // console.log('(Dashboard) initializeReportingData - cachedReportingData.prevMonth2:', cachedReportingData.prevMonth2);
          // console.log('(Dashboard) initializeReportingData - cachedReportingData.prevMonth3:', cachedReportingData.prevMonth3);

          // Étape 5: Initialiser les robots pour les agences présentes dans le reporting
          await initializeRobots4Agencies();

          // Enregistrer le callback pour recevoir les robots filtrés (via AgencySelector -> updateRobots)
          setUpdateRobotsCallback((robots: Robot[]) => {
            // Mise à jour réactive de la liste des robots selon l'agence sélectionnée
            setRobots(robots);
          });

          //selectedRobotData = 'TOUT' => 'Char4All.tsx'
          setSelectedRobotData(TOUT_ROBOT);
          
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
  // Chargement des données pour le robot sélectionné
  // ------------------------------------------------------------------
  useEffect(() => {
    const loadRobotData = async () => {
      // Typage explicite des dépendances
      // Add a guard for selectedRobotData itself to prevent potential null access errors
      if (!selectedRobotData) {
        console.log('[Dashboard] loadRobotData - selectedRobotData is null, skipping data loading.');
        // Reset relevant states if selectedRobotData is null
        setRobotData(null);
        setRobotDataForBarChart(null);
        setUseChart4All(false);
        return; // Exit the function early
      }
      const currentRobot: Robot | null = selectedRobotData;
      const currentMonth: string = selectedMonth;
      //console.log(`[Dashboard] loadRobotData - currentRobot:`, currentRobot, `- selectedMonth: ${currentMonth}`);

      if (currentRobot && currentRobot.robot) {
      if (currentRobot.robot === 'TOUT') {
        // ****** Préparation des données pour Chart4All.tsx (agrégation par agence sélectionnée) ******
        const activeAgency = selectedAgency?.codeAgence || 'TOUT';
        //console.log('[Dashboard] loadRobotData(TOUT) - selectedMonth:', selectedMonth, '- activeAgency:', activeAgency);

        // Filtrer la liste des robots selon l'agence active
        const robotsFiltered = robots.filter(r => r.robot && r.robot !== 'TOUT' && (activeAgency === 'TOUT' ? true : r.agence === activeAgency));
        const robotIdsFiltered = new Set(robotsFiltered.map(r => r.id_robot));
        //console.log('[Dashboard] loadRobotData(TOUT) - robotsFiltered count:', robotsFiltered.length, '- sample ids:', Array.from(robotIdsFiltered).slice(0, 5));

        // Préparer l'agrégation journalière
        let dailyTotals: number[] = new Array(31).fill(0);
        let totalUnitsSinceMonthStart: number = 0;

        // Déterminer mois/année affichés
        const now = new Date();
        let displayMonth = now.getMonth() + 1;
        let displayYear = now.getFullYear();
        if (selectedMonth !== 'N') {
          const monthOffset = parseInt(selectedMonth.split('-')[1]);
          displayMonth -= monthOffset;
          if (displayMonth < 1) {
            displayMonth += 12;
            displayYear -= 1;
          }
        }
        const currentMonthStr = displayMonth.toString().padStart(2, '0');
        const currentYear = displayYear;

        // Extraire les entrées de reporting correspondant aux ids filtrés
        const reportingEntries = getReportingData(selectedMonth).filter((entry: ReportingEntry) => {
          const entryId = `${entry.AGENCE}_${entry['NOM_ROBOT']}`;
          return robotIdsFiltered.has(entryId);
        });
        //console.log('[Dashboard] loadRobotData(TOUT) - reportingEntries count:', reportingEntries.length, '- first ids:', reportingEntries.slice(0, 3).map(e => `${e.AGENCE}_${e['NOM_ROBOT']}`));

        // Agréger sur les 31 jours
        for (const rawEntry of reportingEntries) {
          const entry: any = {
            ...rawEntry,
            'NB UNITES DEPUIS DEBUT DU MOIS': String(rawEntry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']),
          };
          for (let i = 1; i <= 31; i++) {
            const dayColumn = `JOUR${i}`;
            if (entry[dayColumn]) {
              const value = Number(entry[dayColumn]) || 0;
              dailyTotals[i - 1] += value;
            }
          }
          totalUnitsSinceMonthStart += Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0;
        }

        // Construire mergedData (AGENCE='TOUT' pour signaler Chart4All)
        const mergedData: DataEntry = {
          AGENCE: 'TOUT',
          'NOM ROBOT': activeAgency === 'TOUT' ? 'Tous les robots' : `Tous les robots - ${activeAgency}`,
          'NB UNITES DEPUIS DEBUT DU MOIS': String(totalUnitsSinceMonthStart),
          ...Object.fromEntries(
            dailyTotals.map((total, i) => {
              const day = (i + 1).toString().padStart(2, '0');
              const dateKey = `${day}/${currentMonthStr}/${currentYear}`;
              return [dateKey, formatNumber(total)];
            })
          )
        };
        //console.log('[Dashboard] loadRobotData(TOUT) - mergedData:', mergedData);

        setRobotDataForBarChart(mergedData);
        setUseChart4All(true);

        // Calculer les totaux mensuels sur le même périmètre filtré
        const calcTotalForMonth = (monthKey: 'N' | 'N-1' | 'N-2' | 'N-3') => {
          const dataset = getReportingData(monthKey);
          return dataset.reduce((acc, e) => {
            const entryId = `${e.AGENCE}_${e['NOM_ROBOT']}`;
            if (robotIdsFiltered.has(entryId)) {
              return acc + (Number(e['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) || 0);
            }
            return acc;
          }, 0);
        };
        const tN = calcTotalForMonth('N');
        const tN1 = calcTotalForMonth('N-1');
        const tN2 = calcTotalForMonth('N-2');
        const tN3 = calcTotalForMonth('N-3');

        setTotalCurrentMonth(tN);
        setTotalPrevMonth1(tN1);
        setTotalPrevMonth2(tN2);
        setTotalPrevMonth3(tN3);

        setSelectedRobot(currentRobot);
      } else {
        // ***************** Préparation des données pour Chart.tsx ************************
        setUseChart4All(false);
        const tpsParUnit = selectedRobotData?.temps_par_unite === '0' ? '0' : selectedRobotData?.temps_par_unite;

        const robotEntry = (() => {
          switch(selectedMonth) {
            case 'N':
              return cachedReportingData.currentMonth.find((entry: ReportingEntry) =>
                `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
            case 'N-1':
              return cachedReportingData.prevMonth1.find((entry: ReportingEntry) =>
                `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
            case 'N-2':
              return cachedReportingData.prevMonth2.find((entry: ReportingEntry) =>
                `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
            case 'N-3':
              return cachedReportingData.prevMonth3.find((entry: ReportingEntry) =>
                `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
            default:
              return cachedReportingData.currentMonth.find((entry: ReportingEntry) =>
                `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
          }
        })();

        if (robotEntry) {
          // Résoudre le libellé d'agence à partir du cache des agences
          const allAgencies = getCachedAllAgencies();
          const resolvedAgenceLbl =
            selectedRobotData?.agenceLbl ||
            allAgencies.find(a => a.codeAgence === selectedRobotData?.agence)?.libelleAgence ||
            selectedRobotData?.agence;

          const processedData = {
            ...robotEntry,
            'NB UNITES DEPUIS DEBUT DU MOIS': tpsParUnit !== '0'
              ? String(Number(robotEntry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']))
              : String(robotEntry['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']), // Correction ici
            ...selectedRobotData,
            agenceLbl: resolvedAgenceLbl
          };
          setRobotData(processedData);
          setRobotDataForBarChart(processedData);
        } else {
          setRobotData(null);
          setRobotDataForBarChart(null);
        }

        const currentMonthData = cachedReportingData.currentMonth.find((entry: ReportingEntry) =>
          `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
        const prevMonth1Data = cachedReportingData.prevMonth1.find((entry: ReportingEntry) =>
          `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
        const prevMonth2Data = cachedReportingData.prevMonth2.find((entry: ReportingEntry) =>
          `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);
        const prevMonth3Data = cachedReportingData.prevMonth3.find((entry: ReportingEntry) =>
          `${entry.AGENCE}_${entry['NOM_ROBOT']}` === `${selectedRobotData?.agence}_${selectedRobotData?.robot}`);

        setTotalCurrentMonth(currentMonthData ? Number(currentMonthData['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
        setTotalPrevMonth1(prevMonth1Data ? Number(prevMonth1Data['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
        setTotalPrevMonth2(prevMonth2Data ? Number(prevMonth2Data['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
        setTotalPrevMonth3(prevMonth3Data ? Number(prevMonth3Data['NB_UNITES_DEPUIS_DEBUT_DU_MOIS']) : 0);
      }
      setSelectedRobot(currentRobot);
    }
  };

  loadRobotData();
}, [selectedRobotData, selectedMonth, robots, selectedAgency]);


    // ------------------------------------------------------------------
    // Gestion du changement d'agence
    // ------------------------------------------------------------------
    const handleAgencyChange = (agencyCode: string) => {
      const agencySelected = agencies.find(a => a.codeAgence === agencyCode);
      console.log('--- AGENCY CHANGE BEGIN ---');
      console.log('Agence choisie:', agencySelected);
    
      if (agencySelected) {
        setSelectedAgency(agencySelected);
    
        // Mettre à jour les robots en fonction de l'agence sélectionnée
        // Les robots seront mis à jour via le callback setUpdateRobotsCallback appelé par AgencySelector
    
        // Au lieu de remettre à null, forcer un "TOUT" contextualisé sur l'agence
        const TOUT_FOR_AGENCY: Robot = {
          ...TOUT_ROBOT,
          agence: agencySelected.codeAgence
        };
        //console.log('[Dashboard] handleAgencyChange - Forcing TOUT Robot for agency:', TOUT_FOR_AGENCY);
        setSelectedRobot(TOUT_FOR_AGENCY);
        setSelectedRobotData(TOUT_FOR_AGENCY);
        // On peut aussi réinitialiser le mois sur 'N' si souhaité (optionnel)
        // setSelectedMonth('N');
      }
    
      console.log('--- AGENCY CHANGE END ---');
    };

    // ------------------------------------------------------------------
    // Gestion du changement de robot
    // ------------------------------------------------------------------
    const handleRobotChange = (robotID: string) => {
      console.log('--- BEGIN ROBOT CHANGE - robotID:', robotID);

      // Cas spécial: retour à "TOUT"
      // - Si l'utilisateur choisit l'option "TOUT" dans le sélecteur robot,
      //   on construit un Robot synthétique contextualisé à l'agence sélectionnée.
      // - L'id_robot attendu pour cohérence interne suit le format "<CODE_AGENCE>_TOUT".
      if (robotID === 'TOUT' || robotID.endsWith('_TOUT')) {
        const activeAgencyCode = selectedAgency?.codeAgence || 'TOUT';
        const TOUT_FOR_AGENCY: Robot = {
          ...TOUT_ROBOT,
          agence: activeAgencyCode,
          id_robot: `${activeAgencyCode}_TOUT`,
        };
        //console.log('[Dashboard] handleRobotChange - Switching to TOUT for agency:', TOUT_FOR_AGENCY);
        setSelectedRobot(TOUT_FOR_AGENCY);
        setSelectedRobotData(TOUT_FOR_AGENCY);
        //console.log('--- END ROBOT CHANGE (TOUT) ---');
        return;
      }

      const robot = robots.find(r => r.id_robot === robotID);
      if (robot && selectedAgency) {
        setSelectedRobot(robot);
        setSelectedRobotData(robot);
      } else {
        console.log('Robot ou agence non trouvé');
      }
      //console.log('--- END ROBOT CHANGE - ', robotID);
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

    const updateService = (filteredRobots: Robot[]) => {
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

    // Si l'utilisateur n'est pas connecté, afficher un message d'erreur
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
                  </svg> {userName}
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
                  <RobotSelector
                    robots={robots}
                    selectedRobotId={selectedRobot?.id_robot || ''}
                    onRobotChange={handleRobotChange}
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
                    {/* Graphique général pour tous les robots */}
                    {robotDataForBarChart?.AGENCE === 'TOUT' ? (
                      <Chart4All
                        selectedMonth={selectedMonth}
                        setSelectedMonth={setSelectedMonth}
                        key={`all-${selectedAgency?.codeAgence || 'TOUT'}-${selectedMonth}-${totalCurrentMonth}-${totalPrevMonth1}-${totalPrevMonth2}-${totalPrevMonth3}`}
                        robotType={selectedRobot?.type_gain}
                        data1={robotDataForBarChart}
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

function setIsFormOpen(arg0: boolean) {
  throw new Error('Function not implemented.');
}
