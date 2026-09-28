"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchLeases, deleteLease, fetchLease } from "@/lib/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface Lease {
    id: number;
    branchName: string;
    branchCode: string;
    categoryOfRent?: string;
    region?: string;
    boxFileNo?: string;
    ownerName: string;
    contractStartDate: string;
    contractEndDate: string;
    paymentPaidToDate?: string;
    hasStampDuty: boolean;
    hasUtilityPayment: boolean;
    meterSquare: number;
    meterSquarePriceBeforeVat: number;
    vatRate: number;
    monthlyRentWithVat?: number;
    approvalStatus?: string;
    checkerComment?: string;
    createdBy?: string;
    createdAt?: string;
}

function fmt(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-ET", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtPrice(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-ET", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtDate(s: string | undefined | null) {
    if (!s) return "—";
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LeasesPage() {
    useAuthGuard();

    const [leases, setLeases] = useState<Lease[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // View Modal State
    const [selectedLease, setSelectedLease] = useState<any | null>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = (await fetchLeases()) as Lease[];
            setLeases(data);
        } catch {
            setError("Failed to load lease contracts. Please check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // Reset pagination on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, categoryFilter, pageSize]);

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete contract for "${name}"? This action cannot be undone.`)) return;
        try {
            await deleteLease(id);
            setLeases(prev => prev.filter(l => l.id !== id));
            if (selectedLease?.id === id) {
                setSelectedLease(null);
            }
        } catch {
            alert("Delete failed. Please try again.");
        }
    };

    const handleViewDetails = async (id: number) => {
        setViewLoading(true);
        try {
            const fullData = await fetchLease(id);
            setSelectedLease(fullData);
        } catch {
            // fallback to local row
            const local = leases.find(l => l.id === id);
            setSelectedLease(local || null);
        } finally {
            setViewLoading(false);
        }
    };

    // Metrics
    const totalCount = leases.length;
    const approvedCount = leases.filter(l => l.approvalStatus === "APPROVED").length;
    const pendingCount = leases.filter(l => l.approvalStatus === "PENDING" || !l.approvalStatus).length;
    const rejectedCount = leases.filter(l => l.approvalStatus === "REJECTED").length;

    // Filtering logic
    const filtered = useMemo(() => {
        return leases.filter(l => {
            const matchesSearch =
                (l.branchName || "").toLowerCase().includes(search.toLowerCase()) ||
                (l.branchCode || "").toLowerCase().includes(search.toLowerCase()) ||
                (l.ownerName || "").toLowerCase().includes(search.toLowerCase()) ||
                (l.boxFileNo || "").toLowerCase().includes(search.toLowerCase());

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "PENDING" && (l.approvalStatus === "PENDING" || !l.approvalStatus)) ||
                l.approvalStatus === statusFilter;

            const matchesCat =
                categoryFilter === "ALL" ||
                (l.categoryOfRent || "").toUpperCase() === categoryFilter.toUpperCase();

            return matchesSearch && matchesStatus && matchesCat;
        });
    }, [leases, search, statusFilter, categoryFilter]);

    // Pagination slice
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

    // Dynamic 5-page window around safePage
    const windowSize = 5;
    let startPage = Math.max(1, safePage - Math.floor(windowSize / 2));
    let endPage = startPage + windowSize - 1;
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - windowSize + 1);
    }
    const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    return (
        <div style={{ maxWidth: "1500px", margin: "0 auto", paddingBottom: "3rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
                        📄 Lease Contracts Registry
                    </h1>
                    <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>
                        Manage, register, and monitor all branch, ATM, and office lease agreements.
                    </p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <Link
                        href="/leases/upload"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "9px 16px",
                            borderRadius: "8px",
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            fontWeight: 600,
                            fontSize: "0.88rem",
                            textDecoration: "none",
                            boxShadow: "var(--shadow-sm)"
                        }}
                    >
                        📥 Bulk Upload
                    </Link>
                    <Link
                        href="/leases/new"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "9px 18px",
                            borderRadius: "8px",
                            background: "#dc2626",
                            color: "#ffffff",
                            fontWeight: 600,
                            fontSize: "0.88rem",
                            textDecoration: "none",
                            boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)"
                        }}
                    >
                        ➕ Register New Contract
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "1.75rem"
                }}
            >
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Registered</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{totalCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>All lease records</div>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid rgba(22, 163, 74, 0.3)", borderLeft: "4px solid #16a34a", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#16a34a", textTransform: "uppercase" }}>Active / Approved</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>{approvedCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "2px" }}>Verified by Checker</div>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid rgba(245, 158, 11, 0.3)", borderLeft: "4px solid #f59e0b", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f59e0b", textTransform: "uppercase" }}>Pending Approval</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>{pendingCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginTop: "2px" }}>Awaiting verification</div>
                </div>

                <div style={{ background: "var(--bg-card)", border: "1px solid rgba(220, 38, 38, 0.3)", borderLeft: "4px solid #dc2626", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#ef4444", textTransform: "uppercase" }}>Rejected / Corrections</div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>{rejectedCount}</div>
                    <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "2px" }}>Requires edit</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div
                style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "1.25rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "14px",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: "var(--shadow-sm)"
                }}
            >
                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "280px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search branch name, code, box file, or owner…"
                        style={{
                            width: "100%",
                            padding: "9px 12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "0.88rem",
                            outline: "none",
                            background: "#f8fafc"
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            style={{
                                background: "#e2e8f0",
                                border: "none",
                                borderRadius: "50%",
                                width: "22px",
                                height: "22px",
                                cursor: "pointer",
                                fontSize: "12px"
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    {/* Status Tabs */}
                    <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
                        {["ALL", "APPROVED", "PENDING", "REJECTED"].map(st => (
                            <button
                                key={st}
                                onClick={() => setStatusFilter(st)}
                                style={{
                                    border: "none",
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    background: statusFilter === st ? "#ffffff" : "transparent",
                                    color: statusFilter === st ? "#0f172a" : "#64748b",
                                    boxShadow: statusFilter === st ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                                    transition: "all 0.15s"
                                }}
                            >
                                {st}
                            </button>
                        ))}
                    </div>

                    {/* Category Filter */}
                    <div>
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--input-border)",
                                fontSize: "0.85rem",
                                background: "var(--input-bg)",
                                color: "var(--input-text)",
                                fontWeight: 500
                            }}
                        >
                            <option value="ALL">All Categories</option>
                            <option value="CITY">City</option>
                            <option value="OUTLINE">Outline</option>
                            <option value="ATM">ATM</option>
                        </select>
                    </div>

                    {/* Page Size */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Show:</span>
                        <select
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                            style={{
                                padding: "8px 10px",
                                borderRadius: "8px",
                                border: "1px solid var(--input-border)",
                                fontSize: "0.85rem",
                                background: "var(--input-bg)",
                                color: "var(--input-text)"
                            }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading && (
                <div style={{ textAlign: "center", padding: "3rem", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>⏳</div>
                    <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading lease contracts…</div>
                </div>
            )}

            {error && (
                <div style={{ background: "rgba(220, 38, 38, 0.12)", border: "1px solid rgba(220, 38, 38, 0.3)", color: "#ef4444", padding: "14px 18px", borderRadius: "8px", marginBottom: "1rem" }}>
                    {error}
                </div>
            )}

            {/* Table */}
            {!loading && !error && (
                <div
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: "var(--shadow-sm)"
                    }}
                >
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left", background: "var(--table-bg)" }}>
                            <thead>
                                <tr style={{ background: "var(--table-header-bg)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, width: "40px" }}>#</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Branch / Location</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Category</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Owner / Lessor</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Contract Period</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "right" }}>Area (m²)</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "right" }}>Monthly Rent + VAT</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "center" }}>Stamp Duty</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "center" }}>Utility</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "center" }}>Status</th>
                                    <th style={{ padding: "12px 16px", fontWeight: 700, textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                                            No contracts match your search or filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((l, idx) => {
                                        const priceAfterVat = (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15));
                                        const monthly = (l.meterSquare || 0) * priceAfterVat;
                                        const isRenewEligible = l.paymentPaidToDate === l.contractEndDate;

                                        return (
                                            <tr
                                                key={l.id}
                                                style={{
                                                    borderBottom: "1px solid var(--border)",
                                                    transition: "background 0.15s",
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "var(--table-hover)")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontWeight: 600 }}>
                                                    {startIndex + idx + 1}
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{l.branchName}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                        Code: <span style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>{l.branchCode}</span>
                                                        {l.boxFileNo ? ` • Box: ${l.boxFileNo}` : ""}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <span style={{
                                                        background: l.categoryOfRent === "ATM" ? "#f3e8ff" : l.categoryOfRent === "City" ? "#e0f2fe" : "#fef3c7",
                                                        color: l.categoryOfRent === "ATM" ? "#7e22ce" : l.categoryOfRent === "City" ? "#0369a1" : "#b45309",
                                                        padding: "3px 8px",
                                                        borderRadius: "6px",
                                                        fontWeight: 600,
                                                        fontSize: "0.75rem"
                                                    }}>
                                                        {l.categoryOfRent || "City"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px 14px", color: "#334155", maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {l.ownerName}
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "#334155" }}>
                                                    <div>{fmtDate(l.contractStartDate)} ➔ {fmtDate(l.contractEndDate)}</div>
                                                    {l.paymentPaidToDate && (
                                                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                                            Paid to: {fmtDate(l.paymentPaidToDate)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: "#334155" }}>
                                                    {fmt(l.meterSquare)}
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                                                    {fmtPrice(monthly)}
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    {l.hasStampDuty ? (
                                                        <span style={{ color: "#16a34a", fontWeight: 700 }}>✓ Yes</span>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    {l.hasUtilityPayment ? (
                                                        <span style={{ color: "#2563eb", fontWeight: 700 }}>✓ Yes</span>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    {l.approvalStatus === "APPROVED" && (
                                                        <span style={{ background: "#dcfce7", color: "#15803d", padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                                                            🟢 Approved
                                                        </span>
                                                    )}
                                                    {(l.approvalStatus === "PENDING" || !l.approvalStatus) && (
                                                        <span style={{ background: "#fef9c3", color: "#854d0e", padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                                                            🟡 Pending
                                                        </span>
                                                    )}
                                                    {l.approvalStatus === "REJECTED" && (
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                                            <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                                                                🔴 Rejected
                                                            </span>
                                                            {l.checkerComment && (
                                                                <span style={{ fontSize: "0.7rem", color: "#b91c1c", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.checkerComment}>
                                                                    {l.checkerComment}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                                                        <button
                                                            onClick={() => handleViewDetails(l.id)}
                                                            style={{
                                                                background: "#f1f5f9",
                                                                border: "1px solid #cbd5e1",
                                                                borderRadius: "6px",
                                                                padding: "4px 8px",
                                                                fontSize: "0.78rem",
                                                                cursor: "pointer",
                                                                fontWeight: 600,
                                                                color: "#334155"
                                                            }}
                                                            title="View full details"
                                                        >
                                                            👁️ View
                                                        </button>

                                                        <Link
                                                            href={`/leases/${l.id}/edit`}
                                                            style={{
                                                                background: "#f8fafc",
                                                                border: "1px solid #cbd5e1",
                                                                borderRadius: "6px",
                                                                padding: "4px 8px",
                                                                fontSize: "0.78rem",
                                                                color: "#334155",
                                                                textDecoration: "none",
                                                                fontWeight: 600
                                                            }}
                                                        >
                                                            ✏️ Edit
                                                        </Link>

                                                        {isRenewEligible ? (
                                                            <Link
                                                                href={`/leases/new?renewFrom=${l.id}`}
                                                                style={{
                                                                    background: "#ecfdf5",
                                                                    border: "1px solid #a7f3d0",
                                                                    color: "#059669",
                                                                    padding: "4px 8px",
                                                                    borderRadius: "6px",
                                                                    fontSize: "0.78rem",
                                                                    textDecoration: "none",
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                🔄 Renew
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                href={`/leases/new?extendFrom=${l.id}`}
                                                                style={{
                                                                    background: "#f0f9ff",
                                                                    border: "1px solid #bae6fd",
                                                                    color: "#0284c7",
                                                                    padding: "4px 8px",
                                                                    borderRadius: "6px",
                                                                    fontSize: "0.78rem",
                                                                    textDecoration: "none",
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                ➕ Extend
                                                            </Link>
                                                        )}

                                                        <button
                                                            onClick={() => handleDelete(l.id, l.branchName)}
                                                            style={{
                                                                background: "#fee2e2",
                                                                border: "1px solid #fca5a5",
                                                                color: "#dc2626",
                                                                borderRadius: "6px",
                                                                padding: "4px 8px",
                                                                fontSize: "0.78rem",
                                                                cursor: "pointer",
                                                                fontWeight: 600
                                                            }}
                                                            title="Delete contract"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modern Pagination Footer */}
                    <div
                        style={{
                            padding: "14px 20px",
                            borderTop: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                            background: "#fafafa"
                        }}
                    >
                        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                            Showing <strong style={{ color: "#0f172a" }}>{filtered.length === 0 ? 0 : startIndex + 1}</strong> to{" "}
                            <strong style={{ color: "#0f172a" }}>{Math.min(startIndex + pageSize, filtered.length)}</strong> of{" "}
                            <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> contracts
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {/* First */}
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={safePage === 1}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: safePage === 1 ? "#f1f5f9" : "#ffffff",
                                    color: safePage === 1 ? "#94a3b8" : "#334155",
                                    cursor: safePage === 1 ? "not-allowed" : "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: 600
                                }}
                                title="First page"
                            >
                                ⏮ First
                            </button>

                            {/* Prev */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={safePage === 1}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: safePage === 1 ? "#f1f5f9" : "#ffffff",
                                    color: safePage === 1 ? "#94a3b8" : "#334155",
                                    cursor: safePage === 1 ? "not-allowed" : "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: 600
                                }}
                            >
                                ◀ Prev
                            </button>

                            {/* Page numbers */}
                            {pageNumbers.map(p => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    style={{
                                        minWidth: "34px",
                                        height: "34px",
                                        borderRadius: "6px",
                                        border: safePage === p ? "1px solid #2563eb" : "1px solid #cbd5e1",
                                        background: safePage === p ? "#2563eb" : "#ffffff",
                                        color: safePage === p ? "#ffffff" : "#0f172a",
                                        fontWeight: safePage === p ? 700 : 500,
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    {p}
                                </button>
                            ))}

                            {/* Next */}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safePage === totalPages}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: safePage === totalPages ? "#f1f5f9" : "#ffffff",
                                    color: safePage === totalPages ? "#94a3b8" : "#334155",
                                    cursor: safePage === totalPages ? "not-allowed" : "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: 600
                                }}
                            >
                                Next ▶
                            </button>

                            {/* Last */}
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safePage === totalPages}
                                style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #cbd5e1",
                                    background: safePage === totalPages ? "#f1f5f9" : "#ffffff",
                                    color: safePage === totalPages ? "#94a3b8" : "#334155",
                                    cursor: safePage === totalPages ? "not-allowed" : "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: 600
                                }}
                                title="Last page"
                            >
                                Last ⏭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= VIEW DETAIL MODAL ================= */}
            {(selectedLease || viewLoading) && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(4px)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px"
                    }}
                    onClick={() => setSelectedLease(null)}
                >
                    <div
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "16px",
                            width: "100%",
                            maxWidth: "750px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                            border: "1px solid var(--border)"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {viewLoading ? (
                            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                                Loading full contract details…
                            </div>
                        ) : (
                            selectedLease && (
                                <div>
                                    {/* Modal Header */}
                                    <div
                                        style={{
                                            padding: "20px 24px",
                                            borderBottom: "1px solid var(--border)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            background: "var(--table-header-bg)",
                                            borderRadius: "16px 16px 0 0"
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                                                    {selectedLease.branchName}
                                                </h2>
                                                <span style={{ background: "#e2e8f0", color: "#334155", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                                                    Code: {selectedLease.branchCode}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "3px" }}>
                                                Category: <strong>{selectedLease.categoryOfRent || "City"}</strong>
                                                {selectedLease.boxFileNo ? ` • Box File No: ${selectedLease.boxFileNo}` : ""}
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            {selectedLease.approvalStatus === "APPROVED" && (
                                                <span style={{ background: "#dcfce7", color: "#15803d", padding: "4px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>
                                                    🟢 APPROVED
                                                </span>
                                            )}
                                            {(selectedLease.approvalStatus === "PENDING" || !selectedLease.approvalStatus) && (
                                                <span style={{ background: "#fef9c3", color: "#854d0e", padding: "4px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>
                                                    🟡 PENDING
                                                </span>
                                            )}
                                            {selectedLease.approvalStatus === "REJECTED" && (
                                                <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>
                                                    🔴 REJECTED
                                                </span>
                                            )}
                                            <button
                                                onClick={() => setSelectedLease(null)}
                                                style={{
                                                    background: "#e2e8f0",
                                                    border: "none",
                                                    borderRadius: "50%",
                                                    width: "28px",
                                                    height: "28px",
                                                    cursor: "pointer",
                                                    fontWeight: 700,
                                                    fontSize: "14px",
                                                    color: "#475569"
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modal Body */}
                                    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                                        {/* Financial Highlight Banner */}
                                        <div
                                            style={{
                                                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                                                borderRadius: "12px",
                                                padding: "16px 20px",
                                                color: "#ffffff",
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                                                gap: "14px"
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Monthly Rent + VAT</div>
                                                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                                                    ETB {fmtPrice(
                                                        selectedLease.monthlyRentWithVat ||
                                                        (selectedLease.meterSquare * selectedLease.meterSquarePriceBeforeVat * (1 + (selectedLease.vatRate ?? 0.15)))
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Meter Square Area</div>
                                                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
                                                    {fmt(selectedLease.meterSquare)} m²
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Price / m² (Before VAT)</div>
                                                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
                                                    ETB {fmtPrice(selectedLease.meterSquarePriceBeforeVat)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grid Info Sections */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                            {/* Branch & Lessor */}
                                            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#475569", textTransform: "uppercase" }}>
                                                    🏢 Branch & Lessor Info
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "#64748b" }}>Owner:</span> <strong>{selectedLease.ownerName}</strong></div>
                                                    {selectedLease.tinNumber && <div><span style={{ color: "#64748b" }}>TIN:</span> {selectedLease.tinNumber}</div>}
                                                    {selectedLease.region && <div><span style={{ color: "#64748b" }}>Region:</span> {selectedLease.region}</div>}
                                                    {selectedLease.accountNumber && <div><span style={{ color: "#64748b" }}>Account:</span> {selectedLease.accountNumber}</div>}
                                                    {selectedLease.contactInfo1 && <div><span style={{ color: "#64748b" }}>Contact:</span> {selectedLease.contactInfo1}</div>}
                                                </div>
                                            </div>

                                            {/* Contract Period */}
                                            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#475569", textTransform: "uppercase" }}>
                                                    📅 Dates & Duration
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "#64748b" }}>Start Date:</span> <strong>{fmtDate(selectedLease.contractStartDate)}</strong></div>
                                                    <div><span style={{ color: "#64748b" }}>End Date:</span> <strong>{fmtDate(selectedLease.contractEndDate)}</strong></div>
                                                    <div><span style={{ color: "#64748b" }}>Paid To Date:</span> {fmtDate(selectedLease.paymentPaidToDate) || "—"}</div>
                                                    {selectedLease.prepaymentTill && <div><span style={{ color: "#64748b" }}>Prepayment Till:</span> {fmtDate(selectedLease.prepaymentTill)}</div>}
                                                    {selectedLease.paymentModality && <div><span style={{ color: "#64748b" }}>Modality:</span> {selectedLease.paymentModality}</div>}
                                                </div>
                                            </div>

                                            {/* Utility & Stamp Duty */}
                                            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#475569", textTransform: "uppercase" }}>
                                                    ⚡ Utilities & Stamp Duty
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "#64748b" }}>Stamp Duty:</span> {selectedLease.hasStampDuty ? "✅ Registered" : "❌ None"}</div>
                                                    <div><span style={{ color: "#64748b" }}>Utility Charge:</span> {selectedLease.hasUtilityPayment ? `✅ ETB ${fmt(selectedLease.utilityPayment)}/mo` : "❌ None"}</div>
                                                    {selectedLease.vatRate != null && <div><span style={{ color: "#64748b" }}>VAT Rate:</span> {(selectedLease.vatRate * 100).toFixed(0)}%</div>}
                                                </div>
                                            </div>

                                            {/* Workflow & Audit */}
                                            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#475569", textTransform: "uppercase" }}>
                                                    🛡️ Audit & Status
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "#64748b" }}>Created By:</span> <strong>{selectedLease.createdBy || "system"}</strong></div>
                                                    {selectedLease.createdAt && <div><span style={{ color: "#64748b" }}>Registered On:</span> {fmtDate(selectedLease.createdAt)}</div>}
                                                    {selectedLease.checkerComment && (
                                                        <div style={{ color: "#b91c1c", marginTop: "4px" }}>
                                                            <strong>Checker Note:</strong> {selectedLease.checkerComment}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div
                                        style={{
                                            padding: "16px 24px",
                                            borderTop: "1px solid var(--border)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            background: "var(--table-header-bg)",
                                            borderRadius: "0 0 16px 16px"
                                        }}
                                    >
                                        <Link
                                            href={`/leases/${selectedLease.id}/edit`}
                                            style={{
                                                background: "var(--bg-card)",
                                                border: "1px solid var(--border)",
                                                color: "var(--text-secondary)",
                                                padding: "8px 16px",
                                                borderRadius: "8px",
                                                textDecoration: "none",
                                                fontWeight: 600,
                                                fontSize: "0.85rem"
                                            }}
                                        >
                                            ✏️ Edit This Contract
                                        </Link>

                                        <button
                                            onClick={() => setSelectedLease(null)}
                                            style={{
                                                background: "#0f172a",
                                                color: "#ffffff",
                                                border: "none",
                                                padding: "8px 20px",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                fontWeight: 600,
                                                fontSize: "0.85rem"
                                            }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}