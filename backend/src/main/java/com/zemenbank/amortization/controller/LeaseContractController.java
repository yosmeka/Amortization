package com.zemenbank.amortization.controller;

import com.zemenbank.amortization.dto.BulkUploadResult;
import com.zemenbank.amortization.dto.LeaseContractRequest;
import com.zemenbank.amortization.entity.LeaseContract;
import com.zemenbank.amortization.repository.LeaseContractRepository;
import com.zemenbank.amortization.service.AmortizationService;
import com.zemenbank.amortization.service.ExcelImportService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.List;

@RestController
@RequestMapping("/api/leases")
@RequiredArgsConstructor
public class LeaseContractController {

    private final AmortizationService amortizationService;
    private final LeaseContractRepository leaseRepo;
    private final ExcelImportService excelImportService;

    /** Register a new lease contract (with optional stamp duty) */
    @PostMapping
    public ResponseEntity<LeaseContract> createLease(@RequestBody LeaseContractRequest request) {
        LeaseContract saved = amortizationService.registerLease(request);
        return ResponseEntity.ok(saved);
    }

    /** List all lease contracts */
    @GetMapping
    public ResponseEntity<List<LeaseContract>> getAllLeases() {
        return ResponseEntity.ok(leaseRepo.findAll());
    }

    /** Get a single lease contract by ID */
    @GetMapping("/{id}")
    public ResponseEntity<LeaseContract> getLease(@PathVariable Long id) {
        return leaseRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Returns prefill data for renewing a contract:
     * - All branch / lessor / location info copied from the previous period
     * - The last saved outstandingBalanceEndOfMonth as the new period's initialOutstandingBalance
     */
    @GetMapping("/{id}/renewal-prefill")
    public ResponseEntity<com.zemenbank.amortization.dto.RenewalPrefillDto> getRenewalPrefill(
            @PathVariable Long id) {
        try {
            return ResponseEntity.ok(amortizationService.getRenewalPrefill(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Update a lease contract */
    @PutMapping("/{id}")
    public ResponseEntity<LeaseContract> updateLease(@PathVariable Long id,
                                                      @RequestBody LeaseContractRequest request) {
        try {
            LeaseContract updated = amortizationService.updateLease(id, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Delete a lease contract */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLease(@PathVariable Long id) {
        if (!leaseRepo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        leaseRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // =========================================================
    //  BULK UPLOAD
    // =========================================================

    /**
     * POST /api/leases/upload
     * Accepts a multipart .xlsx file. Each data row registers one lease contract.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkUploadResult> bulkUpload(
            @RequestParam("file") MultipartFile file) {
        BulkUploadResult result = excelImportService.importLeases(file);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/leases/template
     * Returns a downloadable .xlsx template pre-filled with the column headers.
     */
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws Exception {
        String[] headers = {
            // 0-12: Branch / Lessor info
            "Branch Name*", "Branch Code*", "Region", "Category of Rent (ATM/Outline/City)",
            "Owner/Lessor Name*", "Lessor Name 2", "Lessor Name 3",
            "TIN Number", "Contact Info 1", "Contact Info 2", "Contact Info 3",
            "Account Number", "Tax Category (VAT/TOT)",
            // 13-16: Dates
            "Contract Start Date* (yyyy-MM-dd)", "Contract End Date* (yyyy-MM-dd)",
            "Payment Paid to Date (yyyy-MM-dd)", "Prepayment Till",
            // 17-23: Financial (office rent)
            "Meter Square*", "Price/m\u00b2 Before VAT*", "VAT Rate (default 0.15)",
            "Utility Payment", "Payment Modality", "Discount Rate",
            "Initial Outstanding Balance",
            // 24-31: Stamp Duty
            "Has Stamp Duty (yes/no)",
            "SD Meter Square", "SD Price/m\u00b2 Before VAT", "SD VAT Rate",
            "SD Utility Payment", "SD Initial Outstanding Balance",
            "SD Full Payment / Total Contract Payment",
            "SD Payment Paid to Date (yyyy-MM-dd)",
            // 32-35: NEW – Outstanding Balance Anchor Month / Year
            "Outstanding Balance Month (1-12)  [NEW]",
            "Outstanding Balance Year (e.g. 2025)  [NEW]",
            "SD Outstanding Balance Month (1-12)  [NEW]",
            "SD Outstanding Balance Year (e.g. 2025)  [NEW]"
        };

        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet("Leases");


            // Header style – blue
            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font font = wb.createFont();
            font.setColor(IndexedColors.WHITE.getIndex());
            font.setBold(true);
            headerStyle.setFont(font);

            // Special style for the new anchor columns – orange
            CellStyle anchorStyle = wb.createCellStyle();
            anchorStyle.setFillForegroundColor(IndexedColors.ORANGE.getIndex());
            anchorStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            Font anchorFont = wb.createFont();
            anchorFont.setColor(IndexedColors.WHITE.getIndex());
            anchorFont.setBold(true);
            anchorStyle.setFont(anchorFont);

            Row headRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(i >= 32 ? anchorStyle : headerStyle);
                sheet.setColumnWidth(i, i >= 32 ? 7500 : 6000);
            }

            // Example row
            Row ex = sheet.createRow(1);
            ex.createCell(0).setCellValue("Dilla Branch");
            ex.createCell(1).setCellValue("050");
            ex.createCell(2).setCellValue("SNNP");
            ex.createCell(3).setCellValue("City");
            ex.createCell(4).setCellValue("Abebe Girma");
            ex.createCell(13).setCellValue("2021-11-01");
            ex.createCell(14).setCellValue("2031-10-10");
            ex.createCell(15).setCellValue("2031-10-10");
            ex.createCell(17).setCellValue(600);
            ex.createCell(18).setCellValue(1225);
            ex.createCell(19).setCellValue(0.15);
            ex.createCell(23).setCellValue(150000);   // example initial outstanding balance
            ex.createCell(24).setCellValue("no");
            // Anchor: balance is for November 2021 (contract start)
            ex.createCell(32).setCellValue(11);        // month
            ex.createCell(33).setCellValue(2021);      // year
            // Leave cols 34-35 blank (no stamp duty in this example)

            wb.write(out);
            byte[] bytes = out.toByteArray();

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"lease_template.xlsx\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(bytes);
        }
    }
}
