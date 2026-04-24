"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchLease, updateLease, LeaseContractRequest } from "@/lib/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toForm(data: any): LeaseContractRequest {
    const sd = data.stampDutyContract;
    return {
        branchName: data.branchName ?? "",
        branchCode: data.branchCode ?? "",
        region: data.region ?? "",
        categoryOfRent: data.categoryOfRent ?? "",
        lessorName1: data.lessorName1 ?? "",
        lessorName2: data.lessorName2 ?? "",
        lessorName3: data.lessorName3 ?? "",
        tinNumber: data.tinNumber ?? "",
        contactInfo1: data.contactInfo1 ?? "",
        contactInfo2: data.contactInfo2 ?? "",
        contactInfo3: data.contactInfo3 ?? "",
        accountNumber: data.accountNumber ?? "",
        taxCategory: data.taxCategory ?? "VAT",
        contractStartDate: data.contractStartDate ?? "",
        contractEndDate: data.contractEndDate ?? "",
        paymentPaidToDate: data.paymentPaidToDate ?? "",
        prepaymentTill: data.prepaymentTill ?? "",
        meterSquare: data.meterSquare ?? 0,
        meterSquarePriceBeforeVat: data.meterSquarePriceBeforeVat ?? 0,
        vatRate: data.vatRate ?? 0.15,
        utilityPayment: data.utilityPayment ?? 0,
        paymentModality: data.paymentModality ?? "monthly",
        discountRate: data.discountRate ?? "15%",
        ownerName: data.ownerName ?? "",
        initialOutstandingBalance: data.initialOutstandingBalance ?? 0,
        initialOutstandingBalanceMonth: data.initialOutstandingBalanceMonth ?? (new Date().getMonth() + 1),
        initialOutstandingBalanceYear: data.initialOutstandingBalanceYear ?? new Date().getFullYear(),
        hasStampDuty: data.hasStampDuty ?? false,
        previousContractId: data.previousContractId ?? undefined,
        stampDuty: sd ? {
            meterSquare: sd.meterSquare ?? 0,
            meterSquarePriceBeforeVat: sd.meterSquarePriceBeforeVat ?? 0,
            vatRate: sd.vatRate ?? 0.15,
            utilityPayment: sd.utilityPayment ?? 0,
            initialOutstandingBalance: sd.initialOutstandingBalance ?? 0,
            initialOutstandingBalanceMonth: sd.initialOutstandingBalanceMonth ?? (new Date().getMonth() + 1),
            initialOutstandingBalanceYear: sd.initialOutstandingBalanceYear ?? new Date().getFullYear(),
            stampDutyFullPayment: sd.stampDutyFullPayment ?? 0,
            paymentPaidToDate: sd.paymentPaidToDate ?? "",
        } : EMPTY_FORM.stampDuty,
    };
}

