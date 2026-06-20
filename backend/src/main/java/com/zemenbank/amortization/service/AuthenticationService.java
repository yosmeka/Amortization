package com.zemenbank.amortization.service;

import com.zemenbank.amortization.dto.UserDto;
import com.zemenbank.amortization.entity.User;
import com.zemenbank.amortization.enums.Role;
import com.zemenbank.amortization.repository.UserRepository;
import com.zemenbank.amortization.config.JwtUtil;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final com.zemenbank.amortization.security.LdapService ldapService;

    @Value("${app.auth-mode:local}")
    private String authMode;

    public AuthenticationService(
            UserRepository userRepository,
            AuthenticationManager authenticationManager,
            JwtUtil jwtUtil,
            PasswordEncoder passwordEncoder,
            com.zemenbank.amortization.security.LdapService ldapService
    ) {
        this.userRepository = userRepository;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.ldapService = ldapService;
    }

    // 🔥 REGISTER USER
    public UserDto registerUser(String username, String email, String password, Role role) {

        // check duplicate user
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);

        // 🔐 encrypt password
        user.setPassword(passwordEncoder.encode(password));

        user.setRole(role);

        User savedUser = userRepository.save(user);

        return new UserDto(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.isEnabled()
        );
    }

    // 🔥 LOGIN USER (returns JWT token)
    public String login(String username, String password) {

        if ("ldap".equalsIgnoreCase(authMode)) {
            ldapService.authenticate(username, password);
        } else if ("hybrid".equalsIgnoreCase(authMode)) {
            try {
                ldapService.authenticate(username, password);
            } catch (Exception e) {
                // Fallback to local DB check
                authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
            }
        } else {
            // Local auth
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(username, password));
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isEnabled()) {
            throw new RuntimeException("User account is currently disabled.");
        }

        return jwtUtil.generateToken(user.getUsername(), user.getRole().name());
    }
}