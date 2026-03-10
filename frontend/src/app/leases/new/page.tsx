"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createLease, fetchRenewalPrefill, RenewalPrefill, LeaseContractRequest } from "@/lib/api";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const YEARS = Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 10 + i);

const EMPTY_FORM: LeaseContractRequest = {
    branchName: "", branchCode: "", region: "", categoryOfRent: "",
    lessorName1: "", lessorName2: "", lessorName3: "",
    tinNumber: "", contactInfo1: "", contactInfo2: "", contactInfo3: "",
    accountNumber: "", taxCategory: "VAT",
    contractStartDate: "", contractEndDate: "", paymentPaidToDate: "",
    prepaymentTill: "", meterSquare: 0, meterSquarePriceBeforeVat: 0,
    vatRate: 0.15, utilityPayment: 0, paymentModality: "monthly",
    discountRate: "15%", ownerName: "", initialOutstandingBalance: 0,
    initialOutstandingBalanceMonth: new Date().getMonth() + 1,
    initialOutstandingBalanceYear: new Date().getFullYear(),
    hasStampDuty: false,
    stampDuty: {
        meterSquare: 0, meterSquarePriceBeforeVat: 0,
        vatRate: 0.15, utilityPayment: 0, initialOutstandingBalance: 0,
        initialOutstandingBalanceMonth: new Date().getMonth() + 1,
        initialOutstandingBalanceYear: new Date().getFullYear(),
        stampDutyFullPayment: 0,
        paymentPaidToDate: "",
    },
};

function NewLeasePageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const renewFromId = searchParams.get("renewFrom");

    const [form, setForm] = useState<LeaseContractRequest>({ ...EMPTY_FORM });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
    const [renewalInfo, setRenewalInfo] = useState<RenewalPrefill | null>(null);
    const [prefillLoading, setPrefillLoading] = useState(false);

    // Pre-fill form when renewFrom is present
    useEffect(() => {
        if (!renewFromId) return;
        setPrefillLoading(true);
        fetchRenewalPrefill(Number(renewFromId))
            .then(data => {
                setRenewalInfo(data);
                setForm(prev => ({
                    ...prev,
                    // Branch / location
                    branchName: data.branchName ?? "",
                    branchCode: data.branchCode ?? "",
                    region: data.region ?? "",
                    categoryOfRent: data.categoryOfRent ?? "",
                    // Lessor
                    ownerName: data.ownerName ?? "",
                    lessorName1: data.lessorName1 ?? "",
                    lessorName2: data.lessorName2 ?? "",
                    lessorName3: data.lessorName3 ?? "",
                    tinNumber: data.tinNumber ?? "",
                    contactInfo1: data.contactInfo1 ?? "",
                    contactInfo2: data.contactInfo2 ?? "",
                    contactInfo3: data.contactInfo3 ?? "",
                    accountNumber: data.accountNumber ?? "",
                    taxCategory: data.taxCategory ?? "VAT",
                    paymentModality: data.paymentModality ?? "monthly",
                    discountRate: data.discountRate ?? "15%",
                    // Outstanding balance from previous period
                    initialOutstandingBalance: data.previousEndingOutstandingBalance ?? 0,
                    initialOutstandingBalanceMonth: data.previousEndingMonth ?? (new Date().getMonth() + 1),
                    initialOutstandingBalanceYear: data.previousEndingYear ?? new Date().getFullYear(),
                    // Stamp duty
                    hasStampDuty: data.hasStampDuty,
                    previousContractId: data.previousContractId,
                    stampDuty: data.hasStampDuty ? {
                        ...prev.stampDuty!,
                        initialOutstandingBalance: data.sdPreviousEndingOutstandingBalance ?? 0,
                        initialOutstandingBalanceMonth: data.sdPreviousEndingMonth ?? (new Date().getMonth() + 1),
                        initialOutstandingBalanceYear: data.sdPreviousEndingYear ?? new Date().getFullYear(),
                    } : prev.stampDuty,
                }));
            })
            .catch(() => setAlert({ type: "error", msg: "Failed to load contract data for renewal." }))
            .finally(() => setPrefillLoading(false));
    }, [renewFromId]);

    // ── Generic field updater ──
    const set = (field: keyof LeaseContractRequest, value: unknown) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const setSD = (field: string, value: unknown) =>
        setForm(prev => ({ ...prev, stampDuty: { ...prev.stampDuty!, [field]: value } }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setAlert(null);
        try {
            await createLease(form);
            setAlert({ type: "success", msg: "Lease contract registered successfully!" });
            setTimeout(() => router.push("/leases"), 1500);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to register lease";
            setAlert({ type: "error", msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="page-header">
                <h2>{renewFromId ? "🔄 Renew Lease Contract" : "Register Rent Lease Contract"}</h2>
                <p>{renewFromId
                    ? "Adding a new period for an existing contract. Branch and lessor info is pre-filled. Enter new dates and pricing."
                    : "Fill in all sections. If the office has a stamp duty component, enable it at the bottom."
                }</p>
            </div>

            {/* Renewal banner */}
            {renewalInfo && (
                <div style={{
                    background: "#e0f2fe", border: "1px solid #0ea5e9",
                    borderRadius: 8, padding: "0.9rem 1.2rem", marginBottom: "1rem",
                    display: "flex", alignItems: "flex-start", gap: "0.75rem"
                }}>
                    <span style={{ fontSize: "1.4rem" }}>🔄</span>
                    <div>
                        <strong>Renewing from Contract #{renewalInfo.previousContractId}</strong>
                        <div style={{ fontSize: "0.85rem", color: "#0369a1", marginTop: 4 }}>
                            Branch info, lessor details and initial outstanding balance have been
                            pre-filled from the previous period.
                            {renewalInfo.previousEndingMonth && renewalInfo.previousEndingYear && (
                                <> The balance (<strong>{renewalInfo.previousEndingOutstandingBalance?.toLocaleString("en-ET", { minimumFractionDigits: 2 })}</strong>)
                                    is taken from {MONTHS[(renewalInfo.previousEndingMonth ?? 1) - 1]} {renewalInfo.previousEndingYear}.</>)}
                            {" "}Enter the <strong>new contract dates and pricing</strong> below.
                        </div>
                    </div>
                </div>
            )}

            {prefillLoading && <p style={{ color: "#0ea5e9" }}>⏳ Loading previous contract data…</p>}

            {alert && (
                <div className={`alert alert-${alert.type}`}>
                    {alert.type === "success" ? "✅" : "❌"} {alert.msg}
                </div>
            )}

            {/* ─── SECTION 1: Location Info ─── */}
            <div className="card">
                <div className="card-title">📍 Lease Contract Location Information</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Branch Name *</label>
                        <input className="form-control" required value={form.branchName}
                            onChange={e => set("branchName", e.target.value)} placeholder="e.g. Dilla Branch" />
                    </div>
                    <div className="form-group">
                        <label>Branch Code *</label>
                        <input className="form-control" required value={form.branchCode}
                            onChange={e => set("branchCode", e.target.value)} placeholder="e.g. 050" />
                    </div>
                    <div className="form-group">
                        <label>Region</label>
                        <input className="form-control" value={form.region}
                            onChange={e => set("region", e.target.value)} placeholder="e.g. SNNP" />
                    </div>
                    <div className="form-group">
                        <label>Category of Rent</label>
                        <select className="form-control" value={form.categoryOfRent}
                            onChange={e => set("categoryOfRent", e.target.value)}>
                            <option value="">Select…</option>
                            <option>ATM</option>
                            <option>Outline</option>
                            <option>City</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ─── SECTION 2: Lessor Info ─── */}
            <div className="card">
                <div className="card-title">👤 Lessor Information</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Owner / Lessor Name *</label>
                        <input className="form-control" required value={form.ownerName}
                            onChange={e => set("ownerName", e.target.value)} placeholder="Primary owner name" />
                    </div>
                    <div className="form-group">
                        <label>Lessor Name 2</label>
                        <input className="form-control" value={form.lessorName2}
                            onChange={e => set("lessorName2", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Lessor Name 3</label>
                        <input className="form-control" value={form.lessorName3}
                            onChange={e => set("lessorName3", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>TIN Number</label>
                        <input className="form-control" value={form.tinNumber}
                            onChange={e => set("tinNumber", e.target.value)} placeholder="Taxpayer ID" />
                    </div>
                    <div className="form-group">
                        <label>Contact Info 1</label>
                        <input className="form-control" value={form.contactInfo1}
                            onChange={e => set("contactInfo1", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Contact Info 2</label>
                        <input className="form-control" value={form.contactInfo2}
                            onChange={e => set("contactInfo2", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Contact Info 3</label>
                        <input className="form-control" value={form.contactInfo3}
                            onChange={e => set("contactInfo3", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Account Number</label>
                        <input className="form-control" value={form.accountNumber}
                            onChange={e => set("accountNumber", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Tax Category</label>
                        <select className="form-control" value={form.taxCategory}
                            onChange={e => set("taxCategory", e.target.value)}>
                            <option value="VAT">VAT</option>
                            <option value="TOT">TOT</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ─── SECTION 3: Payment Info ─── */}
            <div className="card">
                <div className="card-title">💰 Payment Information</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Contract Start Date *</label>
                        <input type="date" className="form-control" required value={form.contractStartDate}
                            onChange={e => set("contractStartDate", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Contract End Date *</label>
                        <input type="date" className="form-control" required value={form.contractEndDate}
                            onChange={e => set("contractEndDate", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Payment Paid to Date</label>
                        <input type="date" className="form-control" value={form.paymentPaidToDate}
                            onChange={e => set("paymentPaidToDate", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Prepayment Till</label>
                        <input className="form-control" value={form.prepaymentTill}
                            onChange={e => set("prepaymentTill", e.target.value)} placeholder="e.g. Dec 2025" />
                    </div>
                    <div className="form-group">
                        <label>Meter Square (m²) *</label>
                        <input type="number" step="0.01" className="form-control" required
                            value={form.meterSquare || ""}
                            onChange={e => set("meterSquare", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>Price per m² (Before VAT) *</label>
                        <input type="number" step="0.01" className="form-control" required
                            value={form.meterSquarePriceBeforeVat || ""}
                            onChange={e => set("meterSquarePriceBeforeVat", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>VAT Rate</label>
                        <select className="form-control" value={form.vatRate}
                            onChange={e => set("vatRate", parseFloat(e.target.value))}>
                            <option value={0.15}>15%</option>
                            <option value={0.07}>7%</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Utility / Service Charge</label>
                        <input type="number" step="0.01" className="form-control"
                            value={form.utilityPayment || ""}
                            onChange={e => set("utilityPayment", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>Payment Modality</label>
                        <select className="form-control" value={form.paymentModality}
                            onChange={e => set("paymentModality", e.target.value)}>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="semi-annual">Semi-Annual</option>
                            <option value="annually">Annually</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Discount Rate</label>
                        <select className="form-control" value={form.discountRate}
                            onChange={e => set("discountRate", e.target.value)}>
                            <option value="15%">15%</option>
                            <option value="7%">7%</option>
                        </select>
                    </div>

                    {/* Outstanding Balance – anchor to any month */}
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label style={{ color: "#1d4ed8", fontWeight: 700 }}>
                            💰 Initial Outstanding Balance
                        </label>
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                            <div style={{ flex: "1 1 200px" }}>
                                <input type="number" step="0.01" className="form-control"
                                    style={{ borderColor: "#2563eb", borderWidth: 2 }}
                                    value={form.initialOutstandingBalance || ""}
                                    onChange={e => set("initialOutstandingBalance", parseFloat(e.target.value) || 0)}
                                    placeholder="Balance amount" />
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <span style={{ fontWeight: 600, color: "#1d4ed8", whiteSpace: "nowrap" }}>as of</span>
                                <select className="form-control" style={{ width: 130 }}
                                    value={form.initialOutstandingBalanceMonth ?? ""}
                                    onChange={e => set("initialOutstandingBalanceMonth", parseInt(e.target.value))}>
                                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                                <select className="form-control" style={{ width: 90 }}
                                    value={form.initialOutstandingBalanceYear ?? ""}
                                    onChange={e => set("initialOutstandingBalanceYear", parseInt(e.target.value))}>
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.3rem", display: "block" }}>
                            Enter the outstanding balance for the selected month. After that month it will be calculated automatically.
                        </span>
                    </div>
                </div>

                {/* Live preview */}
                <LivePreview form={form} />
            </div>

            {/* ─── SECTION 4: Stamp Duty (conditional) ─── */}
            <div className="card">
                <div className="card-title">🔖 Stamp Duty</div>
                <label className="checkbox-toggle" style={{ marginBottom: "0.75rem" }}>
                    <input type="checkbox" checked={form.hasStampDuty}
                        onChange={e => set("hasStampDuty", e.target.checked)} />
                    This office rent contract includes a Stamp Duty component
                </label>

                {form.hasStampDuty && (
                    <div className="stamp-duty-section">
                        <div className="card-title">📄 Stamp Duty Details</div>
                        <p style={{ fontSize: "0.82rem", color: "#92400e", margin: "0 0 1rem" }}>
                            Stamp duty will appear as a separate row in the monthly amortization report.
                        </p>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Meter Square (m²) *</label>
                                <input type="number" step="0.01" className="form-control"
                                    value={form.stampDuty?.meterSquare || ""}
                                    onChange={e => setSD("meterSquare", parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label>Price per m² (Before VAT) *</label>
                                <input type="number" step="0.01" className="form-control"
                                    value={form.stampDuty?.meterSquarePriceBeforeVat || ""}
                                    onChange={e => setSD("meterSquarePriceBeforeVat", parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label>VAT Rate</label>
                                <select className="form-control" value={form.stampDuty?.vatRate}
                                    onChange={e => setSD("vatRate", parseFloat(e.target.value))}>
                                    <option value={0.15}>15%</option>
                                    <option value={0.07}>7%</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Utility / Service Charge</label>
                                <input type="number" step="0.01" className="form-control"
                                    value={form.stampDuty?.utilityPayment || ""}
                                    onChange={e => setSD("utilityPayment", parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label>Payment Paid to Date</label>
                                <input type="date" className="form-control"
                                    value={form.stampDuty?.paymentPaidToDate || ""}
                                    onChange={e => setSD("paymentPaidToDate", e.target.value)} />
                            </div>
                            <div className="form-group" style={{ gridColumn: "span 2" }}>
                                <label style={{ color: "#92400e", fontWeight: 700 }}>
                                    💰 Initial Outstanding Balance (Stamp Duty)
                                </label>
                                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 200px" }}>
                                        <input type="number" step="0.01" className="form-control"
                                            style={{ borderColor: "#f59e0b", borderWidth: 2 }}
                                            value={form.stampDuty?.initialOutstandingBalance || ""}
                                            onChange={e => setSD("initialOutstandingBalance", parseFloat(e.target.value) || 0)}
                                            placeholder="Balance amount" />
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                        <span style={{ fontWeight: 600, color: "#92400e", whiteSpace: "nowrap" }}>as of</span>
                                        <select className="form-control" style={{ width: 130 }}
                                            value={form.stampDuty?.initialOutstandingBalanceMonth ?? ""}
                                            onChange={e => setSD("initialOutstandingBalanceMonth", parseInt(e.target.value))}>
                                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                        </select>
                                        <select className="form-control" style={{ width: 90 }}
                                            value={form.stampDuty?.initialOutstandingBalanceYear ?? ""}
                                            onChange={e => setSD("initialOutstandingBalanceYear", parseInt(e.target.value))}>
                                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <span style={{ fontSize: "0.75rem", color: "#92400e", marginTop: "0.3rem", display: "block" }}>
                                    Enter the outstanding balance for the selected month (stamp duty).
                                </span>
                            </div>

                            {/* Full Payment / Total Contract Payment – key field for SD monthly rent */}
                            <div className="form-group" style={{ gridColumn: "span 2" }}>
                                <label style={{ color: "#b45309", fontWeight: 700, fontSize: "0.85rem" }}>
                                    Full Payment / Total Contract Payment (Stamp Duty) *
                                </label>
                                <input type="number" step="0.01" className="form-control"
                                    style={{ borderColor: "#d97706", borderWidth: 2 }}
                                    value={form.stampDuty?.stampDutyFullPayment || ""}
                                    onChange={e => setSD("stampDutyFullPayment", parseFloat(e.target.value) || 0)}
                                    placeholder="Total stamp duty contract amount" />
                                <span style={{ fontSize: "0.75rem", color: "#92400e" }}>
                                    Monthly Rent = Full Payment ÷ (Total Years × 12). No VAT applied.
                                </span>
                            </div>
                        </div>
                        <StampDutyPreview
                            sd={form.stampDuty!}
                            contractStartDate={form.contractStartDate as string}
                            paymentPaidToDate={form.stampDuty?.paymentPaidToDate || form.paymentPaidToDate as string || ""}
                        />
                    </div>
                )}
            </div>

            {/* ─── Submit ─── */}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", paddingTop: "0.5rem" }}>
                <button type="button" className="btn btn-outline"
                    onClick={() => router.back()}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "⏳ Saving…" : "✅ Register Contract"}
                </button>
            </div>
        </form>
    );
}

/* ── Live preview of calculated fields ── */
function LivePreview({ form }: { form: LeaseContractRequest }) {
    const priceAfterVat = form.meterSquarePriceBeforeVat * (1 + (form.vatRate ?? 0.15));
    const monthly = form.meterSquare * priceAfterVat;
    const annual = monthly * 12;
    return (
        <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
            padding: "0.75rem 1rem", marginTop: "1rem",
            display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "0.5rem",
        }}>
            <PreviewItem label="Price/m² after VAT" value={priceAfterVat} />
            <PreviewItem label="Monthly Rent with VAT" value={monthly} />
            <PreviewItem label="Total Annual Rent" value={annual} />
        </div>
    );
}

function StampDutyPreview({ sd, contractStartDate, paymentPaidToDate }: {
    sd: LeaseContractRequest["stampDuty"];
    contractStartDate: string;
    paymentPaidToDate: string;
}) {
    if (!sd) return null;
    const fullPayment = sd.stampDutyFullPayment ?? 0;
    // Rough total years for preview (paymentPaidToDate or fallback to 1 year)
    let totalYears = 1;
    if (contractStartDate && paymentPaidToDate) {
        const start = new Date(contractStartDate);
        const end = new Date(paymentPaidToDate);
        const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        totalYears = days / 365;
    }
    const monthly = totalYears > 0 ? fullPayment / (totalYears * 12) : 0;
    return (
        <div style={{
            background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
            padding: "0.75rem 1rem", marginTop: "1rem",
            display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "0.5rem",
        }}>
            <PreviewItem label="Full Payment (Stamp Duty)" value={fullPayment} />
            <PreviewItem label="Monthly Rent (No VAT)" value={monthly} />
            <PreviewItem label="Annual Rent (Stamp Duty)" value={monthly * 12} />
        </div>
    );
}

function PreviewItem({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>{label}</div>
            <div style={{ fontWeight: 700, color: "#1d4ed8", fontSize: "0.95rem" }}>
                {isNaN(value) ? "—" : value.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>
    );
}

// useSearchParams requires Suspense boundary in Next.js App Router
export default function NewLeasePage() {
    return (
        <Suspense fallback={<p style={{ padding: "2rem", color: "#64748b" }}>⏳ Loading…</p>}>
            <NewLeasePageInner />
        </Suspense>
    );
}
