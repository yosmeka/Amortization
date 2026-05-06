"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export default function Navbar() {
    useAuthGuard();

    const path = usePathname();
    const router = useRouter();

    const [username, setUsername] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    // ✅ Load + refresh when route changes
    useEffect(() => {
        const loadUser = () => {
            setUsername(localStorage.getItem("username"));
            setRole(localStorage.getItem("role"));
        };

        loadUser();

        // Optional: listen to storage changes (multi-tab support)
        window.addEventListener("storage", loadUser);

        return () => window.removeEventListener("storage", loadUser);
    }, [path]);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("role");

        setUsername(null);
        setRole(null);

        router.push("/login");
    };

    // ❌ Hide navbar on auth pages
    if (path === "/login" || path === "/register") {
        return null;
    }

    return (
        <div className="navbar">
            <h1>🏦 Zemen Bank – Rent Amortization</h1>

            <nav style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <Link href="/" className={path === "/" ? "active" : ""}>Dashboard</Link>
                {role === "MAKER" || role === "CHECKER" ? (
                    <Link href="/leases" className={path === "/leases" ? "active" : ""}>Contracts</Link>
                ) : null}

                {role === "MAKER" ? (
                    <Link href="/leases/new" className={path === "/leases/new" ? "active" : ""}>
                        + Register Contract
                    </Link>
                ) : null}
                {role === "MAKER" ? (
                    <Link href="/leases/upload" className={path === "/leases/upload" ? "active" : ""}>
                        📊 Bulk Upload
                    </Link>
                ) : null}
                {role === "CHECKER" ? (
                    <Link href="/report" className={path === "/report" ? "active" : ""}>
                        Monthly Report
                    </Link>
                ) : null}
                {role === "CHECKER" ? (
                    <Link href="/gl-report" className={path === "/gl-report" ? "active" : ""}>
                        📋 GL Ticket
                    </Link>
                ) : null}
                {/* 👤 USER DROPDOWN */}
                <div style={{ marginLeft: "auto", position: "relative" }}>
                    <button
                        onClick={() => setOpen(!open)}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid #201c1c",
                            cursor: "pointer",
                            background: "#792b2b",
                            fontWeight: 500
                        }}
                    >
                        {username ?? "Guest"}
                    </button>

                    {open && (
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: "110%",
                                background: "white",
                                border: "1px solid #ad4c4c",
                                borderRadius: "10px",
                                padding: "12px",
                                minWidth: "180px",
                                boxShadow: "0 6px 15px rgba(0,0,0,0.15)",
                                zIndex: 1000
                            }}
                        >
                            <p style={{ margin: 0, fontSize: "14px", color: "#272424" }}>
                                <strong>User:</strong> {username ?? "Guest"}
                            </p>

                            <p style={{ margin: "6px 0", fontSize: "14px", color: "#272424" }}>
                                <strong>Role:</strong> {role ?? "None"}
                            </p>

                            <hr />

                            <button
                                onClick={logout}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "#ef4444",
                                    color: "white",
                                    cursor: "pointer",
                                    fontWeight: 500
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </nav>
        </div>
    );
}