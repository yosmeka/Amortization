"use client";

import { useEffect, useState } from "react";
import { fetchPendingLeases, approveContract, rejectContract, fetchLease } from "@/lib/api";

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
    
    // For view modal
    const [viewingLease, setViewingLease] = useState<any | null>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const load = async () => {
        try {
            const data = await fetchPendingLeases() as PendingLease[];
            setLeases(data);
        } catch {
            setError("Failed to load pending approvals");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleApprove = async (id: number) => {
        if (!confirm("Approve this contract? It will now appear in reports.")) return;
        try {
            await approveContract(id);
            alert("Contract approved!");
            load();
        } catch (e: any) {
            alert(e.message || "Approval failed");
        }
    };

    const handleReject = async (id: number) => {
        if (!rejectComment.trim()) {
            alert("Please provide a rejection reason/comment.");
            return;
        }
        try {
            await rejectContract(id, rejectComment);
            alert("Contract rejected!");
            setRejectingId(null);
            setRejectComment("");
            load();
        } catch (e: any) {
            alert(e.message || "Rejection failed");
        }
    };

    const handleView = async (id: number) => {
        setViewLoading(true);
        try {
            const data = await fetchLease(id);
            setViewingLease(data);
        } catch (e) {
            alert("Failed to load lease details form");
        } finally {
            setViewLoading(false);
        }
    };

    if (loading) return <div style={{ padding: "2rem" }}>Loading...</div>;

    return (
        <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
            <h1 style={{ marginBottom: "1rem" }}>🛡️ Pending Approvals</h1>

            {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

            {leases.length === 0 ? (
                <div style={{ background: "white", padding: "2rem", borderRadius: "10px", textAlign: "center" }}>
                    No pending contracts awaiting approval. 🎉
                </div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Branch</th>
                                <th>Branch Code</th>
                                <th>Owner</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>m²</th>
                                <th>Price/m² (before VAT)</th>
                                <th>Monthly Rent + VAT</th>
                                <th>Stamp Duty</th>
                                <th>Maker</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leases.map(l => {
                                const priceAfterVat =
                                    l.meterSquarePriceBeforeVat * (1 + (l.vatRate || 0.15));
                                const monthly = l.meterSquare * priceAfterVat;

                                return (
                                    <tr key={l.id}>
                                        <td style={{fontWeight:600}}>{l.branchName}</td>
                                        <td>{l.branchCode}</td>
                                        <td>{l.ownerName}</td>
                                        <td>{l.contractStartDate}</td>
                                        <td>{l.contractEndDate}</td>
                                        <td>{fmt(l.meterSquare)}</td>
                                        <td>{fmt(l.meterSquarePriceBeforeVat)}</td>
                                        <td>{fmt(monthly)}</td>
                                        <td style={{ textAlign: "center" }}>
                                            {l.hasStampDuty ? "Yes" : "No"}
                                        </td>
                                        <td>
                                            <div style={{display: "flex", flexDirection: "column"}}>
                                                <span>{l.createdBy || "system"}</span>
                                                <small style={{color: "#94a3b8"}}>{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "N/A"}</small>
                                            </div>
                                        </td>
                                        <td>
                                            {rejectingId === l.id ? (
                                                <div style={{ display: "flex", gap: "8px", alignItems:"center" }}>
                                                    <input 
                                                        autoFocus
                                                        placeholder="Reason..." 
                                                        value={rejectComment}
                                                        onChange={e => setRejectComment(e.target.value)}
                                                        style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc", width: "150px" }}
                                                    />
                                                    <button onClick={() => handleReject(l.id)} className="btn btn-sm btn-danger">Submit</button>
                                                    <button onClick={() => setRejectingId(null)} className="btn btn-sm">Cancel</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", gap: "4px" }}>
                                                    <button onClick={() => handleApprove(l.id)} className="btn btn-sm" style={{background: "#16a34a", color: "white"}}>✅ Approve</button>
                                                    <button onClick={() => setRejectingId(l.id)} className="btn btn-sm" style={{background: "#fee2e2", color: "#dc2626"}}>❌ Reject</button>
                                                    <button onClick={() => handleView(l.id)} className="btn btn-sm" style={{background: "#f1f5f9", color:"#334155"}}>👁️ View</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* View Modal Overlay */}
            {(viewingLease || viewLoading) && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.5)", zIndex: 9999,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
                }}>
                    <div style={{
                        background: "white", padding: "24px", borderRadius: "12px", 
                        width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto"
                    }}>
                        {viewLoading ? <p>Loading details...</p> : (
                            <>
                                <h2 style={{marginTop:0, marginBottom:"16px", borderBottom:"1px solid #e2e8f0", paddingBottom:"12px"}}>
                                    Contract Details
                                </h2>
                                
                                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px"}}>
                                    <div><strong>Branch Name:</strong> {viewingLease.branchName}</div>
                                    <div><strong>Branch Code:</strong> {viewingLease.branchCode}</div>
                                    <div><strong>Owner Name:</strong> {viewingLease.ownerName}</div>
                                    <div><strong>Region:</strong> {viewingLease.region || "—"}</div>
                                    <div><strong>Start Date:</strong> {viewingLease.contractStartDate}</div>
                                    <div><strong>End Date:</strong> {viewingLease.contractEndDate}</div>
                                    <div><strong>Payment Modality:</strong> {viewingLease.paymentModality || "—"}</div>
                                    <div><strong>Meter Square:</strong> {fmt(viewingLease.meterSquare)}</div>
                                    <div><strong>Price/m²:</strong> {fmt(viewingLease.meterSquarePriceBeforeVat)}</div>
                                    <div><strong>TIN Number:</strong> {viewingLease.tinNumber || "—"}</div>
                                    <div><strong>Account Number:</strong> {viewingLease.accountNumber || "—"}</div>
                                    <div><strong>Has Stamp Duty:</strong> {viewingLease.hasStampDuty ? "Yes" : "No"}</div>
                                </div>

                                {viewingLease.hasStampDuty && viewingLease.stampDutyContract && (
                                    <div style={{background: "#fef3c7", padding: "12px", borderRadius: "8px", marginBottom: "16px"}}>
                                        <strong>Stamp Duty Details</strong>
                                        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px"}}>
                                            <div><strong>m²:</strong> {fmt(viewingLease.stampDutyContract.meterSquare)}</div>
                                            <div><strong>Price/m²:</strong> {fmt(viewingLease.stampDutyContract.meterSquarePriceBeforeVat)}</div>
                                            <div style={{gridColumn: "span 2"}}><strong>Full Payment / Total Contract Payment:</strong> {fmt(viewingLease.stampDutyContract.stampDutyFullPayment)}</div>
                                        </div>
                                    </div>
                                )}

                                <div style={{display: "flex", justifyContent: "flex-end"}}>
                                    <button onClick={() => setViewingLease(null)} className="btn btn-primary">Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
