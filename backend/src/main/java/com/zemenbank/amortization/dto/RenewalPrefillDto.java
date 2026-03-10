package com.zemenbank.amortization.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

/**
 * Prefill data returned when the user clicks "Renew" on a lease contract.
 * Contains branch/lessor info (to copy into the new period form) and the
 * last saved outstanding balance (to pre-fill as the new period's initial balance).
 */
@Data
@Builder
public class RenewalPrefillDto {

    private Long previousContractId;

    // === Branch / location info (copied from the old contract) ===
    private String branchName;
    private String branchCode;
    private String region;
    private String categoryOfRent;

    // === Lessor info ===
    private String ownerName;
    private String lessorName1;
    private String lessorName2;
    private String lessorName3;
    private String tinNumber;
    private String contactInfo1;
    private String contactInfo2;
    private String contactInfo3;
    private String accountNumber;
    private String taxCategory;

    // === Payment modality ===
    private String paymentModality;
    private String discountRate;

    // === Ending balance of the previous period ===
    /** The last saved outstandingBalanceEndOfMonth from the previous period. */
    private BigDecimal previousEndingOutstandingBalance;
    /** Month (1-12) of the last saved entry. */
    private Integer previousEndingMonth;
    /** Year of the last saved entry. */
    private Integer previousEndingYear;

    // === Has stamp duty? ===
    private boolean hasStampDuty;

    // === Stamp duty ending balance ===
    private BigDecimal sdPreviousEndingOutstandingBalance;
    private Integer sdPreviousEndingMonth;
    private Integer sdPreviousEndingYear;
}
