const sql = require('mssql/msnodesqlv8');

// Configuration avec chaîne de connexion directe (comme test-sql-connection.js)
const config = {
    connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=myreport01.alltransports.fr;Database=BD_RPA_TEST;Trusted_Connection=yes;"
};

// Helper function to build SQL queries safely
export async function executeQuery(query: string, params?: { name: string; type: any; value: any }[]) {
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
