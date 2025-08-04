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

import {
          fetchReportingData,
          fetchAllServices
        } from './dataFetcher';


// ============================================================
// Interfaces
// ============================================================

/**
 * Interface pour représentant une agence.
 * Entrée : données issues de Firestore.
 * Sortie : un objet Agency avec id, nom et libellé (optionnel).
 */
export interface Agency {
  codeAgence: string;
  libelleAgence?: string;
}

/**
 * Interface pour représentant un robot ou programme RPA.
 * Contient des informations telles que le nom, l'identifiant, 
 * l'agence associée, les informations de reporting et d'autres 
 * métadata sur le robot.
 */
export interface Program {
  clef: string;
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
  // Les champs suivants n'existent pas dans Barem_Reporting, mais sont utilisés ailleurs.
  // Je les garde pour éviter des erreurs de compilation, mais ils pourraient être `undefined`.
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
    // Récupérer toutes les agences puis filtrer
    const response = await fetch('/api/sql?table=AgencesV2');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const tout: Agency = { codeAgence: 'TOUT', libelleAgence: 'Toutes les agences' };
    cachedAllAgencies = data.map((agency: any) => ({
      codeAgence: agency.CODE_AGENCE,
      libelleAgence: agency.LIBELLE_AGENCE
    }));
    // Trier les agences par ordre alphabétique
    cachedAllAgencies.sort((a, b) => (a.codeAgence || '').localeCompare(b.codeAgence || ''));
    cachedAllAgencies = [tout, ...cachedAllAgencies];
  } catch (error) {
    console.log('Erreur lors du chargement de toutes les agences:', error);
    throw error;
  }
}

/**
 * loadAllServices
 * -------------------------------------------------------------------
 * Description :
 *  - Charge tous les services depuis la table "Services" dans SQL Server.
 *  - Met à jour la variable globale cachedServices.
 *
 * Entrée : Aucun
 * Sortie : Promise<void>
 */
export async function loadAllServices(): Promise<void> {
  try {
    const response = await fetch('/api/sql?table=Services');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    cachedServices = data.map((service: any) => service.NOM_SERVICE);
    // Ajouter "TOUT" au début de la liste
    //cachedServices.unshift("TOUT");
    //console.log('Services chargés en cache:', cachedServices);
  } catch (error) {
    console.log('Erreur lors du chargement des services:', error);
    throw error;
  }
}

/**
 * loadAllRobots
 * -------------------------------------------------------------------
 * Description :
 *  - Charge tous les robots depuis la table "Barem_Reporting" dans SQL Server.
 *  - Met à jour la variable globale cachedAllRobots.
 *
 * Entrée : Aucun
 * Sortie : Promise<void>
 */
export async function loadAllRobots(): Promise<void> {
  try {
    const response = await fetch('/api/sql?table=Barem_Reporting');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    cachedRobots = data.map((robot: any) => ({
      clef: robot.CLEF,
      robot: robot.NOM_PROGRAMME,
      agence: robot.AGENCE,
      service: robot.SERVICE,
      description: robot.DESCRIPTION,
      probleme: robot.PROBLEME,
      description_long: robot.DESCRIPTION_LONG,
      resultat: robot.RESULTAT,
      date_maj: robot.DATE_MAJ,
      type_unite: robot.TYPE_UNITE,
      temps_par_unite: robot.TEMPS_PAR_UNITE,
      type_gain: robot.TYPE_GAIN,
      validateur: robot.VALIDATEUR,
      valide_oui_non: robot.VALIDE_OUI_NON,
      id_robot: `${robot.AGENCE}_${robot.NOM_PROGRAMME}`
    }));
    // Ajouter "TOUT" au début de la liste
    cachedRobots.unshift({
      clef: "TOUT",
      robot: "TOUT",
      id_robot: "TOUT",
      agence: "TOUT",
      service: "TOUT",
      description: "Tous les robots",
      probleme: "",
      description_long: "",
      resultat: "",
      date_maj: "",
      type_unite: "unité",
      temps_par_unite: "0",
      type_gain: "unité",
      validateur: "",
      valide_oui_non: ""
    });
    console.log('Robots chargés en cache:', cachedRobots);
  } catch (error) {
    console.log('Erreur lors du chargement des robots:', error);
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
 *  - Retourne les robots associés à une agence spécifique.
 *  - Si l'agence est "TOUT", retourne tous les robots en cache.
 *
 * Entrée :
 *  - agencyId: string - L'identifiant de l'agence.
 * Sortie :
 *  - Program[] - Liste des robots filtrés.
 */
export function getRobotsByAgency(agencyId: string): Program[] {
  if (agencyId === 'TOUT') {
    return cachedRobots4Agencies;
  }
  return cachedRobots4Agencies.filter(robot => robot.agence === agencyId);
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



export async function initializeReportingData(): Promise<void> {
  try {
    // Calculer les 4 derniers mois basés sur la date actuelle
    let currentDate = new Date();

    // Si on est le 1er jour du mois, utiliser le mois précédent
    if (currentDate.getDate() === 1) {
      // Créer une nouvelle date pour le dernier jour du mois précédent
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    }

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
      
      const anneeMois = year * 100 + month;
      months.push(anneeMois);
    }
    
    console.log('Mois à récupérer:', months);
    
    // Faire 4 appels API distincts
    const ReportingDataDe_N = await fetchReportingData(months[0]);
    const ReportingDataDe_N_1 = await fetchReportingData(months[1]);
    const ReportingDataDe_N_2 = await fetchReportingData(months[2]);
    const ReportingDataDe_N_3 = await fetchReportingData(months[3]);

    console.log('(dataStore / initializeReportingData) - Données récupérées:', {
      currentMonth: ReportingDataDe_N,
      prevMonth1: ReportingDataDe_N_1,
      prevMonth2: ReportingDataDe_N_2,
      prevMonth3: ReportingDataDe_N_3
    });
    
    // Utiliser directement les données récupérées
    const currentMonthData = ReportingDataDe_N;
    const prevMonth1Data = ReportingDataDe_N_1;
    const prevMonth2Data = ReportingDataDe_N_2;
    const prevMonth3Data = ReportingDataDe_N_3;
    
    // Générer les labels de mois en français
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    const currentMonthLabel = monthNames[(currentMonth - 1) % 12];
    const prevMonth1Label = monthNames[(currentMonth - 2 + 12) % 12];
    const prevMonth2Label = monthNames[(currentMonth - 3 + 12) % 12];
    const prevMonth3Label = monthNames[(currentMonth - 4 + 12) % 12];
  
    // Mettre à jour le cache
    cachedReportingData = {
      currentMonth: currentMonthData,
      prevMonth1: prevMonth1Data,
      prevMonth2: prevMonth2Data,
      prevMonth3: prevMonth3Data,
      monthLabels: {
        currentMonth: currentMonthLabel,
        prevMonth1: prevMonth1Label,
        prevMonth2: prevMonth2Label,
        prevMonth3: prevMonth3Label
      }
    };

    
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
