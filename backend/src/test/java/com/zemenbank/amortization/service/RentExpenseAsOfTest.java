package com.zemenbank.amortization.service;

import com.zemenbank.amortization.dto.AmortizationReportRow;
import com.zemenbank.amortization.dto.LeaseContractRequest;
import com.zemenbank.amortization.entity.AmortizationEntry;
import com.zemenbank.amortization.entity.LeaseContract;
import com.zemenbank.amortization.enums.ApprovalStatus;
import com.zemenbank.amortization.repository.AmortizationEntryRepository;
import com.zemenbank.amortization.repository.LeaseContractRepository;
import com.zemenbank.amortization.repository.StampDutyContractRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class RentExpenseAsOfTest {

    @Mock
    private LeaseContractRepository leaseRepo;

    @Mock
    private StampDutyContractRepository stampRepo;

    @Mock
    private AmortizationEntryRepository entryRepo;

    @InjectMocks
    private AmortizationService amortizationService;

    private LeaseContract contract;

    @BeforeEach
    void setUp() {
        contract = LeaseContract.builder()
                .id(1L)
                .branchName("Main Branch")
                .branchCode("001")
                .ownerName("Landlord A")
                .categoryOfRent("Office")
                .contractStartDate(LocalDate.of(2025, 7, 1))
                .contractEndDate(LocalDate.of(2026, 6, 20))
                .paymentPaidToDate(LocalDate.of(2026, 6, 20))
                .meterSquare(new BigDecimal("100"))
                .meterSquarePriceBeforeVat(new BigDecimal("80.00"))
                .vatRate(BigDecimal.ZERO)
                .initialOutstandingBalance(new BigDecimal("92000.00000000"))
                .initialOutstandingBalanceMonth(7)
                .initialOutstandingBalanceYear(2025)
                .approvalStatus(ApprovalStatus.APPROVED)
                .hasStampDuty(false)
                .hasUtilityPayment(false)
                .build();

        lenient().when(leaseRepo.findAll()).thenReturn(List.of(contract));
        lenient().when(leaseRepo.findSupersededContractIds(any())).thenReturn(Collections.emptySet());
        lenient().when(entryRepo.findAll()).thenReturn(Collections.emptyList());
    }

    @Test
    void testPrepaidPeriod_May2026() {
        List<AmortizationReportRow> rows = amortizationService.generateReport(5, 2026, null);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        AmortizationReportRow row = rows.get(0);

        assertEquals(0, BigDecimal.ZERO.compareTo(row.getDueForMonth()), "May 2026 due should be 0");
        assertEquals(0, new BigDecimal("8000.00000000").compareTo(row.getRentExpenseForMonth()), "May 2026 rent expense should be 8000");
        assertEquals(0, new BigDecimal("8000.00000000").compareTo(row.getRentExpenseAsOf()), "Rent Expense As Of should be 8000 in prepaid month");
        assertEquals(0, BigDecimal.ZERO.compareTo(row.getDueAsOf()), "Due As Of should be 0 when no due");
    }

    @Test
    void testContractEndMonth_June2026_PartialDue() {
        List<AmortizationReportRow> rows = amortizationService.generateReport(6, 2026, null);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        AmortizationReportRow row = rows.get(0);

        assertEquals(0, new BigDecimal("4000.00000000").compareTo(row.getOutstandingBalancePriorMonth()), "June prior balance should be 4000");
        assertEquals(0, new BigDecimal("8000.00000000").compareTo(row.getRentExpenseForMonth()), "June rent expense should be 8000");
        assertEquals(0, new BigDecimal("4000.00000000").compareTo(row.getDueForMonth()), "June due should be 4000");

        // Rent Expense As Of remains untouched (uses rent expense 8000 per previous behavior)
        assertEquals(0, new BigDecimal("8000.00000000").compareTo(row.getRentExpenseAsOf()), "Rent Expense As Of untouched");

        // The NEW Due As Of column depends on Due and sums up the due (4000)
        assertEquals(0, new BigDecimal("4000.00000000").compareTo(row.getDueAsOf()),
                "Due As Of in June should be 4,000 (the due balance)");
    }

    @Test
    void testPostContractExpiry_July2026_AccumulatesDues() {
        List<AmortizationReportRow> rows = amortizationService.generateReport(7, 2026, null);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        AmortizationReportRow row = rows.get(0);

        assertEquals(0, new BigDecimal("8000.00000000").compareTo(row.getDueForMonth()), "July due should be 8000");
        // Due As Of accumulates June (4000) + July (8000) = 12000
        assertEquals(0, new BigDecimal("12000.00000000").compareTo(row.getDueAsOf()),
                "Due As Of in July should accumulate June (4,000) + July (8,000) = 12,000");
    }

    @Test
    void testPostContractExpiry_August2026_ContinuesAccumulatingDues() {
        List<AmortizationReportRow> rows = amortizationService.generateReport(8, 2026, null);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        AmortizationReportRow row = rows.get(0);

        assertEquals(0, new BigDecimal("8000.00000000").compareTo(row.getDueForMonth()), "August due should be 8000");
        // Due As Of accumulates June (4000) + July (8000) + August (8000) = 20000
        assertEquals(0, new BigDecimal("20000.00000000").compareTo(row.getDueAsOf()),
                "Due As Of in August should accumulate June (4,000) + July (8,000) + August (8,000) = 20,000");
    }

    @Test
    void testPrepaidFilledAfterDue_DueAsOfResetsToZeroAndAccumulatesLater() {
        // Contract has contractEndDate 2026-06-20.
        // June 2026 has due 4,000 -> Due As Of is 4,000.
        List<AmortizationReportRow> juneRows = amortizationService.generateReport(6, 2026, null);
        assertEquals(0, new BigDecimal("4000.00000000").compareTo(juneRows.get(0).getDueAsOf()));

        // In July 2026, tenant pays prepaid of 8,000 (covering July).
        AmortizationEntry julyEntry = AmortizationEntry.builder()
                .leaseContract(contract)
                .reportMonth(7)
                .reportYear(2026)
                .stampDuty(false)
                .utility(false)
                .prepaidOfficeRent(new BigDecimal("8000.00000000"))
                .build();
        lenient().when(entryRepo.findAll()).thenReturn(List.of(julyEntry));

        // In July 2026: due is 0. Due As Of in July MUST BE 0 (NOT carrying June's 4,000!).
        List<AmortizationReportRow> julyRows = amortizationService.generateReport(7, 2026, null);
        assertEquals(0, BigDecimal.ZERO.compareTo(julyRows.get(0).getDueForMonth()), "July due should be 0");
        assertEquals(0, BigDecimal.ZERO.compareTo(julyRows.get(0).getDueAsOf()),
                "Due As Of in July must be 0 because prepaid was filled and due is 0");

        // In August 2026: no further prepaid entered, so August has due of 8,000.
        // Due As Of should start fresh at 8,000 (equal to August's due, not including June).
        List<AmortizationReportRow> augRows = amortizationService.generateReport(8, 2026, null);
        assertEquals(0, new BigDecimal("8000.00000000").compareTo(augRows.get(0).getDueForMonth()), "August due should be 8000");
        assertEquals(0, new BigDecimal("8000.00000000").compareTo(augRows.get(0).getDueAsOf()),
                "Due As Of in August should be 8,000 (starts fresh after 0 due month)");

        // In September 2026: due is 8,000 again.
        // Due As Of accumulates August (8,000) + Sept (8,000) = 16,000.
        List<AmortizationReportRow> septRows = amortizationService.generateReport(9, 2026, null);
        assertEquals(0, new BigDecimal("8000.00000000").compareTo(septRows.get(0).getDueForMonth()), "Sept due should be 8000");
        assertEquals(0, new BigDecimal("16000.00000000").compareTo(septRows.get(0).getDueAsOf()),
                "Due As Of in Sept should accumulate August (8,000) + Sept (8,000) = 16,000");
    }

    @Test
    void testRegisterLease_InheritsBoxFileNoFromPreviousContractWhenBlank() {
        LeaseContract oldContract = LeaseContract.builder()
                .id(99L)
                .boxFileNo("BOX-1234")
                .build();
        lenient().when(leaseRepo.findById(99L)).thenReturn(Optional.of(oldContract));
        lenient().when(leaseRepo.save(any(LeaseContract.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LeaseContractRequest req = new LeaseContractRequest();
        req.setBranchName("Test Branch");
        req.setBranchCode("001");
        req.setOwnerName("Landlord X");
        req.setPreviousContractId(99L);
        req.setBoxFileNo(""); // Blank box file no

        LeaseContract saved = amortizationService.registerLease(req);
        assertEquals("BOX-1234", saved.getBoxFileNo(), "Should inherit previous contract's Box File No");
    }

    @Test
    void testPricePerMeterSquare_SupportsFourDecimalPlaces() {
        contract.setMeterSquare(new BigDecimal("100.00"));
        contract.setMeterSquarePriceBeforeVat(new BigDecimal("80.1234"));
        contract.setVatRate(new BigDecimal("0.1500"));

        List<AmortizationReportRow> rows = amortizationService.generateReport(5, 2026, null);
        assertNotNull(rows);
        assertFalse(rows.isEmpty());
        AmortizationReportRow row = rows.get(0);

        assertEquals(new BigDecimal("80.1234"), row.getMeterSquarePriceBeforeVat(), "Price before VAT should retain 4 decimal places");
        // 80.1234 * 1.15 = 92.14191 -> 92.1419 with 4 decimals
        assertEquals(new BigDecimal("92.1419"), row.getMeterSquarePriceAfterVat(), "Price after VAT should be rounded to 4 decimal places");
        // Monthly rent with VAT: 92.1419 * 100.00 = 9214.1900
        assertEquals(new BigDecimal("9214.1900"), row.getMonthlyRentWithVat(), "Monthly rent with VAT should be rounded to 4 decimal places");
    }
}
