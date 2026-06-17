package com.zemenbank.amortization.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final JwtFilter jwtFilter;

    public SecurityConfig(UserDetailsService userDetailsService, JwtFilter jwtFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
           .authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()

    // MAKER only actions
    .requestMatchers(HttpMethod.POST, "/api/leases/*").hasRole("MAKER")
    .requestMatchers(HttpMethod.PUT, "/api/leases/*").hasRole("MAKER")
    .requestMatchers(HttpMethod.DELETE, "/api/leases/*").hasRole("MAKER")

    // CHECKER actions
    
    .requestMatchers(HttpMethod.PUT, "/api/leases/*/approve").hasRole("CHECKER")
    .requestMatchers(HttpMethod.PUT, "/api/leases/*/reject").hasRole("CHECKER")
    

    // BOTH can view
    .requestMatchers(HttpMethod.GET, "/api/leases/**").authenticated()

    // TEMPLATE (you already restricted)
    .requestMatchers("/api/leases/template").hasRole("MAKER")

    .anyRequest().authenticated()
)
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}