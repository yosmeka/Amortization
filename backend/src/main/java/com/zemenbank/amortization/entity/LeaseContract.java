package com.zemenbank.amortization.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a Rent Lease Contract (Office Rent).
 * All calculated/derived columns from the Excel report are computed at runtime.
 */
@Entity
@Table(name = "lease_contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaseContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // === Column 1 – Branch Name ===
    @Column(nullable = false)
    private String branchName;

    // === Column 2 – Branch Code ===
    @Column(nullable = false)
    private String branchCode;

    // === Column 3 – Owner Name ===
    @Column(nullable = false)
    private String ownerName;

    // === Column 4 – Contract Start Date ===
    @Column(nullable = false)
    private LocalDate contractStartDate;

    // === Column 5 – Contract End Date ===
    @Column(nullable = false)
    private LocalDate contractEndDate;

    // === Column 7 – Payment Paid to Date (the date up to which rent is paid/prepaid) ===
    private LocalDate paymentPaidToDate;

    // === Column 9 – Meter Square ===
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal meterSquare;

    // === Column 10 – Meter Square Price Before VAT ===
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal meterSquarePriceBeforeVat;

    // === Column 11 – VAT Rate (default 15%) ===
    @Column(nullable = false, precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal vatRate = new BigDecimal("0.15");

    // === Column 14 – Utility Payment / Service Charge ===
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal utilityPayment = BigDecimal.ZERO;

    // === Outstanding Balance at prior month of contract start (manually entered on first registration) ===
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal initialOutstandingBalance = BigDecimal.ZERO;

    /**
     * The month (1-12) and year for which initialOutstandingBalance is recorded.
     * When null, defaults to the contract start month/year.
     * Allows anchoring the balance to any historical month rather than only the start.
     */
    private Integer initialOutstandingBalanceMonth;
    private Integer initialOutstandingBalanceYear;

    // === Whether this contract has a stamp duty component ===
    @Builder.Default
    private boolean hasStampDuty = false;

    // --- Lessor Info ---
    private String lessorName1;
    private String lessorName2;
    private String lessorName3;
    private String tinNumber;
    private String contactInfo1;
    private String contactInfo2;
    private String contactInfo3;
    private String accountNumber;
    private String taxCategory;   // "TOT" or "VAT"

    // --- Location Info ---
    private String region;
    private String categoryOfRent; // "ATM", "Outline & city", etc.

    // --- Payment Info ---
    private String prepaymentTill;
    private String paymentModality; // "monthly", "quarterly", "semi-annual", "annually"
    private String discountRate;    // "15%" or "7%"

    // --- Relationships ---
    @OneToOne(mappedBy = "leaseContract", cascade = CascadeType.ALL, orphanRemoval = true)
    private StampDutyContract stampDutyContract;

    @JsonIgnore
    @OneToMany(mappedBy = "leaseContract", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AmortizationEntry> amortizationEntries = new ArrayList<>();

    /**
     * If this contract is a renewal, points to the previous period's contract ID.
     * The initialOutstandingBalance of this contract should be set to the previous
     * period's last outstandingBalanceEndOfMonth.
     */
    private Long previousContractId;
}
