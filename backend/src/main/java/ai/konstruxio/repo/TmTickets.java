package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.TmTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TmTickets extends JpaRepository<TmTicket, UUID> {
    List<TmTicket> findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(UUID organizationId, UUID projectId);
    Optional<TmTicket> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
