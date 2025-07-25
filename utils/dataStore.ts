// ------------------------------------------------------------
// FILE: utils/dataStore.ts
// ROLE: Gestion centralisée du cache des données et coordination des opérations Firestore
//
// Ce module est le coeur de la gestion des données pour le dashboard RPA BBL. Il :
// 1. Initialise et maintient un cache des données Firestore (agences, robots, reporting)
// 2. Fournit des fonctions de filtrage avancé par agence/service
// 3. Gère les callbacks pour la mise à jour des composants UI
// 4. Effectue les calculs de reporting (temps gagné, etc.)
//
// Interfaces clés:
// - Agency: Structure des données d'agence (id, nom, libellé)
// - Program: Structure complète des robots RPA (nom, agence, métadonnées)
//
// Variables globales:
// - cachedAgencies: Cache des agences accessibles à l'utilisateur
// - cachedRobots: Robots filtrés pour l'utilisateur courant
// - cachedReportingData: Données de reporting calculées
// ------------------------------------------------------------

import { fetchAgenciesByIds, fetchUser, fetchAllRobotsAndBaremes, fetchAllReportingData, fetchAllServices, fetchUserAgencies } from './dataFetcher';


// ============================================================
// Interfaces
// ============================================================

/**
 * Interface pour représentant une agence.
 * Entrée : données issues de Firestore.
 * Sortie : un objet Agency avec id, nom et libellé (optionnel).
 */
export interface Agency {
  idAgence: string;
  nomAgence: string;
  libelleAgence?: string;
}

/**
 * Interface pour représentant un robot ou programme RPA.
 * Contient des informations telles que le nom, l'identifiant, 
 * l'agence associée, les informations de reporting et d'autres 
 * métadata sur le robot.
 */
export interface Program {
  robot: string;
  id_robot: string;
  agence: string;
  agenceLbl?: string;
  description?: string;
  date_maj?: string;
  type_unite: string;
  temps_par_unite: string;
  type_gain: string;
  validateur?: string;
  valide_oui_non?: string;
  service?: string;
  probleme?: string;
  description_long?: string;
  resultat?: string;
  currentMonth?: string;
  previousMonth?: string;
  name?: string;
  typeDemande?: string;
  status?: string;
}

// ============================================================
// Variables globales pour le cache
// ------------------------------------------------------------
// - cachedAgencies: stocke la liste des agences récupérées afin d'éviter 
//   des appels multiples à Firestore pour ces données.
// - cachedAllRobots: stocke l'intégralité des robots récupérés depuis la collection 
//   "robots_et_baremes".
// - cachedRobots: stocke les robots filtrés pour les agences en cache.
// ------------------------------------------------------------
let cachedAgencies: Agency[] = [];
export let cachedAllAgencies: Agency[] = [];
// Remove duplicate declaration since it's already declared above
export let cachedRobots4Agencies: Program[] = [];
export let cachedRobots: Program[] = [];
export let cachedServices: string[] = [];

/**
 * loadAllAgencies
 * -------------------------------------------------------------------
 * Description :
 *  - Charge toutes les agences depuis la collection "agences" dans Firestore.
 *  - Met à jour la variable globale cachedAllAgencies.
 * 
 * Entrée : Aucun
 * Sortie : Promise<void>
 */
export async function loadAllAgencies(): Promise<void> {
  try {
    const data = await fetchAgenciesByIds([]); // Fetch all agencies
    cachedAllAgencies = data.map((agency: any) => ({
      idAgence: agency.ID_AGENCE,
      nomAgence: agency.NOM_AGENCE,
      libelleAgence: agency.LIBELLE_AGENCE
    }));
    // Trier les agences par ordre alphabétique
    cachedAllAgencies.sort((a, b) => (a.nomAgence || '').localeCompare(b.nomAgence || ''));
  } catch (error) {
    console.log('Erreur lors du chargement de toutes les agences:', error);
    throw error;
  }
}

