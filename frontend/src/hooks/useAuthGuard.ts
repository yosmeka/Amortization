"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useAuthGuard() {
    const router = useRouter();
    const pathname = usePathname();

    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Allow login
        if (pathname === "/login") {
            setReady(true);
            return;
        }

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
        const username = typeof window !== "undefined" ? localStorage.getItem("username") : null;

        // If not authenticated or any credential is missing, logout immediately
        if (!token || !role || !username) {
            if (typeof window !== "undefined") {
                localStorage.removeItem("token");
                localStorage.removeItem("role");
                localStorage.removeItem("username");
            }
            router.replace("/login");
            return;
        }

        setReady(true);
    }, [pathname, router]);

    return ready;
}