package com.zemenbank.amortization.dto;

import com.zemenbank.amortization.enums.Role;
import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private Role role;
}