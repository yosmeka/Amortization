package com.zemenbank.amortization.dto;

import lombok.Data;
import java.util.List;

@Data
public class BoxFileNoAssignmentRequest {
    private List<Long> leaseContractIds;
    private String boxFileNo;
}
