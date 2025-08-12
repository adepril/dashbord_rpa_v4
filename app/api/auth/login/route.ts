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
      SELECT
        [ID], [USER_NAME], [EMAIL],
        [AGENCE_BBLBRI], [AGENCE_TIF69], [AGENCE_TIF93], [AGENCE_BBL],
        [AGENCE_MABBLCASA], [AGENCE_BBLVIL], [AGENCE_MARICHAL93], [AGENCE_BBL_CARGO],
        [AGENCE_BBLPRO], [AGENCE_CHARVIN], [AGENCE_BBLPAU], [AGENCE_BBLLIL],
        [AGENCE_BBLSIEGE], [AGENCE_BBLSQF], [AGENCE_CHARVIN_LOGISTIQUES], [AGENCE_BBLIDF],
        [AGENCE_BBLSOA], [AGENCE_BBLRMB], [AGENCE_BBLPCS], [AGENCE_CHAB9],
        [AGENCE_BBLFIN], [AGENCE_BBLREN], [AGENCE_BBLMPL], [AGENCE_BBLCAEN],
        [AGENCE_BBLLRY], [AGENCE_BLRSTJ], [AGENCE_BBL_SERVICES], [AGENCE_BBLTLS],
        [AGENCE_BBLTUF], [AGENCE_BBLNTE], [AGENCE_BELLEREAUX], [AGENCE_BBLBRU],
        [AGENCE_TOUTES], [USER_SERVICE]
      FROM [BD_RPA_TEST].[dbo].[Utilisateurs]
      WHERE [USER_NAME] = @username AND [USER_PASSWORD] = @password
    `, [
      { name: 'username', type: sql.NVarChar(50), value: USER_NAME },
      { name: 'password', type: sql.NVarChar(50), value: USER_PASSWORD }
    ]);

    if (result.recordset.length > 0) {
      // Traitement des USER_AGENCE_IDS (supposé être une chaîne séparée par des virgules)
      const user = result.recordset[0];
      console.log('User object from DB:', user); // Ajout du log pour le débogage
      // Retourner les données utilisateur
      const agenceIds: string[] = [];
      
      if (user.AGENCE_TIF69.toLowerCase() === "oui") agenceIds.push('TIF69');
      if (user.AGENCE_TIF93.toLowerCase() === "oui") agenceIds.push('TIF93');
      if (user.AGENCE_MABBLCASA.toLowerCase() === "oui") agenceIds.push('MABBLCASA');
      if (user.AGENCE_MARICHAL93.toLowerCase() === "oui") agenceIds.push('MARICHAL93');
      if (user.AGENCE_CHARVIN.toLowerCase() === "oui") agenceIds.push('CHARVIN');
      if (user.AGENCE_CHARVIN_LOGISTIQUES.toLowerCase() === "oui") agenceIds.push('CHARVIN_LOGISTIQUES');
      if (user.AGENCE_CHAB9.toLowerCase() === "oui") agenceIds.push('CHAB9');
      if (user.AGENCE_BBL.toLowerCase() === "oui") agenceIds.push('BBL');
      if (user.AGENCE_BBLPAU.toLowerCase() === "oui") agenceIds.push('BBLPAU');
      if (user.AGENCE_BBLLIL.toLowerCase() === "oui") agenceIds.push('BBLLIL');
      if (user.AGENCE_BBLVIL.toLowerCase() === "oui") agenceIds.push('BBLVIL');
      if (user.AGENCE_BBLSIEGE.toLowerCase() === "oui") agenceIds.push('BBLSIEGE');
      if (user.AGENCE_BBLSQF.toLowerCase() === "oui") agenceIds.push('BBLSQF');
      if (user.AGENCE_BBL_CARGO.toLowerCase() === "oui") agenceIds.push('BBL_CARGO');
      if (user.AGENCE_BBLPRO.toLowerCase() === "oui") agenceIds.push('BBLPRO');
      if (user.AGENCE_BBLIDF.toLowerCase() === "oui") agenceIds.push('BBLIDF');
      if (user.AGENCE_BBLSOA.toLowerCase() === "oui") agenceIds.push('BBLSOA');
      if (user.AGENCE_BBLRMB.toLowerCase() === "oui") agenceIds.push('BBLRMB');
      if (user.AGENCE_BBLPCS.toLowerCase() === "oui") agenceIds.push('BBLPCS');
      if (user.AGENCE_BBLBRI.toLowerCase() === "oui") agenceIds.push('BBLBRI');
      if (user.AGENCE_BBLFIN.toLowerCase() === "oui") agenceIds.push('BBLFIN');
      if (user.AGENCE_BBLREN.toLowerCase() === "oui") agenceIds.push('BBLREN');
      if (user.AGENCE_BBLMPL.toLowerCase() === "oui") agenceIds.push('BBLMPL');
      if (user.AGENCE_BBLCAEN.toLowerCase() === "oui") agenceIds.push('BBLCAEN');
      if (user.AGENCE_BBLLRY.toLowerCase() === "oui") agenceIds.push('BBLLRY');
      if (user.AGENCE_BLRSTJ.toLowerCase() === "oui") agenceIds.push('BLRSTJ');
      if (user.AGENCE_BBL_SERVICES.toLowerCase() === "oui") agenceIds.push('BBL_SERVICES');
      if (user.AGENCE_BBLTLS.toLowerCase() === "oui") agenceIds.push('BBLTLS');
      if (user.AGENCE_BBLTUF.toLowerCase() === "oui") agenceIds.push('BBLTUF');
      if (user.AGENCE_BBLNTE.toLowerCase() === "oui") agenceIds.push('BBLNTE');
      if (user.AGENCE_BELLEREAUX.toLowerCase() === "oui") agenceIds.push('BELLEREAUX');
      if (user.AGENCE_BBLBRU.toLowerCase() === "oui") agenceIds.push('BBLBRU');
      if (user.AGENCE_TOUTES.toLowerCase() === "oui") agenceIds.push('TOUTES');

      const userData = {
        userId: user.ID,
        userName: user.USER_NAME,
        userEmail: user.EMAIL,
        userAgenceIds: agenceIds,
        userService: user.USER_SERVICE,
        
      };
      
      return NextResponse.json({ message: 'Authentication successful', userData: userData });
    } else {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ message: 'An error occurred during login' }, { status: 500 });
  }
}
