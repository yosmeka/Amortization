package com.zemenbank.amortization.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for registering a new lease contract (office rent).
 * Stamp duty details are nested inside if hasStampDuty = true.
 */
@Data
public class LeaseContractRequest {

    // Location info
    private String branchName;
    private String branchCode;
    private String region;
    private String categoryOfRent;

    // Lessor info
    private String lessorName1;
    private String lessorName2;
    private String lessorName3;
    private String tinNumber;
    private String contactInfo1;
    private String contactInfo2;
    private String contactInfo3;
    private String accountNumber;
    private String taxCategory;

    // Payment info
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate contractStartDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate contractEndDate;

    private String prepaymentTill;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate paymentPaidToDate;

    private BigDecimal meterSquare;
    private BigDecimal meterSquarePriceBeforeVat;
    private BigDecimal vatRate;                  // default 0.15
    private BigDecimal utilityPayment;
    private String paymentModality;
    private String discountRate;
    private String ownerName;

    // Outstanding balance as of prior month of contract start date (manually entered)
    private BigDecimal initialOutstandingBalance;
    /** Month (1-12) and year for which initialOutstandingBalance is recorded. Null = contract start. */
    private Integer initialOutstandingBalanceMonth;
    private Integer initialOutstandingBalanceYear;

    /** If this is a contract renewal, the ID of the preceding period's contract. */
    private Long previousContractId;

    // Whether this contract also has a stamp duty component
    private boolean hasStampDuty;

    // Stamp duty sub-details (only used when hasStampDuty = true)
    private StampDutyRequest stampDuty;

    @Data
    public static class StampDutyRequest {
        private BigDecimal meterSquare;
        private BigDecimal meterSquarePriceBeforeVat;
        private BigDecimal vatRate;
        private BigDecimal utilityPayment;
        private BigDecimal initialOutstandingBalance;
        /** Anchor month (1-12) and year for stamp duty outstanding balance. Null = contract start. */
        private Integer initialOutstandingBalanceMonth;
        private Integer initialOutstandingBalanceYear;

        /** Full Payment / Total Contract Payment for the stamp duty component */
        private BigDecimal stampDutyFullPayment;

        @JsonFormat(pattern = "yyyy-MM-dd")
        private LocalDate paymentPaidToDate;
    }
}

