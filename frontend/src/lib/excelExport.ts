import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { AmortizationReportRow } from "./api";
import { Z11_LOGO_BASE64 } from "./z11Logo";

export const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export const GL_OFFICE_RENT = "502149";
export const GL_UTILITY     = "502170";
export const GL_PREPAID     = "104401";
export const GL_AP_MISC     = "208130";
export const ZEMEN_CODE     = "000";
export const ZEMEN_NAME     = "Zemen Bank";
export const ATM_CODE       = "108";
export const ATM_NAME       = "Multichannel Banking Department";

export type TicketRow = {
    branchCode: string;
    branchName: string;
    glNumber: string;
    description: string;
    amount: number;
    inRespectOf: string;
};

export type Ticket = {
    category: "ATM" | "City" | "Outline";
    title: string;
    debit: TicketRow[];
    debitTotal: number;
    credit: TicketRow[];
    creditTotal: number;
    narration: string;
};

/* ─────────────────────────────────────────────────────────────
   Ticket Builders
   ───────────────────────────────────────────────────────────── */

export function buildATM(rows: AmortizationReportRow[], month: number, year: number): Ticket {
    const lbl = `${MONTHS[month - 1]} ${year}`;
    const office = rows.filter(r => !r.stampDutyRow && !r.utilityPaymentRow);
    const utility = rows.filter(r => r.utilityPaymentRow);

    const totalExp = office.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);
    const utilityTotal = utility.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);
    const totalDue = office.reduce((s, r) => s + (r.dueForMonth ?? 0), 0);
    const totalPrepaid = totalExp - totalDue;

    const debit: TicketRow[] = [
        {
            branchCode: ATM_CODE,
            branchName: ATM_NAME,
            glNumber: GL_OFFICE_RENT,
            description: "Office Rent",
            amount: totalExp,
            inRespectOf: `ATM Space Rent for the Month of ${lbl}.`
        },
        ...utility.map(r => ({
            branchCode: r.branchCode,
            branchName: r.branchName,
            glNumber: GL_UTILITY,
            description: "Utility Payment",
            amount: r.rentExpenseForMonth ?? 0,
            inRespectOf: `Utility payment for ${r.branchName} for the month of ${lbl}.`
        }))
    ];

    const credit: TicketRow[] = [
        {
            branchCode: ZEMEN_CODE,
            branchName: ZEMEN_NAME,
            glNumber: GL_AP_MISC,
            description: "Account Payable-Miscellaneous",
            amount: totalDue,
            inRespectOf: `Amount held under A/P Miscellaneous for different  ATM space rent for the month of ${lbl}.`
        },
        {
            branchCode: ZEMEN_CODE,
            branchName: ZEMEN_NAME,
            glNumber: GL_PREPAID,
            description: "Prepaid-Office Rent",
            amount: totalPrepaid,
            inRespectOf: `ATM Space Rent for the Month of ${lbl}.`
        },
        ...(utilityTotal > 0 ? [{
            branchCode: ZEMEN_CODE,
            branchName: ZEMEN_NAME,
            glNumber: GL_AP_MISC,
            description: "Account Payable-Miscellaneous",
            amount: utilityTotal,
            inRespectOf: `Utility payment payable for the month of ${lbl}.`
        }] : [])
    ];

    return {
        category: "ATM",
        title: "ATM Rent Schedule Ticket",
        debit,
        debitTotal: totalExp + utilityTotal,
        credit,
        creditTotal: totalDue + totalPrepaid + utilityTotal,
        narration: `ATM Space Rent for the Month of ${lbl}.`
    };
}

export function buildCityOutline(
    rows: AmortizationReportRow[],
    month: number,
    year: number,
    cat: "City" | "Outline"
): Ticket {
    const lbl = `${MONTHS[month - 1]} ,${year}`;
    const catLbl = cat === "City" ? "City Branches" : "Outline Branches";

    const contracts = new Map<number, AmortizationReportRow[]>();
    rows.forEach(r => {
        const g = contracts.get(r.leaseContractId) ?? [];
        g.push(r);
        contracts.set(r.leaseContractId, g);
    });

    const debit: TicketRow[] = [];
    let totalExp = 0;
    let totalDue = 0;

    contracts.forEach(group => {
        const sdRow = group.find(r => r.stampDutyRow);
        const officeRow = group.find(r => !r.stampDutyRow && !r.utilityPaymentRow);
        const utilityRows = group.filter(r => r.utilityPaymentRow);

        const amount = sdRow?.total ?? officeRow?.rentExpenseForMonth ?? 0;
        const due = group.reduce((s, r) => s + (r.dueForMonth ?? 0), 0);
        const utilityAmount = utilityRows.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);

        totalExp += amount;
        totalExp += utilityAmount;
        totalDue += due;

        if (officeRow) {
            debit.push({
                branchCode: officeRow.branchCode,
                branchName: officeRow.branchName,
                glNumber: GL_OFFICE_RENT,
                description: "Office Rent",
                amount,
                inRespectOf: `Office rent and stamp duty expense of ${officeRow.branchName} for the month of ${lbl}.`
            });
        }
        utilityRows.forEach(r => {
            debit.push({
                branchCode: r.branchCode,
                branchName: r.branchName,
                glNumber: GL_UTILITY,
                description: "Utilities",
                amount: r.rentExpenseForMonth ?? 0,
                inRespectOf: `Utility Expense of ${r.branchName} for the month of ${lbl}.`
            });
        });
    });

    const totalPrepaid = totalExp - totalDue;

    const credit: TicketRow[] = [
        {
            branchCode: ZEMEN_CODE,
            branchName: ZEMEN_NAME,
            glNumber: GL_PREPAID,
            description: "Prepaid-Office Rent",
            amount: totalPrepaid,
            inRespectOf: `Office rent and stamp duty expense of ${catLbl} for the month of ${lbl}.`
        },
        {
            branchCode: ZEMEN_CODE,
            branchName: ZEMEN_NAME,
            glNumber: GL_AP_MISC,
            description: "Account Payable-Miscellaneous",
            amount: totalDue,
            inRespectOf: `Amount held under A/P Miscellaneous for different  Office and ATM  space rent for the month of ${lbl}.`
        }
    ];

    return {
        category: cat,
        title: `Office Rent Ticket (${catLbl} )`,
        debit,
        debitTotal: totalExp,
        credit,
        creditTotal: totalPrepaid + totalDue,
        narration: `Office rent and stamp duty expense of ${catLbl} for the month of ${lbl}.`
    };
}

/* ─────────────────────────────────────────────────────────────
   Number to Words (Ethiopian Birr & Cents)
   ───────────────────────────────────────────────────────────── */
