package com.zemenbank.amortization.entity;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import com.zemenbank.amortization.enums.Role;

/**
 * Represents a User in the system.
 * This entity is used for authentication and authorization purposes.  have username password and role
 * 
 */
//setters and getters
@Getter
@Setter
//no args constructor
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;


    @Column(nullable = false)
    @JsonIgnore
    private String password;

    //lets make the role to use the enum Role
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Role role;

    public User orElseThrow(Object object) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'orElseThrow'");
    }

    public boolean isPresent() {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'isPresent'");
    }
}
