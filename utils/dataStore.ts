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
          fetchAllReportingData,
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
    // Récupérer toutes les agences puis filtrer
    const response = await fetch('/api/sql?table=AgencesV2');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    cachedAllAgencies = data.map((agency: any) => ({
      codeAgence: agency.CODE_AGENCE,
      libelleAgence: agency.LIBELLE_AGENCE
    }));
    // Trier les agences par ordre alphabétique
    cachedAllAgencies.sort((a, b) => (a.codeAgence || '').localeCompare(b.codeAgence || ''));
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
export function getRobotsByAgency(_agencyCode: string): Program[] {
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

  if (_agencyCode === 'TOUT') {
    return [toutRobot, ...allRobots];
  } else {
    // On récupère l'agence correspondante dans le cache pour obtenir son nom
    const agency = cachedAgencies.find(a => a.codeAgence === _agencyCode);
    const agencyName = agency ? agency.codeAgence : _agencyCode;
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
export function getRobotsByAgencyAndService(agencyCode: string, service: string): Program[] {
  
  const robot_all: Program = {
    id_robot: 'TOUT',
    robot: 'TOUT',
    agence: 'TOUT',
    type_gain: '0',
    temps_par_unite: '0',
    type_unite: ''
  };

  console.log(`getRobotsByAgencyAndService - agencyCode: ${agencyCode}, service: ${service}`);

  let filteredRobots: Program[] = [];

  if (agencyCode === 'TOUT') {
    // Cas "TOUT": on filtre tous les robots par service
    filteredRobots = getRobotsByService(service);
  } else {
    // Cas d'une agence spécifique: on filtre d'abord par agence, puis par service
    const agency = cachedAgencies.find(a => a.codeAgence === agencyCode);
    if (agency) {
      filteredRobots = cachedRobots4Agencies.filter(robot => robot.agence === agency.codeAgence);
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
      
      const anneeMois = year * 100 + month;
      months.push(anneeMois);
    }
    
    console.log('Mois à récupérer:', months);
    
    // Récupérer toutes les données de reporting
    const allReportingData = await fetchAllReportingData(months);
    console.log('(dataStore / initializeReportingData) - allReportingData:', allReportingData);
    
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
