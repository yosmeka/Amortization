package com.zemenbank.amortization.repository;

import com.zemenbank.amortization.entity.StampDutyContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StampDutyContractRepository extends JpaRepository<StampDutyContract, Long> {
    Optional<StampDutyContract> findByLeaseContractId(Long leaseContractId);
}
