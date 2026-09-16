"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import FloatingWatermark from "@/components/FloatingWatermark";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);

    const isLoginPage = pathname === "/login";

    useEffect(() => {
        if (isLoginPage) {
            setAuthenticated(true);
            return;
        }

        const checkAuth = () => {
            const token = localStorage.getItem("token");
            const role = localStorage.getItem("role");
            const username = localStorage.getItem("username");

            if (!token || !role || !username) {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                localStorage.removeItem("username");
                setAuthenticated(false);
                router.replace("/login");
            } else {
                setAuthenticated(true);
            }
        };

        checkAuth();
        window.addEventListener("storage", checkAuth);
        return () => window.removeEventListener("storage", checkAuth);
    }, [pathname, isLoginPage, router]);

    // Render auth pages directly without sidebar or app frame
    if (isLoginPage) {
        return <>{children}</>;
    }

    // While checking or if unauthorized, display authenticating screen (never render guest UI)
    if (authenticated === null || !authenticated) {
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    backgroundColor: "var(--bg-base, #070b14)",
                    color: "var(--text-muted, #94a3b8)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    gap: "14px",
                    fontFamily: "Inter, sans-serif"
                }}
            >
                <div
                    style={{
                        width: "28px",
                        height: "28px",
                        border: "3px solid rgba(220, 38, 38, 0.2)",
                        borderTopColor: "#dc2626",
                        borderRadius: "50%",
                        animation: "authSpin 0.7s linear infinite"
                    }}
                />
                <span>Authenticating session…</span>
                <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Authenticated users receive the full executive app layout
    return (
        <div
            className="main-content-layout"
            style={{
                display: "flex",
                minHeight: "100vh",
                backgroundColor: "var(--bg-base)",
                transition: "background-color 0.25s ease"
            }}
        >
            <Sidebar />
            <main style={{ flex: 1, minWidth: 0, overflowX: "hidden", display: "flex", flexDirection: "column" }}>
                <div className="page-container">
                    {children}
                </div>
            </main>
            <FloatingWatermark />
        </div>
    );
}
