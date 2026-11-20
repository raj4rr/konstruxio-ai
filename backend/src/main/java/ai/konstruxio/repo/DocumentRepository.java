package ai.konstruxio.repo;

import ai.konstruxio.domain.ProjectDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface DocumentRepository extends JpaRepository<ProjectDocument, UUID> {
    List<ProjectDocument> findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(UUID organizationId, UUID projectId);
    Optional<ProjectDocument> findByIdAndOrganizationIdAndProjectId(UUID id, UUID organizationId, UUID projectId);
}
