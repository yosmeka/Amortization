"use client";
import { useState } from "react";
import { fetchReport, AmortizationReportRow } from "@/lib/api";
import * as XLSX from "xlsx";

const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];

function fmt(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const GL_OFFICE_RENT  = "502149";
const GL_PREPAID      = "104401";
const GL_AP_MISC      = "208130";
const ZEMEN_CODE      = "000";
const ZEMEN_NAME      = "Zemen Bank";
const ATM_CODE        = "108";
const ATM_NAME        = "Multichannel Banking Department";

type Row = {
    branchCode: string;
    branchName: string;
    glNumber:   string;
    description: string;
    amount:     number;
    inRespectOf: string;
};

type Ticket = {
    title:       string;
    debit:       Row[];
    debitTotal:  number;
    credit:      Row[];
    creditTotal: number;
};

/* ── builders ─────────────────────────────────────────────── */

function buildATM(rows: AmortizationReportRow[], month: number, year: number): Ticket {
    const lbl = `${MONTHS[month - 1]} ${year}`;
    const office = rows.filter(r => !r.stampDutyRow);
    const totalExp     = office.reduce((s, r) => s + (r.rentExpenseForMonth ?? 0), 0);
    const totalDue     = office.reduce((s, r) => s + (r.dueForMonth         ?? 0), 0);
    const totalPrepaid = office.reduce((s, r) => s + (r.prepaidOfficeRent   ?? 0), 0);

    return {
        title: "ATM Rent Schedule Ticket",
        debit: [{
            branchCode: ATM_CODE, branchName: ATM_NAME,
            glNumber: GL_OFFICE_RENT, description: "Office Rent", amount: totalExp,
            inRespectOf: `ATM Space Rent for the Month of ${lbl}.`,
        }],
        debitTotal: totalExp,
        credit: [
            {
                branchCode: ZEMEN_CODE, branchName: ZEMEN_NAME,
                glNumber: GL_AP_MISC, description: "Account Payable-Miscellaneous", amount: totalDue,
                inRespectOf: `Amount held under A/P Miscellaneous for different ATM space rent for the month of ${lbl}.`,
            },
            {
                branchCode: ZEMEN_CODE, branchName: ZEMEN_NAME,
                glNumber: GL_PREPAID, description: "Prepaid-Office Rent", amount: totalPrepaid,
                inRespectOf: `ATM Space Rent for the Month of ${lbl}.`,
            },
        ],
        creditTotal: totalDue + totalPrepaid,
    };
}

function buildCityOutline(rows: AmortizationReportRow[], month: number, year: number, cat: "City" | "Outline"): Ticket {
    const lbl    = `${MONTHS[month - 1]} ${year}`;
    const catLbl = cat === "City" ? "City Branches" : "Outline Branches";

    const contracts = new Map<number, AmortizationReportRow[]>();
    rows.forEach(r => {
        const g = contracts.get(r.leaseContractId) ?? [];
        g.push(r);
        contracts.set(r.leaseContractId, g);
    });

    const debit: Row[] = [];
    let totalExp = 0, totalDue = 0, totalPrepaid = 0;

    contracts.forEach(group => {
        const sdRow     = group.find(r => r.stampDutyRow);
        const officeRow = group.find(r => !r.stampDutyRow);
        const amount    = sdRow?.total ?? officeRow?.rentExpenseForMonth ?? 0;
        const due       = group.reduce((s, r) => s + (r.dueForMonth       ?? 0), 0);
        const prepaid   = group.reduce((s, r) => s + (r.prepaidOfficeRent ?? 0), 0);

        totalExp     += amount;
        totalDue     += due;
        totalPrepaid += prepaid;

        if (officeRow) {
            debit.push({
                branchCode: officeRow.branchCode, branchName: officeRow.branchName,
                glNumber: GL_OFFICE_RENT, description: "Office Rent", amount,
                inRespectOf: `Office rent and stamp duty expense of ${officeRow.branchName} for the month of ${lbl}.`,
            });
        }
    });

    return {
        title: `Office Rent Ticket (${catLbl})`,
        debit,
        debitTotal: totalExp,
        credit: [
            {
                branchCode: ZEMEN_CODE, branchName: ZEMEN_NAME,
                glNumber: GL_PREPAID, description: "Prepaid-Office Rent", amount: totalPrepaid,
                inRespectOf: `Office rent and stamp duty expense of ${catLbl} for the month of ${lbl}.`,
            },
            {
                branchCode: ZEMEN_CODE, branchName: ZEMEN_NAME,
                glNumber: GL_AP_MISC, description: "Account Payable-Miscellaneous", amount: totalDue,
                inRespectOf: `Amount held under A/P Miscellaneous for different Office and ATM space rent for the month of ${lbl}.`,
            },
        ],
        creditTotal: totalPrepaid + totalDue,
    };
}

/* ── Excel export ─────────────────────────────────────────── */
function exportToExcel(ticket: Ticket, month: number, year: number) {
    const rows: (string | number)[][] = [];

    const header = ["Branch Code","Branch Name","GL Number","Description","Amount (ETB)","In Respect Of"];

    rows.push([ticket.title]);
    rows.push([]);
    rows.push(["— DEBIT —"]);
    rows.push(header);
    ticket.debit.forEach(r => rows.push([r.branchCode, r.branchName, r.glNumber, r.description, r.amount, r.inRespectOf]));
    rows.push(["","","","Debit Total", ticket.debitTotal, ""]);
    rows.push([]);
    rows.push(["— CREDIT —"]);
    rows.push(header);
    ticket.credit.forEach(r => rows.push([r.branchCode, r.branchName, r.glNumber, r.description, r.amount, r.inRespectOf]));
    rows.push(["","","","Credit Total", ticket.creditTotal, ""]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 },{ wch: 36 },{ wch: 12 },{ wch: 30 },{ wch: 18 },{ wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GL Ticket");
    XLSX.writeFile(wb, `GL_Ticket_${MONTHS[month-1]}_${year}.xlsx`);
}

/* ── Table component ──────────────────────────────────────── */
function Section({ label, rows, total }: { label: string; rows: Row[]; total: number }) {
    return (
        <>
            <div className="gl-section-hdr">{label}</div>
            <div className="gl-tbl-wrap">
                <table className="gl-tbl">
                    <colgroup>
                        <col style={{ width: 100 }} />
                        <col style={{ width: 180 }} />
                        <col style={{ width: 90 }} />
                        <col style={{ width: 190 }} />
                        <col style={{ width: 140 }} />
                        <col />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Branch Code</th>
                            <th>Branch Name</th>
                            <th>GL Number</th>
                            <th>Description</th>
                            <th className="r">Amount</th>
                            <th>In Respect Of</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i}>
                                <td>{r.branchCode}</td>
                                <td>{r.branchName}</td>
                                <td>{r.glNumber}</td>
                                <td>{r.description}</td>
                                <td className="r">{fmt(r.amount)}</td>
                                <td>{r.inRespectOf}</td>
                            </tr>
                        ))}
                        <tr className="gl-total">
                            <td colSpan={4} className="r"><strong>{label} Total</strong></td>
                            <td className="r"><strong>{fmt(total)}</strong></td>
                            <td />
                        </tr>
                    </tbody>
                </table>
            </div>
        </>
    );
}