function EditLeasePageInner() {
    useAuthGuard();
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [form, setForm] = useState<LeaseContractRequest>({ ...EMPTY_FORM });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

    useEffect(() => {
        fetchLease(id)
            .then(data => setForm(toForm(data)))
            .catch(() => setAlert({ type: "error", msg: "Failed to load contract." }))
            .finally(() => setLoading(false));
    }, [id]);

    const set = (field: keyof LeaseContractRequest, value: unknown) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const setSD = (field: string, value: unknown) =>
        setForm(prev => ({ ...prev, stampDuty: { ...prev.stampDuty!, [field]: value } }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setAlert(null);
        try {
            await updateLease(id, form);
            setAlert({ type: "success", msg: "Contract updated successfully!" });
            setTimeout(() => router.push("/leases"), 1200);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to update contract";
            setAlert({ type: "error", msg });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p style={{ padding: "2rem", color: "#64748b" }}>⏳ Loading contract…</p>;

    return (
        <form onSubmit={handleSubmit}>
            <div className="page-header">
                <h2>✏️ Edit Lease Contract</h2>
                <p>Update the fields below. Existing amortization entries are preserved.</p>
            </div>

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
                        <input required value={form.branchName} onChange={e => set("branchName", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Branch Code *</label>
                        <input required value={form.branchCode} onChange={e => set("branchCode", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Region</label>
                        <input value={form.region ?? ""} onChange={e => set("region", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Category of Rent</label>
                        <select value={form.categoryOfRent ?? ""} onChange={e => set("categoryOfRent", e.target.value)}>
                            <option value="">— Select —</option>
                            <option>ATM</option>
                            <option>Outline</option>
                            <option>City</option>

                        </select>
                    </div>
                </div>
            </div>

            {/* ─── SECTION 2: Lessor Info ─── */}
            <div className="card">
                <div className="card-title">👤 Lessor / Owner Information</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Owner Name *</label>
                        <input required value={form.ownerName} onChange={e => set("ownerName", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Lessor Name 1</label>
                        <input value={form.lessorName1 ?? ""} onChange={e => set("lessorName1", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Lessor Name 2</label>
                        <input value={form.lessorName2 ?? ""} onChange={e => set("lessorName2", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Lessor Name 3</label>
                        <input value={form.lessorName3 ?? ""} onChange={e => set("lessorName3", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>TIN Number</label>
                        <input value={form.tinNumber ?? ""} onChange={e => set("tinNumber", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Contact 1</label>
                        <input value={form.contactInfo1 ?? ""} onChange={e => set("contactInfo1", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Contact 2</label>
                        <input value={form.contactInfo2 ?? ""} onChange={e => set("contactInfo2", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Contact 3</label>
                        <input value={form.contactInfo3 ?? ""} onChange={e => set("contactInfo3", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Account Number</label>
                        <input value={form.accountNumber ?? ""} onChange={e => set("accountNumber", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Tax Category</label>
                        <select value={form.taxCategory ?? "VAT"} onChange={e => set("taxCategory", e.target.value)}>
                            <option>VAT</option>
                            <option>TOT</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ─── SECTION 3: Contract Terms ─── */}
            <div className="card">
                <div className="card-title">📅 Contract Terms &amp; Financials</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Contract Start Date *</label>
                        <input type="date" required value={form.contractStartDate} onChange={e => set("contractStartDate", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Contract End Date *</label>
                        <input type="date" required value={form.contractEndDate} onChange={e => set("contractEndDate", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Payment Paid to Date</label>
                        <input type="date" value={form.paymentPaidToDate ?? ""} onChange={e => set("paymentPaidToDate", e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Meter Square (m²) *</label>
                        <input type="number" step="0.01" required value={form.meterSquare} onChange={e => set("meterSquare", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>Price per m² (Before VAT) *</label>
                        <input type="number" step="0.01" required value={form.meterSquarePriceBeforeVat} onChange={e => set("meterSquarePriceBeforeVat", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>VAT Rate</label>
                        <select value={form.vatRate} onChange={e => set("vatRate", parseFloat(e.target.value))}>
                            <option value={0.15}>15%</option>
                            <option value={0}>0% (No VAT)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Utility / Service Charge</label>
                        <input type="number" step="0.01" value={form.utilityPayment ?? 0} onChange={e => set("utilityPayment", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>Payment Modality</label>
                        <select value={form.paymentModality ?? "monthly"} onChange={e => set("paymentModality", e.target.value)}>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="semi-annual">Semi-annual</option>
                            <option value="annually">Annually</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Discount Rate</label>
                        <select value={form.discountRate ?? "15%"} onChange={e => set("discountRate", e.target.value)}>
                            <option value="15%">15%</option>
                            <option value="7%">7%</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ─── SECTION 4: Outstanding Balance ─── */}
            <div className="card">
                <div className="card-title">💰 Initial Outstanding Balance</div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Outstanding Balance</label>
                        <input type="number" step="0.01" value={form.initialOutstandingBalance ?? 0}
                            onChange={e => set("initialOutstandingBalance", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>Balance Month</label>
                        <select value={form.initialOutstandingBalanceMonth ?? (new Date().getMonth() + 1)}
                            onChange={e => set("initialOutstandingBalanceMonth", parseInt(e.target.value))}>
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Balance Year</label>
                        <select value={form.initialOutstandingBalanceYear ?? new Date().getFullYear()}
                            onChange={e => set("initialOutstandingBalanceYear", parseInt(e.target.value))}>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* ─── SECTION 5: Stamp Duty ─── */}
            <div className="card">
                <div className="card-title">🏛️ Stamp Duty Component</div>
                <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                        <input type="checkbox" checked={form.hasStampDuty}
                            onChange={e => set("hasStampDuty", e.target.checked)} />
                        This contract has a stamp duty component
                    </label>
                </div>
                {form.hasStampDuty && (
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Stamp Duty Full Payment</label>
                            <input type="number" step="0.01" value={form.stampDuty?.stampDutyFullPayment ?? 0}
                                onChange={e => setSD("stampDutyFullPayment", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                            <label>Meter Square (m²)</label>
                            <input type="number" step="0.01" value={form.stampDuty?.meterSquare ?? 0}
                                onChange={e => setSD("meterSquare", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                            <label>Price per m² (Before VAT)</label>
                            <input type="number" step="0.01" value={form.stampDuty?.meterSquarePriceBeforeVat ?? 0}
                                onChange={e => setSD("meterSquarePriceBeforeVat", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                            <label>Payment Paid to Date</label>
                            <input type="date" value={form.stampDuty?.paymentPaidToDate ?? ""}
                                onChange={e => setSD("paymentPaidToDate", e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Initial Outstanding Balance</label>
                            <input type="number" step="0.01" value={form.stampDuty?.initialOutstandingBalance ?? 0}
                                onChange={e => setSD("initialOutstandingBalance", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                            <label>Balance Month</label>
                            <select value={form.stampDuty?.initialOutstandingBalanceMonth ?? (new Date().getMonth() + 1)}
                                onChange={e => setSD("initialOutstandingBalanceMonth", parseInt(e.target.value))}>
                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Balance Year</label>
                            <select value={form.stampDuty?.initialOutstandingBalanceYear ?? new Date().getFullYear()}
                                onChange={e => setSD("initialOutstandingBalanceYear", parseInt(e.target.value))}>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Submit */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "⏳ Saving…" : "💾 Save Changes"}
                </button>
                <button type="button" className="btn" onClick={() => router.push("/leases")}
                    style={{ background: "#f1f5f9", color: "#475569" }}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

export default function EditLeasePage() {
    return (
        <Suspense fallback={<p style={{ padding: "2rem", color: "#64748b" }}>⏳ Loading…</p>}>
            <EditLeasePageInner />
        </Suspense>
    );
}
