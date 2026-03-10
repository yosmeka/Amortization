package com.zemenbank.amortization.repository;

import com.zemenbank.amortization.entity.AmortizationEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AmortizationEntryRepository extends JpaRepository<AmortizationEntry, Long> {

    List<AmortizationEntry> findByReportMonthAndReportYear(int month, int year);

    Optional<AmortizationEntry> findByLeaseContractIdAndStampDutyFalseAndReportMonthAndReportYear(
            Long leaseContractId, int month, int year);

    Optional<AmortizationEntry> findByStampDutyContractIdAndStampDutyTrueAndReportMonthAndReportYear(
            Long stampDutyContractId, int month, int year);

    // Most recent entry before a given period (for outstanding balance carry-forward)
    Optional<AmortizationEntry> findTopByLeaseContractIdAndStampDutyFalseAndReportYearLessThanEqualAndReportMonthLessThanOrderByReportYearDescReportMonthDesc(
            Long leaseContractId, int year, int month);

    Optional<AmortizationEntry> findTopByStampDutyContractIdAndStampDutyTrueAndReportYearLessThanEqualAndReportMonthLessThanOrderByReportYearDescReportMonthDesc(
            Long stampDutyContractId, int year, int month);
    // Most recent saved entry for a lease (any month) – used for renewal prefill
    Optional<AmortizationEntry> findTopByLeaseContractIdAndStampDutyFalseOrderByReportYearDescReportMonthDesc(
            Long leaseContractId);

    Optional<AmortizationEntry> findTopByStampDutyContractIdAndStampDutyTrueOrderByReportYearDescReportMonthDesc(
            Long stampDutyContractId);
}
