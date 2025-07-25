const sql = require('mssql/msnodesqlv8');

// Configuration avec chaîne de connexion directe (comme Python)
const config = {
    connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=myreport01.alltransports.fr;Database=BD_RPA_TEST;Trusted_Connection=yes;"
};

async function testConnection() {
    try {
        console.log('Tentative de connexion à SQL Server...');

        // Connexion à la base
        await sql.connect(config);
        console.log('✅ Connexion réussie !');

        // Exécution de votre requête
        const result = await sql.query(`
            SELECT TOP (1000) [ID], [CITATION], [AUTEUR] 
            FROM [BD_RPA_TEST].[dbo].[Citations]
        `);

        console.log(`📊 ${result.recordset.length} enregistrements trouvés:`);
        console.log('');

        // Affichage des résultats
        result.recordset.forEach((row, index) => {
            console.log(`--- Enregistrement ${index + 1} ---`);
            console.log(`ID: ${row.ID}`);
            console.log(`Citation: ${row.CITATION}`);
            console.log(`Auteur: ${row.AUTEUR}`);
            console.log('');
        });

    } catch (err) {
        console.error('❌ Erreur:', err.message);
        console.error('Détails:', err);
    } finally {
        // Fermeture de la connexion
        await sql.close();
        console.log('Connexion fermée.');
    }
}

// Exécution du test
testConnection();