// ============================================================
// Callback pour la mise à jour des robots
// ------------------------------------------------------------
// Ce callback permet au composant parent d'être informé dès que 
// la liste des robots est mise à jour dans le cache.
// ------------------------------------------------------------
let updateRobotsCallback: ((robots: Program[]) => void) | null = null;

/**
 * updateRobots
 * ------------------------------------------------------------
 * Met à jour les robots dans le composant parent via le callback
 * configuré dans updateRobotsCallback. 
 * Entrée:
 *  - robots: Tableau de Program à envoyer.
 * Sortie:
 *  - Aucun retour, mais déclenche une mise à jour dans le composant parent.
 */
export function updateRobots(robots: Program[]): void {
  if (updateRobotsCallback) {
    updateRobotsCallback(robots);
  }
}

/**
 * setUpdateRobotsCallback
 * ------------------------------------------------------------
 * Définit le callback qui sera utilisé pour notifier la mise à jour
 * de la liste des robots.
 * Entrée:
 *  - callback: Fonction qui prend un tableau de Program.
 */
export function setUpdateRobotsCallback(callback: (robots: Program[]) => void): void {
  updateRobotsCallback = callback;
}

// ============================================================
// Pub/Sub for cachedRobots4Agencies updates
// ============================================================
let robotDataListeners: (() => void)[] = [];

export function subscribeToRobotData(callback: () => void) {
  robotDataListeners.push(callback);
}

export function unsubscribeFromRobotData(callback: () => void) {
  robotDataListeners = robotDataListeners.filter(listener => listener !== callback);
}

function notifyRobotDataListeners() {
  robotDataListeners.forEach(listener => listener());
}

// ============================================================
// Variables pour contrôler l'initialisation et la première connexion
// ------------------------------------------------------------
let isInitialized = false;
let isFirstLogin = true;

// ============================================================
// Fonction d'initialisation des données
// ------------------------------------------------------------
/**
 * initializeData
 * -------------------------------------------------------------------
 * Description : 
 *  - Initialise le cache avec les données de l'utilisateur, des agences 
 *    et des robots. Elle récupère d'abord les données utilisateur via fetchUserData.
 *  - Charge ensuite les agences associées à l'utilisateur (loadUserAgencies) 
 *    sauf pour le cas spécial de l'admin (userId === '0').
 *  - Puis charge tous les robots pour ces agences (loadAllRobotsForAgencies).
 * 
 * Entrée : 
 *  - userId (string): Identifiant de l'utilisateur.
 * Sortie : 
 *  - Promise<void> : La fonction met à jour des variables globales en cache.
 * Remarques :
 *  - Si les données ont déjà été initialisées (isInitialized === true), 
 *    la fonction retourne immédiatement pour éviter des appels inutiles.
 */
export async function initializeData(userId: string): Promise<void> {
  if (isInitialized) return;

  try {
    // 1. Récupération des données de l'utilisateur
    const userData = await fetchUserData(userId);
    if (!userData) {
      throw new Error('Utilisateur non trouvé');
    }
    //console.log('(dataStore - initializeData) Données utilisateur:', userData);

    // 2. Chargement des agences
    if (userId === '0') {
      // Cas spécial pour l'admin : charger toutes les agences
      await loadAllAgencies();
      //console.log('(dataStore - initializeData) Toutes les Agences chargées');
    } else {
      // Cas normal : charger les agences liées à l'utilisateur
      await loadUserAgencies(userData.userAgenceIds);
      //console.log('## (dataStore - initializeData) Chargement des agences utilisateur', userData.userAgenceIds);
      //console.log('## (dataStore - initializeData) Agences chargées', cachedAgencies);
    }

    // 3. Chargement de tous les robots pour ces agences
    await loadAllRobotsForAgencies();
    //console.log('$$(dataStore - loadAllRobotsForAgencies) cachedRobots ', cachedRobots);

    // Marquer l'initialisation comme terminée
    isInitialized = true;
  } catch (error) {
    console.log('Erreur lors de l\'initialisation des données:', error);
    throw error;
  }
}

