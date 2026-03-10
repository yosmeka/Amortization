package com.zemenbank.amortization.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Stamp Duty contract linked to a LeaseContract.
 * Has identical calculated columns as the office rent,
 * and appears as a separate row in the monthly report.
 */
@Entity
@Table(name = "stamp_duty_contracts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StampDutyContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "lease_contract_id", nullable = false)
    private LeaseContract leaseContract;

    // === Stamp Duty specific payment fields ===
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal meterSquare;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal meterSquarePriceBeforeVat;

    @Column(nullable = false, precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal vatRate = new BigDecimal("0.15");

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal utilityPayment = BigDecimal.ZERO;

    /**
     * Full Payment / Total Contract Payment for stamp duty.
     * Monthly Rent (no VAT) = stampDutyFullPayment / (totalYears × 12)
     */
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal stampDutyFullPayment = BigDecimal.ZERO;

    // Manually entered outstanding balance as of prior month of contract start
    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal initialOutstandingBalance = BigDecimal.ZERO;

    /** Anchor month (1-12) and year for the initialOutstandingBalance. Null = contract start. */
    private Integer initialOutstandingBalanceMonth;
    private Integer initialOutstandingBalanceYear;

    // Payment paid to date (date up to which stamp duty payment has been made)
    private LocalDate paymentPaidToDate;

    @JsonIgnore
    @OneToMany(mappedBy = "stampDutyContract", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AmortizationEntry> amortizationEntries = new ArrayList<>();
}

