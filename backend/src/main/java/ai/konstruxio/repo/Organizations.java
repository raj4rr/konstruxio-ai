package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface Organizations extends JpaRepository<Organization, UUID> {}
