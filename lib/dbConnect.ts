import sql from 'mssql/msnodesqlv8';

// Configuration identique à test-sql-connection.js qui fonctionne
// ⚠️ ATTENTION: Cette configuration nécessite msnodesqlv8 qui peut avoir des problèmes de compatibilité avec Next.js
// Pour une utilisation dans Next.js, voir DATABASE_SOLUTION.md
const config: any = {
    connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=myreport01.alltransports.fr;Database=BD_RPA_TEST;Trusted_Connection=yes;"
};

export async function connectDB() {
  try {
    await sql.connect(config);
    console.log('Connected to SQL Server');
  } catch (err) {
    console.log('Database connection failed:', err);
    throw err;
  }
}

export { sql };
