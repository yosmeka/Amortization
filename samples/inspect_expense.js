const path = require('path');
const xlsx = require(path.resolve(__dirname, '../frontend/node_modules/xlsx'));

const wb = xlsx.readFile(path.resolve(__dirname, 'Expense_Upload_3.xlsx'), { cellStyles: true, cellNF: true, cellFormula: true });
console.log('Sheets in Expense_Upload_3.xlsx:', wb.SheetNames);

for (const s of wb.SheetNames) {
    console.log('--------------------------------------------------');
    console.log('Sheet Name:', s);
    const ws = wb.Sheets[s];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log('Total Rows:', data.length);
    for (let i = 0; i < Math.min(60, data.length); i++) {
        console.log(`Row ${i + 1}:`, JSON.stringify(data[i]));
    }
}
