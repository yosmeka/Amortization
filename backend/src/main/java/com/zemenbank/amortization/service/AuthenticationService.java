package com.zemenbank.amortization.service;

import com.zemenbank.amortization.dto.UserDto;
import com.zemenbank.amortization.entity.User;
import com.zemenbank.amortization.enums.Role;
import com.zemenbank.amortization.repository.UserRepository;
import com.zemenbank.amortization.config.JwtUtil;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthenticationService(
            UserRepository userRepository,
            AuthenticationManager authenticationManager,
            JwtUtil jwtUtil,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    // 🔥 REGISTER USER
    public UserDto registerUser(String username, String password, Role role) {

        // check duplicate user
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(username);

        // 🔐 encrypt password
        user.setPassword(passwordEncoder.encode(password));

        user.setRole(role);

        User savedUser = userRepository.save(user);

        return new UserDto(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getRole()
        );
    }

    // 🔥 LOGIN USER (returns JWT token)
    public String login(String username, String password) {

        // authenticate username + password
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return jwtUtil.generateToken(user.getUsername(), user.getRole().name());
    }
}