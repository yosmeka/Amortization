package com.zemenbank.amortization.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;

/**
 * Stores per-month amortization data for a lease contract (office or stamp duty).
 */
@Entity
@Table(name = "amortization_entries",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"lease_contract_id", "is_stamp_duty", "report_month", "report_year"})
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmortizationEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "lease_contract_id", nullable = false)
    private LeaseContract leaseContract;

    // null when this entry belongs to the office lease; set when it belongs to the stamp duty
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "stamp_duty_contract_id")
    private StampDutyContract stampDutyContract;

    @Column(name = "is_stamp_duty", nullable = false)
    @Builder.Default
    private boolean stampDuty = false;

    @Column(name = "report_month", nullable = false)
    private int reportMonth;  // 1..12

    @Column(name = "report_year", nullable = false)
    private int reportYear;

    /** Day of month (1–31) this entry applies to, as entered by the user. Null = unspecified. */
    private Integer entryDay;

    // === Column 17: Outstanding Balance as of prior month ===
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal outstandingBalancePriorMonth = BigDecimal.ZERO;

    /**
     * Column 18 – Rent Expense for the month.
     * When rentExpenseOverridden = true, this stored value is used instead of the auto-calculation.
     */
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal rentExpenseForMonth = BigDecimal.ZERO;

    /** True when the user has manually overridden the rent expense for this month. */
    @Builder.Default
    private boolean rentExpenseOverridden = false;

    // === Column 20: Due for the month ===
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal dueForMonth = BigDecimal.ZERO;

    /** True when the user has manually set the due amount (overrides the auto golden-rule value). */
    @Builder.Default
    private boolean dueForMonthOverridden = false;

    // === Column 21: Prepaid Office Rent for the month – manually entered ===
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal prepaidOfficeRent = BigDecimal.ZERO;

    /**
     * Additional unscheduled expense for this month (not part of the normal rent schedule).
     * Subtracts from the outstanding balance alongside rent expense.
     */
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal additionalExpense = BigDecimal.ZERO;

    // === Column 22: Outstanding Balance end of month ===
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal outstandingBalanceEndOfMonth = BigDecimal.ZERO;
}
