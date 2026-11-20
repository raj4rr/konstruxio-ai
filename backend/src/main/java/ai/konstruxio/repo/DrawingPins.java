package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.DrawingPin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DrawingPins extends JpaRepository<DrawingPin, UUID> {
    List<DrawingPin> findAllByOrganizationIdAndDrawingIdOrderByCreatedAtDesc(UUID organizationId, UUID drawingId);
    List<DrawingPin> findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(UUID organizationId, UUID projectId);
}