export function numberToWords(num: number | null | undefined): string {
    if (num == null || isNaN(num) || num === 0) return "Zero";

    const ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];
    const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

    function convertGroup(n: number): string {
        let str = "";
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + " Hundred ";
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)];
            if (n % 10 > 0) {
                str += "-" + ones[n % 10];
            }
            str += " ";
        } else if (n > 0) {
            str += ones[n] + " ";
        }
        return str.trim();
    }

    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const integerPart = Math.floor(absNum);
    const centsPart = Math.round((absNum - integerPart) * 100);

    if (integerPart === 0 && centsPart === 0) return "Zero";

    let words = "";
    if (integerPart === 0) {
        words = "Zero";
    } else {
        let temp = integerPart;
        let scaleIdx = 0;
        const groups: string[] = [];

        while (temp > 0) {
            const groupVal = temp % 1000;
            if (groupVal > 0) {
                const groupWords = convertGroup(groupVal);
                const scaleStr = scales[scaleIdx] ? " " + scales[scaleIdx] : "";
                groups.unshift(groupWords + scaleStr);
            }
            temp = Math.floor(temp / 1000);
            scaleIdx++;
        }
        words = groups.join(" ");
    }

    const centsStr = centsPart > 0 ? ` and ${String(centsPart).padStart(2, "0")}/100` : " and 00/100";
    return (isNegative ? "Minus " : "") + words.trim() + centsStr;
}

function fmtDate(s: string | undefined | null) {
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─────────────────────────────────────────────────────────────
   Styling Helpers
   ───────────────────────────────────────────────────────────── */
const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD3D3D3" } },
    left: { style: "thin", color: { argb: "FFD3D3D3" } },
    bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
    right: { style: "thin", color: { argb: "FFD3D3D3" } }
};

const darkThinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF808080" } },
    left: { style: "thin", color: { argb: "FF808080" } },
    bottom: { style: "thin", color: { argb: "FF808080" } },
    right: { style: "thin", color: { argb: "FF808080" } }
};

const ticketBoxBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } }
};

const accountingTotalBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF808080" } },
    left: { style: "thin", color: { argb: "FF808080" } },
    bottom: { style: "double", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF808080" } }
};

function fillSolid(argb: string): ExcelJS.Fill {
    return {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: argb.replace("#", "FF") }
    };
}

/* ─────────────────────────────────────────────────────────────
   1. MONTHLY AMORTIZATION REPORT EXPORT
   Matching Report Formatt.xlsx & Report Formattpdf.pdf
   ───────────────────────────────────────────────────────────── */
