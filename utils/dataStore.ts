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
// - Robot: Structure complète des robots RPA (nom, agence, métadonnées)
//
// Variables globales:
// - cachedAgencies: Cache des agences accessibles à l'utilisateur
// - cachedRobotsFromTableBaremeReport: Robots filtrés pour l'utilisateur courant
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
 * Interface pour représentant un robot RPA.
 * Contient des informations telles que le nom, l'identifiant, 
 * l'agence associée, les informations de reporting et d'autres 
 * métadata sur le robot.
 */
export interface Robot {
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
// - cachedRobotsFromTableBaremeReport: stocke les robots filtrés pour les agences en cache.
// ------------------------------------------------------------
let cachedAgencies: Agency[] = [];
export let cachedAllAgencies: Agency[] = [];
// Remove duplicate declaration since it's already declared above
export let cachedRobots4Agencies: Robot[] = [];
export let cachedRobotsFromTableBaremeReport: Robot[] = [];
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
    cachedAllAgencies.sort((a, b) => (a.libelleAgence || '').localeCompare(b.libelleAgence || ''));
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
    cachedRobotsFromTableBaremeReport = data.map((robot: any) => ({
      clef: robot.CLEF,
      robot: robot.NOM_ROBOT,
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
      id_robot: `${robot.AGENCE}_${robot.NOM_ROBOT}`
    }));
    // Trier les robots par ordre alphabétique
    // Trier les robots par ordre alphabétique
    cachedRobotsFromTableBaremeReport.sort((a, b) => (a.robot || '').localeCompare(b.robot || ''));

    // Sécurité: s'assurer qu'aucune entrée "TOUT" n'est présente dans les données brutes.
    // L'option "TOUT" est désormais gérée côté UI (RobotSelector).
    cachedRobotsFromTableBaremeReport = cachedRobotsFromTableBaremeReport.filter(
      (r) => (r.robot ?? '').toUpperCase() !== 'TOUT' && (r.id_robot ?? '').toUpperCase() !== 'TOUT'
    );

    console.log('Robots chargés en cache:', cachedRobotsFromTableBaremeReport);
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
let updateRobotsCallback: ((robots: Robot[]) => void) | null = null;

/**
 * updateRobots
 * ------------------------------------------------------------
 * Met à jour les robots dans le composant parent via le callback
 * configuré dans updateRobotsCallback. 
 * Entrée:
 *  - robots: Tableau de Robot à envoyer.
 * Sortie:
 *  - Aucun retour, mais déclenche une mise à jour dans le composant parent.
 */
export function updateRobots(robots: Robot[]): void {
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
 *  - callback: Fonction qui prend un tableau de Robot.
 */
export function setUpdateRobotsCallback(callback: (robots: Robot[]) => void): void {
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
 *  - Robot[] - Liste des robots filtrés.
 */
export function getRobotsByAgency(agencyCode: string): Robot[] {
  if (agencyCode === 'TOUT') {
    return cachedRobots4Agencies;
  }
  return cachedRobots4Agencies.filter(robot => robot.agence === agencyCode);
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
  cachedRobotsFromTableBaremeReport = [];
  cachedServices = [];
  isInitialized = false;
}

// ============================================================
// Gestion du reporting (données de reporting des robots)
// ------------------------------------------------------------
export interface ReportingEntry {
  AGENCE: string;
  'NOM ROBOT': string;
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
    entry['AGENCE'] + '_' + entry['NOM_ROBOT'] === robotId
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

/**
 * isAgencyInReportingData
 * -------------------------------------------------------------------
 * Vérifie si une agence apparaît dans l'une des 4 sous-listes
 * de cachedReportingData (currentMonth, N-1, N-2, N-3).
 * - 'TOUT' est toujours considéré comme présent.
 */
export function isAgencyInReportingData(agencyCode: string): boolean {
  if (!agencyCode) return false;
  if (agencyCode === 'TOUT') return true;

  const allReportingEntries = [
    ...cachedReportingData.currentMonth,
    ...cachedReportingData.prevMonth1,
    ...cachedReportingData.prevMonth2,
    ...cachedReportingData.prevMonth3
  ];

  // NB: Les clés des colonnes peuvent être 'AGENCE' (selon la source).
  return allReportingEntries.some((entry: ReportingEntry) => entry.AGENCE === agencyCode);
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

/**
 * initializeRobots4Agencies
 * -------------------------------------------------------------------
 * Description :
 *  - Initialise cachedRobots4Agencies avec les robots des agences
 *    présentes dans les données de reporting.
 *  - Ne garde que les robots des agences qui apparaissent dans
 *    l'une des 4 sous-listes de cachedReportingData.
 *
 * Entrée : Aucun
 * Sortie : Promise<void>
 */
export async function initializeRobots4Agencies(): Promise<void> {
  try {
    // Obtenir la liste des agences présentes dans les données de reporting
    const allReportingEntries = [
      ...cachedReportingData.currentMonth,
      ...cachedReportingData.prevMonth1,
      ...cachedReportingData.prevMonth2,
      ...cachedReportingData.prevMonth3
    ];

    // Extraire les codes d'agence uniques
    const agencyCodes = new Set<string>();
    allReportingEntries.forEach((entry: ReportingEntry) => {
      if (entry.AGENCE && entry.AGENCE !== 'TOUT') {
        agencyCodes.add(entry.AGENCE);
      }
    });

    console.log('Agences trouvées dans les données de reporting:', Array.from(agencyCodes));

    // Filtrer les robots pour ne garder que ceux des agences présentes dans le reporting
    const filteredRobots = cachedRobotsFromTableBaremeReport.filter(robot => {
      // Si c'est "TOUT", on le garde
      if (robot.agence === 'TOUT') {
        return true;
      }
      
      // Sinon, on vérifie si l'agence est dans notre liste
      return agencyCodes.has(robot.agence);
    });

    // Mettre à jour cachedRobots4Agencies
    cachedRobots4Agencies = [...filteredRobots];
    
    console.log('Robots filtrés pour les agences du reporting:', cachedRobots4Agencies.length);
    console.log('cachedRobots4Agencies initialisé avec succès');
    
    // Notifier les abonnés du changement
    notifyRobotDataListeners();
    
  } catch (error) {
    console.log('Erreur lors de l\'initialisation de cachedRobots4Agencies:', error);
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
