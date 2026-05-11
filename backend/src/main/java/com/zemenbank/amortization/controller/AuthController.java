package com.zemenbank.amortization.controller;

import com.zemenbank.amortization.dto.*;
import com.zemenbank.amortization.entity.User;
import com.zemenbank.amortization.repository.UserRepository;
import com.zemenbank.amortization.service.AuthenticationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationService authService;
    private final UserRepository userRepository;

    public AuthController(AuthenticationService authService,
                          UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    // 🔥 REGISTER
    @PostMapping("/register")
    public UserDto register(@RequestBody RegisterRequest request) {
        return authService.registerUser(
                request.getUsername(),
                request.getPassword(),
                request.getRole()
        );
    }

    // 🔥 LOGIN
    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {

        String token = authService.login(
                request.getUsername(),
                request.getPassword()
        );

        // get role from DB
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return new AuthResponse(
                token,
                user.getUsername(),
                user.getRole().name()
        );
    }
}