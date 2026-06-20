"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useAuthGuard() {
    const router = useRouter();
    const pathname = usePathname();

    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");

        // Allow auth pages
        // Allow login
        if (pathname === "/login") {
            setReady(true);
            return;
        }

        // Not authenticated
        if (!token || !role) {
            router.replace("/login");
            return;
        }

        setReady(true);
    }, [pathname, router]);

    return ready;
}