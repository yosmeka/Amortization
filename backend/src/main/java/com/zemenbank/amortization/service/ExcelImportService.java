package com.zemenbank.amortization.service;

import com.zemenbank.amortization.dto.BulkUploadResult;
import com.zemenbank.amortization.dto.LeaseContractRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;

/**
 * Parses an uploaded .xlsx file and registers each data row as a lease contract.
 *
 * Expected column order (0-indexed):
 *  0  Branch Name *
 *  1  Branch Code *
 *  2  Region
 *  3  Category of Rent (ATM / Outline / City)
 *  4  Owner / Lessor Name *
 *  5  Lessor Name 2
 *  6  Lessor Name 3
 *  7  TIN Number
 *  8  Contact Info 1
 *  9  Contact Info 2
 * 10  Contact Info 3
 * 11  Account Number
 * 12  Tax Category (VAT/TOT)
 * 13  Contract Start Date * (yyyy-MM-dd or Excel date)
 * 14  Contract End Date *
 * 15  Payment Paid to Date
 * 16  Prepayment Till
 * 17  Meter Square *
 * 18  Price per m² Before VAT *
 * 19  VAT Rate (default 0.15)
 * 20  Utility Payment
 * 21  Payment Modality
 * 22  Discount Rate
 * 23  Initial Outstanding Balance
 * 24  Has Stamp Duty (yes/no/true/false)
 * --- Stamp Duty sub-fields (only used when col 24 = yes) ---
 * 25  SD Meter Square
 * 26  SD Price per m² Before VAT
 * 27  SD VAT Rate
 * 28  SD Utility Payment
 * 29  SD Initial Outstanding Balance
 * 30  SD Full Payment / Total Contract Payment
 * 31  SD Payment Paid to Date
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelImportService {

    private final AmortizationService amortizationService;

    public BulkUploadResult importLeases(MultipartFile file) {
        BulkUploadResult result = new BulkUploadResult();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int lastRow = sheet.getLastRowNum();
            result.setTotalRows(lastRow); // row 0 is the header

            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) continue;

                String branchName = str(row, 0);
                try {
                    LeaseContractRequest req = new LeaseContractRequest();

                    req.setBranchName(branchName);
                    req.setBranchCode(str(row, 1));
                    req.setRegion(str(row, 2));
                    req.setCategoryOfRent(str(row, 3));
                    req.setOwnerName(str(row, 4));
                    req.setLessorName1(str(row, 4));
                    req.setLessorName2(str(row, 5));
                    req.setLessorName3(str(row, 6));
                    req.setTinNumber(str(row, 7));
                    req.setContactInfo1(str(row, 8));
                    req.setContactInfo2(str(row, 9));
                    req.setContactInfo3(str(row, 10));
                    req.setAccountNumber(str(row, 11));
                    req.setTaxCategory(strDef(row, 12, "VAT"));
                    req.setContractStartDate(localDate(row, 13));
                    req.setContractEndDate(localDate(row, 14));
                    req.setPaymentPaidToDate(localDate(row, 15));
                    req.setPrepaymentTill(str(row, 16));
                    req.setMeterSquare(decimal(row, 17));
                    req.setMeterSquarePriceBeforeVat(decimal(row, 18));
                    req.setVatRate(decimalDef(row, 19, new BigDecimal("0.15")));
                    req.setUtilityPayment(decimalDef(row, 20, BigDecimal.ZERO));
                    req.setPaymentModality(strDef(row, 21, "monthly"));
                    req.setDiscountRate(strDef(row, 22, "15%"));
                    req.setInitialOutstandingBalance(decimalDef(row, 23, BigDecimal.ZERO));
                    req.setInitialOutstandingBalanceMonth(intVal(row, 32));
                    req.setInitialOutstandingBalanceYear(intVal(row, 33));

                    boolean hasSD = boolVal(row, 24);
                    req.setHasStampDuty(hasSD);

                    if (hasSD) {
                        LeaseContractRequest.StampDutyRequest sd = new LeaseContractRequest.StampDutyRequest();
                        sd.setMeterSquare(decimalDef(row, 25, BigDecimal.ZERO));
                        sd.setMeterSquarePriceBeforeVat(decimalDef(row, 26, BigDecimal.ZERO));
                        sd.setVatRate(decimalDef(row, 27, new BigDecimal("0.15")));
                        sd.setUtilityPayment(decimalDef(row, 28, BigDecimal.ZERO));
                        sd.setInitialOutstandingBalance(decimalDef(row, 29, BigDecimal.ZERO));
                        sd.setInitialOutstandingBalanceMonth(intVal(row, 34));
                        sd.setInitialOutstandingBalanceYear(intVal(row, 35));
                        sd.setStampDutyFullPayment(decimalDef(row, 30, BigDecimal.ZERO));
                        sd.setPaymentPaidToDate(localDate(row, 31));
                        req.setStampDuty(sd);
                    }

                    amortizationService.registerLease(req);
                    result.setSuccessCount(result.getSuccessCount() + 1);

                } catch (Exception ex) {
                    log.warn("Row {} import failed: {}", i, ex.getMessage());
                    result.setErrorCount(result.getErrorCount() + 1);
                    result.getErrors().add(
                            new BulkUploadResult.RowError(i, branchName, ex.getMessage()));
                }
            }

        } catch (Exception e) {
            log.error("Excel parse failed: {}", e.getMessage(), e);
            result.getErrors().add(new BulkUploadResult.RowError(0, "—", "File parse error: " + e.getMessage()));
            result.setErrorCount(1);
        }

        return result;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private boolean isRowEmpty(Row row) {
        for (int c = 0; c < 5; c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK
                    && !getCellStringValue(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String str(Row row, int col) {
        Cell cell = row.getCell(col);
        return cell == null ? "" : getCellStringValue(cell).trim();
    }

    private String strDef(Row row, int col, String def) {
        String v = str(row, col);
        return v.isBlank() ? def : v;
    }

    private BigDecimal decimal(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return BigDecimal.ZERO;
        if (cell.getCellType() == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        }
        try { return new BigDecimal(getCellStringValue(cell).trim()); }
        catch (Exception e) { return BigDecimal.ZERO; }
    }

    private BigDecimal decimalDef(Row row, int col, BigDecimal def) {
        Cell cell = row.getCell(col);
        if (cell == null || cell.getCellType() == CellType.BLANK) return def;
        if (cell.getCellType() == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        }
        String s = getCellStringValue(cell).trim();
        if (s.isBlank()) return def;
        try { return new BigDecimal(s); } catch (Exception e) { return def; }
    }

    private boolean boolVal(Row row, int col) {
        String v = str(row, col).toLowerCase();
        return v.equals("yes") || v.equals("true") || v.equals("1") || v.equals("y");
    }

    private Integer intVal(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null || cell.getCellType() == CellType.BLANK) return null;
        if (cell.getCellType() == CellType.NUMERIC) return (int) cell.getNumericCellValue();
        String s = getCellStringValue(cell).trim();
        if (s.isBlank()) return null;
        try { return Integer.parseInt(s); } catch (Exception e) { return null; }
    }

    private LocalDate localDate(Row row, int col) {
        if (row == null) return null;
        Cell cell = row.getCell(col);
        if (cell == null || cell.getCellType() == CellType.BLANK) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            Date d = cell.getDateCellValue();
            return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        // Try parsing text
        String s = getCellStringValue(cell).trim();
        if (s.isBlank()) return null;
        try { return LocalDate.parse(s); } catch (Exception e) { return null; }
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toLocalDate().toString()
                    : String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield String.valueOf(cell.getNumericCellValue()); }
                catch (Exception e) { yield cell.getStringCellValue(); }
            }
            default -> "";
        };
    }
}
