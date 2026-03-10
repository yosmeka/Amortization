"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLeases, deleteLease } from "@/lib/api";

interface Lease {
    id: number;
    branchName: string;
    branchCode: string;
    ownerName: string;
    contractStartDate: string;
    contractEndDate: string;
    hasStampDuty: boolean;
    meterSquare: number;
    meterSquarePriceBeforeVat: number;
    vatRate: number;
    monthlyRentWithVat?: number;
}

function fmt(n: number) {
    return n?.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—";
}

export default function LeasesPage() {
    const [leases, setLeases] = useState<Lease[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const load = async () => {
        try {
            const data = await fetchLeases() as Lease[];
            setLeases(data);
        } catch { setError("Failed to load contracts"); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete contract for "${name}"? This cannot be undone.`)) return;
        try {
            await deleteLease(id);
            setLeases(prev => prev.filter(l => l.id !== id));
        } catch { alert("Delete failed. Please try again."); }
    };

    const filtered = leases.filter(l =>
        l.branchName.toLowerCase().includes(search.toLowerCase()) ||
        l.branchCode.toLowerCase().includes(search.toLowerCase()) ||
        l.ownerName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <h2>Lease Contracts</h2>
                <p>All registered office rent contracts. Click a row to view details.</p>
            </div>

            <div className="filter-bar">
                <label>Search:</label>
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Branch name, code or owner…" style={{ minWidth: 220 }} />
                <span style={{ marginLeft: "auto" }}>
                    <Link href="/leases/new" className="btn btn-primary btn-sm">+ Register New Contract</Link>
                </span>
            </div>

            {loading && <p style={{ color: "#64748b" }}>⏳ Loading contracts…</p>}
            {error && <div className="alert alert-error">{error}</div>}

            {!loading && !error && (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Branch Name</th>
                                <th>Branch Code</th>
                                <th>Owner Name</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>m²</th>
                                <th>Price/m² (before VAT)</th>
                                <th>Monthly Rent + VAT</th>
                                <th>Stamp Duty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={11} style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
                                    No contracts found. <Link href="/leases/new" style={{ color: "#2563eb" }}>Register one &rarr;</Link>
                                </td></tr>
                            )}
                            {filtered.map((l, i) => {
                                const priceAfterVat = l.meterSquarePriceBeforeVat * (1 + l.vatRate);
                                const monthly = l.meterSquare * priceAfterVat;
                                return (
                                    <tr key={l.id}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{l.branchName}</td>
                                        <td><span className="badge badge-blue">{l.branchCode}</span></td>
                                        <td>{l.ownerName}</td>
                                        <td>{l.contractStartDate}</td>
                                        <td>{l.contractEndDate}</td>
                                        <td className="number">{fmt(l.meterSquare)}</td>
                                        <td className="number">{fmt(l.meterSquarePriceBeforeVat)}</td>
                                        <td className="number highlight">{fmt(monthly)}</td>
                                        <td style={{ textAlign: "center" }}>
                                            {l.hasStampDuty
                                                ? <span className="badge badge-yellow">Yes</span>
                                                : <span className="badge" style={{ background: "#f1f5f9", color: "#64748b" }}>No</span>
                                            }
                                        </td>
                                        <td style={{ whiteSpace: "nowrap", display: "flex", gap: "0.4rem" }}>
                                            <Link
                                                href={`/leases/${l.id}/edit`}
                                                className="btn btn-sm"
                                                style={{ background: "#6366f1", color: "#fff", border: "none" }}
                                                title="Edit this contract"
                                            >
                                                ✏️ Edit
                                            </Link>
                                            <Link
                                                href={`/leases/new?renewFrom=${l.id}`}
                                                className="btn btn-sm"
                                                style={{ background: "#0ea5e9", color: "#fff", border: "none" }}
                                                title="Add a new period for this contract"
                                            >
                                                🔄 Renew
                                            </Link>
                                            <button className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(l.id, l.branchName)}>
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
