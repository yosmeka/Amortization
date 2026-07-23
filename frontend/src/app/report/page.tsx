"use client";
import { useState } from "react";
import { AmortizationReportRow, fetchReport, saveEntry, fetchPrepaidSuggestion, fetchLeases, assignBoxFileNo } from "@/lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function fmt(n: number | undefined | null) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** 8-decimal formatting for amortization chain (outstanding, prorated rent, due, prepaid). */
function fmtCalc(n: number | undefined | null) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}
function fmtDate(s: string | undefined | null) {
    if (!s) return "—";
    const d = new Date(s);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type EditableField = "dueForMonth" | "prepaidOfficeRent";

const CATEGORIES = ["ATM", "Outline", "City"];


export default function ReportPage() {
    useAuthGuard();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [category, setCategory] = useState("");   // "" = all
    const [rows, setRows] = useState<AmortizationReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error"
    } | null>(null);

    // Modal state for Box File Assignment
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [allLeases, setAllLeases] = useState<any[]>([]);
    const [selectedLeases, setSelectedLeases] = useState<number[]>([]);
    const [boxFileNoToAssign, setBoxFileNoToAssign] = useState("");
    const [assignSearch, setAssignSearch] = useState("");
    const [assignCategory, setAssignCategory] = useState("All");
    const [assignLoading, setAssignLoading] = useState(false);

    const openAssignModal = async () => {
        setShowAssignModal(true);
        try {
            const data = await fetchLeases();
            setAllLeases(data);
        } catch {
            alert("Failed to load leases for assignment.");
        }
    };

    const handleAssignBoxFileNo = async () => {
        if (selectedLeases.length === 0) {
            alert("Please select at least one contract.");
            return;
        }
        setAssignLoading(true);
        try {
            await assignBoxFileNo(selectedLeases, boxFileNoToAssign);
            setToast({
                type: "success",
                message: `Successfully assigned Box File No "${boxFileNoToAssign || "empty"}" to ${selectedLeases.length} contract(s).`
            });
            setTimeout(() => setToast(null), 4000);
            setSelectedLeases([]);
            setBoxFileNoToAssign("");
            setShowAssignModal(false);
            if (rows.length > 0) {
                await load();
            }
        } catch (err: any) {
            alert(err.message || "Failed to assign Box File No.");
        } finally {
            setAssignLoading(false);
        }
    };

    const exportToExcel = () => {
    if (!rows.length) {
        alert("No data available to export.");
        return;
    }

    // Prepare data rows
    const data = rows.map((r, index) => ({
        "S/No": r.stampDutyRow ? "" : index + 1,
        "Box File No": r.boxFileNo || "",
        "Category of Rent": r.categoryOfRent,
        "Branch Name": r.branchName,
        "Branch Code": r.branchCode,
        "Owner Name": r.ownerName,
        "Contract Start": fmtDate(r.contractStartDate),
        "Contract End": fmtDate(r.contractEndDate),
        "Total No. of Years": r.totalNumberOfYears,
        "Payment Paid to Date": fmtDate(r.paymentPaidToDate),
        "Year with Fraction": r.yearWithFraction,
        "Meter Square": r.meterSquare,
        "Price/m² Before VAT": r.meterSquarePriceBeforeVat,
        "VAT Rate": r.vatRate != null ? (r.vatRate * 100) + "%" : "—",
        "Price/m² After VAT": r.meterSquarePriceAfterVat,
        "Monthly Rent with VAT": r.monthlyRentWithVat,
        "Total Annual Rent": r.totalAnnualRentAmount,
        "Utility / Service Charge": r.utilityPayment,
        "Full Payment": r.fullPayment,
        "Total Payment Paid": r.totalPaymentPaidToDate,
        "Remaining Payment": r.remainingPayment,
        "Outstanding Balance (Prev)": r.outstandingBalancePriorMonth,
        "Rent Expense": r.rentExpenseForMonth,
        "Due": r.dueForMonth,
        "Rent Expense − Due": r.rentMinusDue,
        "Reent Expense As Of": r.rentExpenseAsOf,
        "Due Difference As Of": r.dueDifferenceAsOf,
        "Prepaid": r.prepaidOfficeRent,
        "Additional Expense": r.additionalExpense,
        "Day": r.entryDay,
        "Outstanding End": r.outstandingBalanceEndOfMonth
    }));

    // Add total row
    const totalRow = {
        "S/No": "TOTAL",
        "Box File No": "",
        "Category of Rent": "",
        "Branch Name": "",
        "Branch Code": "",
        "Owner Name": "",
        "Contract Start": "",
        "Contract End": "",
        "Total No. of Years": 0,
        "Payment Paid to Date": "",
        "Year with Fraction": 0,
        "Meter Square": rows.reduce((sum, r) => sum + (r.meterSquare || 0), 0),
        "Price/m² Before VAT": rows.reduce((sum, r) => sum + (r.meterSquarePriceBeforeVat || 0), 0),
        "VAT Rate": "",
        "Price/m² After VAT": rows.reduce((sum, r) => sum + (r.meterSquarePriceAfterVat || 0), 0),
        "Monthly Rent with VAT": rows.reduce((sum, r) => sum + (r.monthlyRentWithVat || 0), 0),
        "Total Annual Rent": rows.reduce((sum, r) => sum + (r.totalAnnualRentAmount || 0), 0),
        "Utility / Service Charge": rows.reduce((sum, r) => sum + (r.utilityPayment || 0), 0),
        "Full Payment": rows.reduce((sum, r) => sum + (r.fullPayment || 0), 0),
        "Total Payment Paid": rows.reduce((sum, r) => sum + (r.totalPaymentPaidToDate || 0), 0),
        "Remaining Payment": rows.reduce((sum, r) => sum + (r.remainingPayment || 0), 0),
        "Outstanding Balance (Prev)": rows.reduce((sum, r) => sum + (r.outstandingBalancePriorMonth || 0), 0),
        "Rent Expense": rows.reduce((sum, r) => sum + (r.rentExpenseForMonth || 0), 0),
        "Due": rows.reduce((sum, r) => sum + (r.dueForMonth || 0), 0),
        "Rent Expense − Due": 0,
        "Reent Expense As Of": 0,
        "Due Difference As Of": 0,
        "Prepaid": rows.reduce((sum, r) => sum + (r.prepaidOfficeRent || 0), 0),
        "Additional Expense": rows.reduce((sum, r) => sum + (r.additionalExpense || 0), 0),
        "Day": 0,
        "Outstanding End": rows.reduce((sum, r) => sum + (r.outstandingBalanceEndOfMonth || 0), 0)
    };
    data.push(totalRow);

const monthName = MONTHS[month - 1];
const categoryText = category ? ` - ${category}` : " (All Categories)";

// Column headers
const headers = Object.keys(data[0]);

// Create an empty worksheet
const worksheet = XLSX.utils.aoa_to_sheet([]);

// --------------------
// Row 1 : Title
// --------------------
XLSX.utils.sheet_add_aoa(
    worksheet,
    [[`Monthly Amortization Report for ${monthName} ${year}${categoryText}`]],
    { origin: "A1" }
);

// --------------------
// Row 2 : Column Headers
// --------------------
XLSX.utils.sheet_add_aoa(
    worksheet,
    [headers],
    { origin: "A2" }
);

// --------------------
// Row 3 : Data
// --------------------
XLSX.utils.sheet_add_json(
    worksheet,
    data,
    {
        origin: "A3",
        skipHeader: true
    }
);

// Merge title
const numCols = headers.length;

worksheet["!merges"] = [
    {
        s: { r: 0, c: 0 },
        e: { r: 0, c: numCols - 1 }
    }
];

// Optional title style (works only with xlsx-style / SheetJS Pro)
worksheet["A1"].s = {
    font: {
        bold: true,
        sz: 16
    },
    alignment: {
        horizontal: "center",
        vertical: "center"
    }
};

// Row height for title
worksheet["!rows"] = [
    { hpt: 24 }
];

    // Optimized column widths
  worksheet["!cols"] = [
        { wch: 6 },   // S/No
        { wch: 6 },  // Box File No
        { wch: 9 },  // Category of Rent
        { wch: 30 },  // Branch Name
        { wch: 9 },  // Branch Code
        { wch: 28 },  // Owner Name
        { wch: 14 },  // Contract Start
        { wch: 14 },  // Contract End
        { wch: 12 },  // Total No. of Years
        { wch: 16 },  // Payment Paid to Date
        { wch: 14 },  // Year with Fraction
        { wch: 12 },  // Meter Square
        { wch: 14 },  // Price/m² Before VAT
        { wch: 6 },  // VAT Rate
        { wch: 14 },  // Price/m² After VAT
        { wch: 14 },  // Monthly Rent with VAT
        { wch: 14 },  // Total Annual Rent
        { wch: 14 },  // Utility / Service Charge
        { wch: 14 },  // Full Payment
        { wch: 14 },  // Total Payment Paid
        { wch: 14 },  // Remaining Payment
        { wch: 18},  // Outstanding Balance (Prev)
        { wch: 18 },  // Rent Expense
        { wch: 12 },  // Total
        { wch: 18 },  // Due
        { wch: 14 },  // Rent Expense − Due
        { wch: 18 },  // Rent Expense As Of
        { wch: 18 },  // Due Difference As Of
        { wch: 14 },  // Prepaid
        { wch: 14 },  // Additional Expense
        { wch: 8 },   // Day
        { wch: 16 },  // Outstanding End
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const file = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    saveAs(file, `Amortization_Report_${monthName}_${year}${category ? `_${category}` : ""}.xlsx`);
};



    const handlePrint = () => {
        window.print();
    };

    // Editable fields per row (key = `${leaseId}-${isSD}`)
    const [edits, setEdits] = useState<Record<string, {
        rentExpense: string;   // override; empty = auto-calculate
        due: string;
        prepaid: string;
        additionalExpense: string;
        entryDay: string;     // 1-31 or empty
    }>>({});



    const load = async () => {
        setLoading(true); setError("");
        try {
            const data = await fetchReport(month, year, category || undefined);
            setRows(data);
            // Seed edits from loaded data
            const init: typeof edits = {};
            data.forEach(r => {
                const key = `${r.leaseContractId}-${r.stampDutyRow}`;
                init[key] = {
                    rentExpense: r.rentExpenseOverridden ? (r.rentExpenseForMonth?.toString() ?? "") : "",
                    due: r.dueForMonthOverridden ? (r.dueForMonth?.toString() ?? "") : "",
                    prepaid: r.prepaidOfficeRent?.toString() ?? "0",
                    additionalExpense: r.additionalExpense?.toString() ?? "0",
                    entryDay: r.entryDay?.toString() ?? "",
                };
            });
            setEdits(init);
        } catch { setError("Failed to load report. Is the backend running?"); }
        finally { setLoading(false); }
    };

    const handleEdit = (key: string, field: string, value: string) =>
        setEdits(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

    const calcPrepaid = async (row: AmortizationReportRow) => {
        const key = `${row.leaseContractId}-${row.stampDutyRow}`;
        try {
            const data = await fetchPrepaidSuggestion(row.leaseContractId, month, year, row.stampDutyRow);

            if (data.alreadyFilled) {
                const monthName = MONTHS[(data.filledMonth || 1) - 1];
                const amount = data.filledAmount
                    ? data.filledAmount.toLocaleString("en-ET", { minimumFractionDigits: 2 })
                    : "0.00";

                setToast({
                    type: "success",
                    message: `Prepaid has already been filled on ${monthName} ${data.filledYear} with amount ${amount}.`,
                });

                // Auto-hide toast after 5 seconds
                setTimeout(() => setToast(null), 5000);

                handleEdit(key, "prepaid", "0");
            } else {
                // Normal suggestion
                handleEdit(key, "prepaid", data.suggestedPrepaid?.toString() ?? "0");
            }
        } catch {
            setToast({
                type: "error",
                message: "Could not calculate prepaid suggestion. Please try again.",
            });
            setTimeout(() => setToast(null), 4000);
        }
    };

    const handleSave = async (row: AmortizationReportRow) => {
        const key = `${row.leaseContractId}-${row.stampDutyRow}`;
        const e = edits[key] ?? { rentExpense: "", due: "0", prepaid: "0", additionalExpense: "0", entryDay: "" };
        setSaving(key);
        try {
            await saveEntry(
                row.leaseContractId, row.stampDutyRow, month, year,
                {
                    rentExpenseForMonth: e.rentExpense !== "" ? parseFloat(e.rentExpense) : null,
                    dueForMonth: parseFloat(e.due) || 0,
                    prepaidOfficeRent: parseFloat(e.prepaid) || 0,
                    additionalExpense: parseFloat(e.additionalExpense) || 0,
                    entryDay: e.entryDay !== "" ? parseInt(e.entryDay) : null,
                }
            );
            await load();
        } catch { alert("Save failed. Please try again."); }
        finally { setSaving(null); }
    };

    // Client-side search across branch name, branch code, owner, category
    const q = search.trim().toLowerCase();
    const filteredRows = q
        ? rows.filter(r =>
            (r.branchName ?? "").toLowerCase().includes(q) ||
            (r.branchCode ?? "").toLowerCase().includes(q) ||
            (r.ownerName ?? "").toLowerCase().includes(q) ||
            (r.categoryOfRent ?? "").toLowerCase().includes(q)
        )
        : rows;

    // Group by leaseContractId for total-row logic
    const groupedIds = [...new Set(filteredRows.map(r => r.leaseContractId))];

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginBottom: "1rem" }}>
                <button onClick={exportToExcel} className="btn btn-success btn-sm">
                    📥 Export Excel
                </button>
                <button onClick={handlePrint} className="btn btn-secondary btn-sm">
                    🖨 Print
                </button>
            </div>
            <div className="page-header">
                <h2>Monthly Amortization Report</h2>
                <p>Select a month and year to generate the full 22-column report. Edit &quot;Due&quot; and &quot;Prepaid&quot; inline then click Save.</p>
            </div>

            {/* ── Filter bar ── */}
            <div className="filter-bar">
                <label>Month:</label>
                <select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <label>Year:</label>
                <input type="number" value={year} min={2000} max={2100}
                    onChange={e => setYear(parseInt(e.target.value) || year)}
                    style={{ width: 90 }} />
                <label>Category:</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ minWidth: 140 }}>
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={load}
                    disabled={loading}
                    style={{ whiteSpace: "nowrap" }}
                >
                    {loading ? "⏳ Generating…" : "📊 Generate Report"}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={openAssignModal}
                    style={{ whiteSpace: "nowrap", marginLeft: "4px" }}
                >
                    📁 Assign Box File No
                </button>

                {toast && (
                    <div
                        style={{
                            position: "fixed",
                            top: "20px",
                            right: "20px",
                            background: toast.type === "success" ? "#10b981" : "#ef4444",
                            color: "white",
                            padding: "14px 20px",
                            borderRadius: "8px",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.2)",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            zIndex: 9999,
                            fontSize: "0.95rem",
                            maxWidth: "380px",
                        }}
                    >
                        {toast.type === "success" ? "✅" : "❌"}
                        <span style={{ flex: 1 }}>{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            style={{
                                background: "none",
                                border: "none",
                                color: "white",
                                fontSize: "1.4rem",
                                lineHeight: 1,
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}
                {/* Search */}
                <input
                    type="search"
                    placeholder="🔍 Search branch, owner, category…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        minWidth: 220, padding: "0.4rem 0.75rem", borderRadius: 8,
                        border: "1.5px solid #cbd5e1", fontSize: "0.88rem"
                    }} />
                <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
                    {loading ? "⏳ Loading…" : "🔍 Generate Report"}
                </button>
                <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "0.82rem" }}>
                    Report period: <strong>{MONTHS[month - 1]} {year}</strong>
                    {category && <> &nbsp;·&nbsp; Category: <strong>{category}</strong></>}
                </span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {!loading && rows.length === 0 && !error && (
                <div className="alert" style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                    No active contracts found for {MONTHS[month - 1]} {year}.
                </div>
            )}

            {rows.length > 0 && (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>S/No</th>
                                <th>Box File No</th>
                                <th>Category of Rent</th>
                                <th>Branch Name</th>
                                <th>Branch Code</th>
                                <th>Owner Name</th>
                                <th>Contract Start</th>
                                <th>Contract End</th>
                                <th>Total No. of Years</th>
                                <th>Payment Paid to Date</th>
                                <th>Year with Fraction</th>
                                <th>Meter Square</th>
                                <th>Price/m² Before VAT</th>
                                <th>VAT Rate</th>
                                <th>Price/m² After VAT</th>
                                <th>Monthly Rent with VAT</th>
                                <th>Total Annual Rent</th>
                                <th>Utility / Service Charge</th>
                                <th>Full Payment / Total Contract</th>
                                <th>Total Payment Paid to Date</th>
                                <th>Remaining Payment</th>
                                <th>Outstanding Balance as of {prevMonthLabel(month, year)}</th>
                                <th style={{ background: "#d1fae5", color: "#065f46" }}>Rent Expense – {MONTHS[month - 1]} {year} ✏️</th>
                                <th>Total</th>
                                <th style={{ background: "#fef9c3", color: "#713f12" }}>Due for {MONTHS[month - 1]} {year} ✏️</th>
                                <th style={{ background: "#ecfdf5", color: "#065f46", fontWeight: 700 }}>Rent Expense − Due</th>

                                <th style={{ background: "#ecfdf5", color: "#065f46", fontWeight: 700 }}>
                                    Rent Expense As Of {MONTHS[month - 1]} {year}
                                </th>
                                <th style={{ background: "#ecfdf5", color: "#065f46", fontWeight: 700 }}>
                                    Due Difference As Of {MONTHS[month - 1]} {year}
                                </th>
                                <th style={{ background: "#e0f2fe", color: "#075985" }}>Prepaid Office Rent ✏️</th>
                                {/* <th style={{ background: "#fce7f3", color: "#9d174d" }}>Additional Expense ✏️</th> */}
                                {/* <th style={{ background: "#f3e8ff", color: "#6b21a8" }}>Day</th> */}
                                <th>Outstanding Balance as of {endOfMonthLabel(month, year)}</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedIds.map((lid, gIdx) => {
                                const group = filteredRows.filter(r => r.leaseContractId === lid);
                                return group.map((row, rIdx) => {
                                    const key = `${row.leaseContractId}-${row.stampDutyRow}`;
                                    const edit = edits[key] ?? { rentExpense: "", due: "0", prepaid: "0", additionalExpense: "0", entryDay: "" };
                                    const sn = row.stampDutyRow ? "" : `${gIdx + 1}`;
                                    return (
                                        <tr key={key}
                                            className={`${row.stampDutyRow ? "stamp-duty-row" : ""} ${row.firstMonth ? "first-month-row" : ""}`}>
                                            <td>{sn}</td>
                                            <td>{row.boxFileNo || "—"}</td>
                                            <td>
                                                <span className="badge badge-blue" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                                                    {row.categoryOfRent || "—"}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {row.branchName}
                                                {row.stampDutyRow && <span className="badge badge-yellow" style={{ marginLeft: 6 }}>Stamp Duty</span>}
                                                {row.firstMonth && <span className="badge badge-green" style={{ marginLeft: 6 }}>Pro-Rated</span>}
                                            </td>
                                            <td><span className="badge badge-blue">{row.branchCode}</span></td>
                                            <td>{row.ownerName}</td>
                                            <td>{fmtDate(row.contractStartDate)}</td>
                                            <td>{fmtDate(row.contractEndDate)}</td>
                                            <td className="number">{row.totalNumberOfYears}</td>
                                            <td>{fmtDate(row.paymentPaidToDate)}</td>
                                            <td className="number">{row.yearWithFraction}</td>
                                            <td className="number">{fmt(row.meterSquare)}</td>
                                            <td className="number">{fmt(row.meterSquarePriceBeforeVat)}</td>
                                            <td className="number">{row.vatRate != null ? `${row.vatRate * 100}%` : "—"}</td>
                                            <td className="number">{fmt(row.meterSquarePriceAfterVat)}</td>
                                            <td className="number highlight">{fmt(row.monthlyRentWithVat)}</td>
                                            <td className="number">{fmt(row.totalAnnualRentAmount)}</td>
                                            <td className="number">{fmt(row.utilityPayment)}</td>
                                            <td className="number">{fmt(row.fullPayment)}</td>
                                            <td className="number">{fmt(row.totalPaymentPaidToDate)}</td>
                                            <td className="number">{fmt(row.remainingPayment)}</td>
                                            <td className="number highlight">{fmtCalc(row.outstandingBalancePriorMonth)}</td>
                                            {/* ✏️ Rent Expense — editable override; auto-value shown as placeholder */}
                                            <td className="editable-cell" style={{ background: "#f0fdf4" }}>
                                                {row.rentExpenseOverridden && <span title="Overridden" style={{ fontSize: "0.7rem", color: "#f59e0b" }}>✏️ </span>}
                                                <input type="number" step="0.01"
                                                    placeholder={fmtCalc(row.rentExpenseForMonth) ?? "auto"}
                                                    title="Leave blank to auto-calculate. Enter a value to override."
                                                    value={edit.rentExpense}
                                                    onChange={e => handleEdit(key, "rentExpense", e.target.value)} />
                                            </td>
                                            {/* Total = office + stamp duty (shown on SD row only) */}
                                            <td className="number" style={{ fontWeight: 700 }}>
                                                {row.stampDutyRow && row.total != null ? fmt(row.total) : ""}
                                            </td>

                                            {/* ✏️ Editable: Due for Month */}
                                            <td className="editable-cell" style={{ background: "#fefce8" }}>
                                                <input type="number" step="0.01"
                                                    placeholder={fmtCalc(row.dueForMonth) ?? "auto"}
                                                    title="Leave blank to auto-calculate. Enter a value to override."
                                                    value={edit.due}
                                                    onChange={e => handleEdit(key, "due", e.target.value)} />
                                            </td>

                                            {/* Rent Expense − Due for Month (read-only) */}
                                            <td className="number" style={{ background: "#f0fdf4", fontWeight: 600, color: "#065f46" }}>
                                                {fmtCalc(row.rentMinusDue)}
                                            </td>
                                            {/* Rent Expense As Of */}
                                            <td className="number" style={{ background: "#ecfdf5", fontWeight: 600 }}>
                                                {fmtCalc(row.rentExpenseAsOf)}
                                            </td>

                                            {/* Due Difference As Of */}
                                            <td className="number" style={{ background: "#ecfdf5", fontWeight: 600 }}>
                                                {fmtCalc(row.dueDifferenceAsOf)}
                                            </td>


                                            {/* ✏️ Editable: Prepaid Office Rent + Auto-Calc button */}
                                            <td className="editable-cell" style={{ background: "#eff6ff" }}>
                                                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                    <input type="number" step="0.01"
                                                        style={{ flex: 1 }}
                                                        value={edit.prepaid}
                                                        onChange={e => handleEdit(key, "prepaid", e.target.value)} />
                                                    <button
                                                        onClick={() => calcPrepaid(row)}
                                                        title="Auto-calculate Prepaid Rent for this month"
                                                        style={{
                                                            fontSize: "0.7rem", padding: "2px 6px",
                                                            background: "#3b82f6", color: "#fff",
                                                            border: "none", borderRadius: 4, cursor: "pointer",
                                                            whiteSpace: "nowrap"
                                                        }}>
                                                        Calc
                                                    </button>
                                                </div>
                                            </td>

                                            {/* ✏️ Editable: Additional Expense */}
                                            {/* <td className="editable-cell" style={{ background: "#fdf2f8" }}>
                                                <input type="number" step="0.01"
                                                    placeholder="0"
                                                    value={edit.additionalExpense}
                                                    onChange={e => handleEdit(key, "additionalExpense", e.target.value)} />
                                            </td> */}

                                            {/* Day of month picker */}
                                            {/* <td className="editable-cell" style={{ background: "#faf5ff" }}>
                                                <select
                                                    value={edit.entryDay}
                                                    onChange={e => handleEdit(key, "entryDay", e.target.value)}
                                                    style={{ width: 60 }}>
                                                    <option value="">—</option>
                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d =>
                                                        <option key={d} value={d}>{d}</option>
                                                    )}
                                                </select>
                                            </td> */}

                                            <td className="number highlight" style={{ color: "#7c3aed" }}>
                                                {fmtCalc(row.outstandingBalanceEndOfMonth)}
                                            </td>

                                            <td>
                                                <button className="btn btn-success btn-sm"
                                                    disabled={saving === key}
                                                    onClick={() => handleSave(row)}>
                                                    {saving === key ? "⏳" : "💾 Save"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>

                        {/* ── TOTAL row ── */}
                        <tfoot>
                            <tr style={{
                                background: "#1e293b", color: "#f8fafc",
                                fontWeight: 700, fontSize: "0.82rem",
                            }}>
                                {/* S/No + Box File No + Category + Branch Name + Branch Code = 5 cols */}
                                <td colSpan={5} style={{ textAlign: "right", padding: "0.6rem 0.75rem", letterSpacing: "0.05em" }}>
                                    TOTAL
                                </td>
                                {/* Owner Name, Contract Start, Contract End, Total Yrs, Paid-to-Date, Year with Fraction = 6 blank cols */}
                                <td /><td /><td /><td /><td /><td />
                                {/* Numeric columns aligned with thead */}
                                <td className="number">{fmt(rows.reduce((s, r) => s + (r.meterSquare ?? 0), 0))}</td>
                                <td className="number">{fmt(rows.reduce((s, r) => s + (r.meterSquarePriceBeforeVat ?? 0), 0))}</td>
                                <td /> {/* VAT Rate */}
                                <td className="number">{fmt(rows.reduce((s, r) => s + (r.meterSquarePriceAfterVat ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#93c5fd" }}>{fmt(filteredRows.reduce((s, r) => s + (r.monthlyRentWithVat ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.totalAnnualRentAmount ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.utilityPayment ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.fullPayment ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.totalPaymentPaidToDate ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.remainingPayment ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#93c5fd" }}>{fmtCalc(filteredRows.reduce((s, r) => s + (r.outstandingBalancePriorMonth ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#6ee7b7" }}>{fmtCalc(filteredRows.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.total ?? 0), 0))}</td>
                                <td className="number">{fmtCalc(filteredRows.reduce((s, r) => s + (r.dueForMonth ?? 0), 0))}</td>
                                <td className="number">{fmtCalc(filteredRows.reduce((s, r) => s + (r.prepaidOfficeRent ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#f472b6" }}>{fmtCalc(filteredRows.reduce((s, r) => s + (r.additionalExpense ?? 0), 0))}</td>
                                <td />{/* Day — no total */}
                                <td className="number" style={{ color: "#c4b5fd" }}>{fmtCalc(filteredRows.reduce((s, r) => s + (r.outstandingBalanceEndOfMonth ?? 0), 0))}</td>
                                <td />{/* Action column */}
                            </tr>
                        </tfoot>

                    </table>
                </div>
            )}

            {/* Legend */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem", fontSize: "0.78rem", color: "#64748b" }}>
                <span><span className="badge badge-green">Pro-Rated</span> First month – rent expense is calculated proportionally from start date</span>
                <span><span className="badge badge-yellow">Stamp Duty</span> Stamp duty row (separate from office rent)</span>
                <span style={{ color: "#2563eb", fontWeight: 600 }}>Blue values</span> Monthly Rent &amp; Prior Outstanding Balance
                <span style={{ color: "#059669", fontWeight: 600 }}>Green values</span> Rent Expense for the Month
                <span style={{ color: "#7c3aed", fontWeight: 600 }}>Purple values</span> End-of-Month Outstanding Balance
            </div>

            {/* Modal Dialog for Box File Assignment */}
            {showAssignModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(15, 23, 42, 0.65)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10000,
                    padding: "1rem",
                }}>
                    <div style={{
                        background: "white",
                        borderRadius: "12px",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                        width: "100%",
                        maxWidth: "800px",
                        maxHeight: "90vh",
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid #e2e8f0"
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: "1.25rem 1.5rem",
                            borderBottom: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 700 }}>
                                    Assign Box File No to Contracts
                                </h3>
                                <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                                    Select contracts and set their Box File Number.
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowAssignModal(false); setSelectedLeases([]); }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    fontSize: "1.5rem",
                                    cursor: "pointer",
                                    padding: "4px",
                                    lineHeight: 1,
                                    transition: "color 0.2s"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = "#0f172a"}
                                onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            
                            {/* Filter and Assign Control Bar */}
                            <div style={{
                                background: "#f8fafc",
                                padding: "1rem",
                                borderRadius: "8px",
                                border: "1px solid #f1f5f9",
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem"
                            }}>
                                {/* Box File Input & Submit */}
                                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                                    <div style={{ flex: 1, minWidth: "200px" }}>
                                        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                                            Box File No to Assign:
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Box-10, ZB-098"
                                            value={boxFileNoToAssign}
                                            onChange={e => setBoxFileNoToAssign(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "0.5rem 0.75rem",
                                                borderRadius: "6px",
                                                border: "1.5px solid #cbd5e1",
                                                fontSize: "0.88rem"
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleAssignBoxFileNo}
                                        disabled={assignLoading || selectedLeases.length === 0}
                                        className="btn btn-primary"
                                        style={{
                                            height: "38px",
                                            padding: "0 1.25rem",
                                            fontSize: "0.88rem",
                                            fontWeight: 600,
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        {assignLoading ? "⏳ Assigning..." : `Apply to ${selectedLeases.length} Selected`}
                                    </button>
                                </div>

                                {/* Category Tabs */}
                                <div>
                                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "8px" }}>
                                        Filter by Category of Rent:
                                    </span>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        {["All", "ATM", "Outline", "City"].map(cat => {
                                            const isActive = assignCategory === cat;
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setAssignCategory(cat)}
                                                    style={{
                                                        padding: "6px 12px",
                                                        borderRadius: "20px",
                                                        fontSize: "0.82rem",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        border: "1px solid",
                                                        borderColor: isActive ? "#3b82f6" : "#cbd5e1",
                                                        background: isActive ? "#3b82f6" : "white",
                                                        color: isActive ? "white" : "#475569",
                                                        transition: "all 0.2s"
                                                    }}
                                                >
                                                    {cat === "All" ? "All Categories" : cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div>
                                    <input
                                        type="search"
                                        placeholder="🔍 Search branch code, name, or owner..."
                                        value={assignSearch}
                                        onChange={e => setAssignSearch(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "6px",
                                            border: "1.5px solid #cbd5e1",
                                            fontSize: "0.88rem"
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Contract List Table */}
                            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", flex: 1, maxHeight: "350px", overflowY: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                                    <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1, borderBottom: "1px solid #e2e8f0" }}>
                                        <tr>
                                            <th style={{ width: "50px", padding: "10px 12px", textAlign: "left" }}>
                                                <input
                                                    type="checkbox"
                                                    onChange={e => {
                                                        const filteredList = allLeases.filter(l => {
                                                            const matchesSearch = 
                                                                (l.branchName ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                                (l.branchCode ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                                (l.ownerName ?? "").toLowerCase().includes(assignSearch.toLowerCase());
                                                            const matchesCat = 
                                                                assignCategory === "All" ||
                                                                (l.categoryOfRent ?? "").toLowerCase() === assignCategory.toLowerCase();
                                                            return matchesSearch && matchesCat;
                                                        });
                                                        if (e.target.checked) {
                                                            setSelectedLeases(filteredList.map(l => l.id));
                                                        } else {
                                                            setSelectedLeases([]);
                                                        }
                                                    }}
                                                    checked={
                                                        allLeases.length > 0 && 
                                                        allLeases.filter(l => {
                                                            const matchesSearch = 
                                                                (l.branchName ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                                (l.branchCode ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                                (l.ownerName ?? "").toLowerCase().includes(assignSearch.toLowerCase());
                                                            const matchesCat = 
                                                                assignCategory === "All" ||
                                                                (l.categoryOfRent ?? "").toLowerCase() === assignCategory.toLowerCase();
                                                            return matchesSearch && matchesCat;
                                                        }).every(l => selectedLeases.includes(l.id))
                                                    }
                                                />
                                            </th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Branch</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Code</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Owner</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Category</th>
                                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Box File No</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allLeases
                                            .filter(l => {
                                                const matchesSearch = 
                                                    (l.branchName ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                    (l.branchCode ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                    (l.ownerName ?? "").toLowerCase().includes(assignSearch.toLowerCase());
                                                const matchesCat = 
                                                    assignCategory === "All" ||
                                                    (l.categoryOfRent ?? "").toLowerCase() === assignCategory.toLowerCase();
                                                return matchesSearch && matchesCat;
                                            })
                                            .map(l => {
                                                const isChecked = selectedLeases.includes(l.id);
                                                return (
                                                    <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9", background: isChecked ? "#f0f9ff" : "white" }}>
                                                        <td style={{ padding: "10px 12px" }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setSelectedLeases(prev => [...prev, l.id]);
                                                                    } else {
                                                                        setSelectedLeases(prev => prev.filter(id => id !== l.id));
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: "10px 12px", fontWeight: 500, color: "#0f172a" }}>{l.branchName}</td>
                                                        <td style={{ padding: "10px 12px" }}>
                                                            <span className="badge badge-blue">{l.branchCode}</span>
                                                        </td>
                                                        <td style={{ padding: "10px 12px", color: "#334155" }}>{l.ownerName}</td>
                                                        <td style={{ padding: "10px 12px" }}>
                                                            <span className="badge badge-blue" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>
                                                                {l.categoryOfRent || "—"}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#4f46e5" }}>{l.boxFileNo || "—"}</td>
                                                    </tr>
                                                );
                                            })}
                                        {allLeases.filter(l => {
                                            const matchesSearch = 
                                                (l.branchName ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                (l.branchCode ?? "").toLowerCase().includes(assignSearch.toLowerCase()) ||
                                                (l.ownerName ?? "").toLowerCase().includes(assignSearch.toLowerCase());
                                            const matchesCat = 
                                                assignCategory === "All" ||
                                                (l.categoryOfRent ?? "").toLowerCase() === assignCategory.toLowerCase();
                                            return matchesSearch && matchesCat;
                                        }).length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                                                    No contracts found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: "1rem 1.5rem",
                            borderTop: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "0.75rem",
                            background: "#f8fafc",
                            borderBottomLeftRadius: "12px",
                            borderBottomRightRadius: "12px"
                        }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => { setShowAssignModal(false); setSelectedLeases([]); }}
                                style={{ fontSize: "0.88rem", fontWeight: 600 }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function prevMonthLabel(month: number, year: number) {
    if (month === 1) return `Dec ${year - 1}`;
    return `${MONTHS[month - 2]} ${year}`;
}
function endOfMonthLabel(month: number, year: number) {
    const d = new Date(year, month, 0); // last day of requested month
    return `${d.getDate()} ${MONTHS[month - 1]} ${year}`;
}
