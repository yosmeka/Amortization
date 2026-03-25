package com.zemenbank.amortization.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Full response DTO containing all 22 Excel columns for a single row in the monthly report.
 */
@Data
public class AmortizationReportRow {

    private Long leaseContractId;
    private boolean stampDutyRow;   // true = this row represents the stamp duty line

    // === Columns 1-4 ===
    private String branchName;
    private String branchCode;
    private String ownerName;
    private String categoryOfRent;   // ATM / Branch Office / Head Office / etc.


    // === Column 4-5 ===
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;

    // === Column 6: Total Number of Years ===
    private BigDecimal totalNumberOfYears;

    // === Column 7: Payment Paid to Date (date) ===
    private LocalDate paymentPaidToDate;

    // === Column 8: Year with Fraction ===
    private BigDecimal yearWithFraction;

    // === Column 9-10 ===
    private BigDecimal meterSquare;
    private BigDecimal meterSquarePriceBeforeVat;

    // === Column 11: Meter Square Price After VAT ===
    private BigDecimal meterSquarePriceAfterVat;

    // === Column 12: Monthly Rent Payment with VAT ===
    private BigDecimal monthlyRentWithVat;

    // === Column 13: Total Annual Rent Amount ===
    private BigDecimal totalAnnualRentAmount;

    // === Column 14: Utility Payment / Service Charge ===
    private BigDecimal utilityPayment;

    // === Column 15: Full Payment / Total Contract Payment ===
    private BigDecimal fullPayment;

    // === Column 16: Total Payment Paid to Date ===
    private BigDecimal totalPaymentPaidToDate;

    // === Column 16b: Remaining Payment as per contract ===
    private BigDecimal remainingPayment;

    // === Column 17: Outstanding Balance as of prior month ===
    private BigDecimal outstandingBalancePriorMonth;

    // === Column 18: Rent Expense amount for the month (pro-rated in first month) ===
    private BigDecimal rentExpenseForMonth;

    // === Column 19: Total (office + stamp duty rent expense) ===
    private BigDecimal total;

    // === Column 20: Due for the month (manually entered) ===
    private BigDecimal dueForMonth;

    // === Column 21: Prepaid Office Rent for the month (manually entered) ===
    private BigDecimal prepaidOfficeRent;

    // === Column 22: Outstanding Balance end of month ===
    private BigDecimal outstandingBalanceEndOfMonth;

    // === Additional unscheduled expense (reduces outstanding balance) ===
    private BigDecimal additionalExpense;

    // === Day of month (1–31) this entry applies to ===
    private Integer entryDay;

    // === Whether due-for-month was manually overridden ===
    private boolean dueForMonthOverridden;

    // === Whether rent expense was manually overridden ===
    private boolean rentExpenseOverridden;

    // === Report period ===
    private int reportMonth;
    private int reportYear;

    // Is this the first month of the contract? (to flag pro-rated calculation)
    private boolean firstMonth;

    // === New: Rent Expense for Month − Due for Month ===
    // Uses rentExpenseForMonth (prorated in first month / merged in overlap month)
    private BigDecimal rentMinusDue;
}