/* ── Main page ────────────────────────────────────────────── */
export default function GLReportPage() {
    const now = new Date();
    const [month, setMonth]       = useState(now.getMonth() + 1);
    const [year, setYear]         = useState(now.getFullYear());
    const [category, setCategory] = useState("ATM");
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");
    const [ticket, setTicket]     = useState<Ticket | null>(null);

    const generate = async () => {
        setLoading(true); setError(""); setTicket(null);
        try {
            const rows = await fetchReport(month, year, category || undefined);
            if (!rows.length) { setError("No data for this period / category."); return; }
            setTicket(
                category === "ATM"
                    ? buildATM(rows, month, year)
                    : buildCityOutline(rows, month, year, category as "City" | "Outline")
            );
        } catch { setError("Failed to load report. Is the backend running?"); }
        finally   { setLoading(false); }
    };

    return (
        <div style={{ padding: "1.5rem", maxWidth: "100%", boxSizing: "border-box" }}>
            <style>{`
                /* controls bar */
                .gl-controls { display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end; margin-bottom:1.5rem; }
                .gl-controls label { display:block; font-size:.78rem; font-weight:600; margin-bottom:3px; color:#475569; }
                .gl-controls select, .gl-controls input {
                    padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1;
                    font-size:.875rem; background:#fff; color:#1e293b;
                }
                .gl-btn {
                    padding:9px 20px; border:none; border-radius:8px; font-weight:600;
                    font-size:.875rem; cursor:pointer; transition: opacity .2s;
                }
                .gl-btn:disabled { opacity:.55; cursor:not-allowed; }

                /* ticket wrapper */
                .gl-ticket {
                    background:#fff; border:1px solid #e2e8f0; border-radius:12px;
                    padding:1.75rem; box-shadow:0 2px 16px rgba(0,0,0,.07);
                }
                .gl-ticket-title {
                    text-align:center; font-size:1.05rem; font-weight:700;
                    text-decoration:underline; margin-bottom:1.25rem; color:#1e293b;
                }

                /* section header */
                .gl-section-hdr {
                    background:#475569; color:#fff; text-align:center;
                    font-weight:700; padding:5px; border-radius:4px;
                    letter-spacing:2px; margin-bottom:0; font-size:.85rem;
                }
                .gl-tbl-wrap {
                    overflow-x:auto;          /* horizontal scroll if viewport too narrow */
                    margin-bottom:1.5rem;
                }

                /* GL table */
                .gl-tbl {
                    width:100%; border-collapse:collapse;
                    font-size:.82rem; table-layout:fixed;
                }
                .gl-tbl th {
                    background:#f1f5f9; border:1px solid #cbd5e1;
                    padding:7px 10px; font-weight:600; color:#334155; text-align:left;
                    white-space:nowrap;
                }
                .gl-tbl td {
                    border:1px solid #e2e8f0; padding:6px 10px;
                    color:#1e293b; vertical-align:top;
                    word-break:break-word; white-space:normal;
                }
                .gl-tbl td.r, .gl-tbl th.r { text-align:right; white-space:nowrap; }
                .gl-total td   { background:#f8fafc; border-top:2px solid #64748b; }

                @media print {
                    body * { visibility:hidden; }
                    #gl-printable, #gl-printable * { visibility:visible; }
                    #gl-printable { position:absolute; left:0; top:0; width:100%; }
                    .no-print { display:none !important; }
                    .gl-tbl-wrap { overflow:visible; }
                }
            `}</style>

            {/* Controls */}
            <div className="no-print">
                <h1 style={{ fontSize:"1.4rem", fontWeight:700, marginBottom:"1rem", color:"#1e293b" }}>
                    📋 GL Rent Schedule Ticket
                </h1>
                <div className="gl-controls">
                    <div>
                        <label>Month</label>
                        <select value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label>Year</label>
                        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                            style={{ width:88 }} />
                    </div>
                    <div>
                        <label>Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="ATM">ATM</option>
                            <option value="City">City</option>
                            <option value="Outline">Outline</option>
                        </select>
                    </div>
                    <button className="gl-btn" onClick={generate} disabled={loading}
                        style={{ background:"#2563eb", color:"#fff" }}>
                        {loading ? "Generating…" : "Generate Ticket"}
                    </button>
                    {ticket && (<>
                        <button className="gl-btn" onClick={() => window.print()}
                            style={{ background:"#475569", color:"#fff" }}>
                            🖨️ Print
                        </button>
                        <button className="gl-btn" onClick={() => exportToExcel(ticket, month, year)}
                            style={{ background:"#16a34a", color:"#fff" }}>
                            📥 Export Excel
                        </button>
                    </>)}
                </div>
                {error && (
                    <div style={{ color:"#dc2626", background:"#fef2f2", padding:"10px 16px",
                        borderRadius:8, border:"1px solid #fecaca", marginBottom:"1rem" }}>
                        {error}
                    </div>
                )}
            </div>

            {/* Ticket */}
            {ticket && (
                <div id="gl-printable">
                    <div className="gl-ticket">
                        <div style={{ textAlign:"center", color:"#64748b", marginBottom:4, fontSize:".85rem" }}>
                            <strong style={{ color:"#1e293b" }}>🏦 ZEMEN BANK</strong>
                        </div>
                        <div className="gl-ticket-title">{ticket.title}</div>
                        <Section label="DEBIT"  rows={ticket.debit}  total={ticket.debitTotal}  />
                        <Section label="CREDIT" rows={ticket.credit} total={ticket.creditTotal} />
                    </div>
                </div>
            )}
        </div>
    );
}
