"use client";
import { useState } from "react";
import { AmortizationReportRow, fetchReport, saveEntry } from "@/lib/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function fmt(n: number | undefined | null) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s: string | undefined | null) {
    if (!s) return "—";
    const d = new Date(s);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type EditableField = "dueForMonth" | "prepaidOfficeRent";

const CATEGORIES = ["ATM", "Outline", "City"];


export default function ReportPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [category, setCategory] = useState("");   // "" = all
    const [rows, setRows] = useState<AmortizationReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState<string | null>(null);
    const [search, setSearch] = useState("");


    const exportToExcel = () => {
        if (!rows.length) {
            alert("No data available to export.");
            return;
        }

        const data = rows.map((r, index) => ({
            "S/No": r.stampDutyRow ? "" : index + 1,
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
            "Price/m² After VAT": r.meterSquarePriceAfterVat,
            "Monthly Rent with VAT": r.monthlyRentWithVat,
            "Total Annual Rent": r.totalAnnualRentAmount,
            "Utility / Service Charge": r.utilityPayment,
            "Full Payment": r.fullPayment,
            "Total Payment Paid": r.totalPaymentPaidToDate,
            "Remaining Payment": r.remainingPayment,
            "Outstanding Balance (Prev)": r.outstandingBalancePriorMonth,
            "Rent Expense": r.rentExpenseForMonth,
            "Total": r.total,
            "Due": r.dueForMonth,
            "Rent Expense − Due": r.rentMinusDue,
            "Prepaid": r.prepaidOfficeRent,
            "Additional Expense": r.additionalExpense,
            "Day": r.entryDay,
            "Outstanding End": r.outstandingBalanceEndOfMonth
        }));

        // Add total row
        const totalRow = {
            "S/No": "TOTAL",
            "Category of Rent": "",
            "Branch Name": "",
            "Branch Code": "",
            "Owner Name": "",
            "Contract Start": "",
            "Contract End": "",
            "Total No. of Years": 0, // Updated to match expected type
            "Payment Paid to Date": "", // Updated to match expected type
            "Year with Fraction": 0, // Updated to match expected type
            "Meter Square": rows.reduce((sum, r) => sum + (r.meterSquare || 0), 0),
            "Price/m² Before VAT": rows.reduce((sum, r) => sum + (r.meterSquarePriceBeforeVat || 0), 0),
            "Price/m² After VAT": rows.reduce((sum, r) => sum + (r.meterSquarePriceAfterVat || 0), 0),
            "Monthly Rent with VAT": rows.reduce((sum, r) => sum + (r.monthlyRentWithVat || 0), 0),
            "Total Annual Rent": rows.reduce((sum, r) => sum + (r.totalAnnualRentAmount || 0), 0),
            "Utility / Service Charge": rows.reduce((sum, r) => sum + (r.utilityPayment || 0), 0),
            "Full Payment": rows.reduce((sum, r) => sum + (r.fullPayment || 0), 0),
            "Total Payment Paid": rows.reduce((sum, r) => sum + (r.totalPaymentPaidToDate || 0), 0),
            "Remaining Payment": rows.reduce((sum, r) => sum + (r.remainingPayment || 0), 0),
            "Outstanding Balance (Prev)": rows.reduce((sum, r) => sum + (r.outstandingBalancePriorMonth || 0), 0),
            "Rent Expense": rows.reduce((sum, r) => sum + (r.rentExpenseForMonth || 0), 0),
            "Total": rows.reduce((sum, r) => sum + (r.total || 0), 0),
            "Due": rows.reduce((sum, r) => sum + (r.dueForMonth || 0), 0),
            "Rent Expense − Due": 0, // Updated to match expected type
            "Prepaid": rows.reduce((sum, r) => sum + (r.prepaidOfficeRent || 0), 0),
            "Additional Expense": rows.reduce((sum, r) => sum + (r.additionalExpense || 0), 0),
            "Day": 0, // Updated to match expected type
            "Outstanding End": rows.reduce((sum, r) => sum + (r.outstandingBalanceEndOfMonth || 0), 0)
        };
        data.push(totalRow);

        const worksheet = XLSX.utils.json_to_sheet(data);

        // Apply formatting
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

        // Adjust column widths
        const columnWidths = Object.keys(data[0]).map(() => ({ wch: 20 }));
        worksheet["!cols"] = columnWidths;

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        const file = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        saveAs(file, `Amortization_Report_${month}_${year}.xlsx`);
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
            const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
            const res = await fetch(
                `${API_BASE}/amortization/prepaid-suggestion?leaseId=${row.leaseContractId}&month=${month}&year=${year}&stampDuty=${row.stampDutyRow}`
            );
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            handleEdit(key, "prepaid", data.suggestedPrepaid?.toString() ?? "0");
        } catch {
            alert("Could not calculate prepaid suggestion. Please try again.");
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
                                <th>Price/m² After VAT (15%)</th>
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
                                <th style={{ background: "#e0f2fe", color: "#075985" }}>Prepaid Office Rent ✏️</th>
                                <th style={{ background: "#fce7f3", color: "#9d174d" }}>Additional Expense ✏️</th>
                                <th style={{ background: "#f3e8ff", color: "#6b21a8" }}>Day</th>
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
                                            <td className="number">{fmt(row.meterSquarePriceAfterVat)}</td>
                                            <td className="number highlight">{fmt(row.monthlyRentWithVat)}</td>
                                            <td className="number">{fmt(row.totalAnnualRentAmount)}</td>
                                            <td className="number">{fmt(row.utilityPayment)}</td>
                                            <td className="number">{fmt(row.fullPayment)}</td>
                                            <td className="number">{fmt(row.totalPaymentPaidToDate)}</td>
                                            <td className="number">{fmt(row.remainingPayment)}</td>
                                            <td className="number highlight">{fmt(row.outstandingBalancePriorMonth)}</td>
                                            {/* ✏️ Rent Expense — editable override; auto-value shown as placeholder */}
                                            <td className="editable-cell" style={{ background: "#f0fdf4" }}>
                                                {row.rentExpenseOverridden && <span title="Overridden" style={{ fontSize: "0.7rem", color: "#f59e0b" }}>✏️ </span>}
                                                <input type="number" step="0.01"
                                                    placeholder={fmt(row.rentExpenseForMonth) ?? "auto"}
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
                                                    placeholder={fmt(row.dueForMonth) ?? "auto"}
                                                    title="Leave blank to auto-calculate. Enter a value to override."
                                                    value={edit.due}
                                                    onChange={e => handleEdit(key, "due", e.target.value)} />
                                            </td>

                                            {/* Rent Expense − Due for Month (read-only) */}
                                            <td className="number" style={{ background: "#f0fdf4", fontWeight: 600, color: "#065f46" }}>
                                                {fmt(row.rentMinusDue)}
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
                                            <td className="editable-cell" style={{ background: "#fdf2f8" }}>
                                                <input type="number" step="0.01"
                                                    placeholder="0"
                                                    value={edit.additionalExpense}
                                                    onChange={e => handleEdit(key, "additionalExpense", e.target.value)} />
                                            </td>

                                            {/* Day of month picker */}
                                            <td className="editable-cell" style={{ background: "#faf5ff" }}>
                                                <select
                                                    value={edit.entryDay}
                                                    onChange={e => handleEdit(key, "entryDay", e.target.value)}
                                                    style={{ width: 60 }}>
                                                    <option value="">—</option>
                                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d =>
                                                        <option key={d} value={d}>{d}</option>
                                                    )}
                                                </select>
                                            </td>

                                            <td className="number highlight" style={{ color: "#7c3aed" }}>
                                                {fmt(row.outstandingBalanceEndOfMonth)}
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
                                {/* S/No + Category + Branch Name + Branch Code = 4 cols */}
                                <td colSpan={4} style={{ textAlign: "right", padding: "0.6rem 0.75rem", letterSpacing: "0.05em" }}>
                                    TOTAL
                                </td>
                                {/* Owner Name, Contract Start, Contract End, Total Yrs, Paid-to-Date, Year with Fraction = 6 blank cols */}
                                <td /><td /><td /><td /><td /><td />
                                {/* Numeric columns aligned with thead */}
                                <td className="number">{fmt(rows.reduce((s, r) => s + (r.meterSquare ?? 0), 0))}</td>
                                <td className="number">{fmt(rows.reduce((s, r) => s + (r.meterSquarePriceBeforeVat ?? 0), 0))}</td>
                                <td className="number">{fmt(rows.reduce((s, r) => s + (r.meterSquarePriceAfterVat ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#93c5fd" }}>{fmt(filteredRows.reduce((s, r) => s + (r.monthlyRentWithVat ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.totalAnnualRentAmount ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.utilityPayment ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.fullPayment ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.totalPaymentPaidToDate ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.remainingPayment ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#93c5fd" }}>{fmt(filteredRows.reduce((s, r) => s + (r.outstandingBalancePriorMonth ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#6ee7b7" }}>{fmt(filteredRows.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.total ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.dueForMonth ?? 0), 0))}</td>
                                <td className="number">{fmt(filteredRows.reduce((s, r) => s + (r.prepaidOfficeRent ?? 0), 0))}</td>
                                <td className="number" style={{ color: "#f472b6" }}>{fmt(filteredRows.reduce((s, r) => s + (r.additionalExpense ?? 0), 0))}</td>
                                <td />{/* Day — no total */}
                                <td className="number" style={{ color: "#c4b5fd" }}>{fmt(filteredRows.reduce((s, r) => s + (r.outstandingBalanceEndOfMonth ?? 0), 0))}</td>
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