// ============================================================
// Fonction interne : fetchUserData
// ------------------------------------------------------------
/**
 * fetchUserData
 * -------------------------------------------------------------------
 * Description :
 *  - Récupère les données d'un utilisateur depuis la collection "utilisateurs".
 *  - Utilise une requête pour filtrer par userId.
 * 
 * Entrée :
 *  - userId (string): L'identifiant de l'utilisateur.
 * Sortie :
 *  - Un objet contenant userId, userName, et un tableau userAgenceIds lorsqu'un utilisateur est trouvé,
 *    sinon null.
 */
async function fetchUserData(userId: string) {
  try {
    const userData = await fetchUser(userId);
    if (!userData) {
      return null;
    }
    return {
      userId: userData.userId,
      userName: userData.userName,
      userEmail: userData.userEmail,
      userSuperieur: userData.userSuperieur,
      userValidateur: userData.userValidateur,
      userAgenceIds: userData.userAgenceIds
    };
  } catch (error) {
    console.log('Erreur lors de la récupération des données utilisateur:', error);
    throw error;
  }
}

// ============================================================
// Fonction interne : loadUserAgencies
// ------------------------------------------------------------
/**
 * loadUserAgencies
 * -------------------------------------------------------------------
 * Description :
 *  - Charge les agences pour un utilisateur à partir d'un tableau de noms d'agences.
 *  - Commence par réinitialiser le cache des agences et ajoute une agence spéciale "TOUT".
 *  - Pour chaque nom d'agence (autre que "-"), effectue une requête Firestore afin 
 *    de récupérer les données correspondantes et les ajoute au cache s'il n'existe pas déjà.
 * 
 * Entrée :
 *  - agencyNames (string[]): Tableau des noms d'agences associées à l'utilisateur.
 * Sortie :
 *  - Promise<void> : Met à jour la variable globale cachedAgencies.
 */
async function loadUserAgencies(agencyIds: string[]): Promise<void> {
  try {
    cachedAgencies = [];
    // Ajout de l'agence "TOUT" par défaut
    cachedAgencies.push({
      idAgence: '99',
      nomAgence: 'TOUT',
      libelleAgence: 'TOUT'
    });

    const fetchedAgencies = await fetchUserAgencies(agencyIds);
    fetchedAgencies.forEach((agencyData: any) => {
      // Vérifie que l'agence n'est pas déjà présente dans le cache
      if (!cachedAgencies.find(a => a.idAgence === agencyData.ID_AGENCE)) {
        cachedAgencies.push({
          idAgence: agencyData.ID_AGENCE,
          nomAgence: agencyData.NOM_AGENCE,
          libelleAgence: agencyData.LIBELLE_AGENCE
        });
      }
    });

    // Trier les agences par ordre alphabétique (sauf "TOUT" qui reste en premier)
    cachedAgencies.sort((a, b) => {
      if (a.nomAgence === 'TOUT') return -1;
      if (b.nomAgence === 'TOUT') return 1;
      return (a.nomAgence || '').localeCompare(b.nomAgence || '');
    });
  } catch (error) {
    console.log('Erreur lors du chargement des agences utilisateur:', error);
    throw error;
  }
}

// ============================================================
// Fonction : loadAllRobots
// ------------------------------------------------------------
/**
 * loadAllRobots
 * -------------------------------------------------------------------
 * Description :
 *  - Charge tous les robots depuis la collection "robots_et_baremes" dans Firestore.
 *  - Chaque document est transformé en un objet Program avec les propriétés attendues.
 *  - Ensuite, pour chaque robot, on essaie d'associer des données de reporting depuis cachedReportingData.
 *    Si des données de reporting existent, les valeurs currentMonth et previousMonth sont ajoutées.
 * 
 * Entrée :
 *  - Aucun paramètre.
 * Sortie :
 *  - Promise<void> : Met à jour la variable globale cachedAllRobots.
 */
