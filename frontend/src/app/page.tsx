"use client";
import Link from "next/link";

export default function Home() {
  const cards = [
    {
      href: "/leases/new",
      icon: "📝",
      title: "Register Contract",
      desc: "Add a new office rent lease with optional stamp duty",
      color: "#2563eb",
    },
    {
      href: "/leases",
      icon: "📋",
      title: "View Contracts",
      desc: "Browse and manage all registered lease contracts",
      color: "#7c3aed",
    },
    {
      href: "/report",
      icon: "📊",
      title: "Monthly Report",
      desc: "Generate the 22-column amortization report by month & year",
      color: "#059669",
    },
  ];

  return (
    <div style={{ paddingTop: "2.5rem" }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1a3c5e 0%, #2563eb 100%)",
        borderRadius: 16,
        padding: "2.5rem 2rem",
        color: "#fff",
        marginBottom: "2rem",
        boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
      }}>
        <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
          Rent Amortization System
        </h2>
        <p style={{ margin: "0.5rem 0 0", opacity: 0.85, fontSize: "0.95rem" }}>
          Register office lease contracts, manage stamp duty, and generate monthly amortization reports — all in one place.
        </p>
      </div>

      {/* Quick-action cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: "1.25rem" }}>
        {cards.map(c => (
          <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "#fff",
              border: `2px solid ${c.color}22`,
              borderRadius: 12,
              padding: "1.5rem",
              cursor: "pointer",
              transition: "box-shadow 0.2s, transform 0.2s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 18px ${c.color}40`;
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                (e.currentTarget as HTMLDivElement).style.transform = "none";
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{c.icon}</div>
              <h3 style={{ margin: 0, color: c.color, fontSize: "1.05rem", fontWeight: 700 }}>{c.title}</h3>
              <p style={{ margin: "0.4rem 0 0", color: "#64748b", fontSize: "0.85rem" }}>{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
