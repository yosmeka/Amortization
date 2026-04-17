const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export interface LeaseContractRequest {
    branchName: string;
    branchCode: string;
    region?: string;
    categoryOfRent?: string;
    lessorName1?: string;
    lessorName2?: string;
    lessorName3?: string;
    tinNumber?: string;
    contactInfo1?: string;
    contactInfo2?: string;
    contactInfo3?: string;
    accountNumber?: string;
    taxCategory?: string;
    contractStartDate: string;   // ISO yyyy-MM-dd
    contractEndDate: string;
    paymentPaidToDate?: string;
    prepaymentTill?: string;
    meterSquare: number;
    meterSquarePriceBeforeVat: number;
    vatRate?: number;
    utilityPayment?: number;
    paymentModality?: string;
    discountRate?: string;
    ownerName: string;
    initialOutstandingBalance?: number;
    /** Month (1-12) and year of the outstanding balance anchor. Null = contract start. */
    initialOutstandingBalanceMonth?: number;
    initialOutstandingBalanceYear?: number;
    hasStampDuty: boolean;
    /** ID of the previous period's contract if this is a renewal. */
    previousContractId?: number;
    stampDuty?: {
        meterSquare: number;
        meterSquarePriceBeforeVat: number;
        vatRate?: number;
        utilityPayment?: number;
        initialOutstandingBalance?: number;
        /** Anchor month/year for stamp duty outstanding balance. */
        initialOutstandingBalanceMonth?: number;
        initialOutstandingBalanceYear?: number;
        /** Full Payment / Total Contract Payment for stamp duty */
        stampDutyFullPayment?: number;
        paymentPaidToDate?: string;
    };
}

export interface AmortizationReportRow {
    leaseContractId: number;
    stampDutyRow: boolean;
    branchName: string;

    branchCode: string;
    ownerName: string;
    categoryOfRent?: string;
    contractStartDate: string;
    contractEndDate: string;
    totalNumberOfYears: number;
    paymentPaidToDate?: string;
    yearWithFraction: number;
    meterSquare: number;
    meterSquarePriceBeforeVat: number;
    meterSquarePriceAfterVat: number;
    monthlyRentWithVat: number;
    totalAnnualRentAmount: number;
    utilityPayment: number;
    fullPayment: number;
    totalPaymentPaidToDate: number;
    remainingPayment: number;
    outstandingBalancePriorMonth: number;
    rentExpenseForMonth: number;
    total: number;
    dueForMonth: number;
    prepaidOfficeRent: number;
    outstandingBalanceEndOfMonth: number;
    reportMonth: number;
    reportYear: number;
    firstMonth: boolean;
    additionalExpense: number;
    entryDay: number;
    rentExpenseOverridden: boolean;
    dueForMonthOverridden: boolean;
    rentMinusDue: number;
    rentExpenseAsOf: number;
    dueDifferenceAsOf: number;
   


}

/* ── Helpers ── */
async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
}

export interface BulkUploadResult {
    totalRows: number;
    successCount: number;
    errorCount: number;
    errors: { rowNumber: number; branchName: string; message: string }[];
}

/* ── Lease APIs ── */
export async function createLease(data: LeaseContractRequest) {
    const res = await fetch(`${API_BASE}/leases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<object>(res);
}


export async function fetchLeases() {
    const res = await fetch(`${API_BASE}/leases`);
    return handleResponse<object[]>(res);
}

export async function fetchLease(id: number) {
    const res = await fetch(`${API_BASE}/leases/${id}`);
    return handleResponse<object>(res);
}

export async function updateLease(id: number, data: LeaseContractRequest) {
    const res = await fetch(`${API_BASE}/leases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<object>(res);
}

export async function deleteLease(id: number) {
    const res = await fetch(`${API_BASE}/leases/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export interface RenewalPrefill {
    previousContractId: number;
    branchName: string;
    branchCode: string;
    region?: string;
    categoryOfRent?: string;
    ownerName: string;
    lessorName1?: string;
    lessorName2?: string;
    lessorName3?: string;
    tinNumber?: string;
    contactInfo1?: string;
    contactInfo2?: string;
    contactInfo3?: string;
    accountNumber?: string;
    taxCategory?: string;
    paymentModality?: string;
    discountRate?: string;
    previousEndingOutstandingBalance: number;
    previousEndingMonth?: number;
    previousEndingYear?: number;
    hasStampDuty: boolean;
    sdPreviousEndingOutstandingBalance?: number;
    sdPreviousEndingMonth?: number;
    sdPreviousEndingYear?: number;
}

export async function fetchRenewalPrefill(id: number): Promise<RenewalPrefill> {
    const res = await fetch(`${API_BASE}/leases/${id}/renewal-prefill`);
    return handleResponse<RenewalPrefill>(res);
}


export async function bulkUploadLeases(file: File): Promise<BulkUploadResult> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/leases/upload`, { method: "POST", body: form });
    return handleResponse<BulkUploadResult>(res);
}

/* ── Report APIs ── */
export async function fetchReport(month: number, year: number, category?: string): Promise<AmortizationReportRow[]> {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (category) params.append("category", category);
    const res = await fetch(`${API_BASE}/amortization/report?${params}`);
    return handleResponse<AmortizationReportRow[]>(res);
}

export async function saveEntry(
    leaseId: number,
    isStampDuty: boolean,
    month: number,
    year: number,
    opts: {
        rentExpenseForMonth?: number | null;  // null = auto-calculate
        dueForMonth?: number;
        prepaidOfficeRent?: number;
        additionalExpense?: number;
        entryDay?: number | null;
    }
) {
    const res = await fetch(`${API_BASE}/amortization/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            leaseId,
            stampDuty: isStampDuty,
            month,
            year,
            rentExpenseForMonth: opts.rentExpenseForMonth ?? null,
            dueForMonth: opts.dueForMonth ?? 0,
            prepaidOfficeRent: opts.prepaidOfficeRent ?? 0,
            additionalExpense: opts.additionalExpense ?? 0,
            entryDay: opts.entryDay ?? null,
        }),
    });
    return handleResponse<object>(res);
}
