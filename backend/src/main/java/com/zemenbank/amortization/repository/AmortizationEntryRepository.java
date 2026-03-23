package com.zemenbank.amortization.repository;

import com.zemenbank.amortization.entity.AmortizationEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * Most recent saved entry at or before (targetMonth, targetYear) for an office rent contract.
     * Uses proper year/month boundary: (year < targetYear) OR (year = targetYear AND month <= targetMonth).
     * The old Spring Data derived query was wrong: it used AND between year and month conditions
     * which excluded e.g. October 2025 entries when searching for "before February 2026".
     */
    @Query("SELECT e FROM AmortizationEntry e " +
           "WHERE e.leaseContract.id = :leaseId " +
           "AND e.stampDuty = false " +
           "AND (e.reportYear < :year OR (e.reportYear = :year AND e.reportMonth <= :month)) " +
           "ORDER BY e.reportYear DESC, e.reportMonth DESC")
    List<AmortizationEntry> findLatestOfficeEntryAtOrBefore(
            @Param("leaseId") Long leaseId,
            @Param("year") int year,
            @Param("month") int month);

    /**
     * Most recent saved entry at or before (targetMonth, targetYear) for a stamp duty contract.
     */
    @Query("SELECT e FROM AmortizationEntry e " +
           "WHERE e.stampDutyContract.id = :sdId " +
           "AND e.stampDuty = true " +
           "AND (e.reportYear < :year OR (e.reportYear = :year AND e.reportMonth <= :month)) " +
           "ORDER BY e.reportYear DESC, e.reportMonth DESC")
    List<AmortizationEntry> findLatestSdEntryAtOrBefore(
            @Param("sdId") Long sdId,
            @Param("year") int year,
            @Param("month") int month);

    // Most recent saved entry for a lease (any month) – used for renewal prefill
    Optional<AmortizationEntry> findTopByLeaseContractIdAndStampDutyFalseOrderByReportYearDescReportMonthDesc(
            Long leaseContractId);

    Optional<AmortizationEntry> findTopByStampDutyContractIdAndStampDutyTrueOrderByReportYearDescReportMonthDesc(
            Long stampDutyContractId);

    /**
     * Returns the FIRST (chronologically earliest) saved entry where prepaidOfficeRent > 0
     * for the given office-rent contract, at or before (month, year).
     * If this list is non-empty, the rate has already switched to the new contract rate.
     * If empty, the old contract rate should still be used.
     */
    @Query("SELECT e FROM AmortizationEntry e " +
           "WHERE e.leaseContract.id = :leaseId " +
           "AND e.stampDuty = false " +
           "AND e.prepaidOfficeRent > 0 " +
           "AND (e.reportYear < :year OR (e.reportYear = :year AND e.reportMonth <= :month)) " +
           "ORDER BY e.reportYear ASC, e.reportMonth ASC")
    List<AmortizationEntry> findFirstPrepaidOfficeEntryAtOrBefore(
            @Param("leaseId") Long leaseId,
            @Param("year") int year,
            @Param("month") int month);
}
