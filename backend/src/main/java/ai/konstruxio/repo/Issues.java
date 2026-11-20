package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.SiteIssue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Issues extends JpaRepository<SiteIssue, UUID> {
    List<SiteIssue> findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(UUID org, UUID project);
    Optional<SiteIssue> findByIdAndOrganizationId(UUID id, UUID org);
}
