"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function useAuthGuard() {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");
        const role = localStorage.getItem("role");

        // allow login/register pages
        if (pathname === "/login" || pathname === "/register") {
            setReady(true);
            return;
        }

        // small delay to avoid race condition
        if (!token  || !role) {
            router.replace("/login");
            return;
        }

        setReady(true);
    }, [pathname]);

    return ready;
}