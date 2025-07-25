import { NextResponse, NextRequest } from 'next/server';
import { executeQuery } from '../../../lib/sql';

export async function GET(request: NextRequest) {
  try {
    const result = await executeQuery(`
      SELECT TOP 1 [ID], [CITATION], [AUTEUR]
      FROM [BD_RPA_TEST].[dbo].[Citations]
      ORDER BY NEWID();
    `);

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
  } catch (error) {
    console.error('Error fetching citation:', error);
    return NextResponse.json({ message: 'Error fetching citation' }, { status: 500 });
  }
}
