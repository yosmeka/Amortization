"use client";

import { useEffect, useState } from "react";
import {
    fetchPendingLeases,
    approveContract,
    rejectContract,
    fetchLease
} from "@/lib/api";

interface PendingLease {
    id: number;
    branchName: string;
    branchCode: string;
    categoryOfRent: string;
    ownerName: string;
    createdBy: string;
    createdAt: string;
    contractStartDate: string;
    contractEndDate: string;
    hasStampDuty: boolean;
    meterSquare: number;
    meterSquarePriceBeforeVat: number;
    vatRate: number;
    monthlyRentWithVat?: number;
}

function fmt(n: number) {
    return n?.toLocaleString("en-ET", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) ?? "—";
}

export default function ApprovalsPage() {
    const [leases, setLeases] = useState<PendingLease[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectComment, setRejectComment] = useState("");

    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const [bulkRejecting, setBulkRejecting] = useState(false);
    const [bulkRejectComment, setBulkRejectComment] = useState("");

    const [viewingLease, setViewingLease] = useState<any | null>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const load = async () => {
        try {
            const data = (await fetchPendingLeases()) as PendingLease[];
            setLeases(data);
        } catch {
            setError("Failed to load pending approvals");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === leases.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(leases.map(l => l.id));
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm("Approve this contract?")) return;

        try {
            await approveContract(id);
            alert("Contract approved!");

            setSelectedIds(prev => prev.filter(item => item !== id));
            load();
        } catch (e: any) {
            alert(e.message || "Approval failed");
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return alert("Please select at least one contract.");

        if (!confirm(`Approve ${selectedIds.length} selected contracts?`)) return;

        try {
            await Promise.all(selectedIds.map(id => approveContract(id)));

            alert(`${selectedIds.length} contracts approved successfully!`);

            setSelectedIds([]);
            load();
        } catch (e: any) {
            alert(e.message || "Bulk approval failed");
        }
    };

    const handleReject = async (id: number) => {
        if (!rejectComment.trim()) return alert("Please provide rejection reason.");

        try {
            await rejectContract(id, rejectComment);

            alert("Contract rejected!");

            setRejectingId(null);
            setRejectComment("");

            setSelectedIds(prev => prev.filter(item => item !== id));
            load();
        } catch (e: any) {
            alert(e.message || "Rejection failed");
        }
    };

    const handleBulkReject = async () => {
        if (selectedIds.length === 0) return alert("Please select at least one contract.");
        if (!bulkRejectComment.trim()) return alert("Please provide rejection reason.");

        if (!confirm(`Reject ${selectedIds.length} selected contracts?`)) return;

        try {
            await Promise.all(
                selectedIds.map(id => rejectContract(id, bulkRejectComment))
            );

            alert(`${selectedIds.length} contracts rejected successfully!`);

            setSelectedIds([]);
            setBulkRejecting(false);
            setBulkRejectComment("");

            load();
        } catch (e: any) {
            alert(e.message || "Bulk rejection failed");
        }
    };

    const handleView = async (id: number) => {
        setViewLoading(true);

        try {
            const data = await fetchLease(id);
            setViewingLease(data);
        } catch {
            alert("Failed to load lease details");
        } finally {
            setViewLoading(false);
        }
    };

    if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

    return (
        <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
            <h1 style={{ marginBottom: "1rem" }}>🛡️ Pending Approvals</h1>

            {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

            {/* ===== TABLE + ALL YOUR EXISTING UI (UNCHANGED) ===== */}
            {leases.length !== 0 && (
              <>
    {/* Bulk Actions */}
    <div
        style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            gap: "12px",
            flexWrap: "wrap"
        }}
    >
        <div>
            {selectedIds.length > 0 && (
                <span style={{ fontWeight: 600 }}>
                    {selectedIds.length} selected
                </span>
            )}
        </div>

        <div
            style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap"
            }}
        >
            {bulkRejecting && (
                <input
                    placeholder="Rejection reason..."
                    value={bulkRejectComment}
                    onChange={(e) =>
                        setBulkRejectComment(e.target.value)
                    }
                    style={{
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        width: "220px"
                    }}
                />
            )}

            {/* Bulk Approve */}
            <button
                onClick={handleBulkApprove}
                disabled={selectedIds.length === 0}
                className="btn btn-sm"
                style={{
                    background:
                        selectedIds.length === 0
                            ? "#94a3b8"
                            : "#16a34a",
                    color: "white",
                    cursor:
                        selectedIds.length === 0
                            ? "not-allowed"
                            : "pointer"
                }}
            >
                ✅ Approve Selected
            </button>

            {/* Bulk Reject */}
            {bulkRejecting ? (
                <>
                    <button
                        onClick={handleBulkReject}
                        disabled={selectedIds.length === 0}
                        className="btn btn-sm"
                        style={{
                            background: "#dc2626",
                            color: "white"
                        }}
                    >
                        Submit Reject
                    </button>

                    <button
                        onClick={() => {
                            setBulkRejecting(false);
                            setBulkRejectComment("");
                        }}
                        className="btn btn-sm"
                    >
                        Cancel
                    </button>
                </>
            ) : (
                <button
                    onClick={() => setBulkRejecting(true)}
                    disabled={selectedIds.length === 0}
                    className="btn btn-sm"
                    style={{
                        background:
                            selectedIds.length === 0
                                ? "#94a3b8"
                                : "#dc2626",
                        color: "white",
                        cursor:
                            selectedIds.length === 0
                                ? "not-allowed"
                                : "pointer"
                    }}
                >
                    ❌ Reject Selected
                </button>
            )}
        </div>
    </div>

    {/* Table */}
    <div className="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th>
                        <input
                            type="checkbox"
                            checked={
                                leases.length > 0 &&
                                selectedIds.length === leases.length
                            }
                            onChange={toggleSelectAll}
                        />
                    </th>

                    <th>Branch</th>
                    <th>Branch Code</th>
                    <th>Owner</th>
                    
                    <th>Actions</th>
                </tr>
            </thead>

            <tbody>
                {leases.map(l => {
                    const priceAfterVat =
                        l.meterSquarePriceBeforeVat *
                        (1 + (l.vatRate ?? 0.15));

                    const monthly =
                        l.meterSquare * priceAfterVat;

                    return (
                        <tr key={l.id}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(l.id)}
                                    onChange={() => toggleSelect(l.id)}
                                />
                            </td>

                            <td style={{ fontWeight: 600 }}>
                                {l.branchName}
                            </td>

                            <td>{l.branchCode}</td>

                            <td>{l.ownerName}</td>

                           

                            <td>
                                {rejectingId === l.id ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center"
                                        }}
                                    >
                                        <input
                                            autoFocus
                                            placeholder="Reason..."
                                            value={rejectComment}
                                            onChange={e =>
                                                setRejectComment(e.target.value)
                                            }
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                border: "1px solid #ccc",
                                                width: "150px"
                                            }}
                                        />

                                        <button
                                            onClick={() => handleReject(l.id)}
                                            className="btn btn-sm"
                                            style={{
                                                background: "#dc2626",
                                                color: "white"
                                            }}
                                        >
                                            Submit
                                        </button>

                                        <button
                                            onClick={() => setRejectingId(null)}
                                            className="btn btn-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", gap: "4px" }}>
                                        <button
                                            onClick={() => handleApprove(l.id)}
                                            className="btn btn-sm"
                                            style={{
                                                background: "#16a34a",
                                                color: "white"
                                            }}
                                        >
                                            ✅ Approve
                                        </button>

                                        <button
                                            onClick={() =>
                                                setRejectingId(l.id)
                                            }
                                            className="btn btn-sm"
                                            style={{
                                                background: "#fee2e2",
                                                color: "#dc2626"
                                            }}
                                        >
                                            ❌ Reject
                                        </button>

                                        <button
                                            onClick={() => handleView(l.id)}
                                            className="btn btn-sm"
                                            style={{
                                                background: "#f1f5f9",
                                                color: "#334155"
                                            }}
                                        >
                                            👁️ View
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
</>
            )}

            {/* ================= VIEW MODAL (ONLY UPDATED PART) ================= */}
            {(viewingLease || viewLoading) && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px"
                    }}
                >
                    <div
                        style={{
                            background: "white",
                            padding: "24px",
                            borderRadius: "12px",
                            width: "100%",
                            maxWidth: "600px",
                            maxHeight: "90vh",
                            overflowY: "auto"
                        }}
                    >
                        {viewLoading ? (
                            <p>Loading details...</p>
                        ) : (
                            <>
                                <h2
                                    style={{
                                        marginTop: 0,
                                        marginBottom: "16px",
                                        borderBottom: "1px solid #e2e8f0",
                                        paddingBottom: "12px"
                                    }}
                                >
                                    Contract Details
                                </h2>

                                {/* BASIC INFO (kept + expanded) */}
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "12px"
                                    }}
                                >
                                    <div>
                                        <strong>Branch:</strong>{" "}
                                        {viewingLease.branchName}
                                    </div>

                                    <div>
                                        <strong>Branch Code:</strong>{" "}
                                        {viewingLease.branchCode}
                                    </div>

                                    <div>
                                        <strong>Owner:</strong>{" "}
                                        {viewingLease.ownerName}
                                    </div>

                                    <div>
                                        <strong>Maker:</strong>{" "}
                                        {viewingLease.createdBy || "system"}
                                    </div>

                                    <div>
                                        <strong>Start Date:</strong>{" "}
                                        {viewingLease.contractStartDate}
                                    </div>

                                    <div>
                                        <strong>End Date:</strong>{" "}
                                        {viewingLease.contractEndDate}
                                    </div>

                                    <div>
                                        <strong>m²:</strong>{" "}
                                        {fmt(viewingLease.meterSquare)}
                                    </div>

                                    <div>
                                        <strong>Price/m² (before VAT):</strong>{" "}
                                        {fmt(viewingLease.meterSquarePriceBeforeVat)}
                                    </div>

                                    <div>
                                        <strong>VAT Rate:</strong>{" "}
                                        {viewingLease.vatRate}
                                    </div>

                                    <div>
                                        <strong>Stamp Duty:</strong>{" "}
                                        {viewingLease.hasStampDuty ? "Yes" : "No"}
                                    </div>

                                    <div>
                                        <strong>Monthly Rent + VAT:</strong>{" "}
                                        {fmt(
                                            viewingLease.meterSquare *
                                                viewingLease.meterSquarePriceBeforeVat *
                                                (1 + (viewingLease.vatRate ?? 0.15))
                                        )}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        marginTop: "20px"
                                    }}
                                >
                                    <button
                                        onClick={() => setViewingLease(null)}
                                        className="btn btn-primary"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}