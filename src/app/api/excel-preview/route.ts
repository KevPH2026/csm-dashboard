import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets = workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
      const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
      const previewRows = jsonData.slice(0, 5);
      const colCount = headers.length;
      const rowCount = jsonData.length;

      const columnTypes: Record<string, string> = {};
      headers.forEach(h => {
        const sampleValues = jsonData.slice(0, 20).map(r => r[h]);
        const numCount = sampleValues.filter(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null)).length;
        const dateCount = sampleValues.filter(v => {
          const s = String(v);
          return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) || (Number(v) > 30000 && Number(v) < 60000);
        }).length;

        if (dateCount > sampleValues.length * 0.5) columnTypes[h] = 'date';
        else if (numCount > sampleValues.length * 0.5) columnTypes[h] = 'number';
        else columnTypes[h] = 'string';
      });

      return { name, rowCount, colCount, headers, previewRows, columnTypes };
    });

    return NextResponse.json({ sheets, fileName: file.name });
  } catch (error) {
    console.error('Excel preview error:', error);
    return NextResponse.json({ error: 'Failed to parse Excel file' }, { status: 500 });
  }
}
