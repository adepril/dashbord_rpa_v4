import { Program } from './dataStore';

// ------------------------------------------------------------
// ROLE: Service de récupération des données SQL Server via API
//
// Ce module fournit des fonctions spécifiques pour:
// 1. Récupérer des entités individuelles (agences, utilisateurs, citations)
// 2. Effectuer des requêtes filtrées (par programme, statut, etc.)
// 3. Transformer les données brutes en structures typées
//
// Différences avec dataStore.ts:
// - Pas de gestion de cache (seulement des requêtes directes)
// - Pas de calculs complexes (uniquement la récupération)
// - Pas de callbacks UI (retourne des Promises)
// ------------------------------------------------------------

export let allRobotsByAgency: Program[] = [];

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
  idAgence: string;
  nomAgence: string;
  libelleAgence?: string;
}

/**
 * fetchAgenciesByIds - Récupère les agences correspondant aux IDs fournis via l'API.
 * @param agencyIds string[] - Liste des IDs d'agences à récupérer
 * @returns Promise<Agency[]> - Tableau des agences trouvées
 */
export async function fetchAgenciesByIds(agencyIds: string[]): Promise<Agency[]> {
  console.log('Retrieve agencies for IDs:', agencyIds);
  try {
    // Récupérer toutes les agences puis filtrer
    const response = await fetch('/api/sql/data?table=Agences');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const allAgencies = await response.json();
    
    // Si aucun ID n'est fourni, retourner toutes les agences
    if (!agencyIds || agencyIds.length === 0) {
      return allAgencies;
    }
    
    // Filtrer les agences qui correspondent aux IDs fournis
    const filteredAgencies = allAgencies.filter((agency: any) => 
      agencyIds.includes(agency.NOM_AGENCE)
    );
    
    return filteredAgencies;
  } catch (error) {
    console.log('Error fetching agencies:', error);
    return [];
  }
}

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
  console.log('fetchAllEvolutions');
  try {
    const response = await fetch('/api/sql/data?table=evolutions');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Transformation des données en format attendu
    const results = data.map((doc: any) => ({
      id: doc.ID,
      Robot: doc.ROBOT, // Ensure Robot property is present
      statut: doc.STATUT || 1,
      'Date de la demande': doc.DATE_MAJ ? new Date(doc.DATE_MAJ).toLocaleDateString('fr-FR') : '',
      ...doc
    }));

    // Filtrage des résultats (ex: 5 plus récents par robot)
    const filteredResults: Evolution[] = [];
    const robots = new Set(results.map((item: Evolution) => item.Robot));

    robots.forEach(robot => {
      const robotEvolutions = results.filter((evo: Evolution) => evo.Robot === robot);
      const latestEvolutions = robotEvolutions.slice(-5); // Garder les 5 dernières évolutions
      filteredResults.push(...latestEvolutions);
    });

    return filteredResults;
  } catch (error) {
    console.log('Error fetching evolutions:', error);
    return [];
  }
}

/**
 * Fetches evolution documents for a given program name via the API.
 * @param programId The name of the program to fetch evolutions for.
 * @returns A Promise that resolves to an array of evolution documents.
 */
export async function fetchEvolutionsByProgram(programId: string, selectedMonth: string = 'N'): Promise<Evolution[]> {
  console.log(`fetchEvolutionsByProgram for ${programId} and month ${selectedMonth}`);
  try {
    const response = await fetch(`/api/sql/data?table=evolutions&programId=${programId}&selectedMonth=${selectedMonth}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.map((doc: any) => ({
      id: doc.ID,
      Robot: doc.ROBOT,
      statut: doc.STATUT || 1,
      'Date de la demande': doc.DATE_MAJ ? new Date(doc.DATE_MAJ).toLocaleDateString('fr-FR') : '',
      ...doc
    }));
  } catch (error) {
    console.log('Error fetching evolutions by program:', error);
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
    const response = await fetch('/api/sql/data?table=statuts');
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
 * Fetches all users via the API.
 * @returns A Promise that resolves to an array of user objects with userId and userName properties.
 */
export async function fetchAllUsers(): Promise<{ userId: string; userName: string }[]> {
  try {
    const response = await fetch('/api/sql/data?table=users');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Error fetching users:', error);
    return [];
  }
}

/**
 * Fetches user data via the API based on the provided user ID.
 * @param userId The ID of the user to fetch.
 * @returns A Promise that resolves to a UserData object or null if the user is not found.
 */
export async function fetchUser(userId: string): Promise<UserData | null> {
  try {
    const response = await fetch(`/api/sql/data?table=users&id=${userId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('Error fetching user:', error);
    return null;
  }
}

/**
 * Fetches reporting data for a specific agency via the API.
 * @param agence The name of the agency to fetch data for.
 * @returns A Promise that resolves to an array of reporting data objects.
 */
export async function fetchDataReportingByAgency(agence: string) {
  try {
    const response = await fetch(`/api/sql/data?table=reporting&agency=${agence}`);
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
 * Fetches all reporting data via the API.
 * @returns A Promise that resolves to an array of reporting data objects.
 */
export async function fetchAllReportingData() {
  try {
    const response = await fetch('/api/sql/data?table=reporting');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Retrieve all reporting data (dataFetcher / fetchAllReportingData)', data);
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
    const response = await fetch('/api/sql/data?table=services');
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

/**
 * Fetches all robots and baremes via the API.
 * @param agence (optional) The agency to filter robots by.
 * @returns A Promise that resolves to an array of Program objects.
 */
export async function fetchUserAgencies(agencyIds: string[]): Promise<Agency[]> {
    console.log('Retrieve agencies (dataFetcher / fetchUserAgencies)', agencyIds);
    try {
        // Si aucun ID n'est fourni, retourner toutes les agences
        if (!agencyIds || agencyIds.length === 0) {
            const response = await fetch('/api/sql/data?table=Agences');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        }

        // Pour éviter les URLs trop longues, on utilise une approche différente
        // On récupère toutes les agences puis on filtre côté client
        const response = await fetch('/api/sql/data?table=Agences');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const allAgencies = await response.json();
        
        // Filtrer les agences qui correspondent aux IDs fournis
        const filteredAgencies = allAgencies.filter((agency: any) => 
            agencyIds.includes(agency.NOM_AGENCE)
        );
        
        return filteredAgencies;
    } catch (error) {
        console.log('Error fetching agencies:', error);
        return [];
    }
}

export async function fetchAllRobotsAndBaremes(agence?: string): Promise<Program[]> {
  try {
    const url = agence ? `/api/sql/data?table=robots&agence=${agence}` : '/api/sql/data?table=robots';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if(data.length > 0)
       console.log('Retrieve robots and baremes (dataFetcher / fetchAllRobotsAndBaremes):', data);
    return data;
  } catch (error) {
    console.log('Error fetching robots and baremes:', error);
    return [];
  }
}
