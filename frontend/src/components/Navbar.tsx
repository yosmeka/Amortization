"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const path = usePathname();
    return (
        <div className="navbar">
            <h1>🏦 Zemen Bank – Rent Amortization</h1>
            <nav style={{ display: "flex", gap: "0.25rem" }}>
                <Link href="/" className={path === "/" ? "active" : ""}>Dashboard</Link>
                <Link href="/leases" className={path === "/leases" ? "active" : ""}>Contracts</Link>
                <Link href="/leases/new" className={path === "/leases/new" ? "active" : ""}>+ Register Contract</Link>
                <Link href="/leases/upload" className={path === "/leases/upload" ? "active" : ""}>📊 Bulk Upload</Link>
                <Link href="/report" className={path === "/report" ? "active" : ""}>Monthly Report</Link>
                <Link href="/gl-report" className={path === "/gl-report" ? "active" : ""}>📋 GL Ticket</Link>
            </nav>
        </div>
    );
}
