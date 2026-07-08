package com.zemenbank.amortization.config;

import com.zemenbank.amortization.entity.User;
import com.zemenbank.amortization.enums.Role;
import com.zemenbank.amortization.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminUserSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // Check if the default admin already exists
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@zemenbank.com");
            // Encoding the default password 'admin'
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setRole(Role.ADMIN);
            
            userRepository.save(admin);
            System.out.println("=================================================");
            System.out.println("Default Admin User Created:");
            System.out.println("Username: admin");
            System.out.println("Password: admin");
            System.out.println("Role: ADMIN");
            System.out.println("=================================================");
        }
    }
}
