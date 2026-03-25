package com.zemenbank.amortization.controller;

import com.zemenbank.amortization.dto.AmortizationReportRow;
import com.zemenbank.amortization.entity.AmortizationEntry;
import com.zemenbank.amortization.service.AmortizationService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/amortization")
@RequiredArgsConstructor
public class AmortizationController {

    private final AmortizationService amortizationService;

    /**
     * GET /api/amortization/report?month=10&year=2025[&category=ATM]
     */
    @GetMapping("/report")
    public ResponseEntity<List<AmortizationReportRow>> getReport(
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(amortizationService.generateReport(month, year, category));
    }

    /**
     * POST /api/amortization/entries
     * Save/update manually-entered values for a specific lease row.
     *   - rentExpenseForMonth  — null = auto-calculate, non-null = override
     *   - dueForMonth          — manually entered
     *   - prepaidOfficeRent    — manually entered
     *   - additionalExpense    — unscheduled extra expense; subtracts from outstanding
     *   - entryDay             — day of month (1–31) this edit applies to
     */
    @PostMapping("/entries")
    public ResponseEntity<AmortizationEntry> saveEntry(@RequestBody EntryRequest req) {
        AmortizationEntry saved = amortizationService.saveEntry(
                req.getLeaseId(),
                req.isStampDuty(),
                req.getMonth(),
                req.getYear(),
                req.getRentExpenseForMonth(),
                req.getDueForMonth(),
                req.getPrepaidOfficeRent(),
                req.getAdditionalExpense() != null ? req.getAdditionalExpense() : BigDecimal.ZERO,
                req.getEntryDay()
        );
        return ResponseEntity.ok(saved);
    }

    /**
     * GET /api/amortization/prepaid-suggestion?leaseId=1&month=12&year=2026[&stampDuty=true]
     * Returns the suggested Prepaid Office/StampDuty Rent for the given month.
     * Formula: TotalPaymentPaidToDate(rounded) − Σ(dueForMonth + rentMinusDue) of prior months
     */
    @GetMapping("/prepaid-suggestion")
    public ResponseEntity<java.util.Map<String, Object>> getPrepaidSuggestion(
            @RequestParam Long leaseId,
            @RequestParam int month,
            @RequestParam int year,
            @RequestParam(required = false, defaultValue = "false") boolean stampDuty) {
        java.math.BigDecimal suggestion = amortizationService.calculatePrepaidSuggestion(leaseId, stampDuty, month, year);
        return ResponseEntity.ok(java.util.Map.of("suggestedPrepaid", suggestion));
    }

    @Data
    public static class EntryRequest {
        private Long leaseId;
        private boolean stampDuty;
        private int month;
        private int year;
        /** Null = auto-calculate; non-null = override rent expense */
        private BigDecimal rentExpenseForMonth;
        private BigDecimal dueForMonth;
        private BigDecimal prepaidOfficeRent;
        private BigDecimal additionalExpense;
        private Integer entryDay;
    }
}
