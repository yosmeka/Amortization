"use client";
import { useState } from "react";
import { fetchReport, AmortizationReportRow } from "@/lib/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
    Ticket,
    TicketRow,
    MONTHS,
    buildATM,
    buildCityOutline,
    exportGLTicketToExcel,
    exportExpenseUploadToExcel,
    numberToWords
} from "@/lib/excelExport";

function fmt(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Table component ──────────────────────────────────────── */
function Section({ label, rows, total }: { label: string; rows: TicketRow[]; total: number }) {
    return (
        <>
            <div className="gl-section-hdr">{label}</div>
            <div className="gl-tbl-wrap">
                <table className="gl-tbl">
                    <colgroup>
                        <col style={{ width: 100 }} />
                        <col style={{ width: 220 }} />
                        <col style={{ width: 90 }} />
                        <col style={{ width: 180 }} />
                        <col style={{ width: 140 }} />
                        <col />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Branch Code</th>
                            <th>Branch Name</th>
                            <th>GL Number</th>
                            <th>Description</th>
                            <th className="r">Amount (ETB)</th>
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

function SingleTicketView({ ticket }: { ticket: Ticket }) {
    return (
        <div className="gl-ticket" style={{ marginBottom: "2rem" }}>
            <div style={{ textAlign: "center", color: "#64748b", marginBottom: 4, fontSize: ".85rem" }}>
                <strong style={{ color: "#1e293b", fontSize: "1.05rem" }}>🏦 ZEMEN BANK S.C</strong>
            </div>
            <div className="gl-ticket-title">{ticket.title}</div>
            <Section label="DEBIT" rows={ticket.debit} total={ticket.debitTotal} />
            <Section label="CREDIT" rows={ticket.credit} total={ticket.creditTotal} />

            <div style={{ marginTop: "1rem", padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: ".85rem" }}>
                <div style={{ marginBottom: 6 }}>
                    <strong style={{ color: "#475569" }}>IN RESPECT OF: </strong>
                    <span>{ticket.narration}</span>
                </div>
                <div>
                    <strong style={{ color: "#475569" }}>AMOUNT IN WORDS: </strong>
                    <span style={{ fontWeight: 600 }}>BIRR {numberToWords(ticket.creditTotal)} ONLY</span>
                </div>
            </div>

            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minWidth: 260 }}>
                    <div style={{ borderBottom: "1px dotted #64748b", height: 24, marginBottom: 6 }}></div>
                    <span style={{ fontSize: ".85rem", fontWeight: 700, color: "#334155" }}>Authorized Signature</span>
                </div>
            </div>
        </div>
    );
}

/* ── Main page ────────────────────────────────────────────── */
export default function GLReportPage() {
    useAuthGuard();

    const now = new Date();
    const [month, setMonth]       = useState(now.getMonth() + 1);
    const [year, setYear]         = useState(now.getFullYear());
    const [category, setCategory] = useState("ATM");
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState("");
    const [tickets, setTickets]   = useState<Ticket[]>([]);
    const [reportRows, setReportRows] = useState<AmortizationReportRow[]>([]);

    const generate = async () => {
        setLoading(true);
        setError("");
        setTickets([]);
        try {
            const fetchCat = category === "All" ? undefined : category;
            const rows = await fetchReport(month, year, fetchCat);
            if (!rows.length) {
                setError("No data found for this period / category.");
                return;
            }
            setReportRows(rows);

            if (category === "All") {
                const atmRows = rows.filter(r => (r.categoryOfRent || "").toUpperCase().includes("ATM"));
                const cityRows = rows.filter(r => (r.categoryOfRent || "").toUpperCase().includes("CITY"));
                const outlineRows = rows.filter(r => (r.categoryOfRent || "").toUpperCase().includes("OUTLINE"));

                const generated: Ticket[] = [];
                if (atmRows.length > 0) {
                    generated.push(buildATM(atmRows, month, year));
                }
                if (cityRows.length > 0) {
                    generated.push(buildCityOutline(cityRows, month, year, "City"));
                }
                if (outlineRows.length > 0) {
                    generated.push(buildCityOutline(outlineRows, month, year, "Outline"));
                }

                if (generated.length === 0) {
                    // Fallback if rows didn't match category strings strictly
                    generated.push(buildATM(rows, month, year));
                }
                setTickets(generated);
            } else if (category === "ATM") {
                setTickets([buildATM(rows, month, year)]);
            } else {
                setTickets([buildCityOutline(rows, month, year, category as "City" | "Outline")]);
            }
        } catch {
            setError("Failed to load report. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (!tickets.length) {
            alert("Please generate tickets first.");
            return;
        }
        try {
            await exportGLTicketToExcel(tickets, month, year, category);
        } catch (err: any) {
            alert(err?.message || "Failed to export GL Ticket Excel.");
        }
    };

    const handleExportExpenseUpload = async () => {
        try {
            let rowsToExport = reportRows;
            if (!rowsToExport.length || category !== "All") {
                rowsToExport = await fetchReport(month, year, undefined);
            }
            if (!rowsToExport.length) {
                alert("No amortization data found for this period to generate Expense Upload.");
                return;
            }
            await exportExpenseUploadToExcel(rowsToExport, month, year);
        } catch (err: any) {
            alert(err?.message || "Failed to export Expense Upload Excel.");
        }
    };

    const grandTotal = tickets.reduce((s, t) => s + t.debitTotal, 0);

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
                    font-weight:700; padding:6px; border-radius:4px;
                    letter-spacing:2px; margin-bottom:0; font-size:.85rem;
                }
                .gl-tbl-wrap {
                    overflow-x:auto;
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
                <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem", color: "#1e293b" }}>
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
                            style={{ width: 88 }} />
                    </div>
                    <div>
                        <label>Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="ATM">ATM</option>
                            <option value="City">City</option>
                            <option value="Outline">Outline</option>
                            <option value="All">All Categories (Merged Ticket)</option>
                        </select>
                    </div>
                    <button className="gl-btn" onClick={generate} disabled={loading}
                        style={{ background: "#f30b0bc4", color: "#fff" }}>
                        {loading ? "Generating…" : "Generate Ticket"}
                    </button>
                    {tickets.length > 0 && (<>
                        <button className="gl-btn" onClick={() => window.print()}
                            style={{ background: "#475569", color: "#fff" }}>
                            🖨️ Print
                        </button>
                        <button className="gl-btn" onClick={handleExportExcel}
                            style={{ background: "#a31d16", color: "#fff" }}>
                            📥 Export Excel
                        </button>
                        <button className="gl-btn" onClick={handleExportExpenseUpload}
                            style={{ background: "#262428", color: "#fff" }}>
                            📤 Expense Upload Download
                        </button>
                    </>)}
                </div>
                {error && (
                    <div style={{ color: "#dc2626", background: "#fef2f2", padding: "10px 16px",
                        borderRadius: 8, border: "1px solid #fecaca", marginBottom: "1rem" }}>
                        {error}
                    </div>
                )}
            </div>

            {/* Ticket Views */}
            {tickets.length > 0 && (
                <div id="gl-printable">
                    {tickets.map((t, idx) => (
                        <SingleTicketView key={idx} ticket={t} />
                    ))}

                    {tickets.length > 1 && (
                        <div style={{ padding: "16px 20px", background: "#f1f5f9", borderRadius: 10, border: "2px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                                🏛️ GRAND TOTAL (ALL TICKETS DEBIT):
                            </span>
                            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                                ETB {fmt(grandTotal)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


