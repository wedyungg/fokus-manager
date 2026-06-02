import pkg from 'xlsx';
const { readFile, utils } = pkg;

const filename = 'LAPORAN KEUANGAN FOKUS KESINI.xlsx';

try {
  const workbook = readFile(filename);
  console.log('Sheet Names:', workbook.SheetNames);
  
  if (workbook.SheetNames.length > 0) {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`\nData from first sheet (${firstSheetName}):`);
    for (let i = 0; i < Math.min(10, data.length); i++) {
      console.log(`Row ${i}:`, data[i]);
    }
  }
} catch (err) {
  console.error('Failed to read Excel file:', err);
}
