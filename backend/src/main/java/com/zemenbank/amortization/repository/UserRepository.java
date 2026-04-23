package com.zemenbank.amortization.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.zemenbank.amortization.entity.User;
import java.util.Optional;
/**
 * Repository interface for User entity.
 * This interface extends JpaRepository to provide CRUD operations for User entities.
 * It also includes custom query methods for finding users by username, which is essential for authentication purposes.
 */

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

}
