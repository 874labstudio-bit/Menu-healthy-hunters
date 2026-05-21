import { getAccessToken } from './auth';

export interface SheetProduct {
  seccion: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  descripcion_corta: string;
  descripcion_larga: string;
  precio: number;
  imagen: string;
  destacado: boolean;
  disponible: boolean;
  ingredientes?: string;
  beneficios?: string;
}

export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n' || char === '\r') {
        row.push(cell);
        cell = '';
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          lines.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    lines.push(row);
  }
  return lines;
}

export const fetchCSVData = async (url: string): Promise<SheetProduct[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV spreadsheet data: ${response.statusText}`);
  }

  const text = await response.text();
  const rows = parseCSV(text);

  if (!rows || rows.length <= 1) {
    return [];
  }

  // First row is header
  const headers = rows[0].map((h: string) => h.toLowerCase().trim());
  
  const getIndex = (name: string) => headers.indexOf(name);

  return rows.slice(1).map((row: any[], index: number) => {
    // Return empty fields if column index not found
    const getVal = (colName: string) => {
      const idx = getIndex(colName);
      return idx !== -1 && idx < row.length ? row[idx] : '';
    };

    return {
      seccion: getVal('seccion') || 'General',
      categoria: getVal('categoria') || 'Sin categoría',
      nombre: getVal('nombre') || `Producto ${index + 1}`,
      descripcion: getVal('descripcion') || '',
      descripcion_corta: getVal('descripcion') || '',
      descripcion_larga: getVal('descripcion') || '',
      precio: parseFloat(String(getVal('precio')).replace(/[^\d.]/g, '')) || 0,
      imagen: getVal('imagen_url') || getVal('imagen') || getVal('image') || '',
      destacado: String(getVal('destacado')).toLowerCase() === 'true',
      disponible: String(getVal('disponible')).toLowerCase() !== 'false',
      ingredientes: getVal('ingredientes') || '',
      beneficios: getVal('beneficios') || '',
    } as SheetProduct;
  }).filter(item => item.disponible);
};

export const fetchSpreadsheetData = async (spreadsheetId: string, range: string): Promise<SheetProduct[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No access token available. Please sign in.');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to fetch spreadsheet data');
  }

  const data = await response.json();
  const rows = data.values;

  if (!rows || rows.length <= 1) {
    return [];
  }

  // Assuming first row is header
  const headers = rows[0].map((h: string) => h.toLowerCase().trim());
  
  const getIndex = (name: string) => headers.indexOf(name);

  return rows.slice(1).map((row: any[], index: number) => {
    const getVal = (colName: string) => {
      const idx = getIndex(colName);
      return idx !== -1 && idx < row.length ? row[idx] : '';
    };

    return {
      seccion: getVal('seccion') || 'General',
      categoria: getVal('categoria') || 'Sin categoría',
      nombre: getVal('nombre') || `Producto ${index + 1}`,
      descripcion: getVal('descripcion') || '',
      descripcion_corta: getVal('descripcion') || '',
      descripcion_larga: getVal('descripcion') || '',
      precio: parseFloat(String(getVal('precio')).replace(/[^\d.]/g, '')) || 0,
      imagen: getVal('imagen_url') || getVal('imagen') || getVal('image') || '',
      destacado: String(getVal('destacado')).toLowerCase() === 'true',
      disponible: String(getVal('disponible')).toLowerCase() !== 'false',
      ingredientes: getVal('ingredientes') || '',
      beneficios: getVal('beneficios') || '',
    } as SheetProduct;
  }).filter(item => item.disponible);
};
