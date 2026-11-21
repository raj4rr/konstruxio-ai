package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.Rfi;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Rfis extends JpaRepository<Rfi, UUID> {
    List<Rfi> findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(UUID organizationId, UUID projectId);
    Optional<Rfi> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
