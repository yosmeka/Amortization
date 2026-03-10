package com.zemenbank.amortization.repository;

import com.zemenbank.amortization.entity.LeaseContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaseContractRepository extends JpaRepository<LeaseContract, Long> {
    List<LeaseContract> findByBranchCodeContainingIgnoreCase(String branchCode);
    List<LeaseContract> findByBranchNameContainingIgnoreCase(String branchName);
}
