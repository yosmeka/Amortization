package com.zemenbank.amortization.service;

import com.zemenbank.amortization.dto.UserDto;
import com.zemenbank.amortization.entity.User;
import com.zemenbank.amortization.enums.Role;
import com.zemenbank.amortization.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole(), user.isEnabled()))
                .collect(Collectors.toList());
    }

    public UserDto updateUser(Long id, String email, Role role) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setEmail(email);
        user.setRole(role);
        User savedUser = userRepository.save(user);
        return new UserDto(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail(), savedUser.getRole(), savedUser.isEnabled());
    }

    public UserDto updateUserStatus(Long id, boolean enabled) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setEnabled(enabled);
        User savedUser = userRepository.save(user);
        return new UserDto(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail(), savedUser.getRole(), savedUser.isEnabled());
    }

    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
