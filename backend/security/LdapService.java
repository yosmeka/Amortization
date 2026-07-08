package com.lms.security;

import com.lms.entity.UserEntity;
import com.lms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import javax.naming.Context;
import javax.naming.ldap.InitialLdapContext;
import javax.naming.ldap.LdapContext;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;
import java.util.Optional;

@Service
public class LdapService {

    private static final Logger log = LoggerFactory.getLogger(LdapService.class);

    private final UserRepository userRepository;

    @Value("${app.ldap.url:ldaps://mbdcp02.zemenbank.local:636}")
    private String ldapUrl;

    @Value("${app.ldap.base-dn:dc=zemenbank,dc=local}")
    private String ldapBaseDn;

    @Value("${app.ldap.user-attribute:mail}")
    private String ldapUserAttribute;

    @Value("${app.ldap.trust-all-certs:true}")
    private boolean trustAllCerts;

    public LdapService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void authenticate(String usernameOrEmail, String password) {
        log.debug("Attempting LDAP authentication for: {}", usernameOrEmail);

        if (password == null || password.isEmpty()) {
            throw new BadCredentialsException("Empty credentials not allowed");
        }

        // 1. Resolve email address from DB if username is provided
        String email = usernameOrEmail;
        if (!email.contains("@")) {
            Optional<UserEntity> userOpt = userRepository.findByUsername(usernameOrEmail);
            if (userOpt.isPresent()) {
                email = userOpt.get().getEmail();
                log.debug("Resolved username '{}' to email '{}'", usernameOrEmail, email);
            } else {
                // Fallback: append standard domain name
                email = usernameOrEmail + "@zemenbank.com";
                log.debug("Username '{}' not found in DB. Appending fallback domain to form email: '{}'", usernameOrEmail, email);
            }
        }

        // 2. Build LDAP environment properties
        Hashtable<String, String> env = new Hashtable<>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
        env.put(Context.PROVIDER_URL, ldapUrl);
        env.put(Context.SECURITY_AUTHENTICATION, "simple");
        env.put(Context.REFERRAL, "ignore");

        if (ldapUrl.startsWith("ldaps://")) {
            env.put(Context.SECURITY_PROTOCOL, "ssl");
            if (trustAllCerts) {
                env.put("java.naming.ldap.factory.socket", TrustAllSSLSocketFactory.class.getName());
                log.debug("LDAPS with trust-all SSL socket factory configured");
            }
        }

        // 3. Try multiple principal formats to bind
        // Format 1: Direct email/UPN (standard for AD: e.g., yosef.melkamu@zemenbank.com or yosef.melkamu@zemenbank.local)
        // Format 2: DN style: mail=yosef.melkamu@zemenbank.com,dc=zemenbank,dc=local
        // Format 3: DN style: cn=yosef.melkamu,dc=zemenbank,dc=local (constructed from username part)
        String usernamePart = email.contains("@") ? email.split("@")[0] : email;

        List<String> principalCandidates = new ArrayList<>();
        principalCandidates.add(email); // Try direct email address/UPN
        
        // Also add direct UPN with local domain if different from email domain
        if (ldapBaseDn != null && ldapBaseDn.contains("dc=")) {
            // Reconstruct domain suffix from base DN (e.g. dc=zemenbank,dc=local -> zemenbank.local)
            String domainSuffix = ldapBaseDn.replace("dc=", "").replace(",", ".").trim();
            String upnFallback = usernamePart + "@" + domainSuffix;
            if (!upnFallback.equalsIgnoreCase(email)) {
                principalCandidates.add(upnFallback);
            }
        }
        
        principalCandidates.add(ldapUserAttribute + "=" + email + "," + ldapBaseDn);
        principalCandidates.add("cn=" + usernamePart + "," + ldapBaseDn);

        Exception lastException = null;
        boolean success = false;

        for (String principal : principalCandidates) {
            log.debug("Trying LDAP bind with principal: '{}'", principal);
            try {
                Hashtable<String, String> bindEnv = new Hashtable<>(env);
                bindEnv.put(Context.SECURITY_PRINCIPAL, principal);
                bindEnv.put(Context.SECURITY_CREDENTIALS, password);

                // Perform the bind operation
                LdapContext ctx = new InitialLdapContext(bindEnv, null);
                ctx.close();

                log.info("LDAP authentication successful for principal: '{}'", principal);
                success = true;
                break;
            } catch (Exception e) {
                log.debug("LDAP bind failed for principal '{}': {}", principal, e.getMessage());
                lastException = e;
            }
        }

        if (!success) {
            log.warn("LDAP authentication failed for user '{}'. Last error: {}", usernameOrEmail, lastException != null ? lastException.getMessage() : "Unknown error");
            throw new BadCredentialsException("Invalid Domain credentials", lastException);
        }
    }
}
