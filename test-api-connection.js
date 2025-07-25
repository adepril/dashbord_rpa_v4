const sql = require('mssql/msnodesqlv8');

// Configuration avec chaîne de connexion directe (comme test-sql-connection.js)
const config = {
    connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=myreport01.alltransports.fr;Database=BD_RPA_TEST;Trusted_Connection=yes;"
};

// Helper function to build SQL queries safely
async function executeQuery(query, params) {
    try {
        // Connexion à la base
        await sql.connect(config);
        
        const request = new sql.Request();
        if (params) {
            params.forEach(p => {
                request.input(p.name, p.type, p.value);
            });
        }
        const result = await request.query(query);
        return result;
    } catch (error) {
        console.error('SQL query error:', error);
        throw error;
    } finally {
        try {
            // Fermeture de la connexion
            await sql.close();
        } catch (closeError) {
            console.error('Error closing SQL connection:', closeError);
        }
    }
}

async function testApiConnection() {
    try {
        console.log('Tentative de connexion à SQL Server via la nouvelle configuration...');

        // Test de la fonction executeQuery
        const result = await executeQuery(`
            SELECT TOP (3) [ID], [CITATION], [AUTEUR] 
            FROM [BD_RPA_TEST].[dbo].[Citations]
        `);

        console.log('✅ Connexion réussie !');
        console.log(`📊 ${result.recordset.length} citations trouvées:`);
        console.log('');

        // Affichage des résultats
        result.recordset.forEach((row, index) => {
            console.log(`--- Citation ${index + 1} ---`);
            console.log(`ID: ${row.ID}`);
            console.log(`Citation: ${row.CITATION}`);
            console.log(`Auteur: ${row.AUTEUR}`);
            console.log('');
        });

    } catch (err) {
        console.error('❌ Erreur:', err.message);
        console.error('Détails:', err);
    }
}

// Exécution du test
testApiConnection();
