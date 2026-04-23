package com.zemenbank.amortization.enums;
import lombok.AllArgsConstructor;
import lombok.Getter;
/**
 * Enum representing user roles in the system.
 * This is used for authorization purposes to restrict access to certain endpoints based on the user's role.
 */

@AllArgsConstructor
@Getter
public enum Role {
    MAKER,
    CHECKER,
    ADMIN
}