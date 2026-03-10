package com.zemenbank.amortization.service;

import com.zemenbank.amortization.dto.AmortizationReportRow;
import com.zemenbank.amortization.dto.LeaseContractRequest;
import com.zemenbank.amortization.entity.AmortizationEntry;
import com.zemenbank.amortization.entity.LeaseContract;
import com.zemenbank.amortization.entity.StampDutyContract;
import com.zemenbank.amortization.repository.AmortizationEntryRepository;
import com.zemenbank.amortization.repository.LeaseContractRepository;
import com.zemenbank.amortization.repository.StampDutyContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AmortizationService {

    private final LeaseContractRepository leaseRepo;
    private final StampDutyContractRepository stampRepo;
    private final AmortizationEntryRepository entryRepo;

    private static final BigDecimal DAYS_IN_YEAR = new BigDecimal("365");
    private static final int SCALE = 2;
    private static final RoundingMode RM = RoundingMode.HALF_UP;

    // =========================================================
    //  REGISTRATION
    // =========================================================

    @Transactional
    public LeaseContract registerLease(LeaseContractRequest req) {
        LeaseContract lease = LeaseContract.builder()
                .branchName(req.getBranchName())
                .branchCode(req.getBranchCode())
                .ownerName(req.getOwnerName())
                .region(req.getRegion())
                .categoryOfRent(req.getCategoryOfRent())
                .lessorName1(req.getLessorName1())
                .lessorName2(req.getLessorName2())
                .lessorName3(req.getLessorName3())
                .tinNumber(req.getTinNumber())
                .contactInfo1(req.getContactInfo1())
                .contactInfo2(req.getContactInfo2())
                .contactInfo3(req.getContactInfo3())
                .accountNumber(req.getAccountNumber())
                .taxCategory(req.getTaxCategory())
                .contractStartDate(req.getContractStartDate())
                .contractEndDate(req.getContractEndDate())
                .paymentPaidToDate(req.getPaymentPaidToDate())
                .prepaymentTill(req.getPrepaymentTill())
                .meterSquare(req.getMeterSquare())
                .meterSquarePriceBeforeVat(req.getMeterSquarePriceBeforeVat())
                .vatRate(req.getVatRate() != null ? req.getVatRate() : new BigDecimal("0.15"))
                .utilityPayment(req.getUtilityPayment() != null ? req.getUtilityPayment() : BigDecimal.ZERO)
                .paymentModality(req.getPaymentModality())
                .discountRate(req.getDiscountRate())
                .initialOutstandingBalance(req.getInitialOutstandingBalance() != null
                        ? req.getInitialOutstandingBalance() : BigDecimal.ZERO)
                .initialOutstandingBalanceMonth(req.getInitialOutstandingBalanceMonth())
                .initialOutstandingBalanceYear(req.getInitialOutstandingBalanceYear())
                .hasStampDuty(req.isHasStampDuty())
                .previousContractId(req.getPreviousContractId())
                .build();

        leaseRepo.save(lease);

        // Register stamp duty if applicable
        if (req.isHasStampDuty() && req.getStampDuty() != null) {
            LeaseContractRequest.StampDutyRequest sd = req.getStampDuty();
            StampDutyContract sdContract = StampDutyContract.builder()
                    .leaseContract(lease)
                    .meterSquare(sd.getMeterSquare() != null ? sd.getMeterSquare() : BigDecimal.ZERO)
                    .meterSquarePriceBeforeVat(sd.getMeterSquarePriceBeforeVat() != null
                            ? sd.getMeterSquarePriceBeforeVat() : BigDecimal.ZERO)
                    .vatRate(sd.getVatRate() != null ? sd.getVatRate() : new BigDecimal("0.15"))
                    .utilityPayment(sd.getUtilityPayment() != null ? sd.getUtilityPayment() : BigDecimal.ZERO)
                    .stampDutyFullPayment(sd.getStampDutyFullPayment() != null
                            ? sd.getStampDutyFullPayment() : BigDecimal.ZERO)
                    .initialOutstandingBalance(sd.getInitialOutstandingBalance() != null
                            ? sd.getInitialOutstandingBalance() : BigDecimal.ZERO)
                    .initialOutstandingBalanceMonth(sd.getInitialOutstandingBalanceMonth())
                    .initialOutstandingBalanceYear(sd.getInitialOutstandingBalanceYear())
                    .paymentPaidToDate(sd.getPaymentPaidToDate())
                    .build();
            stampRepo.save(sdContract);
            lease.setStampDutyContract(sdContract);
        }

        return lease;
    }

    // =========================================================
    //  UPDATE (edit an existing lease contract)
    // =========================================================

    @Transactional
    public LeaseContract updateLease(Long id, LeaseContractRequest req) {
        LeaseContract lease = leaseRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Lease not found: " + id));

        // Update all fields in-place (preserves ID + amortization entries)
        lease.setBranchName(req.getBranchName());
        lease.setBranchCode(req.getBranchCode());
        lease.setOwnerName(req.getOwnerName());
        lease.setRegion(req.getRegion());
        lease.setCategoryOfRent(req.getCategoryOfRent());
        lease.setLessorName1(req.getLessorName1());
        lease.setLessorName2(req.getLessorName2());
        lease.setLessorName3(req.getLessorName3());
        lease.setTinNumber(req.getTinNumber());
        lease.setContactInfo1(req.getContactInfo1());
        lease.setContactInfo2(req.getContactInfo2());
        lease.setContactInfo3(req.getContactInfo3());
        lease.setAccountNumber(req.getAccountNumber());
        lease.setTaxCategory(req.getTaxCategory());
        lease.setContractStartDate(req.getContractStartDate());
        lease.setContractEndDate(req.getContractEndDate());
        lease.setPaymentPaidToDate(req.getPaymentPaidToDate());
        lease.setPrepaymentTill(req.getPrepaymentTill());
        lease.setMeterSquare(req.getMeterSquare());
        lease.setMeterSquarePriceBeforeVat(req.getMeterSquarePriceBeforeVat());
        lease.setVatRate(req.getVatRate() != null ? req.getVatRate() : new BigDecimal("0.15"));
        lease.setUtilityPayment(req.getUtilityPayment() != null ? req.getUtilityPayment() : BigDecimal.ZERO);
        lease.setPaymentModality(req.getPaymentModality());
        lease.setDiscountRate(req.getDiscountRate());
        lease.setInitialOutstandingBalance(req.getInitialOutstandingBalance() != null
                ? req.getInitialOutstandingBalance() : BigDecimal.ZERO);
        lease.setInitialOutstandingBalanceMonth(req.getInitialOutstandingBalanceMonth());
        lease.setInitialOutstandingBalanceYear(req.getInitialOutstandingBalanceYear());

        // Stamp duty: update existing or create new
        if (req.isHasStampDuty() && req.getStampDuty() != null) {
            lease.setHasStampDuty(true);
            LeaseContractRequest.StampDutyRequest sdReq = req.getStampDuty();
            StampDutyContract sd = lease.getStampDutyContract();
            if (sd == null) {
                sd = new StampDutyContract();
                sd.setLeaseContract(lease);
            }
            sd.setMeterSquare(sdReq.getMeterSquare() != null ? sdReq.getMeterSquare() : BigDecimal.ZERO);
            sd.setMeterSquarePriceBeforeVat(sdReq.getMeterSquarePriceBeforeVat() != null
                    ? sdReq.getMeterSquarePriceBeforeVat() : BigDecimal.ZERO);
            sd.setVatRate(sdReq.getVatRate() != null ? sdReq.getVatRate() : new BigDecimal("0.15"));
            sd.setUtilityPayment(sdReq.getUtilityPayment() != null ? sdReq.getUtilityPayment() : BigDecimal.ZERO);
            sd.setStampDutyFullPayment(sdReq.getStampDutyFullPayment() != null
                    ? sdReq.getStampDutyFullPayment() : BigDecimal.ZERO);
            sd.setInitialOutstandingBalance(sdReq.getInitialOutstandingBalance() != null
                    ? sdReq.getInitialOutstandingBalance() : BigDecimal.ZERO);
            sd.setInitialOutstandingBalanceMonth(sdReq.getInitialOutstandingBalanceMonth());
            sd.setInitialOutstandingBalanceYear(sdReq.getInitialOutstandingBalanceYear());
            sd.setPaymentPaidToDate(sdReq.getPaymentPaidToDate());
            stampRepo.save(sd);
            lease.setStampDutyContract(sd);
        } else {
            lease.setHasStampDuty(false);
            if (lease.getStampDutyContract() != null) {
                stampRepo.delete(lease.getStampDutyContract());
                lease.setStampDutyContract(null);
            }
        }

        return leaseRepo.save(lease);
    }

    // =========================================================
    //  REPORT GENERATION for a given month/year
    // =========================================================

    @Transactional
    public List<AmortizationReportRow> generateReport(int month, int year, String category) {
        List<LeaseContract> allLeases = leaseRepo.findAll();
        List<AmortizationReportRow> rows = new ArrayList<>();

        LocalDate reportStart = LocalDate.of(year, month, 1);
        LocalDate reportEnd   = reportStart.withDayOfMonth(reportStart.lengthOfMonth());

        for (LeaseContract lease : allLeases) {
            // ── Category filter ────────────────────────────────────────────────
            if (category != null && !category.isBlank()
                    && !category.equalsIgnoreCase(lease.getCategoryOfRent())) {
                continue;
            }

            // ── Skip contracts that haven't started yet ────────────────────────
            if (lease.getContractStartDate().isAfter(reportEnd)) {
                continue;
            }

            // ── Effective amortization end date = paymentPaidToDate (not contractEndDate) ──
            LocalDate officeEffectiveEnd = lease.getPaymentPaidToDate() != null
                    ? lease.getPaymentPaidToDate() : lease.getContractEndDate();

            // Whether this contract's amortization period has ended before the report month
            boolean officeExpired = officeEffectiveEnd.isBefore(reportStart);

            // --- Office rent row --- always build (even if expired)
            AmortizationReportRow officeRow = buildRow(lease, null, month, year);

            if (officeExpired) {
                // Amortization finished: outstanding = 0, due = monthly rent expense
                BigDecimal monthlyRent = officeRow.getMonthlyRentWithVat();
                officeRow.setOutstandingBalancePriorMonth(BigDecimal.ZERO);
                officeRow.setRentExpenseForMonth(monthlyRent);
                officeRow.setDueForMonth(monthlyRent);
                officeRow.setPrepaidOfficeRent(BigDecimal.ZERO);
                officeRow.setOutstandingBalanceEndOfMonth(BigDecimal.ZERO);
            }

            rows.add(officeRow);

            // --- Stamp duty row (if applicable) ---
            if (lease.isHasStampDuty() && lease.getStampDutyContract() != null) {
                StampDutyContract sd = lease.getStampDutyContract();

                LocalDate sdEffectiveEnd = sd.getPaymentPaidToDate() != null
                        ? sd.getPaymentPaidToDate() : officeEffectiveEnd;
                boolean sdExpired = sdEffectiveEnd.isBefore(reportStart);

                AmortizationReportRow sdRow = buildRow(lease, sd, month, year);

                if (sdExpired) {
                    BigDecimal monthlyRent = sdRow.getMonthlyRentWithVat();
                    sdRow.setOutstandingBalancePriorMonth(BigDecimal.ZERO);
                    sdRow.setRentExpenseForMonth(monthlyRent);
                    sdRow.setDueForMonth(monthlyRent);
                    sdRow.setPrepaidOfficeRent(BigDecimal.ZERO);
                    sdRow.setOutstandingBalanceEndOfMonth(BigDecimal.ZERO);
                }

                rows.add(sdRow);

                // Total = officeRentExpense + stampDutyRentExpense (on SD row only)
                BigDecimal total = officeRow.getRentExpenseForMonth()
                        .add(sdRow.getRentExpenseForMonth()).setScale(SCALE, RM);
                officeRow.setTotal(null);
                sdRow.setTotal(total);
            }
        }

        return rows;
    }

    // (Golden Rule is now applied inline in buildRow and saveEntry — no separate method needed)

    // =========================================================
    //  Core row builder
    // =========================================================

    private AmortizationReportRow buildRow(LeaseContract lease,
                                            StampDutyContract sd,
                                            int month, int year) {
        boolean isStampDuty = (sd != null);

        LocalDate paidToDate = isStampDuty ? sd.getPaymentPaidToDate() : lease.getPaymentPaidToDate();

        // ---- Column 6: Total Number of Years (always based on lease dates) ----
        long daysBetween = ChronoUnit.DAYS.between(lease.getContractStartDate(),
                paidToDate != null ? paidToDate : lease.getContractEndDate());
        BigDecimal totalYears = BigDecimal.valueOf(daysBetween)
                .divide(DAYS_IN_YEAR, 6, RM).setScale(2, RM);

        // ---- Column 8: Year with Fraction ----
        BigDecimal yearWithFraction = BigDecimal.ZERO;
        if (paidToDate != null && !paidToDate.isBefore(lease.getContractStartDate())) {
            long paidDays = ChronoUnit.DAYS.between(lease.getContractStartDate(), paidToDate);
            yearWithFraction = BigDecimal.valueOf(paidDays)
                    .divide(DAYS_IN_YEAR, 6, RM).setScale(2, RM);
        }

        // ───────────────────────────────────────────────────────────────────
        // Columns 10-14: different formulas for office rent vs stamp duty
        // ───────────────────────────────────────────────────────────────────
        BigDecimal meterSqr, priceBeforeVat, priceAfterVat, monthlyRent, annualRent, fullPayment;
        BigDecimal utilityPayment;

        if (!isStampDuty) {
            // ── OFFICE RENT ──────────────────────────────────────────────
            meterSqr       = lease.getMeterSquare();
            priceBeforeVat = lease.getMeterSquarePriceBeforeVat();
            BigDecimal vatRate = lease.getVatRate();
            utilityPayment = lease.getUtilityPayment();

            priceAfterVat = priceBeforeVat.multiply(BigDecimal.ONE.add(vatRate)).setScale(SCALE, RM);
            monthlyRent   = meterSqr.multiply(priceAfterVat).setScale(SCALE, RM);
            annualRent    = monthlyRent.multiply(BigDecimal.valueOf(12)).setScale(SCALE, RM);
            fullPayment   = annualRent.multiply(totalYears).setScale(SCALE, RM);

        } else {
            // ── STAMP DUTY ───────────────────────────────────────────────
            // No VAT for stamp duty.
            // Monthly Rent = stampDutyFullPayment / (totalYears × 12)
            meterSqr       = sd.getMeterSquare();
            priceBeforeVat = sd.getMeterSquarePriceBeforeVat();
            priceAfterVat  = priceBeforeVat;   // no VAT
            utilityPayment = sd.getUtilityPayment();
            fullPayment    = sd.getStampDutyFullPayment() != null
                    ? sd.getStampDutyFullPayment() : BigDecimal.ZERO;

            // Monthly rent: avoid division by zero
            BigDecimal divisor = totalYears.multiply(BigDecimal.valueOf(12)).setScale(6, RM);
            if (divisor.compareTo(BigDecimal.ZERO) > 0) {
                monthlyRent = fullPayment.divide(divisor, SCALE, RM);
            } else {
                monthlyRent = BigDecimal.ZERO;
            }
            annualRent = monthlyRent.multiply(BigDecimal.valueOf(12)).setScale(SCALE, RM);
        }

        // ---- Column 16: Total Payment Paid to Date ----
        BigDecimal totalPaid = annualRent.multiply(yearWithFraction)
                .add(utilityPayment).setScale(SCALE, RM);

        // ---- Column 16b: Remaining Payment ----
        BigDecimal remaining = fullPayment.subtract(totalPaid).setScale(SCALE, RM);

        // ---- Column 18: Rent Expense for the month ----
        boolean firstMonth = isFirstMonth(lease.getContractStartDate(), month, year);
        BigDecimal calcRentExpense = firstMonth
                ? calcProratedRent(lease.getContractStartDate(), monthlyRent)
                : monthlyRent;

        // ---- Column 17: Outstanding Balance prior month ----
        BigDecimal outstandingPrior = resolveOutstandingPrior(lease, sd, isStampDuty, month, year);

        // ---- Load saved entry (prepaid, rent override, additional expense, entryDay) ----
        Optional<AmortizationEntry> savedEntry = isStampDuty
                ? entryRepo.findByStampDutyContractIdAndStampDutyTrueAndReportMonthAndReportYear(sd.getId(), month, year)
                : entryRepo.findByLeaseContractIdAndStampDutyFalseAndReportMonthAndReportYear(lease.getId(), month, year);

        BigDecimal prepaidRent       = savedEntry.map(AmortizationEntry::getPrepaidOfficeRent).orElse(BigDecimal.ZERO);
        BigDecimal additionalExpense = savedEntry.map(AmortizationEntry::getAdditionalExpense).orElse(BigDecimal.ZERO);
        Integer    entryDay          = savedEntry.map(AmortizationEntry::getEntryDay).orElse(null);
        boolean    rentOverridden    = savedEntry.map(AmortizationEntry::isRentExpenseOverridden).orElse(false);
        boolean    dueOverridden     = savedEntry.map(AmortizationEntry::isDueForMonthOverridden).orElse(false);

        // Use stored override if the user explicitly set it; otherwise use auto-calculated value
        BigDecimal rentExpense = rentOverridden
                ? savedEntry.get().getRentExpenseForMonth()
                : calcRentExpense;

        // ---- Golden Rule: outstanding + prepaid − rentExpense − additionalExpense ----
        BigDecimal rawEnd       = outstandingPrior
                .add(prepaidRent)
                .subtract(rentExpense)
                .subtract(additionalExpense)
                .setScale(SCALE, RM);
        // dueForMonth: use user-saved value if overridden, otherwise auto-calculate
        BigDecimal dueForMonth  = dueOverridden
                ? savedEntry.get().getDueForMonth()
                : (rawEnd.compareTo(BigDecimal.ZERO) < 0 ? rawEnd.negate().setScale(SCALE, RM) : BigDecimal.ZERO);
        // outstandingEnd: always auto-calculated (drives the next-month chain)
        BigDecimal outstandingEnd = rawEnd.max(BigDecimal.ZERO).setScale(SCALE, RM);

        // ---- Assemble the row ----
        AmortizationReportRow row = new AmortizationReportRow();
        row.setLeaseContractId(lease.getId());
        row.setStampDutyRow(isStampDuty);
        row.setBranchName(lease.getBranchName());
        row.setBranchCode(lease.getBranchCode());
        row.setOwnerName(lease.getOwnerName());
        row.setCategoryOfRent(lease.getCategoryOfRent());

        row.setContractStartDate(lease.getContractStartDate());
        row.setContractEndDate(lease.getContractEndDate());
        row.setTotalNumberOfYears(totalYears);
        row.setPaymentPaidToDate(paidToDate);
        row.setYearWithFraction(yearWithFraction);
        row.setMeterSquare(meterSqr);
        row.setMeterSquarePriceBeforeVat(priceBeforeVat);
        row.setMeterSquarePriceAfterVat(priceAfterVat);
        row.setMonthlyRentWithVat(monthlyRent);
        row.setTotalAnnualRentAmount(annualRent);
        row.setUtilityPayment(utilityPayment);
        row.setFullPayment(fullPayment);
        row.setTotalPaymentPaidToDate(totalPaid);
        row.setRemainingPayment(remaining);
        row.setOutstandingBalancePriorMonth(outstandingPrior);
        row.setRentExpenseForMonth(rentExpense);
        row.setDueForMonth(dueForMonth);
        row.setDueForMonthOverridden(dueOverridden);
        row.setPrepaidOfficeRent(prepaidRent);
        row.setAdditionalExpense(additionalExpense);
        row.setOutstandingBalanceEndOfMonth(outstandingEnd);
        row.setEntryDay(entryDay);
        row.setRentExpenseOverridden(rentOverridden);
        row.setReportMonth(month);
        row.setReportYear(year);
        row.setFirstMonth(firstMonth);

        return row;
    }


    // =========================================================
    //  Helpers
    // =========================================================

    private boolean isFirstMonth(LocalDate contractStartDate, int month, int year) {
        return contractStartDate.getMonthValue() == month
                && contractStartDate.getYear() == year;
    }

    /**
     * Pro-rated rent for the first (partial) month:
     *  days remaining (including start day) / days in that month × monthly rent
     */
    private BigDecimal calcProratedRent(LocalDate startDate, BigDecimal monthlyRent) {
        int daysInMonth = YearMonth.of(startDate.getYear(), startDate.getMonthValue()).lengthOfMonth();
        // Days from startDate through end of month (inclusive of startDate)
        int daysRemaining = daysInMonth - startDate.getDayOfMonth() + 1;
        return monthlyRent
                .multiply(BigDecimal.valueOf(daysRemaining))
                .divide(BigDecimal.valueOf(daysInMonth), SCALE, RM);
    }

    /**
     * Outstanding balance going INTO the requested month (i.e. end-of-prior-month balance).
     *
     * Priority:
     *  1. If this IS the anchor month (initialOutstandingBalanceMonth/Year, defaulting to
     *     contract start month/year when null) → return initialOutstandingBalance.
     *  2. If a saved AmortizationEntry exists for the prior month → use its stored end balance.
     *  3. Otherwise → recursively compute what the prior month's end balance would have been,
     *     assuming prepaid = 0 for any unsaved months.
     */
    private BigDecimal resolveOutstandingPrior(LeaseContract lease, StampDutyContract sd,
                                                boolean isStampDuty, int month, int year) {
        LocalDate contractStart = lease.getContractStartDate();

        // ── Determine anchor month/year (user-chosen or default to contract start) ──
        int anchorMonth = isStampDuty && sd.getInitialOutstandingBalanceMonth() != null
                ? sd.getInitialOutstandingBalanceMonth()
                : (lease.getInitialOutstandingBalanceMonth() != null
                        ? lease.getInitialOutstandingBalanceMonth()
                        : contractStart.getMonthValue());
        int anchorYear = isStampDuty && sd.getInitialOutstandingBalanceYear() != null
                ? sd.getInitialOutstandingBalanceYear()
                : (lease.getInitialOutstandingBalanceYear() != null
                        ? lease.getInitialOutstandingBalanceYear()
                        : contractStart.getYear());

        // ── 1. This IS the anchor month → return the registered initial balance ──
        if (year == anchorYear && month == anchorMonth) {
            return isStampDuty
                    ? (sd.getInitialOutstandingBalance() != null ? sd.getInitialOutstandingBalance() : BigDecimal.ZERO)
                    : (lease.getInitialOutstandingBalance() != null ? lease.getInitialOutstandingBalance() : BigDecimal.ZERO);
        }

        // ── 2. Guard: don't recurse before the anchor month ─────────────────────
        LocalDate anchorDate      = LocalDate.of(anchorYear, anchorMonth, 1);
        LocalDate requestedPeriod = LocalDate.of(year, month, 1);
        if (requestedPeriod.isBefore(anchorDate)) {
            return BigDecimal.ZERO;
        }

        // Prior period
        int priorMonth = month == 1 ? 12 : month - 1;
        int priorYear  = month == 1 ? year - 1 : year;

        // ── 3. Saved entry for prior month? ─────────────────────────────────
        Optional<AmortizationEntry> savedPrior = isStampDuty
                ? entryRepo.findByStampDutyContractIdAndStampDutyTrueAndReportMonthAndReportYear(
                        sd.getId(), priorMonth, priorYear)
                : entryRepo.findByLeaseContractIdAndStampDutyFalseAndReportMonthAndReportYear(
                        lease.getId(), priorMonth, priorYear);

        if (savedPrior.isPresent()) {
            return savedPrior.get().getOutstandingBalanceEndOfMonth();
        }

        // ── 4. No saved entry – compute prior month dynamically ──────────────
        BigDecimal priorOutstandingPrior = resolveOutstandingPrior(
                lease, sd, isStampDuty, priorMonth, priorYear);

        BigDecimal priorMonthlyRent = calcMonthlyRent(isStampDuty ? sd : null, lease);
        boolean priorIsFirstMonth   = isFirstMonth(contractStart, priorMonth, priorYear);
        BigDecimal priorRentExpense = priorIsFirstMonth
                ? calcProratedRent(contractStart, priorMonthlyRent)
                : priorMonthlyRent;

        // prepaid defaults to 0 for unsaved months; apply golden rule (cap at 0)
        BigDecimal rawPriorEnd = priorOutstandingPrior
                .subtract(priorRentExpense)
                .setScale(SCALE, RM);
        return rawPriorEnd.max(BigDecimal.ZERO);
    }


    // =========================================================
    //  SAVE / UPDATE monthly entry (due + prepaid – manually entered)
    // =========================================================

    @Transactional
    public AmortizationEntry saveEntry(Long leaseId, boolean isStampDuty,
                                       int month, int year,
                                       BigDecimal rentExpenseOverride,   // null = auto-calculated
                                       BigDecimal dueForMonthInput,      // nullable, used as hint only
                                       BigDecimal prepaidOfficeRent,
                                       BigDecimal additionalExpense,
                                       Integer entryDay) {

        LeaseContract lease = leaseRepo.findById(leaseId)
                .orElseThrow(() -> new RuntimeException("Lease not found: " + leaseId));

        StampDutyContract sd = isStampDuty ? lease.getStampDutyContract() : null;

        // Find or create entry
        AmortizationEntry entry;
        if (isStampDuty && sd != null) {
            entry = entryRepo.findByStampDutyContractIdAndStampDutyTrueAndReportMonthAndReportYear(
                    sd.getId(), month, year).orElse(new AmortizationEntry());
        } else {
            entry = entryRepo.findByLeaseContractIdAndStampDutyFalseAndReportMonthAndReportYear(
                    leaseId, month, year).orElse(new AmortizationEntry());
        }

        // Populate
        entry.setLeaseContract(lease);
        entry.setStampDutyContract(sd);
        entry.setStampDuty(isStampDuty);
        entry.setReportMonth(month);
        entry.setReportYear(year);
        entry.setEntryDay(entryDay);

        BigDecimal prepaid   = prepaidOfficeRent != null ? prepaidOfficeRent : BigDecimal.ZERO;
        BigDecimal addlExp   = additionalExpense  != null ? additionalExpense  : BigDecimal.ZERO;
        entry.setPrepaidOfficeRent(prepaid);
        entry.setAdditionalExpense(addlExp);

        // Recalculate outstanding balance as of prior month
        BigDecimal outstandingPrior = resolveOutstandingPrior(lease, sd, isStampDuty, month, year);
        entry.setOutstandingBalancePriorMonth(outstandingPrior);

        // Rent expense: use override if provided, otherwise auto-calculate
        BigDecimal monthlyRent = calcMonthlyRent(isStampDuty ? sd : null, lease);
        boolean firstMonth     = isFirstMonth(lease.getContractStartDate(), month, year);
        BigDecimal autoRent    = firstMonth
                ? calcProratedRent(lease.getContractStartDate(), monthlyRent)
                : monthlyRent;

        boolean overridden = rentExpenseOverride != null;
        BigDecimal rentExpense = overridden ? rentExpenseOverride : autoRent;
        entry.setRentExpenseForMonth(rentExpense);
        entry.setRentExpenseOverridden(overridden);

        // Golden Rule: outstanding + prepaid - rentExpense - additionalExpense
        BigDecimal rawEnd = outstandingPrior
                .add(prepaid)
                .subtract(rentExpense)
                .subtract(addlExp)
                .setScale(SCALE, RM);

        // dueForMonth: persist user value if provided, otherwise auto-calculate
        boolean dueOverridden = dueForMonthInput != null;
        BigDecimal dueToSave = dueOverridden
                ? dueForMonthInput.max(BigDecimal.ZERO).setScale(SCALE, RM)   // clamp at 0
                : (rawEnd.compareTo(BigDecimal.ZERO) < 0 ? rawEnd.negate().setScale(SCALE, RM) : BigDecimal.ZERO);
        entry.setDueForMonth(dueToSave);
        entry.setDueForMonthOverridden(dueOverridden);

        // outstandingEnd: always auto-calculated (drives the next-month chain)
        entry.setOutstandingBalanceEndOfMonth(rawEnd.max(BigDecimal.ZERO).setScale(SCALE, RM));

        return entryRepo.save(entry);
    }

    /**
     * Monthly rent for outstandingPrior resolution and saveEntry.
     * For stamp duty: fullPayment / (totalYears * 12). For office: meterSqr * priceAfterVat.
     */
    private BigDecimal calcMonthlyRent(StampDutyContract sd, LeaseContract lease) {
        if (sd != null) {
            // Stamp duty: fullPayment / (days-based totalYears * 12)
            BigDecimal fullPayment = sd.getStampDutyFullPayment() != null
                    ? sd.getStampDutyFullPayment() : BigDecimal.ZERO;
            LocalDate paidToDate = sd.getPaymentPaidToDate() != null
                    ? sd.getPaymentPaidToDate() : lease.getContractEndDate();
            long days = ChronoUnit.DAYS.between(lease.getContractStartDate(), paidToDate);
            BigDecimal totalYears = BigDecimal.valueOf(days).divide(DAYS_IN_YEAR, 6, RM);
            BigDecimal divisor = totalYears.multiply(BigDecimal.valueOf(12)).setScale(6, RM);
            return divisor.compareTo(BigDecimal.ZERO) > 0
                    ? fullPayment.divide(divisor, SCALE, RM)
                    : BigDecimal.ZERO;
        }
        // Office rent: meterSqr * priceAfterVat
        BigDecimal priceBeforeVat = lease.getMeterSquarePriceBeforeVat();
        BigDecimal vatRate        = lease.getVatRate();
        BigDecimal priceAfterVat  = priceBeforeVat.multiply(BigDecimal.ONE.add(vatRate)).setScale(SCALE, RM);
        return lease.getMeterSquare().multiply(priceAfterVat).setScale(SCALE, RM);
    }

    // =========================================================
    //  RENEWAL PREFILL
    // =========================================================

    /**
     * Returns all the data needed to pre-fill the "Register New Contract" form
     * when renewing an existing contract.
     *
     * The caller should use the returned initialOutstandingBalance values as the
     * starting balance for the new contract period.
     */
    @Transactional(readOnly = true)
    public com.zemenbank.amortization.dto.RenewalPrefillDto getRenewalPrefill(Long leaseId) {
        LeaseContract lease = leaseRepo.findById(leaseId)
                .orElseThrow(() -> new RuntimeException("Lease not found: " + leaseId));

        // Find the last saved entry for office rent
        Optional<AmortizationEntry> lastOffice =
                entryRepo.findTopByLeaseContractIdAndStampDutyFalseOrderByReportYearDescReportMonthDesc(leaseId);

        BigDecimal endingBalance = lastOffice.map(AmortizationEntry::getOutstandingBalanceEndOfMonth)
                .orElse(lease.getInitialOutstandingBalance());
        Integer endMonth = lastOffice.map(AmortizationEntry::getReportMonth).orElse(null);
        Integer endYear  = lastOffice.map(AmortizationEntry::getReportYear).orElse(null);

        // Stamp duty
        BigDecimal sdEndingBalance = BigDecimal.ZERO;
        Integer sdEndMonth = null;
        Integer sdEndYear  = null;
        if (lease.isHasStampDuty() && lease.getStampDutyContract() != null) {
            StampDutyContract sd = lease.getStampDutyContract();
            Optional<AmortizationEntry> lastSd =
                    entryRepo.findTopByStampDutyContractIdAndStampDutyTrueOrderByReportYearDescReportMonthDesc(sd.getId());
            sdEndingBalance = lastSd.map(AmortizationEntry::getOutstandingBalanceEndOfMonth)
                    .orElse(sd.getInitialOutstandingBalance());
            sdEndMonth = lastSd.map(AmortizationEntry::getReportMonth).orElse(null);
            sdEndYear  = lastSd.map(AmortizationEntry::getReportYear).orElse(null);
        }

        return com.zemenbank.amortization.dto.RenewalPrefillDto.builder()
                .previousContractId(lease.getId())
                .branchName(lease.getBranchName())
                .branchCode(lease.getBranchCode())
                .region(lease.getRegion())
                .categoryOfRent(lease.getCategoryOfRent())
                .ownerName(lease.getOwnerName())
                .lessorName1(lease.getLessorName1())
                .lessorName2(lease.getLessorName2())
                .lessorName3(lease.getLessorName3())
                .tinNumber(lease.getTinNumber())
                .contactInfo1(lease.getContactInfo1())
                .contactInfo2(lease.getContactInfo2())
                .contactInfo3(lease.getContactInfo3())
                .accountNumber(lease.getAccountNumber())
                .taxCategory(lease.getTaxCategory())
                .paymentModality(lease.getPaymentModality())
                .discountRate(lease.getDiscountRate())
                .previousEndingOutstandingBalance(endingBalance)
                .previousEndingMonth(endMonth)
                .previousEndingYear(endYear)
                .hasStampDuty(lease.isHasStampDuty())
                .sdPreviousEndingOutstandingBalance(sdEndingBalance)
                .sdPreviousEndingMonth(sdEndMonth)
                .sdPreviousEndingYear(sdEndYear)
                .build();
    }
}
