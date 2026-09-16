"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { fetchPendingLeases } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";
import z07Logo from "../../public/z-07.png";

interface NavItem {
    label: string;
    href: string;
    icon: string;
    roles?: string[];
    badge?: string;
    isPendingCount?: boolean;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

export default function Sidebar() {
    useAuthGuard();

    const path = usePathname();
    const router = useRouter();

    const [username, setUsername] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const { theme, toggleTheme, setTheme } = useTheme();

    useEffect(() => {
        const loadUser = () => {
            const token = localStorage.getItem("token");
            const u = localStorage.getItem("username");
            const r = localStorage.getItem("role");

            if (!token || !u || !r) {
                localStorage.removeItem("token");
                localStorage.removeItem("username");
                localStorage.removeItem("role");
                setUsername(null);
                setRole(null);
                if (path !== "/login") {
                    router.replace("/login");
                }
                return;
            }

            setUsername(u);
            setRole(r);
        };

        loadUser();
        window.addEventListener("storage", loadUser);
        return () => window.removeEventListener("storage", loadUser);
    }, [path, router]);

    // Fetch pending count for Checker / Admin
    useEffect(() => {
        let isMounted = true;
        const checkPending = async () => {
            const currentRole = role || localStorage.getItem("role");
            if (currentRole === "CHECKER" || currentRole === "ADMIN") {
                try {
                    const pending = await fetchPendingLeases();
                    if (isMounted && Array.isArray(pending)) {
                        setPendingCount(pending.length);
                    }
                } catch {
                    // silently ignore if not accessible
                }
            }
        };

        checkPending();
        const interval = setInterval(checkPending, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [role, path]);

    const logout = () => {
        if (!confirm("Are you sure you want to sign out?")) return;
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        setUsername(null);
        setRole(null);
        router.push("/login");
    };

    if (path === "/login") {
        return null;
    }

    const sections: NavSection[] = [
        {
            title: "OVERVIEW",
            items: [
                { label: "Dashboard", href: "/", icon: "📊" },
            ]
        },
        {
            title: "CONTRACT MANAGEMENT",
            items: [
                { label: "All Contracts", href: "/leases", icon: "📑", roles: ["MAKER", "CHECKER", "ADMIN"] },
                { label: "Register Contract", href: "/leases/new", icon: "➕", roles: ["MAKER", "ADMIN"] },
                { label: "Bulk Excel Upload", href: "/leases/upload", icon: "📥", roles: ["MAKER", "ADMIN"] },
            ]
        },
        {
            title: "ACCOUNTING & TICKETS",
            items: [
                { label: "Monthly Report", href: "/report", icon: "📈", roles: ["MAKER", "CHECKER", "ADMIN"] },
                { label: "GL Rent Tickets", href: "/gl-report", icon: "📋", roles: ["MAKER", "CHECKER", "ADMIN"] },
            ]
        },
        {
            title: "GOVERNANCE & AUDIT",
            items: [
                {
                    label: "Pending Approvals",
                    href: "/approvals",
                    icon: "🛡️",
                    roles: ["CHECKER", "ADMIN"],
                    isPendingCount: true,
                    badge: pendingCount && pendingCount > 0 ? String(pendingCount) : undefined
                },
                { label: "User Management", href: "/register", icon: "👥", roles: ["ADMIN"] },
            ]
        }
    ];

    const roleColor = role === "CHECKER" ? "#10b981" : role === "ADMIN" ? "#f59e0b" : "#3b82f6";
    const roleLabel = role === "CHECKER" ? "Checker" : role === "ADMIN" ? "Administrator" : "Maker";
    const roleGradient = role === "CHECKER"
        ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
        : role === "ADMIN"
        ? "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)"
        : "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)";
    const roleGlow = role === "CHECKER"
        ? "0 0 14px rgba(16, 185, 129, 0.4)"
        : role === "ADMIN"
        ? "0 0 14px rgba(245, 158, 11, 0.4)"
        : "0 0 14px rgba(59, 130, 246, 0.4)";
    const initials = username
        ? username.trim().split(/\s+/).map(n => n[0]).join("").substring(0, 2).toUpperCase()
        : "US";

    return (
        <aside
            style={{
                width: collapsed ? "76px" : "272px",
                minWidth: collapsed ? "76px" : "272px",
                height: "100vh",
                position: "sticky",
                top: 0,
                backgroundColor: "#070b19",
                backgroundImage: "linear-gradient(180deg, #090e1f 0%, #060913 100%)",
                color: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
                zIndex: 100,
                boxShadow: "4px 0 28px rgba(0, 0, 0, 0.35)",
                userSelect: "none"
            }}
        >
            {/* Header Brand */}
            <div
                style={{
                    padding: collapsed ? "16px 8px" : "18px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(10, 16, 33, 0.75)",
                    backdropFilter: "blur(8px)",
                    position: "relative"
                }}
            >
                {!collapsed ? (
                    <Link
                        href="/"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "11px",
                            textDecoration: "none"
                        }}
                    >
                        <div
                            style={{
                                width: "38px",
                                height: "38px",
                                background: "#ffffff",
                                borderRadius: "10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "3px",
                                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
                                border: "1px solid rgba(255,255,255,0.8)",
                                flexShrink: 0,
                                overflow: "hidden"
                            }}
                        >
                            <Image
                                src={z07Logo}
                                alt="Zemen Bank"
                                width={32}
                                height={32}
                                unoptimized
                                priority
                                style={{ objectFit: "contain" }}
                            />
                        </div>
                        <div>
                            <div style={{
                                fontWeight: 800,
                                fontSize: "1.02rem",
                                letterSpacing: "0.6px",
                                color: "#ffffff",
                                lineHeight: 1.15
                            }}>
                                ZEMEN BANK
                            </div>
                            <div style={{
                                fontSize: "0.72rem",
                                color: "#94a3b8",
                                letterSpacing: "0.4px",
                                fontWeight: 500
                            }}>
                                Lease Amortization
                            </div>
                        </div>
                    </Link>
                ) : (
                    <Link
                        href="/"
                        style={{
                            width: "40px",
                            height: "40px",
                            background: "#ffffff",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "3px",
                            boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
                            textDecoration: "none",
                            overflow: "hidden"
                        }}
                        title="Zemen Bank Amortization System"
                    >
                        <Image
                            src={z07Logo}
                            alt="Zemen Bank"
                            width={34}
                            height={34}
                            unoptimized
                            priority
                            style={{ objectFit: "contain" }}
                        />
                    </Link>
                )}

                {/* Collapse / Expand Toggle Button */}
                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        style={{
                            background: "rgba(30, 41, 59, 0.7)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            color: "#94a3b8",
                            cursor: "pointer",
                            borderRadius: "8px",
                            width: "28px",
                            height: "28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(220, 38, 38, 0.25)";
                            e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(30, 41, 59, 0.7)";
                            e.currentTarget.style.color = "#94a3b8";
                        }}
                        title="Collapse sidebar"
                    >
                        ◀
                    </button>
                )}
            </div>

