package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface Tasks extends JpaRepository<Task, UUID> {
    List<Task> findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(UUID org, UUID project);
    Optional<Task> findByIdAndOrganizationId(UUID id, UUID org);
}
