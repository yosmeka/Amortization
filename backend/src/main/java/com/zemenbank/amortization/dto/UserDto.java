package com.zemenbank.amortization.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.zemenbank.amortization.enums.Role;


/**
 * Data Transfer Object for User entity.
 * This DTO is used to transfer user data between the client and server without exposing sensitive information like passwords.
 */

@NoArgsConstructor
@AllArgsConstructor
@Data
public class UserDto {
    private Long id;
    private String username;
    private Role role; // we can use String here to represent the role, or we can use the enum Role if we want to be more strict
    
}
