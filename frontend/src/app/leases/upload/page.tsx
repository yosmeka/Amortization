"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { bulkUploadLeases, BulkUploadResult } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export default function BulkUploadPage() {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<BulkUploadResult | null>(null);
    const [error, setError] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) { setFile(f); setResult(null); setError(""); }
    };

    const handleUpload = async () => {
        if (!file) { setError("Please select an Excel (.xlsx) file first."); return; }
        setLoading(true); setError(""); setResult(null);
        try {
            const res = await bulkUploadLeases(file);
            setResult(res);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.open(`${API_BASE}/leases/template`, "_blank");
    };

    return (
        <div>
            <div className="page-header">
                <h2>📊 Bulk Upload Lease Contracts</h2>
                <p>Upload an Excel (.xlsx) file to register multiple lease contracts at once.</p>
            </div>

            {/* Instructions card */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="card-title">📋 How it works</div>
                <ol style={{ margin: "0.5rem 0 0 1.2rem", lineHeight: 1.9, color: "#475569", fontSize: "0.88rem" }}>
                    <li>Download the template below — it contains the correct column order and an example row.</li>
                    <li>Fill in your lease data row-by-row. Columns marked <strong>*</strong> are required.</li>
                    <li>For contracts with stamp duty, set column <em>"Has Stamp Duty"</em> to <code>yes</code> and fill columns 25–31.</li>
                    <li>Save the file as <strong>.xlsx</strong> (Excel format).</li>
                    <li>Upload the file using the form below.</li>
                </ol>

                <button
                    className="btn btn-outline"
                    onClick={handleDownloadTemplate}
                    style={{ marginTop: "1rem" }}>
                    ⬇️ Download Excel Template
                </button>
            </div>

            {/* Upload card */}
            <div className="card">
                <div className="card-title">📤 Upload File</div>

                <div style={{
                    border: "2px dashed #cbd5e1", borderRadius: 10, padding: "2rem",
                    textAlign: "center", background: file ? "#f0fdf4" : "#f8fafc",
                    cursor: "pointer", transition: "all 0.2s",
                }}
                    onClick={() => fileRef.current?.click()}>
                    <input ref={fileRef} type="file" accept=".xlsx"
                        style={{ display: "none" }} onChange={handleFileChange} />
                    {file
                        ? <><div style={{ fontSize: "2rem" }}>✅</div>
                            <div style={{ fontWeight: 700, color: "#15803d" }}>{file.name}</div>
                            <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                                {(file.size / 1024).toFixed(1)} KB — click to change
                            </div></>
                        : <><div style={{ fontSize: "2.5rem" }}>📂</div>
                            <div style={{ fontWeight: 600, color: "#475569" }}>Click to select .xlsx file</div>
                            <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Only Excel (.xlsx) files accepted</div></>
                    }
                </div>

                {error && <div className="alert alert-error" style={{ marginTop: "1rem" }}>❌ {error}</div>}

                <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem" }}>
                    <button className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleUpload} disabled={loading || !file}>
                        {loading ? "⏳ Uploading…" : "🚀 Upload & Register"}
                    </button>
                </div>
            </div>

            {/* Results */}
            {result && (
                <div className="card" style={{ marginTop: "1.5rem" }}>
                    <div className="card-title">📊 Upload Results</div>

                    {/* Summary badges */}
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                        <div style={{
                            background: "#f0fdf4", border: "1px solid #bbf7d0",
                            borderRadius: 8, padding: "0.75rem 1.25rem", textAlign: "center", minWidth: 120,
                        }}>
                            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#15803d" }}>
                                {result.successCount}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#166534", fontWeight: 600 }}>✅ Registered</div>
                        </div>
                        <div style={{
                            background: "#fef2f2", border: "1px solid #fecaca",
                            borderRadius: 8, padding: "0.75rem 1.25rem", textAlign: "center", minWidth: 120,
                        }}>
                            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#dc2626" }}>
                                {result.errorCount}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#991b1b", fontWeight: 600 }}>❌ Failed</div>
                        </div>
                        <div style={{
                            background: "#eff6ff", border: "1px solid #bfdbfe",
                            borderRadius: 8, padding: "0.75rem 1.25rem", textAlign: "center", minWidth: 120,
                        }}>
                            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#1d4ed8" }}>
                                {result.totalRows}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#1e40af", fontWeight: 600 }}>📋 Total Rows</div>
                        </div>
                    </div>

                    {/* Error table */}
                    {result.errors.length > 0 && (
                        <>
                            <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: "0.5rem" }}>
                                ⚠️ Rows with errors – please fix and re-upload:
                            </div>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 70 }}>Row #</th>
                                            <th>Branch Name</th>
                                            <th>Error Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.errors.map((e, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 700, color: "#dc2626" }}>{e.rowNumber}</td>
                                                <td>{e.branchName || "—"}</td>
                                                <td style={{ color: "#dc2626", fontSize: "0.82rem" }}>{e.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {result.errorCount === 0 && (
                        <div className="alert alert-success">
                            🎉 All {result.successCount} contracts registered successfully!
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button className="btn btn-outline" onClick={() => { setResult(null); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                            Upload Another File
                        </button>
                        <button className="btn btn-primary" onClick={() => router.push("/leases")}>
                            📋 View All Contracts
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