export async function loadAllRobots(): Promise<void> {
  try {
    const data = await fetchAllRobotsAndBaremes();
    cachedRobots4Agencies = data.map((robot: any) => ({
      robot: robot["CLEF"],
      id_robot: robot.AGENCE + "_" + robot["NOM_PROGRAMME"],
      agence: robot.AGENCE,
      agenceLbl: (() => {
        const agency = cachedAllAgencies.find(a => a.nomAgence === robot.AGENCE);
        return agency ? agency.libelleAgence : robot.AGENCE;
      })(),
      description: robot.DESCRIPTION,
      date_maj: robot["DATE_MAJ"],
      type_unite: robot["TYPE_UNITE"],
      temps_par_unite: (robot["TEMPS_PAR_UNITE"]?.toString() || '0').replace(',', '.'),
      type_gain: (robot["TYPE_GAIN"]?.toString() || '0').replace(' (mn)', '').toLowerCase(),
      validateur: robot.VALIDATEUR,
      valide_oui_non: robot["VALIDE_OUI_NON"],
      service: robot.SERVICE,
      probleme: robot.PROBLEME,
      description_long: robot["DESCRIPTION_LONG"],
      resultat: robot.RESULTAT
    }));
    if (cachedAgencies.length > 0) {
      const userAgencyNames = cachedAgencies.map(agency => agency.nomAgence);
      cachedRobots4Agencies = cachedRobots4Agencies.filter(robot => userAgencyNames.includes(robot.agence));
    }

    // Pour chaque robot, essaye de lier les données de reporting
    // cachedRobots4Agencies = cachedRobots4Agencies.map(robot => {
    //   const reportingData = findInMonthlyData(cachedReportingData,
    //     report => report['AGENCE'] + '_' + report['NOM_PROGRAMME'] === robot.id_robot
    //   );

    //   return robot;
    // });
    console.log('dataStore: loadAllRobots from barème -', cachedRobots4Agencies.length, 'robots chargés');
    console.log('dataStore: loadAllRobots from barème -', cachedRobots4Agencies);

    // Notifier les composants que les données ont été mises à jour
    console.log('dataStore: Notification des listeners -', robotDataListeners.length, 'abonnés');
    notifyRobotDataListeners();

  } catch (error) {
    console.log('Erreur lors du chargement des robots:', error);
    throw error;
  }
}

// ============================================================
// Fonction : loadAllRobotsForAgencies
// ------------------------------------------------------------
/**
 * loadAllRobotsForAgencies
 * -------------------------------------------------------------------
 * Description :
 *  - Charge les robots pour toutes les agences présentes dans le cache (cachedAgencies).
 *  - Exclut l'agence "TOUT". Pour chaque agence, effectue une requête pour récupérer
 *    les robots correspondants dans la collection "robots_et_baremes".
 *  - Agrège les robots dans cachedRobots.
 * 
 * Entrée : Aucun
 * Sortie : Promise<void> — Met à jour cachedRobots.
 */
