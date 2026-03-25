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

        // ── Superseded contracts ──────────────────────────────────────────────────
        // Old contract is superseded when a renewal's contractStartDate ≤ reportStart.
        java.util.Set<Long> supersededIds = leaseRepo.findSupersededContractIds(reportStart);

        // ── Overlap month pre-pass ────────────────────────────────────────────────
        // An overlap occurs when a new (renewed) contract starts WITHIN the report month
        // (contractStartDate is between reportStart and reportEnd, inclusive).
        // In that case:
        //   • The old contract's partial rent (days 1 → paymentPaidToDate) is computed here.
        //   • Its ID is added to overlapHidden so it won't get its own row.
        //   • The partial rent is stored in overlapOldRents keyed by the NEW contract's ID,
        //     so it can be added to the new contract's first-month prorated row.
        //
        // Formula:  daysOld = paymentPaidToDate.getDayOfMonth()   (e.g. 24 for Oct-24)
        //           oldPartial = oldMonthlyRent × daysOld / daysInMonth
        // NOTE: days 25-31 (7 days including day 25) belong to the new contract and are
        //       already prorated correctly in buildRow via calcProratedRent.
        java.util.Map<Long, BigDecimal> overlapOldRents        = new java.util.HashMap<>(); // newLeaseId → oldPartialRent (for expense display)
        java.util.Map<Long, BigDecimal> overlapOldPrior        = new java.util.HashMap<>(); // newLeaseId → old contract's prior-month balance
        java.util.Map<Long, BigDecimal> overlapOldMonthlyRent  = new java.util.HashMap<>(); // newLeaseId → old full monthly rent (for due formula)
        java.util.Set<Long>             overlapHidden          = new java.util.HashSet<>();

        for (LeaseContract candidate : allLeases) {
            if (candidate.getPreviousContractId() == null) continue;
            LocalDate newStart = candidate.getContractStartDate();
            if (newStart.isBefore(reportStart) || newStart.isAfter(reportEnd)) continue;

            // The new contract starts this month → look for old contract ending this month
            leaseRepo.findById(candidate.getPreviousContractId()).ifPresent(oldContract -> {
                LocalDate oldEnd = oldContract.getPaymentPaidToDate() != null
                        ? oldContract.getPaymentPaidToDate() : oldContract.getContractEndDate();
                // Old contract must also end within this month to form the overlap
                if (!oldEnd.isBefore(reportStart) && !oldEnd.isAfter(reportEnd)) {
                    BigDecimal oldMR    = calcMonthlyRent(null, oldContract);
                    int daysInMonth     = reportStart.lengthOfMonth();
                    int daysOld         = oldEnd.getDayOfMonth(); // e.g. 24
                    BigDecimal oldPart  = oldMR
                            .multiply(BigDecimal.valueOf(daysOld))
                            .divide(BigDecimal.valueOf(daysInMonth), SCALE, RM);

                    // Old contract's prior-month balance (e.g. end-of-Sep for an Oct overlap)
                    // Use it as the outstanding prior for the merged row.
                    BigDecimal oldPrior = resolveOutstandingPrior(oldContract, null, false, month, year);

                    overlapHidden.add(oldContract.getId());
                    overlapOldRents.put(candidate.getId(), oldPart);
                    overlapOldPrior.put(candidate.getId(), oldPrior);
                    overlapOldMonthlyRent.put(candidate.getId(), oldMR); // full old rate for due formula
                }
            });
        }

        for (LeaseContract lease : allLeases) {
            // ── Skip contracts superseded by a newer period ───────────────────────
            if (supersededIds.contains(lease.getId())) continue;

            // ── Skip old contracts hidden by overlap merging ──────────────────────
            if (overlapHidden.contains(lease.getId())) continue;

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

            // ── Overlap merge ──────────────────────────────────────────────────────────
            // For the overlap month the row always uses:
            //   outstandingPrior  = old contract's prior-month balance (e.g. Sep 2026)
            //   rentExpense       = oldPartialRent (days 1..oldEnd) + newProratedRent (days newStart..31)
            //   due               = max(0, oldFullMonthlyRent − oldPrior)   ← user's specified formula
            //   outstandingEnd    = max(0, oldPrior − oldFullMonthlyRent)
            // We ALWAYS apply this — even if a saved override exists — because the overlap
            // fundamentally changes what the month represents.
            if (overlapOldRents.containsKey(lease.getId())) {
                BigDecimal oldPrior      = overlapOldPrior.getOrDefault(lease.getId(), BigDecimal.ZERO);
                BigDecimal oldFullMR     = overlapOldMonthlyRent.getOrDefault(lease.getId(), BigDecimal.ZERO);
                BigDecimal oldPart       = overlapOldRents.get(lease.getId());
                BigDecimal newProrate    = officeRow.getRentExpenseForMonth(); // prorated new days from buildRow
                BigDecimal mergedRent    = newProrate.add(oldPart).setScale(SCALE, RM);
                BigDecimal prepaid       = officeRow.getPrepaidOfficeRent();

                // Set merged expense and prior balance
                officeRow.setOutstandingBalancePriorMonth(oldPrior);
                officeRow.setRentExpenseForMonth(mergedRent);
                officeRow.setRentExpenseOverridden(false); // display as the computed overlap value

                // Due = max(0, oldFullMonthlyRent − oldPrior − prepaid)
                BigDecimal dueRaw = oldFullMR.subtract(oldPrior).subtract(prepaid).setScale(SCALE, RM);
                if (!officeRow.isDueForMonthOverridden()) {
                    officeRow.setDueForMonth(dueRaw.compareTo(BigDecimal.ZERO) > 0
                            ? dueRaw : BigDecimal.ZERO);
                }

                // Outstanding end: oldPrior + prepaid − mergedRent (drives next month's chain)
                BigDecimal rawEnd = oldPrior.add(prepaid).subtract(mergedRent).setScale(SCALE, RM);
                officeRow.setOutstandingBalanceEndOfMonth(rawEnd.max(BigDecimal.ZERO).setScale(SCALE, RM));
            }

            if (officeExpired) {
                // Amortization finished: force outstanding to 0, but respect user overrides
                BigDecimal monthlyRent = officeRow.getMonthlyRentWithVat();
                officeRow.setOutstandingBalancePriorMonth(BigDecimal.ZERO);
                officeRow.setOutstandingBalanceEndOfMonth(BigDecimal.ZERO);
                officeRow.setPrepaidOfficeRent(BigDecimal.ZERO);
                if (!officeRow.isRentExpenseOverridden()) {
                    officeRow.setRentExpenseForMonth(monthlyRent);
                }
                if (!officeRow.isDueForMonthOverridden()) {
                    officeRow.setDueForMonth(monthlyRent);
                }
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
                    sdRow.setOutstandingBalanceEndOfMonth(BigDecimal.ZERO);
                    sdRow.setPrepaidOfficeRent(BigDecimal.ZERO);
                    if (!sdRow.isRentExpenseOverridden()) {
                        sdRow.setRentExpenseForMonth(monthlyRent);
                    }
                    if (!sdRow.isDueForMonthOverridden()) {
                        sdRow.setDueForMonth(monthlyRent);
                    }
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

        // ---- Column 6: Total Number of Years — based on contractEndDate (full contract duration) ----
        // End date counted INCLUSIVELY (+1 day) so a Sep-1 → Aug-31 contract = exactly 1.00 year.
        // Used for: Full Payment / Total Contract Payment = annualRent × totalYears
        long daysContract = ChronoUnit.DAYS.between(lease.getContractStartDate(), lease.getContractEndDate().plusDays(1));
        BigDecimal totalYears = BigDecimal.valueOf(daysContract)
                .divide(DAYS_IN_YEAR, 6, RM).setScale(2, RM);

        // ---- Column 8: Year with Fraction — based on paymentPaidToDate ----
        // Used for: Total Payment Paid to Date = annualRent × yearWithFraction + utility
        // Keep 10 decimal places — setScale(2) would round 0.9973 → 1.00 making totalPaid = fullPayment.
        BigDecimal yearWithFraction = BigDecimal.ZERO;
        if (paidToDate != null && !paidToDate.isBefore(lease.getContractStartDate())) {
            long paidDays = ChronoUnit.DAYS.between(lease.getContractStartDate(), paidToDate);
            yearWithFraction = BigDecimal.valueOf(paidDays)
                    .divide(DAYS_IN_YEAR, 10, RM);  // high precision, NOT rounded to 2dp
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
            // Full payment is the registered stamp duty amount (fixed).
            // Monthly Rent = fullPayment / (totalYears × 12) where totalYears uses contractEndDate.
            meterSqr       = sd.getMeterSquare();
            priceBeforeVat = sd.getMeterSquarePriceBeforeVat();
            priceAfterVat  = priceBeforeVat;   // no VAT
            utilityPayment = sd.getUtilityPayment();
            fullPayment    = sd.getStampDutyFullPayment() != null
                    ? sd.getStampDutyFullPayment() : BigDecimal.ZERO;

            // Monthly rent divisor uses contractEndDate-based totalYears
            BigDecimal divisor = totalYears.multiply(BigDecimal.valueOf(12)).setScale(6, RM);
            if (divisor.compareTo(BigDecimal.ZERO) > 0) {
                monthlyRent = fullPayment.divide(divisor, SCALE, RM);
            } else {
                monthlyRent = BigDecimal.ZERO;
            }
            annualRent = monthlyRent.multiply(BigDecimal.valueOf(12)).setScale(SCALE, RM);
        }

        // ---- Column 16: Total Payment Paid to Date ----
        // = annualRent × yearWithFraction (paidToDate-based) + utility
        BigDecimal totalPaid = annualRent.multiply(yearWithFraction)
                .add(utilityPayment).setScale(SCALE, RM);

        // ---- Column 17: Remaining Payment = Full Payment − Total Paid ----
        BigDecimal remaining = fullPayment.subtract(totalPaid).setScale(SCALE, RM);

        // ---- Column 18: Rent Expense for the month ----
        boolean firstMonth = isFirstMonth(lease.getContractStartDate(), month, year);

        // ── Rate-switching for renewed contracts (Rule 2) ─────────────────────────
        // If this contract is a renewal (previousContractId set) and it is NOT the first month:
        //   • Before any prepaid is entered: use the PREVIOUS contract's monthly rate
        //   • Once prepaid > 0 is saved for any month ≤ current month: switch to THIS contract's rate
        BigDecimal effectiveMonthlyRent = monthlyRent;
        if (!isStampDuty && !firstMonth && lease.getPreviousContractId() != null) {
            boolean prepaidEntered = !entryRepo
                    .findFirstPrepaidOfficeEntryAtOrBefore(lease.getId(), year, month)
                    .isEmpty();
            if (!prepaidEntered) {
                // No prepaid yet → use old contract's rate
                Optional<LeaseContract> prevOpt = leaseRepo.findById(lease.getPreviousContractId());
                if (prevOpt.isPresent()) {
                    effectiveMonthlyRent = calcMonthlyRent(null, prevOpt.get());
                }
            }
            // If prepaid was entered: stay with this contract's own monthlyRent (already set)
        }

        BigDecimal calcRentExpense = firstMonth
                ? calcProratedRent(lease.getContractStartDate(), monthlyRent)  // first month always uses new rate (prorated by new contract's start day)
                : effectiveMonthlyRent;

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

        // Rent Expense − Due for Month:
        // - If dueForMonth is 0 → result is 0 (no subtraction needed)
        // - Normal months:         Monthly Rent with VAT − dueForMonth
        // - Prorated (first month) or overlap: rentExpenseForMonth − dueForMonth
        BigDecimal rentMinusDue;
        if (dueForMonth.compareTo(BigDecimal.ZERO) == 0) {
            rentMinusDue = BigDecimal.ZERO;
        } else {
            BigDecimal baseForDiff = firstMonth ? rentExpense : monthlyRent;
            rentMinusDue = baseForDiff.subtract(dueForMonth).setScale(SCALE, RM);
        }
        row.setRentMinusDue(rentMinusDue);

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
     * Calculates the suggested Prepaid Office/StampDuty Rent for a given month.
     *
     * Formula:
     *   prepaid = TotalPaymentPaidToDate  −  Σ(dueForMonth + rentMinusDue) for all months
     *             from contractStart up to (but NOT including) the target month.
     *
     * TotalPaymentPaidToDate uses yearWithFraction ROUNDED to 2 decimal places.
     */
    public BigDecimal calculatePrepaidSuggestion(Long leaseId, boolean stampDuty, int targetMonth, int targetYear) {
        LeaseContract lease = leaseRepo.findById(leaseId)
                .orElseThrow(() -> new RuntimeException("Lease not found: " + leaseId));

        LocalDate startDate = lease.getContractStartDate();

        BigDecimal annualRent;
        BigDecimal utility;
        LocalDate paidToDate;

        if (stampDuty && lease.isHasStampDuty() && lease.getStampDutyContract() != null) {
            // ── Stamp Duty annual rent ────────────────────────────────────────────
            StampDutyContract sd = lease.getStampDutyContract();
            paidToDate = sd.getPaymentPaidToDate() != null ? sd.getPaymentPaidToDate() : lease.getPaymentPaidToDate();
            utility = sd.getUtilityPayment() != null ? sd.getUtilityPayment() : BigDecimal.ZERO;
            BigDecimal fullPayment = sd.getStampDutyFullPayment() != null ? sd.getStampDutyFullPayment() : BigDecimal.ZERO;
            // totalYears uses contractEndDate inclusive
            long daysContract      = ChronoUnit.DAYS.between(startDate, lease.getContractEndDate().plusDays(1));
            BigDecimal totalYears  = BigDecimal.valueOf(daysContract).divide(DAYS_IN_YEAR, 10, RM);
            BigDecimal divisor     = totalYears.multiply(BigDecimal.valueOf(12)).setScale(6, RM);
            BigDecimal monthlyRent = divisor.compareTo(BigDecimal.ZERO) > 0
                    ? fullPayment.divide(divisor, SCALE, RM) : BigDecimal.ZERO;
            annualRent = monthlyRent.multiply(BigDecimal.valueOf(12)).setScale(SCALE, RM);
        } else {
            // ── Office Rent annual rent ───────────────────────────────────────────
            paidToDate = lease.getPaymentPaidToDate();
            utility = lease.getUtilityPayment() != null ? lease.getUtilityPayment() : BigDecimal.ZERO;
            BigDecimal priceAfterVat = lease.getMeterSquarePriceBeforeVat()
                    .multiply(BigDecimal.ONE.add(lease.getVatRate())).setScale(SCALE, RM);
            BigDecimal monthlyRent = lease.getMeterSquare().multiply(priceAfterVat).setScale(SCALE, RM);
            annualRent = monthlyRent.multiply(BigDecimal.valueOf(12)).setScale(SCALE, RM);
        }

        // ── Total Payment Paid to Date with ROUNDED yearWithFraction ─────────────
        BigDecimal yearWithFractionRounded = BigDecimal.ZERO;
        if (paidToDate != null && !paidToDate.isBefore(startDate)) {
            long paidDays = ChronoUnit.DAYS.between(startDate, paidToDate);
            yearWithFractionRounded = BigDecimal.valueOf(paidDays)
                    .divide(DAYS_IN_YEAR, 10, RM)
                    .setScale(2, RM);
        }
        BigDecimal totalPaid = annualRent.multiply(yearWithFractionRounded).add(utility).setScale(SCALE, RM);

        // ── Sum (dueForMonth + rentMinusDue) for each month before the target ────
        BigDecimal previousSum = BigDecimal.ZERO;
        java.time.YearMonth current = java.time.YearMonth.of(startDate.getYear(), startDate.getMonthValue());
        java.time.YearMonth target  = java.time.YearMonth.of(targetYear, targetMonth);
        StampDutyContract sdForBuild = stampDuty && lease.isHasStampDuty() ? lease.getStampDutyContract() : null;

        while (current.isBefore(target)) {
            AmortizationReportRow row = buildRow(lease, sdForBuild, current.getMonthValue(), current.getYear());
            BigDecimal contrib = row.getDueForMonth().add(row.getRentMinusDue());
            previousSum = previousSum.add(contrib);
            current = current.plusMonths(1);
        }

        BigDecimal suggested = totalPaid.subtract(previousSum).setScale(SCALE, RM);
        return suggested.max(BigDecimal.ZERO);
    }

    /**
     * Outstanding balance going INTO the requested month (i.e. end-of-prior-month balance).
     *
     * Non-recursive O(1) implementation:
     *  1. Find anchor: the most recent saved AmortizationEntry at or before the prior month.
     *  2. If no saved entry exists, use the contract's initialOutstandingBalance and its
     *     configured anchor month/year.
     *  3. Count the number of full months between the anchor and the prior month.
     *  4. Apply: balance = anchor_balance - (monthlyRent × N), clamped at 0.
     *     The first (partial) month uses the prorated rent instead of full monthly rent.
     *
     * This avoids the N-deep recursion that caused hangs for far-future years.
     */
    private BigDecimal resolveOutstandingPrior(LeaseContract lease, StampDutyContract sd,
                                                boolean isStampDuty, int month, int year) {
        LocalDate contractStart = lease.getContractStartDate();

        // ── Determine the registered anchor month/year and initial balance ──
        int initMonth = isStampDuty && sd.getInitialOutstandingBalanceMonth() != null
                ? sd.getInitialOutstandingBalanceMonth()
                : (lease.getInitialOutstandingBalanceMonth() != null
                        ? lease.getInitialOutstandingBalanceMonth()
                        : contractStart.getMonthValue());
        int initYear = isStampDuty && sd.getInitialOutstandingBalanceYear() != null
                ? sd.getInitialOutstandingBalanceYear()
                : (lease.getInitialOutstandingBalanceYear() != null
                        ? lease.getInitialOutstandingBalanceYear()
                        : contractStart.getYear());
        BigDecimal initBalance = isStampDuty
                ? (sd.getInitialOutstandingBalance() != null ? sd.getInitialOutstandingBalance() : BigDecimal.ZERO)
                : (lease.getInitialOutstandingBalance() != null ? lease.getInitialOutstandingBalance() : BigDecimal.ZERO);

        // ── 1. This IS the anchor month → return the registered initial balance ──
        if (year == initYear && month == initMonth) {
            return initBalance;
        }

        // ── Guard: requested period before anchor → return 0 ────────────────────
        LocalDate anchorDate      = LocalDate.of(initYear, initMonth, 1);
        LocalDate requestedPeriod = LocalDate.of(year, month, 1);
        if (requestedPeriod.isBefore(anchorDate)) {
            return BigDecimal.ZERO;
        }

        // Prior period (the month whose end-balance we need)
        int priorMonth = month == 1 ? 12 : month - 1;
        int priorYear  = month == 1 ? year - 1 : year;

        // ── 2. Look for the most recent saved entry at or before the prior month ──
        // Uses a proper @Query: (year < priorYear) OR (year = priorYear AND month <= priorMonth)
        // This correctly handles cross-year boundaries (old derived query was wrong for this).
        List<AmortizationEntry> savedList = isStampDuty
                ? entryRepo.findLatestSdEntryAtOrBefore(sd.getId(), priorYear, priorMonth)
                : entryRepo.findLatestOfficeEntryAtOrBefore(lease.getId(), priorYear, priorMonth);

        Optional<AmortizationEntry> latestSaved = savedList.isEmpty()
                ? Optional.empty() : Optional.of(savedList.get(0));

        // If the latest saved entry IS exactly the prior month, return it directly
        if (latestSaved.isPresent()) {
            AmortizationEntry e = latestSaved.get();
            if (e.getReportYear() == priorYear && e.getReportMonth() == priorMonth) {
                return e.getOutstandingBalanceEndOfMonth();
            }
            // Otherwise, use it as a closer anchor (it IS the end-of-that-month balance)
            // and walk forward from that saved month to priorMonth
            return applyMonthsForward(lease, sd, isStampDuty,
                    e.getOutstandingBalanceEndOfMonth(),
                    e.getReportMonth(), e.getReportYear(),
                    priorMonth, priorYear);
        }

        // ── 3. No saved entries at all – compute from the registered initial balance ──
        // initBalance is the outstanding PRIOR TO initMonth (end-of-previous-month).
        // We first apply the initMonth's own rent to get the end-of-initMonth balance,
        // then walk forward from there to priorMonth.
        // (Bug was here: previously passed initBalance directly, skipping initMonth's rent.)
        BigDecimal monthlyRentCalc = calcMonthlyRent(isStampDuty ? sd : null, lease);
        BigDecimal initMonthRent = isFirstMonth(lease.getContractStartDate(), initMonth, initYear)
                ? calcProratedRent(lease.getContractStartDate(), monthlyRentCalc)
                : monthlyRentCalc;

        // Determine whether the user explicitly recorded an END-OF-initMonth balance
        // (initMonth was set to a month OTHER than the contract start month/year).
        // When explicit: initBalance = end-of-initMonth → don't subtract rent.
        // When defaulted to contractStart: initBalance = entering-initMonth → subtract rent.
        boolean initIsExplicitPriorMonth =
                (isStampDuty && sd.getInitialOutstandingBalanceMonth() != null
                        && !(initMonth == contractStart.getMonthValue() && initYear == contractStart.getYear()))
                ||
                (!isStampDuty && lease.getInitialOutstandingBalanceMonth() != null
                        && !(initMonth == contractStart.getMonthValue() && initYear == contractStart.getYear()));

        BigDecimal initEndBalance;
        if (initIsExplicitPriorMonth) {
            // User recorded the END-OF-initMonth balance directly (e.g. "February outstanding")
            initEndBalance = initBalance;
        } else {
            // Default anchor = contract start month; initBalance = ENTERING that month
            initEndBalance = initBalance.subtract(initMonthRent).setScale(SCALE, RM).max(BigDecimal.ZERO);
        }

        // If priorMonth IS the anchor month, its ending balance is initEndBalance
        if (priorYear == initYear && priorMonth == initMonth) {
            return initEndBalance;
        }

        return applyMonthsForward(lease, sd, isStampDuty, initEndBalance, initMonth, initYear, priorMonth, priorYear);
    }

    /**
     * Starting from anchorEndBalance (the end-of-month balance at anchorMonth/anchorYear),
     * compute the end-of-month balance at targetMonth/targetYear by subtracting
     * monthlyRent for each month in between, clamping at 0.
     *
     * Uses the prorated rent for the first (partial) contract month.
     */
    private BigDecimal applyMonthsForward(LeaseContract lease, StampDutyContract sd,
                                           boolean isStampDuty,
                                           BigDecimal anchorEndBalance,
                                           int anchorMonth, int anchorYear,
                                           int targetMonth, int targetYear) {
        BigDecimal monthlyRent = calcMonthlyRent(isStampDuty ? sd : null, lease);
        BigDecimal balance = anchorEndBalance;

        // Walk month by month from the month AFTER the anchor to the target
        int curMonth = anchorMonth;
        int curYear  = anchorYear;

        while (!(curYear == targetYear && curMonth == targetMonth)) {
            // Advance one month
            curMonth++;
            if (curMonth > 12) { curMonth = 1; curYear++; }

            // Rent for this month (prorated only on the very first contract month)
            BigDecimal rent = isFirstMonth(lease.getContractStartDate(), curMonth, curYear)
                    ? calcProratedRent(lease.getContractStartDate(), monthlyRent)
                    : monthlyRent;

            balance = balance.subtract(rent).setScale(SCALE, RM).max(BigDecimal.ZERO);

            // Short-circuit once balance hits 0 (it can't go negative)
            if (balance.compareTo(BigDecimal.ZERO) == 0) break;
        }
        return balance;
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
     * The initialOutstandingBalance is computed for the LAST MONTH of the contract
     * (paymentPaidToDate month/year, or contractEndDate if not set) by calling buildRow
     * for that month and reading outstandingBalanceEndOfMonth. This is correct regardless
     * of whether the user has saved entries for every intermediate month.
     */
    @Transactional(readOnly = true)
    public com.zemenbank.amortization.dto.RenewalPrefillDto getRenewalPrefill(Long leaseId) {
        LeaseContract lease = leaseRepo.findById(leaseId)
                .orElseThrow(() -> new RuntimeException("Lease not found: " + leaseId));

        // ── Determine the last month of this contract's amortization period ──
        // We want the balance at the END of the last amortization month.
        // paymentPaidToDate (e.g. Mar 20 2028) means the contract covers up to that date.
        // The LAST full month with a balance is the month OF paidToDate.
        // BUT the outstanding we carry to the new contract is the balance PRIOR to
        // the new contract's first month (e.g. February 2028 if new starts Mar 21 2028).
        // Therefore we use the month BEFORE paidToDate as the snapshot month.
        LocalDate officeEnd = lease.getPaymentPaidToDate() != null
                ? lease.getPaymentPaidToDate() : lease.getContractEndDate();
        // Prior month = month before paidToDate
        java.time.YearMonth officeSnap = java.time.YearMonth.from(officeEnd).minusMonths(1);
        int lastMonth = officeSnap.getMonthValue();
        int lastYear  = officeSnap.getYear();

        // Compute the outstanding balance at the end of that prior month
        AmortizationReportRow lastRow = buildRow(lease, null, lastMonth, lastYear);
        BigDecimal endingBalance = lastRow.getOutstandingBalanceEndOfMonth();

        // Stamp duty
        BigDecimal sdEndingBalance = BigDecimal.ZERO;
        Integer sdEndMonth = null;
        Integer sdEndYear  = null;
        if (lease.isHasStampDuty() && lease.getStampDutyContract() != null) {
            StampDutyContract sd = lease.getStampDutyContract();
            LocalDate sdPaid = sd.getPaymentPaidToDate() != null ? sd.getPaymentPaidToDate() : officeEnd;
            // Same logic: use the month before paidToDate
            java.time.YearMonth sdSnap = java.time.YearMonth.from(sdPaid).minusMonths(1);
            sdEndMonth = sdSnap.getMonthValue();
            sdEndYear  = sdSnap.getYear();
            AmortizationReportRow sdLastRow = buildRow(lease, sd, sdEndMonth, sdEndYear);
            sdEndingBalance = sdLastRow.getOutstandingBalanceEndOfMonth();
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
                .previousEndingMonth(lastMonth)
                .previousEndingYear(lastYear)
                .hasStampDuty(lease.isHasStampDuty())
                .sdPreviousEndingOutstandingBalance(sdEndingBalance)
                .sdPreviousEndingMonth(sdEndMonth)
                .sdPreviousEndingYear(sdEndYear)
                .build();
    }
}
