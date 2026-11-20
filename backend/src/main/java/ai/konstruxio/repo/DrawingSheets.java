package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.DrawingSheet;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DrawingSheets extends JpaRepository<DrawingSheet, UUID> {
    List<DrawingSheet> findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(UUID organizationId, UUID projectId);
}
