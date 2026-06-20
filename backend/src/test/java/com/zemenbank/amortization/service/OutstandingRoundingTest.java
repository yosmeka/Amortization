package com.zemenbank.amortization.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OutstandingRoundingTest {

    private static final int SCALE = 8;
    private static final RoundingMode RM = RoundingMode.HALF_UP;

    private BigDecimal roundCalc(BigDecimal value) {
        return value.setScale(SCALE, RM);
    }

    private BigDecimal calcProratedRent(BigDecimal monthlyRent, int daysRemaining, int daysInMonth) {
        return monthlyRent.multiply(BigDecimal.valueOf(daysRemaining))
                .divide(BigDecimal.valueOf(daysInMonth), SCALE, RM);
    }

    @Test
    void proratedApril_firstMonth_outstandingEndAtCalcPrecision() {
        BigDecimal prior = new BigDecimal("69000.00");
        BigDecimal monthlyRent = new BigDecimal("23000.00000000");
        // Contract starts 3 Apr → 28 days of 30 in April
        BigDecimal rent = calcProratedRent(monthlyRent, 28, 30);
        BigDecimal end = roundCalc(prior.subtract(rent));

        assertEquals(new BigDecimal("21466.66666667"), rent);
        assertEquals(new BigDecimal("47533.33333333"), end);
    }
}
