package com.zemenbank.amortization.dto;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

/**
 * Returned by POST /api/leases/upload after processing an Excel file.
 */
@Data
public class BulkUploadResult {

    private int totalRows;
    private int successCount;
    private int errorCount;
    private List<RowError> errors = new ArrayList<>();

    @Data
    public static class RowError {
        private int rowNumber;        // 1-based (excluding header)
        private String branchName;
        private String message;

        public RowError(int rowNumber, String branchName, String message) {
            this.rowNumber  = rowNumber;
            this.branchName = branchName;
            this.message    = message;
        }
    }
}