async function loadAllRobotsForAgencies(): Promise<void> {
  try {
    const agencyNames = cachedAgencies.map(agency => agency.nomAgence);
    cachedRobots = [];
    //console.log('*(dataStore - loadAllRobotsForAgencies) Chargement des ROBOTS des agences :', agencyNames);

    for (const agencyName of agencyNames) {
      // Ignorer l'agence spéciale "TOUT"
      if (agencyName !== 'TOUT') {
        const robots = await fetchAllRobotsAndBaremes(agencyName);
        cachedRobots.push(...robots.map((robot: any) => ({
          robot: robot["NOM_PROGRAMME"],
          id_robot: robot.AGENCE + "_" + robot["NOM_PROGRAMME"],
          agence: robot.AGENCE,
          agenceLbl: (() => {
            const agency = cachedAllAgencies.find(a => a.nomAgence === robot.AGENCE);
            return agency ? agency.libelleAgence : robot.AGENCE;
          })(),
          description: robot.DESCRIPTION,
          date_maj: robot["DATE_MAJ"],
          type_unite: robot["TYPE_UNITE"],
          temps_par_unite: (robot["TEMPS PAR UNITE"]?.toString() || '0').replace(',', '.'),
          type_gain: (robot["TYPE_GAIN"]?.toString() || '0').replace(' (mn)', '').toLowerCase(),
          validateur: robot.VALIDATEUR,
          valide_oui_non: robot["VALIDE_OUI_NON"],
          service: robot.SERVICE,
          probleme: robot.PROBLEME,
          description_long: robot["DESCRIPTION_LONG"],
          resultat: robot.RESULTAT
        })));
      }
    }
  } catch (error) {
    console.log('Erreur lors du chargement des robots:', error);
    throw error;
  }
}

function findInMonthlyData(data: any, predicate: (entry: any) => boolean): any | undefined {
  // This function needs to be implemented or imported if it's from another file
  return undefined;
}

// ============================================================
// Fonctions de récupération dans le cache
// ------------------------------------------------------------
/**
 * getCachedAgencies
 * -------------------------------------------------------------------
 * Retourne le tableau des agences en cache.
 * Entrée : Aucun.
 * Sortie : Agency[] — Liste des agences disponibles.
 */
export function getCachedAgencies(): Agency[] {
  return cachedAgencies;
}

/**
 * getRobotsByAgency
 * -------------------------------------------------------------------
 * Description :
 *  - Filtre les robots en fonction de l'ID d'une agence.
 *  - Si l'agence est "TOUT" (id '99'), retourne tous les robots.
 *  - Sinon, filtre les robots dont l'agence correspond au nom de l'agence trouvée dans le cache.
 *  - Ajoute ensuite un robot "TOUT" en position 0 pour permettre une sélection globale.
 * 
 * Entrée :
 *  - agencyId (string) : Identifiant de l'agence sélectionnée.
 * Sortie :
 *  - Program[] : Liste des robots filtrés, avec "TOUT" inclus.
 */
export function getRobotsByAgency(_agencyId: string): Program[] {
  const toutRobot: Program = {
    id_robot: 'TOUT',
    robot: 'TOUT',
    agence: 'TOUT',
    type_gain: '0',
    temps_par_unite: '0',
    type_unite: ''
  };

  const allRobots = [...cachedRobots4Agencies];
  allRobots.sort((a, b) => (a.robot || '').localeCompare(b.robot || ''));

  if (_agencyId === '99') {
    return [toutRobot, ...allRobots];
  } else {
    // On récupère l'agence correspondante dans le cache pour obtenir son nom
    const agency = cachedAgencies.find(a => a.idAgence === _agencyId);
    const agencyName = agency ? agency.nomAgence : _agencyId;
    const filteredRobots = allRobots.filter(r => r.agence === agencyName);
    return [toutRobot, ...filteredRobots];
  }
}

/**
 * getRobotsByService
 * -------------------------------------------------------------------
 * Description :
 *  - Retourne tous les robots filtrés par service.
 *  - Si le service est "TOUT" ou non spécifié, retourne l'ensemble des robots.
 * 
 * Entrée :
 *  - service (string)
 * Sortie :
 *  - Program[] : Liste des robots filtrés par service.
 */
