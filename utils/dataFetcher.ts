import { Robot } from './dataStore';

// ------------------------------------------------------------
// ROLE: Service de récupération des données SQL Server via API
//
// Ce module fournit des fonctions spécifiques pour:
// 1. Récupérer des entités individuelles (agences, utilisateurs, citations)
// 2. Effectuer des requêtes filtrées (par Robot, statut, etc.)
// 3. Transformer les données brutes en structures typées
//
// Différences avec dataStore.ts:
// - Pas de gestion de cache (seulement des requêtes directes)
// - Pas de calculs complexes (uniquement la récupération)
// - Pas de callbacks UI (retourne des Promises)
// ------------------------------------------------------------

export let allRobotsByAgency: Robot[] = [];

interface UserData {
  userId: string;
  userName: string;
  userSuperieur: string;
  userValidateur: string;
  userAgenceIds: string[];
  userEmail: string;
  userService: string;
}

interface Agency {
  codeAgence: string;
  libelleAgence?: string;
}

/**
 * fetchAgenciesByIds - Récupère les agences correspondant aux IDs fournis via l'API.
 * @param agencyCode string[] - Liste des IDs d'agences à récupérer
 * @returns Promise<Agency[]> - Tableau des agences trouvées
 */
// export async function fetchAgenciesByIds(agencyCode: string[]): Promise<Agency[]> {
// //TODO: récupérer le 'libelleAgence' à partir du 'codeAgence' de 'cachedAllAgencies'

// }


interface Evolution {
  Robot: string;
  statut: number;
  [key: string]: any;
}

/**
 * fetchAllEvolutions - Récupère et traite tous les documents d'évolution via l'API.
 * @returns Promise<Evolution[]> - Tableau des évolutions filtrées
 */
export async function fetchAllEvolutions(): Promise<Evolution[]> {
  //console.log('fetchAllEvolutions');
  try {
    // Appel de l'API centrale (utiliser le nom de table tel que whitelisté côté serveur)
    const response = await fetch('/api/sql?table=Evolutions');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Normaliser et mapper les colonnes SQL vers les clés attendues par les composants
    const results = data.map((doc: any) => {
      const rawDateStr = doc.DATE_MAJ ? String(doc.DATE_MAJ) : null;
      return {
        id: doc.ID,
        Intitulé: doc.INTITULE || doc.INTITULÉ || '',
        Description: doc.DESCRIPTION || '',
        Robot: doc.ROBOT || '',
        Statut: (doc.STATUT !== undefined && doc.STATUT !== null) ? String(doc.STATUT) : '1',
        Nb_operations_mensuelles: doc.NB_OPERATIONS_MENSUELLES ?? '',
        Temps_consommé: doc.TEMPS_CONSOMME ?? '',
        Date: rawDateStr || (doc.DATE_MAJ ? String(doc.DATE_MAJ) : ''),
        DATE_MAJ_RAW: rawDateStr, // champ interne (string) pour tri/diagnostic
        ...doc
      };
    });

    // Fonction utilitaire de parsing sécurisé pour tri (supporte DD/MM/YYYY et autres formats)
    const getTimestamp = (s: string | null) => {
      if (!s) return 0;
      const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
      if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        const year = parseInt(dmy[3], 10);
        return new Date(year, month, day).getTime();
      }
      const t = Date.parse(s);
      return isNaN(t) ? 0 : t;
    };

    // Trier par date descendante (les plus récentes en premier) en utilisant parsing sécurisé
    results.sort((a: any, b: any) => {
      const da = getTimestamp(a.DATE_MAJ_RAW);
      const db = getTimestamp(b.DATE_MAJ_RAW);
      return db - da;
    });

    return results;
  } catch (error) {
    console.log('Error fetching evolutions:', error);
    return [];
  }
}

/**
 * Fetches evolution documents for a given robot name via the API.
 * @param robotId The name of the robot to fetch evolutions for.
 * @returns A Promise that resolves to an array of evolution documents.
 */
