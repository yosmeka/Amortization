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
    return n?.toLocaleString("en-ET", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) ?? "—";
}

export default function LeasesPage() {
    
    const [leases, setLeases] = useState<Lease[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    // 🔥 pagination group control
    const [currentGroup, setCurrentGroup] = useState(0);
    const groupSize = 5;

    const load = async () => {
        try {
            const data = await fetchLeases() as Lease[];
            setLeases(data);
        } catch {
            setError("Failed to load contracts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        setCurrentPage(1);
        setCurrentGroup(0);
    }, [search, pageSize]);

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete contract for "${name}"? This cannot be undone.`)) return;
        try {
            await deleteLease(id);
            setLeases(prev => prev.filter(l => l.id !== id));
        } catch {
            alert("Delete failed. Please try again.");
        }
    };

    const filtered = leases.filter(l =>
        l.branchName.toLowerCase().includes(search.toLowerCase()) ||
        l.branchCode.toLowerCase().includes(search.toLowerCase()) ||
        l.ownerName.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / pageSize);

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

    // 🔥 group logic (5 pages only)
    const startPage = currentGroup * groupSize + 1;
    const endPage = Math.min(startPage + groupSize - 1, totalPages);

    const pages = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i
    );

    return (
        <div>

            <div className="page-header">
                <h2>Lease Contracts</h2>
                <p>All registered office rent contracts. Click a row to view details.</p>
            </div>

            {/* SEARCH */}
            <div className="filter-bar">
                <label>Search:</label>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Branch name, code or owner…"
                    style={{ minWidth: 220 }}
                />

                <span style={{ marginLeft: "auto" }}>
                    <Link href="/leases/new" className="btn btn-primary btn-sm">
                        + Register New Contract
                    </Link>
                </span>
            </div>

            {loading && <p style={{ color: "#64748b" }}>⏳ Loading contracts…</p>}
            {error && <div className="alert alert-error">{error}</div>}

            {/* PAGE SIZE */}
            <div style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                marginBottom: "0.75rem"
            }}>
                <label style={{ marginRight: "0.5rem" }}>Rows per page:</label>
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    style={{ padding: "4px 8px", borderRadius: "6px" }}
                >
                    {[5, 10, 15, 20].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>

            {/* TABLE (UNCHANGED) */}
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
                                <tr>
                                    <td colSpan={11} style={{
                                        textAlign: "center",
                                        color: "#94a3b8",
                                        padding: "2rem"
                                    }}>
                                        No contracts found. <Link href="/leases/new">Register one →</Link>
                                    </td>
                                </tr>
                            )}

                            {paginatedData.map((l, i) => {
                                const priceAfterVat =
                                    l.meterSquarePriceBeforeVat * (1 + l.vatRate);

                                const monthly = l.meterSquare * priceAfterVat;

                                return (
                                    <tr key={l.id}>
                                        <td>{startIndex + i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{l.branchName}</td>
                                        <td>{l.branchCode}</td>
                                        <td>{l.ownerName}</td>
                                        <td>{l.contractStartDate}</td>
                                        <td>{l.contractEndDate}</td>
                                        <td>{fmt(l.meterSquare)}</td>
                                        <td>{fmt(l.meterSquarePriceBeforeVat)}</td>
                                        <td>{fmt(monthly)}</td>

                                        <td style={{ textAlign: "center" }}>
                                            {l.hasStampDuty ? "Yes" : "No"}
                                        </td>

                                        {/* ACTIONS (UNCHANGED) */}
                                        <td style={{ whiteSpace: "nowrap", display: "flex", gap: "0.4rem" }}>
                                            <Link href={`/leases/${l.id}/edit`} className="btn btn-sm">
                                                ✏️ Edit
                                            </Link>

                                            <Link href={`/leases/new?renewFrom=${l.id}`} className="btn btn-sm">
                                                🔄 Renew
                                            </Link>

                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(l.id, l.branchName)}
                                            >
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

            {/* 🔥 PAGINATION (ONLY UPDATED PART) */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1rem"
            }}>

                <span style={{ color: "#64748b" }}>
                    Page {currentPage} of {totalPages || 1}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                    {/* Prev group */}
                    <button
                        className="btn btn-sm"
                        disabled={currentGroup === 0}
                        onClick={() => {
                            const newGroup = currentGroup - 1;
                            setCurrentGroup(newGroup);
                            setCurrentPage(newGroup * groupSize + 1);
                        }}
                    >
                        ⬅
                    </button>

                    {/* 5 pages only */}
                    <div style={{ display: "flex", gap: "6px" }}>
                        {pages.map((p) => (
                            <button
                                key={p}
                                className="btn btn-sm"
                                onClick={() => setCurrentPage(p)}
                                style={{
                                    minWidth: "34px",
                                    borderRadius: "8px",
                                    background: currentPage === p ? "#2563eb" : "#e2e8f0",
                                    color: currentPage === p ? "#fff" : "#0f172a",
                                    fontWeight: currentPage === p ? 600 : 400
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                    {/* Next group */}
                    <button
                        className="btn btn-sm"
                        disabled={endPage >= totalPages}
                        onClick={() => {
                            const newGroup = currentGroup + 1;
                            setCurrentGroup(newGroup);
                            setCurrentPage(newGroup * groupSize + 1);
                        }}
                    >
                        ➡
                    </button>
                </div>
            </div>

        </div>
    );
}