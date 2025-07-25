const sql = require('mssql/msnodesqlv8');

// Configuration identique à test-sql-connection.js
const config = {
    connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=myreport01.alltransports.fr;Database=BD_RPA_TEST;Trusted_Connection=yes;"
};

async function testConnection() {
    try {
        console.log('Tentative de connexion à SQL Server...');

        // Connexion à la base
        await sql.connect(config);
        console.log('✅ Connexion réussie !');

        // Exécution de la requête comme dans l'API
        const result = await sql.query(`
            SELECT TOP 1 CITATION, AUTEUR
            FROM Citations
            ORDER BY NEWID();
        `);

        if (result.recordset.length > 0) {
            console.log('✅ Query successful!');
            console.log('Citation:', result.recordset[0].CITATION);
            console.log('Auteur:', result.recordset[0].AUTEUR);
        } else {
            console.log('No citations found');
        }

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