export function getRobotsByService(service: string): Program[] {
  const sourceRobots = [...cachedRobots4Agencies];

  if (!service || service === 'TOUT') {
    // Trier par ordre alphabétique
    sourceRobots.sort((a, b) => (a.robot || '').localeCompare(b.robot || ''));
    return sourceRobots;
  }
  
  // Filtrer puis trier
  const filteredRobots = sourceRobots.filter(robot =>
    (robot.service ?? '').toLowerCase() === service.toLowerCase()
  );
  
  // Trier par ordre alphabétique
  filteredRobots.sort((a, b) => (a.robot || '').localeCompare(b.robot || ''));
  
  return filteredRobots;
}

/**
 * getRobotsByAgencyAndService
 * -------------------------------------------------------------------
 * Description :
 *  - Retourne les robots filtrés par agence et service.
 * 
 * Entrée :
 *  - agencyId (string): Identifiant de l'agence.
 *  - service (string): Nom du service.
 * Sortie :
 *  - Program[]: Liste des robots filtrés.
 */
export function getRobotsByAgencyAndService(agencyId: string, service: string): Program[] {
  
  const robot_all: Program = {
    id_robot: 'TOUT',
    robot: 'TOUT',
    agence: 'TOUT',
    type_gain: '0',
    temps_par_unite: '0',
    type_unite: ''
  };

  console.log(`getRobotsByAgencyAndService - agencyId: ${agencyId}, service: ${service}`);
  
  let filteredRobots: Program[] = [];

  if (agencyId === '99') {
    // Cas "TOUT": on filtre tous les robots par service
    filteredRobots = getRobotsByService(service);
  } else {
    // Cas d'une agence spécifique: on filtre d'abord par agence, puis par service
    const agency = cachedAgencies.find(a => a.idAgence === agencyId);
    if (agency) {
      filteredRobots = cachedRobots4Agencies.filter(robot => robot.agence === agency.nomAgence);
      if (service && service !== 'TOUT') {
        filteredRobots = filteredRobots.filter(robot => (robot.service ?? '').toLowerCase() === service.toLowerCase());
      }
    }
  }

  // Trier les robots par ordre alphabétique
  filteredRobots.sort((a, b) => (a.robot || '').localeCompare(b.robot || ''));
  
  // Ajouter le robot "TOUT" en premier
  return [robot_all, ...filteredRobots];
}

/**
 * updateService
 * ------------------------------------------------------------
 * Met à jour le service des robots dans le cache.
 * Entrée:
 *  - robots: Tableau de Program à envoyer.
 * Sortie:
 *  - string[]: Tableau des services mis à jour.
 */
export function updateService(robots: Program[]): string[] {
  const updatedServices: string[] = [];
  robots.forEach(robot => {
    if (robot.service) {
      updatedServices.push(robot.service);
    }
  });
  return updatedServices;
}


// ============================================================
// Vérification et réinitialisation de l'initialisation
// ------------------------------------------------------------
/**
 * isDataInitialized
 * -------------------------------------------------------------------
 * Description :
 *  - Retourne true si les données ont déjà été initialisées, false sinon.
 * 
 * Entrée : Aucun.
 * Sortie :
 *  - boolean
 */
export function isDataInitialized(): boolean {
  return isInitialized;
}

/**
 * resetCache
 * ------------------------------------------------------------
 * Réinitialise le cache des agences et des robots.
 */
export function resetCache(): void {
  cachedAgencies = [];
  cachedAllAgencies = [];
  cachedRobots4Agencies = [];
  cachedRobots = [];
  cachedServices = [];
  isInitialized = false;
}

// ============================================================
// Gestion du reporting (données de reporting des robots)
// ------------------------------------------------------------
export interface ReportingEntry {
  AGENCE: string;
  'NOM PROGRAMME': string;
  'NB UNITES DEPUIS DEBUT DU MOIS': string;
  [key: string]: any;
  monthLabel?: string;
}

interface MonthlyLabels {
  currentMonth: string;
  prevMonth1: string;
  prevMonth2: string;
  prevMonth3: string;
}

