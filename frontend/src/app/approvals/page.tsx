"use client";

import { useEffect, useState, useMemo } from "react";
import {
    fetchPendingLeases,
    approveContract,
    rejectContract,
    fetchLease
} from "@/lib/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface PendingLease {
    id: number;
    branchName: string;
    branchCode: string;
    categoryOfRent?: string;
    region?: string;
    boxFileNo?: string;
    ownerName: string;
    createdBy?: string;
    createdAt?: string;
    contractStartDate: string;
    contractEndDate: string;
    paymentPaidToDate?: string;
    hasStampDuty: boolean;
    hasUtilityPayment?: boolean;
    utilityPayment?: number;
    meterSquare: number;
    meterSquarePriceBeforeVat: number;
    vatRate?: number;
    monthlyRentWithVat?: number;
}

function fmt(n: number | null | undefined) {
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

export default function ApprovalsPage() {
    useAuthGuard();

    const [leases, setLeases] = useState<PendingLease[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Search and Filters
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    // Selection
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Rejection Modal / Prompt
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectComment, setRejectComment] = useState("");
    const [bulkRejecting, setBulkRejecting] = useState(false);
    const [bulkRejectComment, setBulkRejectComment] = useState("");

    // View Details Modal
    const [viewingLease, setViewingLease] = useState<any | null>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = (await fetchPendingLeases()) as PendingLease[];
            setLeases(Array.isArray(data) ? data : []);
        } catch {
            setError("Failed to load pending approvals. Please check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // Reset page on search/filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, categoryFilter, pageSize]);

    // Selection handlers
    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAllCurrent = () => {
        const pageIds = paginatedData.map(l => l.id);
        const allSelected = pageIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const handleSelectAllGlobal = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(l => l.id));
        }
    };

    // Single Approve
    const handleApprove = async (id: number, branchName?: string) => {
        if (!confirm(`Approve contract for "${branchName || 'this branch'}"?`)) return;

        try {
            await approveContract(id);
            setSelectedIds(prev => prev.filter(item => item !== id));
            if (viewingLease?.id === id) {
                setViewingLease(null);
            }
            await load();
        } catch (e: any) {
            alert(e.message || "Approval failed");
        }
    };

    // Bulk Approve
    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Approve all ${selectedIds.length} selected contracts?`)) return;

        try {
            await Promise.all(selectedIds.map(id => approveContract(id)));
            setSelectedIds([]);
            await load();
        } catch (e: any) {
            alert(e.message || "Bulk approval failed");
        }
    };

    // Single Reject
    const handleReject = async () => {
        if (!rejectingId) return;
        if (!rejectComment.trim()) {
            alert("Please provide a reason for rejection.");
            return;
        }

        try {
            await rejectContract(rejectingId, rejectComment);
            setSelectedIds(prev => prev.filter(item => item !== rejectingId));
            if (viewingLease?.id === rejectingId) {
                setViewingLease(null);
            }
            setRejectingId(null);
            setRejectComment("");
            await load();
        } catch (e: any) {
            alert(e.message || "Rejection failed");
        }
    };

    // Bulk Reject
    const handleBulkReject = async () => {
        if (selectedIds.length === 0) return;
        if (!bulkRejectComment.trim()) {
            alert("Please provide a reason for rejecting the selected contracts.");
            return;
        }

        if (!confirm(`Reject all ${selectedIds.length} selected contracts?`)) return;

        try {
            await Promise.all(
                selectedIds.map(id => rejectContract(id, bulkRejectComment))
            );
            setSelectedIds([]);
            setBulkRejecting(false);
            setBulkRejectComment("");
            await load();
        } catch (e: any) {
            alert(e.message || "Bulk rejection failed");
        }
    };

    // View Details
    const handleView = async (id: number) => {
        setViewLoading(true);
        try {
            const data = await fetchLease(id);
            setViewingLease(data);
        } catch {
            const local = leases.find(l => l.id === id);
            setViewingLease(local || null);
        } finally {
            setViewLoading(false);
        }
    };

    // Filtering
    const filtered = useMemo(() => {
        return leases.filter(l => {
            const matchesSearch =
                (l.branchName || "").toLowerCase().includes(search.toLowerCase()) ||
                (l.branchCode || "").toLowerCase().includes(search.toLowerCase()) ||
                (l.ownerName || "").toLowerCase().includes(search.toLowerCase()) ||
                (l.boxFileNo || "").toLowerCase().includes(search.toLowerCase()) ||
                (l.createdBy || "").toLowerCase().includes(search.toLowerCase());

            const matchesCat =
                categoryFilter === "ALL" ||
                (l.categoryOfRent || "").toUpperCase() === categoryFilter.toUpperCase();

            return matchesSearch && matchesCat;
        });
    }, [leases, search, categoryFilter]);

    // Financial Metrics
    const totalPendingCount = leases.length;
    const totalSelectedCount = selectedIds.length;
    const totalMonthlyPendingValue = useMemo(() => {
        return leases.reduce((sum, l) => {
            const priceAfterVat = (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15));
            return sum + (l.meterSquare || 0) * priceAfterVat;
        }, 0);
    }, [leases]);

    const cityCount = leases.filter(l => (l.categoryOfRent || "").toUpperCase().includes("CITY")).length;
    const outlineCount = leases.filter(l => (l.categoryOfRent || "").toUpperCase().includes("OUTLINE")).length;
    const atmCount = leases.filter(l => (l.categoryOfRent || "").toUpperCase().includes("ATM")).length;

    // Pagination slice
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

    // Page window
    const windowSize = 5;
    let startPage = Math.max(1, safePage - Math.floor(windowSize / 2));
    let endPage = startPage + windowSize - 1;
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - windowSize + 1);
    }
    const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    const isAllPageSelected = paginatedData.length > 0 && paginatedData.every(l => selectedIds.includes(l.id));

    return (
        <div style={{ maxWidth: "1500px", margin: "0 auto", paddingBottom: "3rem" }}>
            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem"
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
                            🛡️ Checker Approvals & Verification
                        </h1>
                        <span style={{
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#f59e0b",
                            border: "1px solid rgba(245, 158, 11, 0.35)",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700
                        }}>
                            CHECKER ROLE
                        </span>
                    </div>
                    <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>
                        Inspect, audit, verify, and approve or reject lease contracts submitted by makers before activation.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                        onClick={load}
                        disabled={loading}
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
                            cursor: loading ? "not-allowed" : "pointer",
                            boxShadow: "var(--shadow-sm)"
                        }}
                    >
                        🔄 Refresh Queue
                    </button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    marginBottom: "1.75rem"
                }}
            >
                {/* Pending Review */}
                <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderLeft: "4px solid #f59e0b",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>
                        Pending Checker Review
                    </div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
                        {totalPendingCount}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Awaiting your decision
                    </div>
                </div>

                {/* Selected */}
                <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid rgba(2, 132, 199, 0.3)",
                    borderLeft: "4px solid #0284c7",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                        Selected for Batch Action
                    </div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0284c7", marginTop: "4px" }}>
                        {totalSelectedCount}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {totalSelectedCount > 0 ? "Ready for bulk decision" : "Select checkboxes below"}
                    </div>
                </div>

                {/* Total Monthly Value */}
                <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: "4px solid #475569",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Pending Monthly Exposure
                    </div>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
                        ETB {fmt(totalMonthlyPendingValue)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Combined monthly rent + VAT
                    </div>
                </div>

                {/* Category Mix */}
                <div style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                        Queue Distribution
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ background: "rgba(2, 132, 199, 0.15)", color: "#38bdf8", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                            City: {cityCount}
                        </span>
                        <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                            Outline: {outlineCount}
                        </span>
                        <span style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                            ATM: {atmCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* Sticky / Floating Batch Actions Bar */}
            {selectedIds.length > 0 && (
                <div
                    style={{
                        position: "sticky",
                        top: "12px",
                        zIndex: 50,
                        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                        borderRadius: "12px",
                        padding: "12px 20px",
                        color: "#ffffff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.25rem",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        flexWrap: "wrap",
                        gap: "12px"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                            background: "#2563eb",
                            color: "#ffffff",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            fontWeight: 800,
                            fontSize: "0.85rem"
                        }}>
                            {selectedIds.length} Selected
                        </span>
                        <span style={{ fontSize: "0.88rem", color: "#cbd5e1" }}>
                            Apply checker decision to all selected contracts simultaneously
                        </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                            onClick={handleBulkApprove}
                            style={{
                                background: "#16a34a",
                                color: "#ffffff",
                                border: "none",
                                padding: "8px 18px",
                                borderRadius: "8px",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.35)"
                            }}
                        >
                            ✅ Approve Selected ({selectedIds.length})
                        </button>

                        <button
                            onClick={() => setBulkRejecting(true)}
                            style={{
                                background: "#dc2626",
                                color: "#ffffff",
                                border: "none",
                                padding: "8px 18px",
                                borderRadius: "8px",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.35)"
                            }}
                        >
                            ❌ Reject Selected ({selectedIds.length})
                        </button>

                        <button
                            onClick={() => setSelectedIds([])}
                            style={{
                                background: "rgba(255, 255, 255, 0.1)",
                                color: "#cbd5e1",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                padding: "8px 14px",
                                borderRadius: "8px",
                                fontWeight: 600,
                                fontSize: "0.82rem",
                                cursor: "pointer"
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

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
                        placeholder="Search branch name, code, box file, owner, or maker…"
                        style={{
                            width: "100%",
                            padding: "9px 12px",
                            border: "1px solid var(--input-border)",
                            borderRadius: "8px",
                            fontSize: "0.88rem",
                            outline: "none",
                            background: "var(--input-bg)",
                            color: "var(--input-text)"
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            style={{
                                background: "var(--border)",
                                border: "none",
                                borderRadius: "50%",
                                width: "22px",
                                height: "22px",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "var(--text-secondary)"
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
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
                    <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>Loading pending approvals…</div>
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
                                    <th style={{ padding: "12px 14px", width: "40px", textAlign: "center" }}>
                                        <input
                                            type="checkbox"
                                            checked={isAllPageSelected}
                                            onChange={toggleSelectAllCurrent}
                                            title="Select all on this page"
                                            style={{ cursor: "pointer", width: "15px", height: "15px" }}
                                        />
                                    </th>
                                    <th style={{ padding: "12px 10px", fontWeight: 700, width: "40px" }}>#</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Branch / Location</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Category</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Owner / Lessor</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Submitted By</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700 }}>Contract Period</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "right" }}>Monthly Rent + VAT</th>
                                    <th style={{ padding: "12px 14px", fontWeight: 700, textAlign: "center" }}>Flags</th>
                                    <th style={{ padding: "12px 16px", fontWeight: 700, textAlign: "center" }}>Decision Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                                            {leases.length === 0
                                                ? "🎉 All pending contracts have been reviewed! No items awaiting approval."
                                                : "No pending contracts match your search filter."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((l, idx) => {
                                        const priceAfterVat = (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15));
                                        const monthly = (l.meterSquare || 0) * priceAfterVat;
                                        const isSelected = selectedIds.includes(l.id);

                                        return (
                                            <tr
                                                key={l.id}
                                                style={{
                                                    borderBottom: "1px solid #f1f5f9",
                                                    background: isSelected ? "#f0f9ff" : "transparent",
                                                    transition: "background 0.15s",
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isSelected) e.currentTarget.style.background = "#f8fafc";
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isSelected) e.currentTarget.style.background = "transparent";
                                                }}
                                            >
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(l.id)}
                                                        style={{ cursor: "pointer", width: "15px", height: "15px" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "12px 10px", color: "#64748b", fontWeight: 600 }}>
                                                    {startIndex + idx + 1}
                                                </td>
                                                <td style={{ padding: "12px 14px" }}>
                                                    <div style={{ fontWeight: 700, color: "#0f172a" }}>{l.branchName}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                                        Code: <span style={{ fontFamily: "monospace", color: "#1e293b", fontWeight: 600 }}>{l.branchCode}</span>
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
                                                <td style={{ padding: "12px 14px", fontSize: "0.8rem" }}>
                                                    <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                                        👤 {l.createdBy || "Maker"}
                                                    </div>
                                                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                                        {fmtDate(l.createdAt)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "#334155" }}>
                                                    <div>{fmtDate(l.contractStartDate)} ➔ {fmtDate(l.contractEndDate)}</div>
                                                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                                        Area: {fmt(l.meterSquare)} m²
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                                                    ETB {fmt(monthly)}
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                                                        {l.hasStampDuty && (
                                                            <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }} title="Stamp Duty Registered">
                                                                Stamp
                                                            </span>
                                                        )}
                                                        {l.hasUtilityPayment && (
                                                            <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }} title="Utility Payment Included">
                                                                Utility
                                                            </span>
                                                        )}
                                                        {!l.hasStampDuty && !l.hasUtilityPayment && (
                                                            <span style={{ color: "#94a3b8" }}>—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                                                        <button
                                                            onClick={() => handleView(l.id)}
                                                            style={{
                                                                background: "#f1f5f9",
                                                                border: "1px solid #cbd5e1",
                                                                borderRadius: "6px",
                                                                padding: "5px 10px",
                                                                fontSize: "0.78rem",
                                                                cursor: "pointer",
                                                                fontWeight: 600,
                                                                color: "#334155"
                                                            }}
                                                            title="Inspect full details"
                                                        >
                                                            👁️ View
                                                        </button>

                                                        <button
                                                            onClick={() => handleApprove(l.id, l.branchName)}
                                                            style={{
                                                                background: "#16a34a",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                padding: "5px 12px",
                                                                fontSize: "0.78rem",
                                                                color: "#ffffff",
                                                                fontWeight: 700,
                                                                cursor: "pointer",
                                                                boxShadow: "0 1px 3px rgba(22, 163, 74, 0.3)"
                                                            }}
                                                            title="Approve this lease"
                                                        >
                                                            ✅ Approve
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setRejectingId(l.id);
                                                                setRejectComment("");
                                                            }}
                                                            style={{
                                                                background: "#fee2e2",
                                                                border: "1px solid #fca5a5",
                                                                color: "#dc2626",
                                                                borderRadius: "6px",
                                                                padding: "5px 10px",
                                                                fontSize: "0.78rem",
                                                                cursor: "pointer",
                                                                fontWeight: 700
                                                            }}
                                                            title="Reject with note"
                                                        >
                                                            ❌ Reject
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

                    {/* Pagination Footer */}
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
                            <strong style={{ color: "#0f172a" }}>{filtered.length}</strong> pending contracts
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
                            >
                                Last ⏭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= REJECT REASON MODAL ================= */}
            {rejectingId && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(15, 23, 42, 0.7)",
                        backdropFilter: "blur(4px)",
                        zIndex: 10000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px"
                    }}
                >
                    <div
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "16px",
                            width: "100%",
                            maxWidth: "480px",
                            padding: "24px",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                            border: "1px solid var(--border)"
                        }}
                    >
                        <h3 style={{ margin: "0 0 8px", color: "#dc2626", fontSize: "1.2rem", fontWeight: 700 }}>
                            ❌ Reject Lease Contract
                        </h3>
                        <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "0.85rem" }}>
                            Please state clearly why this contract is being rejected so the maker can correct it.
                        </p>

                        <textarea
                            autoFocus
                            rows={4}
                            value={rejectComment}
                            onChange={e => setRejectComment(e.target.value)}
                            placeholder="e.g. Discrepancy in square meter price, missing TIN document, incorrect contract period..."
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.88rem",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                                marginBottom: "16px"
                            }}
                        />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                onClick={() => {
                                    setRejectingId(null);
                                    setRejectComment("");
                                }}
                                style={{
                                    background: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    color: "#334155",
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                style={{
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: "8px 18px",
                                    borderRadius: "8px",
                                    fontWeight: 700,
                                    cursor: "pointer"
                                }}
                            >
                                Submit Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= BULK REJECT MODAL ================= */}
            {bulkRejecting && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(15, 23, 42, 0.7)",
                        backdropFilter: "blur(4px)",
                        zIndex: 10000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px"
                    }}
                >
                    <div
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "16px",
                            width: "100%",
                            maxWidth: "480px",
                            padding: "24px",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
                            border: "1px solid var(--border)"
                        }}
                    >
                        <h3 style={{ margin: "0 0 8px", color: "#dc2626", fontSize: "1.2rem", fontWeight: 700 }}>
                            ❌ Reject {selectedIds.length} Selected Contracts
                        </h3>
                        <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "0.85rem" }}>
                            Please provide a rejection reason applied to all {selectedIds.length} selected contracts.
                        </p>

                        <textarea
                            autoFocus
                            rows={4}
                            value={bulkRejectComment}
                            onChange={e => setBulkRejectComment(e.target.value)}
                            placeholder="Rejection reason for selected batch..."
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.88rem",
                                fontFamily: "inherit",
                                boxSizing: "border-box",
                                marginBottom: "16px"
                            }}
                        />

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                                onClick={() => {
                                    setBulkRejecting(false);
                                    setBulkRejectComment("");
                                }}
                                style={{
                                    background: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    color: "#334155",
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkReject}
                                style={{
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: "8px 18px",
                                    borderRadius: "8px",
                                    fontWeight: 700,
                                    cursor: "pointer"
                                }}
                            >
                                Reject Selected ({selectedIds.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= VIEW DETAIL MODAL ================= */}
            {(viewingLease || viewLoading) && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(15, 23, 42, 0.7)",
                        backdropFilter: "blur(5px)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px"
                    }}
                    onClick={() => setViewingLease(null)}
                >
                    <div
                        style={{
                            background: "var(--bg-card)",
                            borderRadius: "16px",
                            width: "100%",
                            maxWidth: "760px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)",
                            border: "1px solid var(--border)"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {viewLoading ? (
                            <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                                Loading full lease details…
                            </div>
                        ) : (
                            viewingLease && (
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
                                                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                                    {viewingLease.branchName}
                                                </h2>
                                                <span style={{ background: "var(--border-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                                                    Code: {viewingLease.branchCode}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "3px" }}>
                                                Category: <strong style={{ color: "var(--text-primary)" }}>{viewingLease.categoryOfRent || "City"}</strong>
                                                {viewingLease.boxFileNo ? ` • Box File No: ${viewingLease.boxFileNo}` : ""}
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.35)", padding: "4px 10px", borderRadius: "12px", fontSize: "0.78rem", fontWeight: 700 }}>
                                                🟡 PENDING APPROVAL
                                            </span>
                                            <button
                                                onClick={() => setViewingLease(null)}
                                                style={{
                                                    background: "var(--border)",
                                                    border: "none",
                                                    borderRadius: "50%",
                                                    width: "28px",
                                                    height: "28px",
                                                    cursor: "pointer",
                                                    fontWeight: 700,
                                                    fontSize: "14px",
                                                    color: "var(--text-secondary)"
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
                                                background: "linear-gradient(135deg, #070e24 0%, #0f1c3f 100%)",
                                                borderRadius: "12px",
                                                padding: "16px 20px",
                                                color: "#ffffff",
                                                display: "grid",
                                                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                                                gap: "14px",
                                                border: "1px solid rgba(255, 255, 255, 0.1)"
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Monthly Rent + VAT</div>
                                                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                                                    ETB {fmt(
                                                        viewingLease.monthlyRentWithVat ||
                                                        (viewingLease.meterSquare * viewingLease.meterSquarePriceBeforeVat * (1 + (viewingLease.vatRate ?? 0.15)))
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Meter Square Area</div>
                                                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
                                                    {fmt(viewingLease.meterSquare)} m²
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Price / m² (Before VAT)</div>
                                                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
                                                    ETB {fmt(viewingLease.meterSquarePriceBeforeVat)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grid Info Sections */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                            {/* Branch & Lessor */}
                                            <div style={{ background: "var(--bg-card-subtle)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                                    🏢 Branch & Lessor Info
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "var(--text-muted)" }}>Owner:</span> <strong style={{ color: "var(--text-primary)" }}>{viewingLease.ownerName}</strong></div>
                                                    {viewingLease.tinNumber && <div><span style={{ color: "var(--text-muted)" }}>TIN:</span> <span style={{ color: "var(--text-primary)" }}>{viewingLease.tinNumber}</span></div>}
                                                    {viewingLease.region && <div><span style={{ color: "var(--text-muted)" }}>Region:</span> <span style={{ color: "var(--text-primary)" }}>{viewingLease.region}</span></div>}
                                                    {viewingLease.accountNumber && <div><span style={{ color: "var(--text-muted)" }}>Account:</span> <span style={{ color: "var(--text-primary)" }}>{viewingLease.accountNumber}</span></div>}
                                                    {viewingLease.contactInfo1 && <div><span style={{ color: "var(--text-muted)" }}>Contact:</span> <span style={{ color: "var(--text-primary)" }}>{viewingLease.contactInfo1}</span></div>}
                                                </div>
                                            </div>

                                            {/* Contract Period */}
                                            <div style={{ background: "var(--bg-card-subtle)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                                    📅 Dates & Duration
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "var(--text-muted)" }}>Start Date:</span> <strong style={{ color: "var(--text-primary)" }}>{fmtDate(viewingLease.contractStartDate)}</strong></div>
                                                    <div><span style={{ color: "var(--text-muted)" }}>End Date:</span> <strong style={{ color: "var(--text-primary)" }}>{fmtDate(viewingLease.contractEndDate)}</strong></div>
                                                    <div><span style={{ color: "var(--text-muted)" }}>Paid To Date:</span> <span style={{ color: "var(--text-primary)" }}>{fmtDate(viewingLease.paymentPaidToDate) || "—"}</span></div>
                                                    {viewingLease.prepaymentTill && <div><span style={{ color: "var(--text-muted)" }}>Prepayment Till:</span> <span style={{ color: "var(--text-primary)" }}>{fmtDate(viewingLease.prepaymentTill)}</span></div>}
                                                    {viewingLease.paymentModality && <div><span style={{ color: "var(--text-muted)" }}>Modality:</span> <span style={{ color: "var(--text-primary)" }}>{viewingLease.paymentModality}</span></div>}
                                                </div>
                                            </div>

                                            {/* Utility & Stamp Duty */}
                                            <div style={{ background: "var(--bg-card-subtle)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                                    ⚡ Utilities & Stamp Duty
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "var(--text-muted)" }}>Stamp Duty:</span> <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{viewingLease.hasStampDuty ? "✅ Registered" : "❌ None"}</span></div>
                                                    <div><span style={{ color: "var(--text-muted)" }}>Utility Payment:</span> <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{viewingLease.hasUtilityPayment ? `✅ ETB ${fmt(viewingLease.utilityPayment)}/mo` : "❌ None"}</span></div>
                                                    {viewingLease.vatRate != null && <div><span style={{ color: "var(--text-muted)" }}>VAT Rate:</span> <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{(viewingLease.vatRate * 100).toFixed(0)}%</span></div>}
                                                </div>
                                            </div>

                                            {/* Maker & Submission Trail */}
                                            <div style={{ background: "var(--bg-card-subtle)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                                                <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                                    👤 Maker Submission Info
                                                </h4>
                                                <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    <div><span style={{ color: "var(--text-muted)" }}>Submitted By:</span> <strong style={{ color: "var(--text-primary)" }}>{viewingLease.createdBy || "system"}</strong></div>
                                                    {viewingLease.createdAt && <div><span style={{ color: "var(--text-muted)" }}>Registered Date:</span> <span style={{ color: "var(--text-primary)" }}>{fmtDate(viewingLease.createdAt)}</span></div>}
                                                    <div><span style={{ color: "var(--text-muted)" }}>Approval Status:</span> <strong style={{ color: "#f59e0b" }}>Pending Review</strong></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer with Decision Actions */}
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
                                        <div style={{ display: "flex", gap: "10px" }}>
                                            <button
                                                onClick={() => {
                                                    setRejectingId(viewingLease.id);
                                                    setRejectComment("");
                                                }}
                                                style={{
                                                    background: "#fee2e2",
                                                    border: "1px solid #fca5a5",
                                                    color: "#dc2626",
                                                    padding: "8px 18px",
                                                    borderRadius: "8px",
                                                    fontWeight: 700,
                                                    fontSize: "0.85rem",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                ❌ Reject Contract
                                            </button>

                                            <button
                                                onClick={() => handleApprove(viewingLease.id, viewingLease.branchName)}
                                                style={{
                                                    background: "#16a34a",
                                                    color: "#ffffff",
                                                    border: "none",
                                                    padding: "8px 20px",
                                                    borderRadius: "8px",
                                                    fontWeight: 700,
                                                    fontSize: "0.85rem",
                                                    cursor: "pointer",
                                                    boxShadow: "0 2px 8px rgba(22, 163, 74, 0.35)"
                                                }}
                                            >
                                                ✅ Approve Contract
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setViewingLease(null)}
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