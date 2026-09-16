"use client";

import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useEffect, useState, useMemo } from "react";
import { fetchLeases, fetchPendingLeases } from "@/lib/api";

function fmt(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "0.00";
    return n.toLocaleString("en-ET", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function fmtShort(n: number | null | undefined) {
    if (n == null || isNaN(n)) return "0";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toLocaleString();
}

export default function Home() {
    useAuthGuard();

    const [role, setRole] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [leases, setLeases] = useState<any[]>([]);
    const [pendingLeases, setPendingLeases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setRole(localStorage.getItem("role"));
        setUsername(localStorage.getItem("username"));

        const loadData = async () => {
            try {
                const [allData, pendingData] = await Promise.allSettled([
                    fetchLeases(),
                    fetchPendingLeases()
                ]);
                if (allData.status === "fulfilled" && Array.isArray(allData.value)) {
                    setLeases(allData.value);
                }
                if (pendingData.status === "fulfilled" && Array.isArray(pendingData.value)) {
                    setPendingLeases(pendingData.value);
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Metrics calculation
    const totalCount = leases.length;
    const approvedCount = leases.filter(l => l.approvalStatus === "APPROVED").length;
    const pendingCount = pendingLeases.length || leases.filter(l => l.approvalStatus === "PENDING" || !l.approvalStatus).length;
    const rejectedCount = leases.filter(l => l.approvalStatus === "REJECTED").length;

    const totalMonthlyRent = useMemo(() => {
        return leases.reduce((sum, l) => {
            const priceAfterVat = (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15));
            return sum + (l.meterSquare || 0) * priceAfterVat;
        }, 0);
    }, [leases]);

    const totalArea = useMemo(() => {
        return leases.reduce((sum, l) => sum + (l.meterSquare || 0), 0);
    }, [leases]);

    // Categories breakdown
    const cityLeases = leases.filter(l => (l.categoryOfRent || "").toUpperCase().includes("CITY"));
    const outlineLeases = leases.filter(l => (l.categoryOfRent || "").toUpperCase().includes("OUTLINE"));
    const atmLeases = leases.filter(l => (l.categoryOfRent || "").toUpperCase().includes("ATM"));

    const cityMonthly = cityLeases.reduce((s, l) => s + (l.meterSquare || 0) * (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15)), 0);
    const outlineMonthly = outlineLeases.reduce((s, l) => s + (l.meterSquare || 0) * (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15)), 0);
    const atmMonthly = atmLeases.reduce((s, l) => s + (l.meterSquare || 0) * (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15)), 0);

    const maxMonthlyCategory = Math.max(1, cityMonthly, outlineMonthly, atmMonthly);

    const cards = [
        {
            href: "/leases/new",
            icon: "📝",
            title: "Register Contract",
            desc: "Add a new office rent lease contract",
            color: "#2563eb",
            gradient: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            roles: ["MAKER", "ADMIN"],
        },
        {
            href: "/leases/upload",
            icon: "📥",
            title: "Bulk Excel Upload",
            desc: "Batch import contracts from Excel template",
            color: "#0891b2",
            gradient: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
            roles: ["MAKER", "ADMIN"],
        },
        {
            href: "/leases",
            icon: "📋",
            title: "View Contracts",
            desc: "Browse, filter, and audit all contracts",
            color: "#7c3aed",
            gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            roles: ["MAKER", "CHECKER", "ADMIN"],
        },
        {
            href: "/report",
            icon: "📊",
            title: "Monthly Report",
            desc: "Generate amortization reports & journal entries",
            color: "#059669",
            gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            roles: ["CHECKER", "MAKER", "ADMIN"],
        },
        {
            href: "/gl-report",
            icon: "📋",
            title: "GL Rent Tickets",
            desc: "Generate ATM, City, Outline tickets & Expense Upload",
            color: "#ea580c",
            gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
            roles: ["CHECKER", "MAKER", "ADMIN"],
        },
        {
            href: "/approvals",
            icon: "🛡️",
            title: "Pending Approvals",
            desc: "Review and approve/reject maker submissions",
            color: "#dc2626",
            gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            badge: pendingCount > 0 ? `${pendingCount} pending` : undefined,
            roles: ["CHECKER", "ADMIN"],
        },
    ];

    const allowedCards = cards.filter((c) => !c.roles || (role && c.roles.includes(role)));

    // Recent 5 contracts
    const recentContracts = leases.slice(-5).reverse();

    return (
        <div style={{ padding: "1.5rem 0 3rem", maxWidth: "1500px", margin: "0 auto" }}>
            {/* Executive Hero Banner */}
            <div
                style={{
                    background: "linear-gradient(135deg, #070e24 0%, #0f1c3f 50%, #1e3a8a 100%)",
                    borderRadius: "18px",
                    padding: "2.2rem 2.4rem",
                    color: "#ffffff",
                    marginBottom: "2rem",
                    boxShadow: "0 10px 30px rgba(15, 28, 63, 0.4)",
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
            >
                {/* Decorative background glow */}
                <div style={{
                    position: "absolute",
                    top: "-40px",
                    right: "-40px",
                    width: "220px",
                    height: "220px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(220, 38, 38, 0.25) 0%, rgba(220, 38, 38, 0) 70%)",
                    pointerEvents: "none"
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem", position: "relative", zIndex: 1 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <span style={{
                                background: "rgba(220, 38, 38, 0.25)",
                                border: "1px solid rgba(220, 38, 38, 0.5)",
                                color: "#fca5a5",
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                Zemen Bank S.C
                            </span>
                            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                                • Rent Amortization &amp; Financial Management System
                            </span>
                        </div>
                        <h1 style={{ margin: "0 0 8px", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.5px" }}>
                            Welcome back, {username ?? "Authorized User"} 
                        </h1>
                        <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.95rem", maxWidth: "680px", lineHeight: 1.5 }}>
                            Monitor office lease commitments, audit monthly amortization schedules, generate balanced GL tickets, and manage maker/checker verification queues.
                        </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                        <div style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            backdropFilter: "blur(6px)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "10px",
                            padding: "8px 16px",
                            fontSize: "0.85rem",
                            color: "#e2e8f0"
                        }}>
                            📅 <strong>{new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong> Active Accounting Period
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                            System Role: <strong style={{ color: "#ffffff" }}>{role || "User"}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top KPI Metrics */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: "14px",
                    marginBottom: "2rem"
                }}
            >
                {/* Total Leases */}
                <div style={{
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    padding: "18px 22px",
                    border: "1px solid var(--border)",
                    borderLeft: "4px solid #2563eb",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Total Lease Contracts
                        </div>
                        <span style={{ fontSize: "1.2rem" }}>📑</span>
                    </div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
                        {loading ? "…" : totalCount}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "2px", fontWeight: 600 }}>
                        ✓ {approvedCount} approved &amp; active
                    </div>
                </div>

                {/* Monthly Rent Exposure */}
                <div style={{
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    padding: "18px 22px",
                    border: "1px solid var(--border)",
                    borderLeft: "4px solid #059669",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Monthly Rent Exposure
                        </div>
                        <span style={{ fontSize: "1.2rem" }}>💰</span>
                    </div>
                    <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
                        {loading ? "…" : `ETB ${fmtShort(totalMonthlyRent)}`}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        ETB {fmt(totalMonthlyRent)} total/mo
                    </div>
                </div>

                {/* Total Area Leased */}
                <div style={{
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    padding: "18px 22px",
                    border: "1px solid var(--border)",
                    borderLeft: "4px solid #7c3aed",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Total Leased Area
                        </div>
                        <span style={{ fontSize: "1.2rem" }}>📐</span>
                    </div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
                        {loading ? "…" : `${fmt(totalArea)} m²`}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Across all branch premises
                    </div>
                </div>

                {/* Pending Approvals */}
                <div style={{
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    padding: "18px 22px",
                    border: "1px solid var(--border)",
                    borderLeft: "4px solid #f59e0b",
                    boxShadow: "var(--shadow-sm)"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>
                            Pending Approvals
                        </div>
                        <span style={{ fontSize: "1.2rem" }}>🛡️</span>
                    </div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#f59e0b", marginTop: "6px" }}>
                        {loading ? "…" : pendingCount}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {pendingCount > 0 ? (
                            <Link href="/approvals" style={{ color: "#d97706", fontWeight: 700, textDecoration: "underline" }}>
                                Review {pendingCount} in queue ➔
                            </Link>
                        ) : (
                            "All queues up to date"
                        )}
                    </div>
                </div>
            </div>

            {/* Figurative Visual Analytics Section */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                    gap: "1.5rem",
                    marginBottom: "2rem"
                }}
            >
                {/* Visual Chart 1: Category Distribution Ring */}
                <div
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "20px 24px",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                📊 Portfolio by Category
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                Distribution of City, Outline, and ATM lease contracts
                            </p>
                        </div>
                        <span style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700 }}>
                            {totalCount} Total
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "20px", flex: 1 }}>
                        {/* SVG Donut Ring */}
                        <div style={{ position: "relative", width: "160px", height: "160px" }}>
                            <svg width="160" height="160" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                                {/* Background circle */}
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--border-subtle)" strokeWidth="3.2" />

                                {/* City circle */}
                                <circle
                                    cx="18" cy="18" r="15.915"
                                    fill="transparent"
                                    stroke="#0284c7"
                                    strokeWidth="3.2"
                                    strokeDasharray={`${totalCount > 0 ? (cityLeases.length / totalCount) * 100 : 0} 100`}
                                    strokeDashoffset="0"
                                    strokeLinecap="round"
                                />

                                {/* Outline circle */}
                                <circle
                                    cx="18" cy="18" r="15.915"
                                    fill="transparent"
                                    stroke="#f59e0b"
                                    strokeWidth="3.2"
                                    strokeDasharray={`${totalCount > 0 ? (outlineLeases.length / totalCount) * 100 : 0} 100`}
                                    strokeDashoffset={`-${totalCount > 0 ? (cityLeases.length / totalCount) * 100 : 0}`}
                                    strokeLinecap="round"
                                />

                                {/* ATM circle */}
                                <circle
                                    cx="18" cy="18" r="15.915"
                                    fill="transparent"
                                    stroke="#8b5cf6"
                                    strokeWidth="3.2"
                                    strokeDasharray={`${totalCount > 0 ? (atmLeases.length / totalCount) * 100 : 0} 100`}
                                    strokeDashoffset={`-${totalCount > 0 ? ((cityLeases.length + outlineLeases.length) / totalCount) * 100 : 0}`}
                                    strokeLinecap="round"
                                />
                            </svg>

                            <div style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center"
                            }}>
                                <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
                                    {totalCount}
                                </span>
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                                    Contracts
                                </span>
                            </div>
                        </div>

                        {/* Donut Legend */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "160px" }}>
                            {/* City */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0284c7" }} />
                                        City Branches
                                    </span>
                                    <strong style={{ fontSize: "0.85rem", color: "#0284c7" }}>{cityLeases.length}</strong>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "16px" }}>
                                    {totalCount > 0 ? ((cityLeases.length / totalCount) * 100).toFixed(0) : 0}% of portfolio
                                </div>
                            </div>

                            {/* Outline */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                                        Outline Branches
                                    </span>
                                    <strong style={{ fontSize: "0.85rem", color: "#f59e0b" }}>{outlineLeases.length}</strong>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "16px" }}>
                                    {totalCount > 0 ? ((outlineLeases.length / totalCount) * 100).toFixed(0) : 0}% of portfolio
                                </div>
                            </div>

                            {/* ATM */}
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#8b5cf6" }} />
                                        ATM Space Rent
                                    </span>
                                    <strong style={{ fontSize: "0.85rem", color: "#8b5cf6" }}>{atmLeases.length}</strong>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "16px" }}>
                                    {totalCount > 0 ? ((atmLeases.length / totalCount) * 100).toFixed(0) : 0}% of portfolio
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Chart 2: Monthly Rent Commitment Comparison Bars */}
                <div
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "20px 24px",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                📈 Monthly Rent Commitment by Category
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                Comparison of monthly amortized rental amounts (ETB)
                            </p>
                        </div>
                        <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "3px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700 }}>
                            ETB {fmtShort(totalMonthlyRent)}
                        </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, justifyContent: "center" }}>
                        {/* City Bar */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>City Branches</span>
                                <span style={{ fontWeight: 700, color: "#0284c7" }}>ETB {fmt(cityMonthly)}</span>
                            </div>
                            <div style={{ width: "100%", height: "12px", background: "var(--border-subtle)", borderRadius: "6px", overflow: "hidden" }}>
                                <div style={{
                                    height: "100%",
                                    width: `${Math.min(100, Math.max(5, (cityMonthly / maxMonthlyCategory) * 100))}%`,
                                    background: "linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)",
                                    borderRadius: "6px"
                                }} />
                            </div>
                        </div>

                        {/* Outline Bar */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Outline Branches</span>
                                <span style={{ fontWeight: 700, color: "#f59e0b" }}>ETB {fmt(outlineMonthly)}</span>
                            </div>
                            <div style={{ width: "100%", height: "12px", background: "var(--border-subtle)", borderRadius: "6px", overflow: "hidden" }}>
                                <div style={{
                                    height: "100%",
                                    width: `${Math.min(100, Math.max(5, (outlineMonthly / maxMonthlyCategory) * 100))}%`,
                                    background: "linear-gradient(90deg, #d97706 0%, #fbbf24 100%)",
                                    borderRadius: "6px"
                                }} />
                            </div>
                        </div>

                        {/* ATM Bar */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>ATM Space Rent</span>
                                <span style={{ fontWeight: 700, color: "#8b5cf6" }}>ETB {fmt(atmMonthly)}</span>
                            </div>
                            <div style={{ width: "100%", height: "12px", background: "var(--border-subtle)", borderRadius: "6px", overflow: "hidden" }}>
                                <div style={{
                                    height: "100%",
                                    width: `${Math.min(100, Math.max(5, (atmMonthly / maxMonthlyCategory) * 100))}%`,
                                    background: "linear-gradient(90deg, #7c3aed 0%, #a78bfa 100%)",
                                    borderRadius: "6px"
                                }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Chart 3: Verification Pipeline */}
                <div
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "20px 24px",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                🛡️ Maker-Checker Verification Pipeline
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                Status of submitted contracts awaiting checker audit
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: "16px" }}>
                        <div style={{ width: "100%", height: "14px", background: "var(--border-subtle)", borderRadius: "7px", display: "flex", overflow: "hidden" }}>
                            <div style={{ width: `${totalCount > 0 ? (approvedCount / totalCount) * 100 : 0}%`, background: "#16a34a" }} title="Approved" />
                            <div style={{ width: `${totalCount > 0 ? (pendingCount / totalCount) * 100 : 0}%`, background: "#f59e0b" }} title="Pending" />
                            <div style={{ width: `${totalCount > 0 ? (rejectedCount / totalCount) * 100 : 0}%`, background: "#dc2626" }} title="Rejected" />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", textAlign: "center" }}>
                        <div style={{ background: "rgba(22, 163, 74, 0.12)", border: "1px solid rgba(22, 163, 74, 0.3)", borderRadius: "10px", padding: "10px" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16a34a" }}>Approved</div>
                            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#16a34a", marginTop: "2px" }}>{approvedCount}</div>
                        </div>

                        <div style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "10px", padding: "10px" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b" }}>Pending</div>
                            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f59e0b", marginTop: "2px" }}>{pendingCount}</div>
                        </div>

                        <div style={{ background: "rgba(220, 38, 38, 0.12)", border: "1px solid rgba(220, 38, 38, 0.3)", borderRadius: "10px", padding: "10px" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444" }}>Rejected</div>
                            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ef4444", marginTop: "2px" }}>{rejectedCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Navigation Cards Hub */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        ⚡ Quick Navigation Hub
                    </h2>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        Features accessible for your role ({role || "User"})
                    </span>
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "1.25rem",
                    }}
                >
                    {allowedCards.map((c) => (
                        <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
                            <div
                                style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "14px",
                                    padding: "1.5rem",
                                    cursor: "pointer",
                                    boxShadow: "var(--shadow-sm)",
                                    position: "relative",
                                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-3px)";
                                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                                    e.currentTarget.style.borderColor = c.color;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                                    e.currentTarget.style.borderColor = "var(--border)";
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                    <div
                                        style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "12px",
                                            background: c.gradient,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "1.5rem",
                                            color: "#ffffff",
                                            boxShadow: `0 4px 12px ${c.color}33`
                                        }}
                                    >
                                        {c.icon}
                                    </div>
                                    {c.badge && (
                                        <span style={{
                                            background: "#fee2e2",
                                            color: "#dc2626",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            padding: "3px 8px",
                                            borderRadius: "12px",
                                            border: "1px solid #fca5a5"
                                        }}>
                                            {c.badge}
                                        </span>
                                    )}
                                </div>

                                <h3
                                    style={{
                                        margin: "0 0 6px",
                                        color: "var(--text-primary)",
                                        fontSize: "1.05rem",
                                        fontWeight: 700,
                                    }}
                                >
                                    {c.title}
                                </h3>
                                <p
                                    style={{
                                        margin: 0,
                                        color: "var(--text-muted)",
                                        fontSize: "0.85rem",
                                        lineHeight: 1.4
                                    }}
                                >
                                    {c.desc}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Contracts Section */}
            {recentContracts.length > 0 && (
                <div
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "20px 24px",
                        boxShadow: "var(--shadow-sm)"
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                📑 Recent Contracts Registry
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                                Recently registered and modified branch lease agreements
                            </p>
                        </div>
                        <Link
                            href="/leases"
                            style={{
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                color: "#2563eb",
                                textDecoration: "none"
                            }}
                        >
                            View All Contracts ({totalCount}) ➔
                        </Link>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", background: "var(--table-bg)" }}>
                            <thead>
                                <tr style={{ background: "var(--table-header-bg)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Branch Name</th>
                                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Code</th>
                                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Category</th>
                                    <th style={{ padding: "10px 12px", fontWeight: 700 }}>Owner</th>
                                    <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>Monthly Rent + VAT</th>
                                    <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "center" }}>Status</th>
                                    <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "center" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentContracts.map((l) => {
                                    const monthly = (l.meterSquare || 0) * (l.meterSquarePriceBeforeVat || 0) * (1 + (l.vatRate ?? 0.15));
                                    return (
                                        <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                            <td style={{ padding: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{l.branchName}</td>
                                            <td style={{ padding: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>{l.branchCode}</td>
                                            <td style={{ padding: "12px" }}>
                                                <span style={{
                                                    background: l.categoryOfRent === "ATM" ? "rgba(168, 85, 247, 0.15)" : l.categoryOfRent === "City" ? "rgba(2, 132, 199, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                                    color: l.categoryOfRent === "ATM" ? "#a855f7" : l.categoryOfRent === "City" ? "#38bdf8" : "#fbbf24",
                                                    padding: "2px 8px",
                                                    borderRadius: "6px",
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600
                                                }}>
                                                    {l.categoryOfRent || "City"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{l.ownerName}</td>
                                            <td style={{ padding: "12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                                                ETB {fmt(monthly)}
                                            </td>
                                            <td style={{ padding: "12px", textAlign: "center" }}>
                                                {l.approvalStatus === "APPROVED" && (
                                                    <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700 }}>
                                                        Approved
                                                    </span>
                                                )}
                                                {(l.approvalStatus === "PENDING" || !l.approvalStatus) && (
                                                    <span style={{ background: "#fef3c7", color: "#854d0e", padding: "2px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700 }}>
                                                        Pending
                                                    </span>
                                                )}
                                                {l.approvalStatus === "REJECTED" && (
                                                    <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700 }}>
                                                        Rejected
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: "12px", textAlign: "center" }}>
                                                <Link
                                                    href="/leases"
                                                    style={{
                                                        background: "#f1f5f9",
                                                        color: "#334155",
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: 600,
                                                        textDecoration: "none"
                                                    }}
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}