interface MonthlyData {
  currentMonth: ReportingEntry[];
  prevMonth1: ReportingEntry[];
  prevMonth2: ReportingEntry[];
  prevMonth3: ReportingEntry[];
  monthLabels: MonthlyLabels;
}

export let cachedReportingData: MonthlyData = {
  currentMonth: [],
  prevMonth1: [],
  prevMonth2: [],
  prevMonth3: [],
  monthLabels: {
    currentMonth: '',
    prevMonth1: '',
    prevMonth2: '',
    prevMonth3: ''
  }
};

export let totalCurrentMonth: number = 0;
export let totalPrevMonth1: number = 0;
export let totalPrevMonth2: number = 0;
export let totalPrevMonth3: number = 0;

export function getReportingDataForRobot(robotId: string, month: string): ReportingEntry | undefined {
  const data = getReportingData(month);
  return data.find((entry: ReportingEntry) =>
    entry['AGENCE'] + '_' + entry['NOM_PROGRAMME'] === robotId
  );
}

export function getReportingData(month: string): ReportingEntry[] {
  switch(month) {
    case 'N': return cachedReportingData.currentMonth;
    case 'N-1': return cachedReportingData.prevMonth1;
    case 'N-2': return cachedReportingData.prevMonth2;
    case 'N-3': return cachedReportingData.prevMonth3;
    default:
      const data = cachedReportingData.currentMonth;
      console.log(`[dataStore] getReportingData - Month: ${month}, Data:`, data);
      return data;
  }
}


export function getTotalCurrentMonth(): number {
  return totalCurrentMonth;
}

export function getTotalPrevMonth1(): number {
  return totalPrevMonth1;
}

export function getTotalPrevMonth2(): number {
  return totalPrevMonth2;
}

export function getTotalPrevMonth3(): number {
  return totalPrevMonth3;
}

export function getRobotTotalCurrentMonth(robotId: string): number {
  // Implémentation à ajouter
  return 0;
}

export function getRobotTotalPrevMonth1(robotId: string): number {
  // Implémentation à ajouter
  return 0;
}

export function getRobotTotalPrevMonth2(robotId: string): number {
  // Implémentation à ajouter
  return 0;
}

export function getRobotTotalPrevMonth3(robotId: string): number {
  // Implémentation à ajouter
  return 0;
}

function calculateMonthlyTotal(data: ReportingEntry[]): number {
  let total = 0;
  data.forEach(entry => {
    const nbUnites = Number(entry['NB UNITES DEPUIS DEBUT DU MOIS']) || 0;
    total += nbUnites;
  });
  return total;
}