export async function exportMonthlyReportToExcel(
    rows: AmortizationReportRow[],
    month: number,
    year: number,
    category: string
) {
    if (!rows.length) {
        throw new Error("No data available to export.");
    }

    const monthName = MONTHS[month - 1];
    const prevMonthName = month === 1 ? MONTHS[11] : MONTHS[month - 2];
    const prevYear = month === 1 ? year - 1 : year;
    const categoryLabel = category ? `for ${category}` : "for All Categories";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Zemen Bank Amortization System";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Report", {
        views: [{ showGridLines: true }]
    });

    // Column definitions matching Report Formatt.xlsx
    ws.columns = [
        { width: 4 },   // A - margin
        { width: 8 },   // B - S/No
        { width: 13 },  // C - Box File No
        { width: 12 },  // D - Category of Rent
        { width: 28 },  // E - Branch Name
        { width: 12 },  // F - Branch Code
        { width: 26 },  // G - Owner Name
        { width: 14 },  // H - Contract Start
        { width: 14 },  // I - Contract End
        { width: 12 },  // J - Total No. of Years
        { width: 15 },  // K - Payment Paid to Date
        { width: 14 },  // L - Year with Fraction
        { width: 13 },  // M - Meter Square
        { width: 15 },  // N - Price/m² Before VAT
        { width: 10 },  // O - VAT Rate
        { width: 15 },  // P - Price/m² After VAT
        { width: 16 },  // Q - Monthly Rent with VAT
        { width: 16 },  // R - Total Annual Rent
        { width: 16 },  // S - Utility / Service Charge
        { width: 16 },  // T - Full Payment
        { width: 16 },  // U - Total Payment Paid
        { width: 16 },  // V - Remaining Payment
        { width: 22 },  // W - Outstanding Balance (prev)
        { width: 18 },  // X - Rent Expense – [Month] [Year]
        { width: 16 },  // Y - Due for [Month] [Year]
        { width: 16 },  // Z - Rent Expense − Due
        { width: 18 },  // AA - Rent Expense As Of [Month] [Year]
        { width: 19 },  // AB - Due Difference As Of [Month] [Year]
        { width: 19 },  // AC - Cumulative Due As Of [Month] [Year]
        { width: 16 },  // AD - Prepaid
        { width: 18 },  // AE - Cumulative Expense
        { width: 16 },  // AF - Additional Expense
        { width: 10 },  // AG - Day
        { width: 19 },  // AH - Outstanding End [Month] [Year]
    ];

    // Row 2: Zemen Bank S.C (B2:AH2)
    ws.mergeCells("B2:AH2");
    const b2 = ws.getCell("B2");
    b2.value = "Zemen Bank S.C";
    b2.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF000000" } };
    b2.alignment = { horizontal: "center", vertical: "middle" };
    b2.fill = fillSolid("EEE8AA");
    ws.getRow(2).height = 24;

    // Row 3: Monthly Amortization Report for [category] (B3:AH3)
    ws.mergeCells("B3:AH3");
    const b3 = ws.getCell("B3");
    b3.value = `Monthly Amortization Report ${categoryLabel}`;
    b3.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF000000" } };
    b3.alignment = { horizontal: "center", vertical: "middle" };
    b3.fill = fillSolid("EEE8AA");
    ws.getRow(3).height = 24;

    // Row 4: For the month of [Month Year] (B4:AH4)
    ws.mergeCells("B4:AH4");
    const b4 = ws.getCell("B4");
    b4.value = `For the month of ${monthName} ${year}`;
    b4.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
    b4.alignment = { horizontal: "center", vertical: "middle" };
    b4.fill = fillSolid("EEE8AA");
    ws.getRow(4).height = 22;

    for (let r = 2; r <= 4; r++) {
        for (let c = 2; c <= 34; c++) {
            ws.getCell(r, c).fill = fillSolid("EEE8AA");
        }
    }

    // Row 5: Column Headers (B5 to AH5)
    const headers = [
        "S/No", "Box File No", "Category of Rent", "Branch Name", "Branch Code", "Owner Name",
        "Contract Start", "Contract End", "Total No. of Years", "Payment Paid to Date",
        "Year with Fraction", "Meter Square", "Price/m² Before VAT", "VAT Rate", "Price/m² After VAT",
        "Monthly Rent with VAT", "Total Annual Rent", "Utility / Service Charge", "Full Payment",
        "Total Payment Paid", "Remaining Payment",
        `Outstanding Balance (prev) ${prevMonthName} ${prevYear}`,
        `Rent Expense – ${monthName} ${year}`,
        `Due for ${monthName} ${year}`,
        "Rent Expense − Due",
        `Rent Expense As Of ${monthName} ${year}`,
        `Due Difference As Of ${monthName} ${year}`,
        `Cumulative Due As Of ${monthName} ${year}`,
        "Prepaid",
        "Cumulative Expense",
        "Additional Expense",
        "Day",
        `Outstanding End ${monthName} ${year}`
    ];

    ws.getRow(5).height = 42;
    headers.forEach((h, idx) => {
        const cell = ws.getCell(5, idx + 2);
        cell.value = h;
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF000000" } };
        cell.fill = fillSolid("AFEEEE"); // Pale turquoise matching sample
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = darkThinBorder;
    });

    // Rows 6 to N: Data rows
    let currentSNo = 1;
    const startDataRow = 6;
    let currentRow = startDataRow;

    rows.forEach((r) => {
        const isChildRow = r.stampDutyRow || r.utilityPaymentRow;
        const sNo = isChildRow ? "" : currentSNo++;

        const row = ws.getRow(currentRow);
        row.height = 20;

        const rowValues = [
            sNo,                                          // B: S/No
            r.boxFileNo || "",                            // C: Box File No
            r.categoryOfRent || "",                       // D: Category
            r.branchName || "",                           // E: Branch Name
            r.branchCode || "",                           // F: Branch Code
            r.ownerName || "",                            // G: Owner Name
            fmtDate(r.contractStartDate),                 // H: Contract Start
            fmtDate(r.contractEndDate),                   // I: Contract End
            r.totalNumberOfYears ?? 0,                    // J: Total No. of Years
            fmtDate(r.paymentPaidToDate),                 // K: Payment Paid to Date
            r.yearWithFraction ?? 0,                      // L: Year with Fraction
            r.meterSquare ?? 0,                           // M: Meter Square
            r.meterSquarePriceBeforeVat ?? 0,             // N: Price/m² Before VAT
            r.vatRate != null ? (r.vatRate * 100) + "%" : "", // O: VAT Rate
            r.meterSquarePriceAfterVat ?? 0,              // P: Price/m² After VAT
            r.monthlyRentWithVat ?? 0,                    // Q: Monthly Rent with VAT
            r.totalAnnualRentAmount ?? 0,                 // R: Total Annual Rent
            r.utilityPayment ?? 0,                        // S: Utility / Service Charge
            r.fullPayment ?? 0,                           // T: Full Payment
            r.totalPaymentPaidToDate ?? 0,                // U: Total Payment Paid
            r.remainingPayment ?? 0,                      // V: Remaining Payment
            r.outstandingBalancePriorMonth ?? 0,          // W: Outstanding Balance (Prev)
            r.rentExpenseForMonth ?? 0,                   // X: Rent Expense
            r.dueForMonth ?? 0,                           // Y: Due
            r.rentMinusDue ?? 0,                          // Z: Rent Expense − Due
            r.rentExpenseAsOf ?? 0,                       // AA: Rent Expense As Of
            r.dueDifferenceAsOf ?? 0,                     // AB: Due Difference As Of
            r.dueAsOf ?? 0,                               // AC: Due As Of
            r.prepaidOfficeRent ?? 0,                     // AD: Prepaid
            r.cumulativeExpense ?? 0,                     // AE: Cumulative Expense
            r.additionalExpense ?? 0,                     // AF: Additional Expense
            r.entryDay ?? "",                             // AG: Day
            r.outstandingBalanceEndOfMonth ?? 0           // AH: Outstanding End
        ];

        rowValues.forEach((val, cIdx) => {
            const cell = row.getCell(cIdx + 2);
            cell.value = val;
            cell.font = { name: "Calibri", size: 10 };
            cell.border = thinBorder;

            if ([0, 1, 2, 4, 6, 7, 9, 31].includes(cIdx)) {
                cell.alignment = { horizontal: "center", vertical: "middle" };
            } else if ([3, 5].includes(cIdx)) {
                cell.alignment = { horizontal: "left", vertical: "middle" };
            } else if ([8, 10].includes(cIdx)) {
                cell.alignment = { horizontal: "right", vertical: "middle" };
                if (typeof val === "number") {
                    cell.numFmt = cIdx === 10 ? "0.00000000" : "0.00";
                }
            } else if (cIdx === 13) {
                cell.alignment = { horizontal: "right", vertical: "middle" };
            } else if (typeof val === "number") {
                cell.alignment = { horizontal: "right", vertical: "middle" };
                cell.numFmt = "#,##0.00";
            }
        });

        currentRow++;
    });

    const endDataRow = currentRow - 1;
    const totalRowIdx = currentRow;

    // Total Row
    const totalRow = ws.getRow(totalRowIdx);
    totalRow.height = 22;

    totalRow.getCell(2).value = ""; // Col B
    totalRow.getCell(2).border = accountingTotalBorder;
    totalRow.getCell(2).fill = fillSolid("D3D3D3");

    totalRow.getCell(3).value = "Total"; // Col C
    totalRow.getCell(3).font = { name: "Calibri", size: 10, bold: true };
    totalRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    totalRow.getCell(3).border = accountingTotalBorder;
    totalRow.getCell(3).fill = fillSolid("D3D3D3");

    const numColsToSum = [10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34];
    for (let c = 4; c <= 34; c++) {
        const cell = totalRow.getCell(c);
        let colLetter = "";
        let tempC = c;
        while (tempC > 0) {
            const mod = (tempC - 1) % 26;
            colLetter = String.fromCharCode(65 + mod) + colLetter;
            tempC = Math.floor((tempC - mod) / 26);
        }

        if (numColsToSum.includes(c)) {
            cell.value = {
                formula: `SUM(${colLetter}${startDataRow}:${colLetter}${endDataRow})`
            };
            cell.numFmt = "#,##0.00";
        } else {
            cell.value = 0;
        }

        cell.font = { name: "Calibri", size: 10, bold: true };
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.border = accountingTotalBorder;
        cell.fill = fillSolid("D3D3D3");
    }

    // Two blank rows after total
    currentRow = totalRowIdx + 3;

    // Signatures
    const prepRow = ws.getRow(currentRow);
    prepRow.getCell(4).value = "Prepared By________________________________________";
    prepRow.getCell(4).font = { name: "Calibri", size: 11, bold: true };

    const checkRow = ws.getRow(currentRow + 2);
    checkRow.getCell(14).value = "Checked By________________________________________";
    checkRow.getCell(14).font = { name: "Calibri", size: 11, bold: true };

    currentRow = currentRow + 4;

    // Summary Box: Possible Entry for the Month of [Month]
    const possibleEntryTitleRow = currentRow;
    ws.mergeCells(possibleEntryTitleRow, 5, possibleEntryTitleRow, 7);
    const petCell = ws.getCell(possibleEntryTitleRow, 5);
    petCell.value = `Possible Entry for the Month of ${monthName}`;
    petCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
    petCell.alignment = { horizontal: "center", vertical: "middle" };
    petCell.fill = fillSolid("D99694");
    for (let c = 5; c <= 7; c++) ws.getCell(possibleEntryTitleRow, c).border = darkThinBorder;

    const subHdrRow = ws.getRow(possibleEntryTitleRow + 1);
    subHdrRow.height = 20;
    const subHdrs = ["Describtion", "Dr", "Cr"];
    subHdrs.forEach((sh, i) => {
        const c = subHdrRow.getCell(5 + i);
        c.value = sh;
        c.font = { name: "Calibri", size: 10, bold: true };
        c.alignment = { horizontal: "center", vertical: "middle" };
        c.fill = fillSolid("E6B9B8");
        c.border = darkThinBorder;
    });

    const rentExpCellRef = `X${totalRowIdx}`;
    const dueCellRef = `Y${totalRowIdx}`;

    // Expense Row
    const rExp = ws.getRow(possibleEntryTitleRow + 2);
    rExp.getCell(5).value = "Expense";
    rExp.getCell(5).font = { name: "Calibri", size: 10 };
    rExp.getCell(5).border = darkThinBorder;

    rExp.getCell(6).value = { formula: rentExpCellRef };
    rExp.getCell(6).font = { name: "Calibri", size: 10 };
    rExp.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
    rExp.getCell(6).numFmt = "#,##0.00";
    rExp.getCell(6).border = darkThinBorder;

    rExp.getCell(7).value = "";
    rExp.getCell(7).border = darkThinBorder;

    // Payable Row
    const rPay = ws.getRow(possibleEntryTitleRow + 3);
    rPay.getCell(5).value = "Payable";
    rPay.getCell(5).font = { name: "Calibri", size: 10 };
    rPay.getCell(5).border = darkThinBorder;

    rPay.getCell(6).value = "";
    rPay.getCell(6).border = darkThinBorder;

    rPay.getCell(7).value = { formula: dueCellRef };
    rPay.getCell(7).font = { name: "Calibri", size: 10 };
    rPay.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
    rPay.getCell(7).numFmt = "#,##0.00";
    rPay.getCell(7).border = darkThinBorder;

    // Prepaid Row
    const rPrep = ws.getRow(possibleEntryTitleRow + 4);
    rPrep.getCell(5).value = "Prepaid";
    rPrep.getCell(5).font = { name: "Calibri", size: 10 };
    rPrep.getCell(5).border = darkThinBorder;

    rPrep.getCell(6).value = "";
    rPrep.getCell(6).border = darkThinBorder;

    rPrep.getCell(7).value = { formula: `${rentExpCellRef}-${dueCellRef}` };
    rPrep.getCell(7).font = { name: "Calibri", size: 10 };
    rPrep.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
    rPrep.getCell(7).numFmt = "#,##0.00";
    rPrep.getCell(7).border = darkThinBorder;

    // Total Row
    const rTot = ws.getRow(possibleEntryTitleRow + 5);
    rTot.getCell(5).value = "Total";
    rTot.getCell(5).font = { name: "Calibri", size: 10, bold: true };
    rTot.getCell(5).fill = fillSolid("F2DCDB");
    rTot.getCell(5).border = accountingTotalBorder;

    rTot.getCell(6).value = {
        formula: `SUM(F${possibleEntryTitleRow + 2}:F${possibleEntryTitleRow + 4})`
    };
    rTot.getCell(6).font = { name: "Calibri", size: 10, bold: true };
    rTot.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
    rTot.getCell(6).numFmt = "#,##0.00";
    rTot.getCell(6).fill = fillSolid("F2DCDB");
    rTot.getCell(6).border = accountingTotalBorder;

    rTot.getCell(7).value = {
        formula: `SUM(G${possibleEntryTitleRow + 2}:G${possibleEntryTitleRow + 4})`
    };
    rTot.getCell(7).font = { name: "Calibri", size: 10, bold: true };
    rTot.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
    rTot.getCell(7).numFmt = "#,##0.00";
    rTot.getCell(7).fill = fillSolid("F2DCDB");
    rTot.getCell(7).border = accountingTotalBorder;

    // Save Workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    saveAs(blob, `Amortization_Report_${monthName}_${year}${category ? `_${category}` : ""}.xlsx`);
}

