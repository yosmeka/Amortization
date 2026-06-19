package com.zemenbank.amortization.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VatRoundingTest {

    private static final int MONEY_SCALE = 2;
    private static final RoundingMode MONEY_RM = RoundingMode.HALF_EVEN;

    private static final BigDecimal HALF_CENT = new BigDecimal("0.005");

    private BigDecimal roundGrossFromNet(BigDecimal net, BigDecimal vatRate) {
        if (vatRate.compareTo(BigDecimal.ZERO) == 0) {
            return net.setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
        }
        BigDecimal onePlusVat = BigDecimal.ONE.add(vatRate);
        BigDecimal grossExact = net.multiply(onePlusVat);
        BigDecimal rounded0 = grossExact.setScale(0, RoundingMode.HALF_UP);
        BigDecimal inverseNet = rounded0.divide(onePlusVat, MONEY_SCALE, RoundingMode.HALF_UP);
        if (inverseNet.compareTo(net) == 0) {
            if (grossExact.subtract(rounded0).abs().compareTo(new BigDecimal("0.01")) < 0) {
                return rounded0.setScale(MONEY_SCALE);
            }
        }
        return grossExact.setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
    }

    private BigDecimal calcGrossRent(BigDecimal meterSquare, BigDecimal priceBeforeVat, BigDecimal vatRate) {
        BigDecimal priceAfterVat = roundGrossFromNet(priceBeforeVat, vatRate);
        return priceAfterVat.multiply(meterSquare).setScale(MONEY_SCALE, RoundingMode.HALF_EVEN);
    }

    @Test
    void grossRent_2608_70_beforeVat_roundsTo3000() {
        BigDecimal monthly = calcGrossRent(
                new BigDecimal("1.00"),
                new BigDecimal("2608.70"),
                new BigDecimal("0.15"));
        assertEquals(new BigDecimal("3000.00"), monthly);
    }

    @Test
    void grossRent_19130_43_beforeVat_roundsTo22000() {
        // Zemen Bank custom rules: 19130.43 * 1.15 -> derives exact 22000.00
        BigDecimal monthly = calcGrossRent(
                new BigDecimal("1.00"),
                new BigDecimal("19130.43"),
                new BigDecimal("0.15"));
        assertEquals(new BigDecimal("22000.00"), monthly);
    }

    @Test
    void grossRent_6086_96_beforeVat_roundsTo7000() {
        // Zemen Bank custom rules: 6086.96 * 1.15 -> derives exact 7000.00 not 7000.01
        BigDecimal monthly = calcGrossRent(
                new BigDecimal("1.00"),
                new BigDecimal("6086.96"),
                new BigDecimal("0.15"));
        assertEquals(new BigDecimal("7000.00"), monthly);
    }

    @Test
    void priceAfterVat_matchesMonthlyWhenMeterSquareIsOne() {
        BigDecimal before = new BigDecimal("19130.43");
        BigDecimal vat = new BigDecimal("0.15");
        BigDecimal monthly = calcGrossRent(new BigDecimal("1.00"), before, vat);
        BigDecimal after = roundGrossFromNet(before, vat);
        assertEquals(new BigDecimal("22000.00"), monthly);
        assertEquals(new BigDecimal("22000.00"), after);
    }
}
