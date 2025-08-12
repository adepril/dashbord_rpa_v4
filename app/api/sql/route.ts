import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { executeQuery } from '../../../lib/sql';
import sql from 'mssql/msnodesqlv8';

// Liste blanche des tables autorisées pour éviter l'injection SQL
const ALLOWED_TABLES = [
    'Reporting',
    'Citations',
    'Services',
    'Statuts',
    'UtilisateursV2',
    'AgencesV2',
    'Evolutions',
    'Barem_Reporting'
];

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const table = url.searchParams.get('table');
    const action = url.searchParams.get('action') || 'N/A'; // Default action is 'N/A'
    console.log(`GET Request: Table - ${table}, Action - ${action}`);

    if (!table || !ALLOWED_TABLES.includes(table)) {
        return NextResponse.json({ error: 'Invalid or disallowed table parameter' }, { status: 400 });
    }

    try {
        let query = '';
        let params: { name: string; type: any; value: any }[] = [];
        let result;

        switch (table) {
            case 'Citations':
                // Citation aléatoire
                query = `SELECT TOP 1 [ID],[CITATION],[AUTEUR] FROM [BD_RPA_TEST].[dbo].[Citations] ORDER BY NEWID()`;
                result = await executeQuery(query);
                //console.log('Citations result:', result);
                if (result.recordset.length > 0) {
                    const citation = result.recordset[0];
                    return NextResponse.json({
                        id: citation.ID.toString().trim(),
                        citation: citation.CITATION,
                        auteur: citation.AUTEUR
                    });
                } else {
                    return NextResponse.json(null);
                }
                break;

            case 'Reporting':
                const clefRobot = url.searchParams.get('Clef');
                const anneeMois = url.searchParams.get('AnneeMois');

                query = `SELECT * FROM [BD_RPA_TEST].[dbo].[Reporting] WHERE 1=1`;
                if (clefRobot && clefRobot.length > 0) {
                    query += ` AND [CLEF] = @clefRobot`;
                    params.push({ name: 'clefRobot', type: sql.NVarChar(150), value: clefRobot });
                }
                
                if (anneeMois) {
                    query += ` AND [ANNEE_MOIS] = @anneeMois`;
                    params.push({ name: 'anneeMois', type: sql.Int, value: parseInt(anneeMois) });
                }

                //console.log('(sql/route.ts) Reporting query:', query, 'params:', params);   
                result = await executeQuery(query, params);
                return NextResponse.json(result.recordset);

            case 'Services':
                query = `SELECT [NOM_SERVICE] FROM [BD_RPA_TEST].[dbo].[Services]`;
                result = await executeQuery(query);
                return NextResponse.json(result.recordset);

            case 'Statuts':
                query = `SELECT [LABEL],[NUMERO] FROM [BD_RPA_TEST].[dbo].[Statuts]`;
                result = await executeQuery(query);
                return NextResponse.json(result.recordset);

            // case 'UtilisateursV2':
            //     const userId = url.searchParams.get('userId');
            //     query = `SELECT [ID],[USER_NAME],[EMAIL],[USER_SERVICE],[AGENCE_BBLBRI],[AGENCE_TIF69],[AGENCE_TOUTES],[USER_AGENCE_IDS] FROM [BD_RPA_TEST].[dbo].[UtilisateursV2] WHERE 1=1`;
            //     if (userId) {
            //         query += ` AND [ID] = @userId`;
            //         params.push({ name: 'userId', type: sql.NVarChar(50), value: userId });
            //     }
            //     result = await executeQuery(query, params);
            //     return NextResponse.json(result.recordset);

            case 'AgencesV2':
                const agenceName = url.searchParams.get('agenceName'); // For filtering by agency name
                query = `SELECT [CODE_AGENCE],[LIBELLE_AGENCE] FROM [BD_RPA_TEST].[dbo].[AgencesV2] WHERE 1=1`;
                if (agenceName) {
                    query += ` AND [CODE_AGENCE] = @agenceName`;
                    params.push({ name: 'agenceName', type: sql.NVarChar(100), value: agenceName });
                }
                result = await executeQuery(query, params);
                return NextResponse.json(result.recordset);

            case 'Barem_Reporting':
                query = `SELECT * FROM [BD_RPA_TEST].[dbo].[Barem_Reporting]`;
                result = await executeQuery(query);
                return NextResponse.json(result.recordset);

            case 'Evolutions':
                // Support three retrieval modes:
                // 1) All evolutions (no filter)
                // 2) Evolutions for a specific agency (agency param) -> robots belonging to that agency
                // 3) Evolutions for a single robot (robot param)
                const robotParam = url.searchParams.get('robot') || url.searchParams.get('robotId') || url.searchParams.get('programme');
                const agencyParam = url.searchParams.get('agency') || url.searchParams.get('agence') || url.searchParams.get('agencyCode');

                // Default: return all rows
                query = `SELECT * FROM [BD_RPA_TEST].[dbo].[Evolutions] WHERE 1=1`;
                if (robotParam && robotParam.length > 0) {
                    query += ` AND [ROBOT] = @robot`;
                    params.push({ name: 'robot', type: sql.NVarChar(200), value: robotParam });
                } else if (agencyParam && agencyParam.length > 0) {
                    // If an agency is provided, return evolutions for robots that belong to that agency.
                    // We infer robot membership from the Reporting table (NOM_ROBOT / AGENCE).
                    query = `
                        SELECT e.*
                        FROM [BD_RPA_TEST].[dbo].[Evolutions] e
                        WHERE e.[ROBOT] IN (
                            SELECT DISTINCT [NOM_ROBOT] FROM [BD_RPA_TEST].[dbo].[Reporting] WHERE [AGENCE] = @agency
                        )
                    `;
                    params.push({ name: 'agency', type: sql.NVarChar(100), value: agencyParam });
                } else {
                    // no extra params -> full table (query already set)
                }

                result = await executeQuery(query, params);
                return NextResponse.json(result.recordset);

            default:
                // Should not reach here due to ALLOWED_TABLES check, but as a fallback
                return NextResponse.json({ error: 'Unsupported table' }, { status: 400 });
        }

    } catch (error) {
        console.error('SQL GET error:', error);
        let errorMessage = 'An unknown database error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ error: 'Database error', details: errorMessage }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { table, data } = body;
        console.log(`POST Request: Table - ${table}, Data -`, data);

        if (!table || !data) {
            return NextResponse.json({ error: 'Table and data are required for POST request' }, { status: 400 });
        }

        if (!ALLOWED_TABLES.includes(table)) {
            return NextResponse.json({ error: 'Invalid or disallowed table parameter' }, { status: 400 });
        }

        let query = '';
        let params: { name: string; type: any; value: any }[] = [];

        switch (table) {
            case 'Reporting':
                // Insertion dans la table Reporting
                query = `
                    INSERT INTO [BD_RPA_TEST].[dbo].[Reporting] (
                        [CLEF], [NOM_ROBOT], [AGENCE], [DESCRIPTION], [DATE_MAJ], [TYPE_UNITE], [ANNEE_MOIS],
                        [JOUR1], [JOUR2], [JOUR3], [JOUR4], [JOUR5], [JOUR6], [JOUR7], [JOUR8], [JOUR9], [JOUR10],
                        [JOUR11], [JOUR12], [JOUR13], [JOUR14], [JOUR15], [JOUR16], [JOUR17], [JOUR18], [JOUR19], [JOUR20],
                        [JOUR21], [JOUR22], [JOUR23], [JOUR24], [JOUR25], [JOUR26], [JOUR27], [JOUR28], [JOUR29], [JOUR30], [JOUR31]
                    ) VALUES (
                        @CLEF, @NOM_ROBOT, @AGENCE, @DESCRIPTION, @DATE_MAJ, @TYPE_UNITE, @ANNEE_MOIS,
                        @JOUR1, @JOUR2, @JOUR3, @JOUR4, @JOUR5, @JOUR6, @JOUR7, @JOUR8, @JOUR9, @JOUR10,
                        @JOUR11, @JOUR12, @JOUR13, @JOUR14, @JOUR15, @JOUR16, @JOUR17, @JOUR18, @JOUR19, @JOUR20,
                        @JOUR21, @JOUR22, @JOUR23, @JOUR24, @JOUR25, @JOUR26, @JOUR27, @JOUR28, @JOUR29, @JOUR30, @JOUR31
                    )
                `;
                // Map data fields to SQL parameters
                params.push({ name: 'CLEF', type: sql.NVarChar(150), value: data.CLEF });
                params.push({ name: 'NOM_ROBOT', type: sql.NVarChar(100), value: data.NOM_ROBOT });
                params.push({ name: 'AGENCE', type: sql.NVarChar(50), value: data.AGENCE });
                params.push({ name: 'DESCRIPTION', type: sql.NVarChar(sql.MAX), value: data.DESCRIPTION });
                params.push({ name: 'DATE_MAJ', type: sql.Date, value: data.DATE_MAJ });
                params.push({ name: 'TYPE_UNITE', type: sql.NVarChar(50), value: data.TYPE_UNITE });
                params.push({ name: 'ANNEE_MOIS', type: sql.Int, value: data.ANNEE_MOIS });
                for (let i = 1; i <= 31; i++) {
                    params.push({ name: `JOUR${i}`, type: sql.Int, value: data[`JOUR${i}`] });
                }
                
                await executeQuery(query, params);
                return NextResponse.json({ message: 'Reporting data inserted successfully' }, { status: 201 });

            case 'Evolutions':
                // Insertion dans la table Evolutions
                query = `
                    INSERT INTO [BD_RPA_TEST].[dbo].[Evolutions] (
                        [ID], [INTITULE], [DESCRIPTION], [DATE_MAJ], [NB_OPERATIONS_MENSUELLES],
                        [ROBOT], [STATUT], [TEMPS_CONSOMME], [TYPE_DEMANDE], [TYPE_GAIN]
                    ) VALUES (
                        @ID, @INTITULE, @DESCRIPTION, @DATE_MAJ, @NB_OPERATIONS_MENSUELLES,
                        @ROBOT, @STATUT, @TEMPS_CONSOMME, @TYPE_DEMANDE, @TYPE_GAIN
                    )
                `;
                // Map data fields to SQL parameters
                params.push({ name: 'ID', type: sql.Int, value: data.ID });
                params.push({ name: 'INTITULE', type: sql.NVarChar(50), value: data.INTITULE });
                params.push({ name: 'DESCRIPTION', type: sql.NVarChar(sql.MAX), value: data.DESCRIPTION });
                params.push({ name: 'DATE_MAJ', type: sql.NVarChar(50), value: data.DATE_MAJ });
                params.push({ name: 'NB_OPERATIONS_MENSUELLES', type: sql.NVarChar(50), value: data.NB_OPERATIONS_MENSUELLES });
                params.push({ name: 'ROBOT', type: sql.NVarChar(50), value: data.ROBOT });
                params.push({ name: 'STATUT', type: sql.NChar(10), value: data.STATUT });
                params.push({ name: 'TEMPS_CONSOMME', type: sql.NChar(10), value: data.TEMPS_CONSOMME });
                params.push({ name: 'TYPE_DEMANDE', type: sql.NChar(10), value: data.TYPE_DEMANDE });
                params.push({ name: 'TYPE_GAIN', type: sql.NChar(10), value: data.TYPE_GAIN });
                
                await executeQuery(query, params);
                return NextResponse.json({ message: 'Evolution data inserted successfully' }, { status: 201 });

            // Add cases for other tables if POST operations are needed (e.g., for users, services, etc.)
            // For now, only Reporting supports POST based on the provided example.

            default:
                return NextResponse.json({ error: 'POST operation not supported for this table' }, { status: 405 });
        }

    } catch (error) {
        console.error('SQL POST error:', error);
        let errorMessage = 'An unknown database error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ error: 'Database error', details: errorMessage }, { status: 500 });
    }
}