/* ─────────────────────────────────────────────────────────────
   2. GL TICKET EXPORT
   Matching tiketFormatt.xlsx (ATM, City, Outline & All Ticket)
   ───────────────────────────────────────────────────────────── */

let cachedLogoBuffer: ArrayBuffer | null = null;

async function loadLogoBuffer(): Promise<ArrayBuffer | null> {
    if (cachedLogoBuffer) return cachedLogoBuffer;
    try {
        if (typeof window !== "undefined") {
            const urls = [
                "/amortization/z-11.png",
                "/z-11.png",
                `${window.location.origin}/amortization/z-11.png`,
                `${window.location.origin}/z-11.png`
            ];
            for (const url of urls) {
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        cachedLogoBuffer = await res.arrayBuffer();
                        return cachedLogoBuffer;
                    }
                } catch {}
            }
        }
    } catch (e) {
        console.warn("Failed to load /z-11.png logo:", e);
    }
    return null;
}

function renderTicketSection(
    ws: ExcelJS.Worksheet,
    ticket: Ticket,
    startRow: number,
    reportDateStr: string,
    logoImageId: number | null
): { nextStartRow: number; debitTotalCellRef: string; creditTotalCellRef: string } {
    let r = startRow;

    // Header Box: B[r]:G[r+1]
    const headerStartRow = r;
    const headerEndRow = r + 1;

    ws.getRow(headerStartRow).height = 26;
    ws.getRow(headerEndRow).height = 28;

    // Top Center: "Date"
    ws.mergeCells(headerStartRow, 4, headerStartRow, 6);
    const dateLabelCell = ws.getCell(headerStartRow, 4);
    dateLabelCell.value = "Date";
    dateLabelCell.font = { name: "Calibri", size: 10, bold: true };
    dateLabelCell.alignment = { horizontal: "center", vertical: "middle" };

    // Top Right: Report Date
    const dateValCell = ws.getCell(headerStartRow, 7);
    dateValCell.value = reportDateStr;
    dateValCell.font = { name: "Calibri", size: 10, bold: true };
    dateValCell.alignment = { horizontal: "right", vertical: "middle" };

    // Bottom Center: Ticket Title (Underlined, bold)
    ws.mergeCells(headerEndRow, 4, headerEndRow, 6);
    const titleCell = ws.getCell(headerEndRow, 4);
    titleCell.value = ticket.title;
    titleCell.font = { name: "Calibri", size: 11, bold: true, underline: true, color: { argb: "FF000000" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Apply Solid White Fill & Box Border Margins across B to G
    for (let rowIdx = headerStartRow; rowIdx <= headerEndRow; rowIdx++) {
        for (let c = 2; c <= 7; c++) {
            const cell = ws.getCell(rowIdx, c);
            cell.fill = fillSolid("FFFFFF");
            const b: any = cell.border ? { ...cell.border } : {};
            if (rowIdx === headerStartRow) b.top = ticketBoxBorder.top;
            if (rowIdx === headerEndRow) b.bottom = ticketBoxBorder.bottom;
            if (c === 2) b.left = ticketBoxBorder.left;
            if (c === 7) b.right = ticketBoxBorder.right;
            cell.border = b;
        }
    }

    // Top Left: Zemen Bank logo (z-11.png)
    if (logoImageId !== null) {
        ws.addImage(logoImageId, {
            tl: { col: 1.15, row: headerStartRow - 1 + 0.12 },
            ext: { width: 125, height: 48 }
        });
    }

    r += 3;

    // DEBIT Header banner (B to G)
    ws.mergeCells(r, 2, r, 7);
    const debitBar = ws.getCell(r, 2);
    debitBar.value = "DEBIT";
    debitBar.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    debitBar.alignment = { horizontal: "center", vertical: "middle" };
    debitBar.fill = fillSolid("595959");
    for (let c = 2; c <= 7; c++) ws.getCell(r, c).border = darkThinBorder;
    ws.getRow(r).height = 22;

    r += 1;

    const tblHeaders = ["Branch Code", "Branch Name", "GL Number", "Description", "Amount", "In Respect Of  "];
    const hdrRow = ws.getRow(r);
    hdrRow.height = 22;
    tblHeaders.forEach((th, i) => {
        const c = hdrRow.getCell(2 + i);
        c.value = th;
        c.font = { name: "Calibri", size: 10, bold: true };
        c.alignment = { horizontal: i === 4 ? "right" : i === 5 ? "left" : "center", vertical: "middle" };
        c.fill = fillSolid("D9D9D9");
        c.border = darkThinBorder;
    });

    r += 1;
    const debitStartRow = r;
    ticket.debit.forEach((row) => {
        const dRow = ws.getRow(r);
        dRow.height = 20;

        dRow.getCell(2).value = row.branchCode;
        dRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
        dRow.getCell(2).border = darkThinBorder;

        dRow.getCell(3).value = row.branchName;
        dRow.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
        dRow.getCell(3).border = darkThinBorder;

        dRow.getCell(4).value = row.glNumber;
        dRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
        dRow.getCell(4).border = darkThinBorder;

        dRow.getCell(5).value = row.description;
        dRow.getCell(5).alignment = { horizontal: "left", vertical: "middle" };
        dRow.getCell(5).border = darkThinBorder;

        dRow.getCell(6).value = row.amount;
        dRow.getCell(6).numFmt = "#,##0.00";
        dRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
        dRow.getCell(6).border = darkThinBorder;

        dRow.getCell(7).value = row.inRespectOf;
        dRow.getCell(7).alignment = { horizontal: "left", vertical: "middle" };
        dRow.getCell(7).border = darkThinBorder;

        r += 1;
    });
    const debitEndRow = r - 1;

    // Debit Total Row
    ws.mergeCells(r, 2, r, 5);
    const dTotLabel = ws.getCell(r, 2);
    dTotLabel.value = "Debit Total";
    dTotLabel.font = { name: "Calibri", size: 10, bold: true };
    dTotLabel.alignment = { horizontal: "center", vertical: "middle" };
    dTotLabel.fill = fillSolid("D9D9D9");
    for (let c = 2; c <= 5; c++) ws.getCell(r, c).border = darkThinBorder;

    const dTotAmountCell = ws.getCell(r, 6);
    dTotAmountCell.value = { formula: `SUM(F${debitStartRow}:F${debitEndRow})` };
    dTotAmountCell.font = { name: "Calibri", size: 10, bold: true };
    dTotAmountCell.numFmt = "#,##0.00";
    dTotAmountCell.alignment = { horizontal: "right", vertical: "middle" };
    dTotAmountCell.fill = fillSolid("D9D9D9");
    dTotAmountCell.border = darkThinBorder;

    const dTotG = ws.getCell(r, 7);
    dTotG.border = darkThinBorder;
    dTotG.fill = fillSolid("D9D9D9");

    const debitTotalRef = `F${r}`;

    r += 2; // Blank row then CREDIT

    // CREDIT Header banner (B to G)
    ws.mergeCells(r, 2, r, 7);
    const creditBar = ws.getCell(r, 2);
    creditBar.value = "CREDIT";
    creditBar.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    creditBar.alignment = { horizontal: "center", vertical: "middle" };
    creditBar.fill = fillSolid("595959");
    for (let c = 2; c <= 7; c++) ws.getCell(r, c).border = darkThinBorder;
    ws.getRow(r).height = 22;

    r += 1;

    const crHdrRow = ws.getRow(r);
    crHdrRow.height = 22;
    tblHeaders.forEach((th, i) => {
        const c = crHdrRow.getCell(2 + i);
        c.value = th;
        c.font = { name: "Calibri", size: 10, bold: true };
        c.alignment = { horizontal: i === 4 ? "right" : i === 5 ? "left" : "center", vertical: "middle" };
        c.fill = fillSolid("D9D9D9");
        c.border = darkThinBorder;
    });

    r += 1;
    const creditStartRow = r;
    ticket.credit.forEach((row) => {
        const cRow = ws.getRow(r);
        cRow.height = 20;

        cRow.getCell(2).value = row.branchCode;
        cRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
        cRow.getCell(2).border = darkThinBorder;

        cRow.getCell(3).value = row.branchName;
        cRow.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
        cRow.getCell(3).border = darkThinBorder;

        cRow.getCell(4).value = row.glNumber;
        cRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
        cRow.getCell(4).border = darkThinBorder;

        cRow.getCell(5).value = row.description;
        cRow.getCell(5).alignment = { horizontal: "left", vertical: "middle" };
        cRow.getCell(5).border = darkThinBorder;

        cRow.getCell(6).value = row.amount;
        cRow.getCell(6).numFmt = "#,##0.00";
        cRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
        cRow.getCell(6).border = darkThinBorder;

        cRow.getCell(7).value = row.inRespectOf;
        cRow.getCell(7).alignment = { horizontal: "left", vertical: "middle" };
        cRow.getCell(7).border = darkThinBorder;

        r += 1;
    });
    const creditEndRow = r - 1;

    // Credit Total Row
    ws.mergeCells(r, 2, r, 5);
    const cTotLabel = ws.getCell(r, 2);
    cTotLabel.value = "Credit Total";
    cTotLabel.font = { name: "Calibri", size: 10, bold: true };
    cTotLabel.alignment = { horizontal: "center", vertical: "middle" };
    cTotLabel.fill = fillSolid("D9D9D9");
    for (let c = 2; c <= 5; c++) ws.getCell(r, c).border = darkThinBorder;

    const cTotAmountCell = ws.getCell(r, 6);
    cTotAmountCell.value = { formula: `SUM(F${creditStartRow}:F${creditEndRow})` };
    cTotAmountCell.font = { name: "Calibri", size: 10, bold: true };
    cTotAmountCell.numFmt = "#,##0.00";
    cTotAmountCell.alignment = { horizontal: "right", vertical: "middle" };
    cTotAmountCell.fill = fillSolid("D9D9D9");
    cTotAmountCell.border = darkThinBorder;

    const cTotG = ws.getCell(r, 7);
    cTotG.border = darkThinBorder;
    cTotG.fill = fillSolid("D9D9D9");

    const creditTotalRef = `F${r}`;

    r += 1;

    // Difference Check Row: Debit - Credit in Col D
    ws.getRow(r).height = 20;
    const diffCell = ws.getCell(r, 4);
    diffCell.value = { formula: `${debitTotalRef}-${creditTotalRef}` };
    diffCell.font = { name: "Calibri", size: 10, color: { argb: "FF666666" } };
    diffCell.numFmt = '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)';
    diffCell.alignment = { horizontal: "center", vertical: "middle" };

    r += 1;

    // Footer Card Box (Columns B to G)
    const cardStartRow = r;
    const cardEndRow = cardStartRow + 9;

    // Row 1: Spacer
    ws.getRow(cardStartRow).height = 16;

    // Row 2: IN RESPECT OF: (Centered across B to D)
    const inRespRowIdx = cardStartRow + 1;
    ws.getRow(inRespRowIdx).height = 24;
    ws.mergeCells(inRespRowIdx, 2, inRespRowIdx, 4);
    const inRespLabel = ws.getCell(inRespRowIdx, 2);
    inRespLabel.value = "IN RESPECT OF:";
    inRespLabel.font = { name: "Calibri", size: 10, bold: true };
    inRespLabel.alignment = { horizontal: "center", vertical: "middle" };

    // Row 3: Narration (Centered, Bold, Underlined across D to G)
    const narrRowIdx = cardStartRow + 2;
    ws.getRow(narrRowIdx).height = 26;
    ws.mergeCells(narrRowIdx, 4, narrRowIdx, 7);
    const inRespContent = ws.getCell(narrRowIdx, 4);
    inRespContent.value = ticket.narration;
    inRespContent.font = { name: "Calibri", size: 11, bold: true, underline: true };
    inRespContent.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Row 4: AMOUNT IN WORDS: (Left-aligned across B to E)
    const amtWordsRowIdx = cardStartRow + 3;
    ws.getRow(amtWordsRowIdx).height = 24;
    ws.mergeCells(amtWordsRowIdx, 2, amtWordsRowIdx, 5);
    const amtWordsLabel = ws.getCell(amtWordsRowIdx, 2);
    amtWordsLabel.value = "AMOUNT IN WORDS:";
    amtWordsLabel.font = { name: "Calibri", size: 10, bold: true };
    amtWordsLabel.alignment = { horizontal: "left", vertical: "middle" };

    // Row 5: BIRR (Centered in Col D)
    const birrRowIdx = cardStartRow + 4;
    ws.getRow(birrRowIdx).height = 22;
    const birrCell = ws.getCell(birrRowIdx, 4);
    birrCell.value = "BIRR";
    birrCell.font = { name: "Calibri", size: 10, bold: true };
    birrCell.alignment = { horizontal: "center", vertical: "middle" };

    // Row 6: Spelled Words (Centered across Col D to F)
    const wordsRowIdx = cardStartRow + 5;
    ws.getRow(wordsRowIdx).height = 28;
    ws.mergeCells(wordsRowIdx, 4, wordsRowIdx, 6);
    const wordsCell = ws.getCell(wordsRowIdx, 4);
    wordsCell.value = ticket.creditTotal > 0
        ? `${numberToWords(ticket.creditTotal).toUpperCase()} ONLY`
        : "ZERO ONLY";
    wordsCell.font = { name: "Calibri", size: 10, bold: true };
    wordsCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // Row 7: Spacer
    ws.getRow(cardStartRow + 6).height = 20;

    // Row 8: Authorized Signature Line (Merged F to G)
    const sigLineRowIdx = cardStartRow + 7;
    ws.getRow(sigLineRowIdx).height = 22;
    ws.mergeCells(sigLineRowIdx, 6, sigLineRowIdx, 7);
    const sigLineCell = ws.getCell(sigLineRowIdx, 6);
    sigLineCell.value = "………………………………………………………………………………………………………………………………";
    sigLineCell.font = { name: "Calibri", size: 10, bold: true };
    sigLineCell.alignment = { horizontal: "center", vertical: "middle" };

    // Row 9: Authorized Signature Label (Merged F to G, centered)
    const sigLabelRowIdx = cardStartRow + 8;
    ws.getRow(sigLabelRowIdx).height = 20;
    ws.mergeCells(sigLabelRowIdx, 6, sigLabelRowIdx, 7);
    const sigLabel = ws.getCell(sigLabelRowIdx, 6);
    sigLabel.value = "Authorized Signature";
    sigLabel.font = { name: "Calibri", size: 10, bold: true };
    sigLabel.alignment = { horizontal: "center", vertical: "middle" };

    // Row 10: Closing Spacer
    ws.getRow(cardEndRow).height = 18;

    // Apply Solid White Fill & Box Border Margins across B to G
    for (let rowIdx = cardStartRow; rowIdx <= cardEndRow; rowIdx++) {
        for (let c = 2; c <= 7; c++) {
            const cell = ws.getCell(rowIdx, c);
            cell.fill = fillSolid("FFFFFF");
            const b: any = cell.border ? { ...cell.border } : {};
            if (rowIdx === cardStartRow) b.top = ticketBoxBorder.top;
            if (rowIdx === cardEndRow) b.bottom = ticketBoxBorder.bottom;
            if (c === 2) b.left = ticketBoxBorder.left;
            if (c === 7) b.right = ticketBoxBorder.right;
            cell.border = b;
        }
    }

    r = cardEndRow + 3;

    return { nextStartRow: r, debitTotalCellRef: debitTotalRef, creditTotalCellRef: creditTotalRef };
}

export async function exportGLTicketToExcel(
    tickets: Ticket | Ticket[],
    month: number,
    year: number,
    categoryName: string
) {
    const ticketList = Array.isArray(tickets) ? tickets : [tickets];
    if (!ticketList.length) {
        throw new Error("No ticket data available to export.");
    }

    const monthName = MONTHS[month - 1] ?? `Month_${month}`;
    const now = new Date();
    const day = now.getDate();
    const monthShort = now.toLocaleDateString("en-GB", { month: "short" });
    const yearNum = now.getFullYear();
    const reportDateStr = `${day}-${monthShort}-${yearNum}`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Zemen Bank Amortization System";
    workbook.created = new Date();

    let logoImageId: number | null = null;
    try {
        if (Z11_LOGO_BASE64) {
            logoImageId = workbook.addImage({
                base64: Z11_LOGO_BASE64,
                extension: "png",
            });
        }
    } catch (e) {
        console.warn("Failed to add base64 logo image to workbook:", e);
    }

    if (logoImageId === null) {
        const logoBuffer = await loadLogoBuffer();
        if (logoBuffer) {
            logoImageId = workbook.addImage({
                buffer: logoBuffer,
                extension: "png",
            });
        }
    }

    const isAll = ticketList.length > 1 || categoryName === "All";
    const sheetName = isAll ? "All Ticket" : `${categoryName} Ticket`;

    const ws = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: true }]
    });

    ws.columns = [
        { width: 4 },   // A - margin
        { width: 14 },  // B - Branch Code
        { width: 32 },  // C - Branch Name
        { width: 14 },  // D - GL Number
        { width: 30 },  // E - Description
        { width: 22 },  // F - Amount
        { width: 100 }, // G - In Respect Of
    ];

    let currentStartRow = 2;
    const debitTotalRefs: string[] = [];

    ticketList.forEach((t) => {
        const result = renderTicketSection(ws, t, currentStartRow, reportDateStr, logoImageId);
        debitTotalRefs.push(result.debitTotalCellRef);
        currentStartRow = result.nextStartRow;
    });

    if (ticketList.length > 1) {
        const grandTotalRow = ws.getRow(currentStartRow);
        grandTotalRow.height = 24;

        ws.mergeCells(currentStartRow, 2, currentStartRow, 5);
        const gtLabel = ws.getCell(currentStartRow, 2);
        gtLabel.value = "GRAND TOTAL";
        gtLabel.font = { name: "Calibri", size: 11, bold: true };
        gtLabel.alignment = { horizontal: "center", vertical: "middle" };
        gtLabel.fill = fillSolid("D9D9D9");
        for (let c = 2; c <= 5; c++) ws.getCell(currentStartRow, c).border = accountingTotalBorder;

        const gtAmount = ws.getCell(currentStartRow, 6);
        gtAmount.value = { formula: debitTotalRefs.join("+") };
        gtAmount.font = { name: "Calibri", size: 11, bold: true };
        gtAmount.numFmt = "#,##0.00";
        gtAmount.alignment = { horizontal: "right", vertical: "middle" };
        gtAmount.fill = fillSolid("D9D9D9");
        gtAmount.border = accountingTotalBorder;

        const gtG = ws.getCell(currentStartRow, 7);
        gtG.fill = fillSolid("D9D9D9");
        gtG.border = accountingTotalBorder;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const fileName = isAll
        ? `GL_All_Tickets_${monthName}_${year}.xlsx`
        : `GL_Ticket_${categoryName}_${monthName}_${year}.xlsx`;

    saveAs(blob, fileName);
}

