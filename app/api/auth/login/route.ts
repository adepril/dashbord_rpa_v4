import { NextResponse, NextRequest } from 'next/server';
import { executeQuery } from '../../../../lib/sql';
import * as sql from 'mssql/msnodesqlv8';

export async function POST(request: NextRequest) {
  try {
    const { USER_NAME, USER_PASSWORD } = await request.json();

    if (!USER_NAME || !USER_PASSWORD) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // Using parameterized queries to prevent SQL injection
    const result = await executeQuery(`
      SELECT [ID], [USER_NAME], [EMAIL], [USER_SERVICE], [AGENCE_BBLBRI], [AGENCE_TIF69], [AGENCE_TOUTES], [USER_AGENCE_IDS]
      FROM [BD_RPA_TEST].[dbo].[UtilisateursV2]
      WHERE [USER_NAME] = @username AND [USER_PASSWORD] = @password
    `, [
      { name: 'username', type: sql.NVarChar(50), value: USER_NAME },
      { name: 'password', type: sql.NVarChar(50), value: USER_PASSWORD }
    ]);

    if (result.recordset.length > 0) {
      // Traitement des USER_AGENCE_IDS (supposé être une chaîne séparée par des virgules)
      const user = result.recordset[0];
      const agenceIds = user.USER_AGENCE_IDS ? user.USER_AGENCE_IDS.split('-') : [];
      
      // Retourner les données utilisateur
      const userData = {
        userId: user.ID,
        userName: user.USER_NAME,
        userEmail: user.EMAIL,
        userAgenceIds: typeof agenceIds === 'string' ? agenceIds.split('-') : agenceIds,
        userService: user.USER_SERVICE,
        agenceBBLBRI: user.AGENCE_BBLBRI,
        agenceTIF69: user.AGENCE_TIF69,
        agenceToutes: user.AGENCE_TOUTES
      };
      
      return NextResponse.json({ message: 'Authentication successful', user: userData });
    } else {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ message: 'An error occurred during login' }, { status: 500 });
  }
}
