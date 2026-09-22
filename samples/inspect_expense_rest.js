const path = require('path');
const xlsx = require(path.resolve(__dirname, '../frontend/node_modules/xlsx'));

const wb = xlsx.readFile(path.resolve(__dirname, 'Expense_Upload_3.xlsx'));
const ws = wb.Sheets['Sheet1'];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

console.log('Rows 61 to 145:');
for (let i = 60; i < data.length; i++) {
    console.log(`Row ${i + 1}:`, JSON.stringify(data[i]));
}
