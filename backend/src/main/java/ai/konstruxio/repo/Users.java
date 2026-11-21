package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Users extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    List<AppUser> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    Optional<AppUser> findByIdAndOrganizationId(UUID id, UUID organizationId);
    long countByOrganizationIdAndRole(UUID organizationId, String role);
}