/* ─────────────────────────────────────────────────────────────
   3. EXPENSE UPLOAD EXPORT
   Matching Expense Upload (3).xlsx
   Columns: Branch_Code | Amount | Entry | Narrative | GL_Account
   ───────────────────────────────────────────────────────────── */
export async function exportExpenseUploadToExcel(
    rows: AmortizationReportRow[],
    month: number,
    year: number
) {
    if (!rows.length) {
        throw new Error("No data available to generate Expense Upload.");
    }

    const monthName = MONTHS[month - 1];
    const lbl = `${monthName} ${year}`;
    const lblWithComma = `${monthName} ,${year}`;

    // Separate rows by category
    const atmRows = rows.filter(r => (r.categoryOfRent || "").toUpperCase().includes("ATM"));
    const cityRows = rows.filter(r => (r.categoryOfRent || "").toUpperCase().includes("CITY"));
    const outlineRows = rows.filter(r => (r.categoryOfRent || "").toUpperCase().includes("OUTLINE"));

    // Fallback: If categories aren't set on some rows, categorize remaining
    const remainingRows = rows.filter(r =>
        !atmRows.includes(r) && !cityRows.includes(r) && !outlineRows.includes(r)
    );

    type ExpenseRow = {
        branchCode: string | number;
        amount: number;
        entry: "D" | "C";
        narrative: string;
        glAccount: string | number;
    };

    const debitRows: ExpenseRow[] = [];
    const creditRows: ExpenseRow[] = [];

    /* ─── 1. ATM DEBITS & CREDITS ─── */
    if (atmRows.length > 0) {
        const office = atmRows.filter(r => !r.stampDutyRow && !r.utilityPaymentRow);
        const utility = atmRows.filter(r => r.utilityPaymentRow);

        const totalExp = office.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);
        const utilityTotal = utility.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);
        const totalDue = office.reduce((s, r) => s + (r.dueForMonth ?? 0), 0);
        const totalPrepaid = totalExp - totalDue;

        // ATM Office Rent Debit
        if (totalExp > 0) {
            debitRows.push({
                branchCode: 108,
                amount: totalExp,
                entry: "D",
                narrative: `ATM Space Rent for the Month of ${lbl}.`,
                glAccount: 502149
            });
        }

        // ATM Utility Debits (separate single rows)
        utility.forEach(u => {
            const uAmt = u.rentExpenseForMonth ?? 0;
            if (uAmt > 0) {
                debitRows.push({
                    branchCode: isNaN(Number(u.branchCode)) ? u.branchCode : Number(u.branchCode),
                    amount: uAmt,
                    entry: "D",
                    narrative: `Utility payment for ${u.branchName} for the month of ${lbl}.`,
                    glAccount: 502170
                });
            }
        });

        // ATM Credits
        if (totalDue > 0) {
            creditRows.push({
                branchCode: "000",
                amount: totalDue,
                entry: "C",
                narrative: `Amount held under A/P Miscellaneous for different  ATM space rent for the month of ${lblWithComma}.`,
                glAccount: 208130
            });
        }
        if (totalPrepaid > 0) {
            creditRows.push({
                branchCode: "000",
                amount: totalPrepaid,
                entry: "C",
                narrative: `ATM Space Rent for the Month of ${lbl}.`,
                glAccount: 104401
            });
        }
        if (utilityTotal > 0) {
            creditRows.push({
                branchCode: "000",
                amount: utilityTotal,
                entry: "C",
                narrative: `Utility payment payable for the month of ${lbl}.`,
                glAccount: 208130
            });
        }
    }

    /* ─── 2. CITY BRANCHES DEBITS & CREDITS ─── */
    if (cityRows.length > 0) {
        const contracts = new Map<number, AmortizationReportRow[]>();
        cityRows.forEach(r => {
            const g = contracts.get(r.leaseContractId) ?? [];
            g.push(r);
            contracts.set(r.leaseContractId, g);
        });

        let totalExp = 0;
        let totalDue = 0;

        contracts.forEach(group => {
            const sdRow = group.find(r => r.stampDutyRow);
            const officeRow = group.find(r => !r.stampDutyRow && !r.utilityPaymentRow);
            const utilityRows = group.filter(r => r.utilityPaymentRow);

            // Stamp Duty included in Office Rent
            const amount = (sdRow?.total ?? 0) + (officeRow?.rentExpenseForMonth ?? 0);
            const due = group.reduce((s, r) => s + (r.dueForMonth ?? 0), 0);
            const utilityAmount = utilityRows.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);

            totalExp += amount + utilityAmount;
            totalDue += due;

            if (officeRow && amount > 0) {
                debitRows.push({
                    branchCode: isNaN(Number(officeRow.branchCode)) ? officeRow.branchCode : Number(officeRow.branchCode),
                    amount,
                    entry: "D",
                    narrative: `Office rent and stamp duty expense of ${officeRow.branchName} for the month of ${lblWithComma}.`,
                    glAccount: 502149
                });
            }

            // Utility added as single separate row
            utilityRows.forEach(u => {
                const uAmt = u.rentExpenseForMonth ?? 0;
                if (uAmt > 0) {
                    debitRows.push({
                        branchCode: isNaN(Number(u.branchCode)) ? u.branchCode : Number(u.branchCode),
                        amount: uAmt,
                        entry: "D",
                        narrative: `Utility Expense of ${u.branchName} for the month of ${lblWithComma}.`,
                        glAccount: 502170
                    });
                }
            });
        });

        const totalPrepaid = totalExp - totalDue;

        if (totalPrepaid > 0) {
            creditRows.push({
                branchCode: "000",
                amount: totalPrepaid,
                entry: "C",
                narrative: `Office rent and stamp duty expense of City Branches for the month of ${lblWithComma}.`,
                glAccount: 104401
            });
        }
        if (totalDue > 0) {
            creditRows.push({
                branchCode: "000",
                amount: totalDue,
                entry: "C",
                narrative: `Amount held under A/P Miscellaneous for different  Office and ATM  space rent for the month of ${lblWithComma}.`,
                glAccount: 208130
            });
        }
    }

    /* ─── 3. OUTLINE BRANCHES DEBITS & CREDITS ─── */
    const outlinePool = [...outlineRows, ...remainingRows];
    if (outlinePool.length > 0) {
        const contracts = new Map<number, AmortizationReportRow[]>();
        outlinePool.forEach(r => {
            const g = contracts.get(r.leaseContractId) ?? [];
            g.push(r);
            contracts.set(r.leaseContractId, g);
        });

        let totalExp = 0;
        let totalDue = 0;

        contracts.forEach(group => {
            const sdRow = group.find(r => r.stampDutyRow);
            const officeRow = group.find(r => !r.stampDutyRow && !r.utilityPaymentRow);
            const utilityRows = group.filter(r => r.utilityPaymentRow);

            const amount = (sdRow?.total ?? 0) + (officeRow?.rentExpenseForMonth ?? 0);
            const due = group.reduce((s, r) => s + (r.dueForMonth ?? 0), 0);
            const utilityAmount = utilityRows.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);

            totalExp += amount + utilityAmount;
            totalDue += due;

            if (officeRow && amount > 0) {
                debitRows.push({
                    branchCode: isNaN(Number(officeRow.branchCode)) ? officeRow.branchCode : Number(officeRow.branchCode),
                    amount,
                    entry: "D",
                    narrative: `Office rent and stamp duty expense of ${officeRow.branchName} for the month of ${lblWithComma}.`,
                    glAccount: 502149
                });
            }

            utilityRows.forEach(u => {
                const uAmt = u.rentExpenseForMonth ?? 0;
                if (uAmt > 0) {
                    debitRows.push({
                        branchCode: isNaN(Number(u.branchCode)) ? u.branchCode : Number(u.branchCode),
                        amount: uAmt,
                        entry: "D",
                        narrative: `Utility Expense of ${u.branchName} for the month of ${lblWithComma}.`,
                        glAccount: 502170
                    });
                }
            });
        });

        const totalPrepaid = totalExp - totalDue;

        if (totalPrepaid > 0) {
            creditRows.push({
                branchCode: "000",
                amount: totalPrepaid,
                entry: "C",
                narrative: `Office rent and stamp duty expense of Outline Branches for the month of ${lblWithComma}.`,
                glAccount: 104401
            });
        }
        if (totalDue > 0) {
            creditRows.push({
                branchCode: "000",
                amount: totalDue,
                entry: "C",
                narrative: `Office rent and stamp duty expense of Outline Branches for the month of ${lblWithComma}.`,
                glAccount: 208130
            });
        }
    }

    // Build Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Zemen Bank Amortization System";
    workbook.created = new Date();

    const ws = workbook.addWorksheet("Sheet1", {
        views: [{ showGridLines: true }]
    });

    ws.columns = [
        { width: 14 }, // A: Branch_Code
        { width: 18 }, // B: Amount
        { width: 10 }, // C: Entry
        { width: 75 }, // D: Narrative
        { width: 14 }, // E: GL_Account
    ];

    // Row 1: Headers
    const headers = ["Branch_Code", "Amount", "Entry", "Narrative", "GL_Account"];
    const hdrRow = ws.getRow(1);
    hdrRow.height = 20;
    headers.forEach((h, idx) => {
        const cell = hdrRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 11, bold: true };
        cell.alignment = { horizontal: idx === 1 ? "right" : idx === 3 ? "left" : "center", vertical: "middle" };
    });

    // Populate all Debits first, then all Credits
    const allExpenseRows = [...debitRows, ...creditRows];
    let rIdx = 2;

    allExpenseRows.forEach(item => {
        const row = ws.getRow(rIdx);
        row.height = 19;

        const c1 = row.getCell(1); // Branch_Code
        c1.value = item.branchCode;
        c1.alignment = { horizontal: "center", vertical: "middle" };

        const c2 = row.getCell(2); // Amount
        c2.value = item.amount;
        c2.numFmt = "#,##0.00";
        c2.alignment = { horizontal: "right", vertical: "middle" };

        const c3 = row.getCell(3); // Entry
        c3.value = item.entry;
        c3.alignment = { horizontal: "center", vertical: "middle" };

        const c4 = row.getCell(4); // Narrative
        c4.value = item.narrative;
        c4.alignment = { horizontal: "left", vertical: "middle" };

        const c5 = row.getCell(5); // GL_Account
        c5.value = item.glAccount;
        c5.alignment = { horizontal: "center", vertical: "middle" };

        rIdx++;
      
    });
   
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    saveAs(blob, `Expense_Upload_${monthName}_${year}.xlsx`);
}