export async function initializeReportingData(): Promise<void> {
  try {
    // Calculer les 4 derniers mois basés sur la date actuelle
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() retourne 0-11
    
    // Calculer les mois N, N-1, N-2, N-3
    const months: number[] = [];
    for (let i = 0; i < 4; i++) {
      let year = currentYear;
      let month = currentMonth - i;
      
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      const anneMois = year * 100 + month;
      months.push(anneMois);
    }
    
    //console.log('Mois à récupérer:', months);
    
    // Récupérer toutes les données de reporting
    const allReportingData = await fetchAllReportingData();
    
    // Filtrer les données par mois
    const currentMonthData = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[0]);
    const prevMonth1Data = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[1]);
    const prevMonth2Data = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[2]);
    const prevMonth3Data = allReportingData.filter((entry: any) => entry.ANNEE_MOIS === months[3]);
    
    // Générer les labels de mois en français
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    const currentMonthLabel = monthNames[(currentMonth - 1) % 12];
    const prevMonth1Label = monthNames[(currentMonth - 2 + 12) % 12];
    const prevMonth2Label = monthNames[(currentMonth - 3 + 12) % 12];
    const prevMonth3Label = monthNames[(currentMonth - 4 + 12) % 12];
    
    // Mapper les données au format attendu
    const mapReportingData = (data: any[]): ReportingEntry[] => {
      return data.map((entry: any) => ({
        AGENCE: entry.AGENCE,
        'NOM PROGRAMME': entry.NOM_PROGRAMME,
        'NB UNITES DEPUIS DEBUT DU MOIS': entry.NB_UNITES_DEPUIS_DEBUT_DU_MOIS?.toString() || '0',
        ...entry // Inclure toutes les autres propriétés (dates formatées, etc.)
      }));
    };
    
    // Mettre à jour le cache
    cachedReportingData = {
      currentMonth: mapReportingData(currentMonthData),
      prevMonth1: mapReportingData(prevMonth1Data),
      prevMonth2: mapReportingData(prevMonth2Data),
      prevMonth3: mapReportingData(prevMonth3Data),
      monthLabels: {
        currentMonth: currentMonthLabel,
        prevMonth1: prevMonth1Label,
        prevMonth2: prevMonth2Label,
        prevMonth3: prevMonth3Label
      }
    };
    console.log('(dataStore / initializeReportingData) - cachedReportingData.currentMonth:', cachedReportingData.currentMonth.length);
    console.log('(dataStore / initializeReportingData) - cachedReportingData.prevMonth1:', cachedReportingData.prevMonth1);
    console.log('(dataStore / initializeReportingData) - cachedReportingData.prevMonth2:', cachedReportingData.prevMonth2);
    console.log('(dataStore / initializeReportingData) - cachedReportingData.prevMonth3:', cachedReportingData.prevMonth3);
    
    // Calculer les totaux mensuels globaux
    totalCurrentMonth = calculateMonthlyTotal(cachedReportingData.currentMonth);
    totalPrevMonth1 = calculateMonthlyTotal(cachedReportingData.prevMonth1);
    totalPrevMonth2 = calculateMonthlyTotal(cachedReportingData.prevMonth2);
    totalPrevMonth3 = calculateMonthlyTotal(cachedReportingData.prevMonth3);
    
    console.log('(dataStore / initializeReportingData) Totaux', {
      currentMonth: cachedReportingData.currentMonth.length,
      prevMonth1: cachedReportingData.prevMonth1.length,
      prevMonth2: cachedReportingData.prevMonth2.length,
      prevMonth3: cachedReportingData.prevMonth3.length,
      totals: { totalCurrentMonth, totalPrevMonth1, totalPrevMonth2, totalPrevMonth3 }
    });
    
  } catch (error) {
    console.log('Erreur lors de l\'initialisation des données de reporting:', error);
    throw error;
  }
}

// function createMergedData(doc: any, monthLabel: string): MergedData {
//   // Implémentation à ajouter
//   return {} as MergedData;
// }

interface MergedData {
  [key: string]: any;
}


export function getMonthLabelCurrentMonth(): string {
  return cachedReportingData.monthLabels.currentMonth;
}

export function getMonthLabelPrevMonth1(): string {
  return cachedReportingData.monthLabels.prevMonth1;
}

export function getMonthLabelPrevMonth2(): string {
  return cachedReportingData.monthLabels.prevMonth2;
}

export function getMonthLabelPrevMonth3(): string {
  return cachedReportingData.monthLabels.prevMonth3;
}

export function getCachedAllAgencies(): Agency[] {
  return cachedAllAgencies;
}


// ============================================================
// Gestion de la première connexion
// ------------------------------------------------------------
/**
 * isFirstLoginSession
 * -------------------------------------------------------------------
 * Description :
 *  - Retourne true si c'est la première session de l'utilisateur,
 *    sinon false.
 */
export function isFirstLoginSession(): boolean {
  return isFirstLogin;
}

/**
 * updateFirstLoginStatus
 * -------------------------------------------------------------------
 * Description :
 *  - Permet de mettre à jour l'état indiquant que l'utilisateur 
 *    n'est plus en première connexion.
 */
export function updateFirstLoginStatus(): void {
  isFirstLogin = false;
}
