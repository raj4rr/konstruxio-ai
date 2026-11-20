package ai.konstruxio.repo;

import ai.konstruxio.domain.Entities.DailyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface Reports extends JpaRepository<DailyReport, UUID> {
    List<DailyReport> findAllByOrganizationIdAndProjectIdOrderByReportDateDesc(UUID org, UUID project);
}