            {/* Collapsed Expand Toggle Bar */}
            {collapsed && (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 2px" }}>
                    <button
                        onClick={() => setCollapsed(false)}
                        style={{
                            background: "rgba(30, 41, 59, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            color: "#cbd5e1",
                            cursor: "pointer",
                            borderRadius: "8px",
                            width: "36px",
                            height: "26px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.72rem",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = "#dc2626";
                            e.currentTarget.style.color = "#ffffff";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(30, 41, 59, 0.8)";
                            e.currentTarget.style.color = "#cbd5e1";
                        }}
                        title="Expand sidebar"
                    >
                        ▶
                    </button>
                </div>
            )}

            {/* Navigation Body */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: collapsed ? "12px 8px" : "16px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px"
                }}
            >
                {sections.map((sec, sIdx) => {
                    const visibleItems = sec.items.filter(
                        it => !it.roles || (role && it.roles.includes(role))
                    );

                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={sIdx}>
                            {!collapsed && (
                                <div
                                    style={{
                                        fontSize: "0.68rem",
                                        fontWeight: 700,
                                        color: "#64748b",
                                        letterSpacing: "1px",
                                        padding: "0 12px 6px",
                                        textTransform: "uppercase"
                                    }}
                                >
                                    {sec.title}
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {visibleItems.map(item => {
                                    const isActive = path === item.href;
                                    const isHovered = hoveredItem === item.href;

                                    return (
                                        <div
                                            key={item.href}
                                            style={{ position: "relative" }}
                                            onMouseEnter={() => setHoveredItem(item.href)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                        >
                                            <Link
                                                href={item.href}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                    padding: collapsed ? "11px 0" : "10px 14px",
                                                    borderRadius: "10px",
                                                    textDecoration: "none",
                                                    fontSize: "0.875rem",
                                                    fontWeight: isActive ? 600 : 500,
                                                    color: isActive ? "#ffffff" : isHovered ? "#f1f5f9" : "#94a3b8",
                                                    background: isActive
                                                        ? "linear-gradient(90deg, rgba(220, 38, 38, 0.3) 0%, rgba(220, 38, 38, 0.08) 100%)"
                                                        : isHovered
                                                        ? "rgba(255, 255, 255, 0.05)"
                                                        : "transparent",
                                                    borderLeft: isActive ? "3px solid #dc2626" : "3px solid transparent",
                                                    justifyContent: collapsed ? "center" : "flex-start",
                                                    transform: isHovered && !isActive ? "translateX(3px)" : "none",
                                                    boxShadow: isActive ? "0 2px 10px rgba(220, 38, 38, 0.2)" : "none",
                                                    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                                                }}
                                            >
                                                <span style={{
                                                    fontSize: "1.15rem",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    filter: isActive ? "drop-shadow(0 0 8px rgba(220,38,38,0.5))" : "none"
                                                }}>
                                                    {item.icon}
                                                </span>

                                                {!collapsed && (
                                                    <span style={{
                                                        flex: 1,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis"
                                                    }}>
                                                        {item.label}
                                                    </span>
                                                )}

                                                {/* Dynamic Badge */}
                                                {!collapsed && item.badge && (
                                                    <span
                                                        style={{
                                                            background: item.isPendingCount ? "#f59e0b" : "#dc2626",
                                                            color: "#0f172a",
                                                            fontWeight: 800,
                                                            fontSize: "0.72rem",
                                                            padding: "2px 8px",
                                                            borderRadius: "12px",
                                                            boxShadow: item.isPendingCount
                                                                ? "0 0 10px rgba(245, 158, 11, 0.5)"
                                                                : "0 0 8px rgba(220, 38, 38, 0.4)"
                                                        }}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>

                                            {/* Tooltip in collapsed mode */}
                                            {collapsed && isHovered && (
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        left: "82px",
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        background: "#0f172a",
                                                        color: "#ffffff",
                                                        border: "1px solid rgba(255, 255, 255, 0.15)",
                                                        borderRadius: "8px",
                                                        padding: "7px 12px",
                                                        fontSize: "0.82rem",
                                                        fontWeight: 600,
                                                        whiteSpace: "nowrap",
                                                        zIndex: 9999,
                                                        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                                                        pointerEvents: "none",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "6px"
                                                    }}
                                                >
                                                    <span>{item.label}</span>
                                                    {item.badge && (
                                                        <span style={{
                                                            background: "#f59e0b",
                                                            color: "#000",
                                                            padding: "1px 6px",
                                                            borderRadius: "6px",
                                                            fontSize: "0.7rem",
                                                            fontWeight: 800
                                                        }}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* User Profile & Logout Section */}
            <div
                style={{
                    padding: collapsed ? "14px 8px" : "14px 16px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(9, 14, 31, 0.95)",
                    backdropFilter: "blur(6px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                }}
            >
                {/* Theme Mode Switcher */}
                {!collapsed ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "rgba(15, 23, 42, 0.75)",
                            border: "1px solid rgba(255, 255, 255, 0.09)",
                            borderRadius: "10px",
                            padding: "3px",
                            marginBottom: "2px"
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setTheme("light")}
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                border: "none",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                background: theme === "light" ? "#ffffff" : "transparent",
                                color: theme === "light" ? "#0f172a" : "#94a3b8",
                                boxShadow: theme === "light" ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                            title="Switch to Light Theme"
                        >
                            <span>☀️</span>
                            <span>Light</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTheme("dark")}
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                padding: "6px 8px",
                                borderRadius: "8px",
                                border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "none",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                background: theme === "dark" ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)" : "transparent",
                                color: theme === "dark" ? "#f8fafc" : "#94a3b8",
                                boxShadow: theme === "dark" ? "0 2px 10px rgba(0,0,0,0.5)" : "none",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                            title="Switch to Dark Theme"
                        >
                            <span>🌙</span>
                            <span>Dark</span>
                        </button>
                    </div>
                ) : (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "2px" }}>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            style={{
                                width: "38px",
                                height: "34px",
                                borderRadius: "9px",
                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                background: theme === "dark" ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.15)",
                                color: theme === "dark" ? "#38bdf8" : "#fbbf24",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.05rem",
                                transition: "all 0.2s ease",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                            }}
                            title={`Current: ${theme === "dark" ? "Dark" : "Light"} mode. Click to toggle.`}
                        >
                            {theme === "dark" ? "🌙" : "☀️"}
                        </button>
                    </div>
                )}

                {/* Executive User Identity & Action Card */}
                {!collapsed ? (
                    <div
                        style={{
                            background: "linear-gradient(145deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)",
                            border: "1px solid rgba(255, 255, 255, 0.09)",
                            borderRadius: "14px",
                            padding: "12px",
                            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                            transition: "all 0.25s ease"
                        }}
                    >
                        {/* Profile Info Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                            {/* Modern Squircle Avatar */}
                            <div style={{ position: "relative", flexShrink: 0 }}>
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "11px",
                                        background: roleGradient,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 800,
                                        fontSize: "0.92rem",
                                        color: "#ffffff",
                                        boxShadow: roleGlow,
                                        border: "1px solid rgba(255, 255, 255, 0.25)",
                                        letterSpacing: "0.5px"
                                    }}
                                    title={`${username ?? "User"} (${roleLabel})`}
                                >
                                    {initials}
                                </div>
                                <span
                                    style={{
                                        position: "absolute",
                                        bottom: "-2px",
                                        right: "-2px",
                                        width: "10px",
                                        height: "10px",
                                        backgroundColor: "#10b981",
                                        border: "2px solid #0f172a",
                                        borderRadius: "50%",
                                        boxShadow: "0 0 6px #10b981"
                                    }}
                                    title="Active Session"
                                />
                            </div>

                            {/* Username & Role Pill */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: "0.88rem",
                                        fontWeight: 700,
                                        color: "#f8fafc",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        lineHeight: 1.3
                                    }}
                                    title={username || "User"}
                                >
                                    {username || "User"}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                                    <span
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            fontSize: "0.68rem",
                                            color: roleColor,
                                            background: `${roleColor}18`,
                                            border: `1px solid ${roleColor}35`,
                                            padding: "2px 7px",
                                            borderRadius: "12px",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px"
                                        }}
                                    >
                                        {role === "CHECKER" ? (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                <path d="m9 12 2 2 4-4" />
                                            </svg>
                                        ) : role === "ADMIN" ? (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                        ) : (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        )}
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modern Refined Sign Out Button */}
                        <button
                            type="button"
                            onClick={logout}
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "rgba(239, 68, 68, 0.08)",
                                border: "1px solid rgba(239, 68, 68, 0.22)",
                                color: "#fca5a5",
                                cursor: "pointer",
                                padding: "7px 11px",
                                borderRadius: "8px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                                e.currentTarget.style.color = "#ffffff";
                                e.currentTarget.style.borderColor = "#dc2626";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.35)";
                                e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                                e.currentTarget.style.color = "#fca5a5";
                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.22)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span>Sign Out</span>
                            </span>
                            <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>➔</span>
                        </button>
                    </div>
                ) : (
                    /* Collapsed View */
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <div style={{ position: "relative" }}>
                            <div
                                style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "10px",
                                    background: roleGradient,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 800,
                                    fontSize: "0.9rem",
                                    color: "#ffffff",
                                    boxShadow: roleGlow,
                                    border: "1px solid rgba(255, 255, 255, 0.25)"
                                }}
                                title={`${username ?? "User"} (${roleLabel})`}
                            >
                                {initials}
                            </div>
                            <span
                                style={{
                                    position: "absolute",
                                    bottom: "-2px",
                                    right: "-2px",
                                    width: "9px",
                                    height: "9px",
                                    backgroundColor: "#10b981",
                                    border: "2px solid #0f172a",
                                    borderRadius: "50%",
                                    boxShadow: "0 0 6px #10b981"
                                }}
                                title="Active Session"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={logout}
                            style={{
                                width: "38px",
                                height: "34px",
                                background: "rgba(239, 68, 68, 0.12)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#fca5a5",
                                cursor: "pointer",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "#dc2626";
                                e.currentTarget.style.color = "#ffffff";
                                e.currentTarget.style.boxShadow = "0 3px 10px rgba(220, 38, 38, 0.4)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                                e.currentTarget.style.color = "#fca5a5";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                            title="Sign Out"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
