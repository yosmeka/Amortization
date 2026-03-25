package com.zemenbank.amortization.repository;

import com.zemenbank.amortization.entity.LeaseContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Repository
public interface LeaseContractRepository extends JpaRepository<LeaseContract, Long> {
    List<LeaseContract> findByBranchCodeContainingIgnoreCase(String branchCode);
    List<LeaseContract> findByBranchNameContainingIgnoreCase(String branchName);

    /**
     * Returns the IDs of all contracts that have been superseded by a renewal.
     * A contract is superseded when another contract has previousContractId = its ID
     * AND the successor's contractStartDate is on or before the report period start.
     * These contracts must be hidden from the monthly report for that period.
     */
    @Query("SELECT l.previousContractId FROM LeaseContract l " +
           "WHERE l.previousContractId IS NOT NULL " +
           "AND l.contractStartDate <= :reportPeriodStart")
    Set<Long> findSupersededContractIds(@Param("reportPeriodStart") LocalDate reportPeriodStart);
}
