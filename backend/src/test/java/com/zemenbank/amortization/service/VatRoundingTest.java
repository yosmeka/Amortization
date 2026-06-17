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
        BigDecimal grossExact = net.multiply(BigDecimal.ONE.add(vatRate));
        BigDecimal truncated = grossExact.setScale(MONEY_SCALE, RoundingMode.DOWN);
        if (grossExact.subtract(truncated).compareTo(HALF_CENT) == 0) {
            return grossExact.setScale(MONEY_SCALE, MONEY_RM);
        }
        BigDecimal vatAmount = net.multiply(vatRate).setScale(MONEY_SCALE, RoundingMode.CEILING);
        return net.add(vatAmount).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal calcGrossRent(BigDecimal meterSquare, BigDecimal priceBeforeVat, BigDecimal vatRate) {
        return roundGrossFromNet(meterSquare.multiply(priceBeforeVat), vatRate);
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
        BigDecimal monthly = calcGrossRent(
                new BigDecimal("1.00"),
                new BigDecimal("19130.43"),
                new BigDecimal("0.15"));
        assertEquals(new BigDecimal("22000.00"), monthly);
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
