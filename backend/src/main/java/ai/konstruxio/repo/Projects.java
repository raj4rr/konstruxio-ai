package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Projects extends JpaRepository<Project, UUID> {
    List<Project> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
    Optional<Project> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