export async function fetchEvolutionsByRobot(robotId: string, selectedMonth: string = 'N'): Promise<Evolution[]> {
  console.log(`fetchEvolutionsByRobot for ${robotId} and month ${selectedMonth}`);
  try {
    // robotId peut être le nom du robot ou la clé composite AGENCE_NOM (selon usage)
    const encodedRobot = encodeURIComponent(robotId);
    const url = `/api/sql?table=Evolutions&robot=${encodedRobot}&selectedMonth=${encodeURIComponent(selectedMonth)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const results = data.map((doc: any) => {
      const rawDateStr = doc.DATE_MAJ ? String(doc.DATE_MAJ) : null;
      return {
        id: doc.ID,
        Intitulé: doc.INTITULE || '',
        Description: doc.DESCRIPTION || '',
        Robot: doc.ROBOT || '',
        Statut: (doc.STATUT !== undefined && doc.STATUT !== null) ? String(doc.STATUT) : '1',
        Nb_operations_mensuelles: doc.NB_OPERATIONS_MENSUELLES ?? '',
        Temps_consommé: doc.TEMPS_CONSOMME ?? '',
        Date: rawDateStr || (doc.DATE_MAJ ? String(doc.DATE_MAJ) : ''),
        DATE_MAJ_RAW: rawDateStr,
        ...doc
      };
    });

    const getTimestamp = (s: string | null) => {
      if (!s) return 0;
      const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
      if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        const year = parseInt(dmy[3], 10);
        return new Date(year, month, day).getTime();
      }
      const t = Date.parse(s);
      return isNaN(t) ? 0 : t;
    };

    // Trier par date descendante
    results.sort((a: any, b: any) => {
      const da = getTimestamp(a.DATE_MAJ_RAW);
      const db = getTimestamp(b.DATE_MAJ_RAW);
      return db - da;
    });

    return results;
  } catch (error) {
    console.log('Error fetching evolutions by Robot:', error);
    return [];
  }
}

/**
 * Fetches evolution documents for a given agency via the API.
 * Returns all evolutions for robots associated with the agency.
 * @param agency The agency code to fetch evolutions for.
 */
export async function fetchEvolutionsByAgency(agency: string, selectedMonth: string = 'N'): Promise<Evolution[]> {
  //console.log(`fetchEvolutionsByAgency for ${agency} and month ${selectedMonth}`);
  try {
    const encodedAgency = encodeURIComponent(agency);
    const url = `/api/sql?table=Evolutions&agency=${encodedAgency}&selectedMonth=${encodeURIComponent(selectedMonth)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const results = data.map((doc: any) => {
      const rawDateStr = doc.DATE_MAJ ? String(doc.DATE_MAJ) : null;
      return {
        id: doc.ID,
        Intitulé: doc.INTITULE || '',
        Description: doc.DESCRIPTION || '',
        Robot: doc.ROBOT || '',
        Statut: (doc.STATUT !== undefined && doc.STATUT !== null) ? String(doc.STATUT) : '1',
        Nb_operations_mensuelles: doc.NB_OPERATIONS_MENSUELLES ?? '',
        Temps_consommé: doc.TEMPS_CONSOMME ?? '',
        Date: rawDateStr || (doc.DATE_MAJ ? String(doc.DATE_MAJ) : ''),
        DATE_MAJ_RAW: rawDateStr,
        ...doc
      };
    });

    const getTimestamp = (s: string | null) => {
      if (!s) return 0;
      const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
      if (dmy) {
        const day = parseInt(dmy[1], 10);
        const month = parseInt(dmy[2], 10) - 1;
        const year = parseInt(dmy[3], 10);
        return new Date(year, month, day).getTime();
      }
      const t = Date.parse(s);
      return isNaN(t) ? 0 : t;
    };

    // Trier par date descendante
    results.sort((a: any, b: any) => {
      const da = getTimestamp(a.DATE_MAJ_RAW);
      const db = getTimestamp(b.DATE_MAJ_RAW);
      return db - da;
    });

    return results;
  } catch (error) {
    console.log('Error fetching evolutions by Agency:', error);
    return [];
  }
}

export interface Quote {
  id: string;
  citation: string;
  auteur: string;
}

/**
 * Fetches a random quote via the API.
 * @returns A Promise that resolves to a random Quote object, or null if no quote is available.
 */
export async function fetchRandomQuote(): Promise<Quote | null> {
  try {
    const response = await fetch('/api/sql?table=Citations');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Fetched random quote:', data);
    return data;
  } catch (error) {
    console.log('Error fetching random quote:', error);
    return null;
  }
}

/**
 * fetchStatuts - Récupère tous les statuts via l'API.
 * @returns Promise<Array<{numero: number, label: string}>>
 */
export async function fetchStatuts() {
  try {
    const response = await fetch('/api/sql?table=Statuts');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Error fetching statuts:', error);
    return [];
  }
}

export const formatNumber = (num: number) => {
  if (Number.isInteger(num)) {
    return num.toString();
  } else {
    const [entier, decimal] = num.toFixed(2).split('.');
    const minutes = Math.round(Number(decimal) * 0.6);
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${entier}`;
  }
};


/**
 * Fetches reporting data for a specific agency via the API.
 * @param agence The name of the agency to fetch data for.
 * @returns A Promise that resolves to an array of reporting data objects.
 */
export async function fetchDataReportingByAgency(agence: string) {
  try {
    const response = await fetch(`/api/sql?table=Reporting&agency=${agence}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Error fetching reporting data:', error);
    return [];
  }
}


/**
 * Fetches reporting data for multiple months via the API using a single query.
 * @param months Array of month identifiers (e.g., numbers representing YYYYMM).
 * @returns A Promise that resolves to an array of reporting data objects.
 */
export async function fetchReportingData(month: number): Promise<any[]> {
  //console.log('Fetching reporting data for month:', month);
  try {
    const url = `/api/sql?table=Reporting&Clef=&AnneeMois=${month}`;
    //console.log('Constructed URL for reporting data:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    //console.log('(dataFetcher / fetchAllReportingData) Retrieve reporting '+month+':', data);
    return data;
  } catch (error) {
    console.log('Error fetching all reporting data:', error);
    return [];
  }
}
/**
 * Fetches all services via the API.
 * @returns A Promise that resolves to an array of service objects with id and name properties.
 */
export async function fetchAllServices(): Promise<{ id: string; name: string }[]> {
  try {
    const response = await fetch('/api/sql?table=services');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Retrieve services (dataFetcher / fetchAllServices)', data);
    return data;
  } catch (error) {
    console.log('Error fetching services:', error);
    return [];
  }
}

