const path = require('path');
const xlsx = require(path.resolve(__dirname, '../frontend/node_modules/xlsx'));

// Read sample report data from Report_Formatt.xlsx
const wbReport = xlsx.readFile(path.resolve(__dirname, 'Report_Formatt.xlsx'));
const wsReport = wbReport.Sheets['Report'];
const reportData = xlsx.utils.sheet_to_json(wsReport, { header: 1 });

console.log('Sample Report Row 5 (headers):', reportData[4]?.slice(1, 10));
console.log('Sample Report Row 6 (data):', reportData[5]?.slice(1, 10));

// Read Expense Upload sample
const wbExpense = xlsx.readFile(path.resolve(__dirname, 'Expense_Upload_3.xlsx'));
const wsExpense = wbExpense.Sheets['Sheet1'];
const expenseData = xlsx.utils.sheet_to_json(wsExpense, { header: 1 });
console.log('Sample Expense Upload Total Rows:', expenseData.length);
console.log('Expense Row 1:', expenseData[0]);
console.log('Expense Row 2 (first debit):', expenseData[1]);
console.log('Expense Row 145 (last credit):', expenseData[144]);
