package ai.konstruxio;

import ai.konstruxio.repo.Projects;
import ai.konstruxio.service.DemoDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private final DemoDataService demoService;
    private final Projects projects;

    public DataSeeder(DemoDataService demoService, Projects projects) {
        this.demoService = demoService;
        this.projects = projects;
    }

    @Override
    public void run(String... args) {
        try {
            if (projects.count() == 0) {
                log.info("No projects found in database. Seeding sample flagship project...");
                demoService.seedSampleProject(null, null);
                log.info("✓ Sample project 'Skyline Meridian Tower — Phase 2' seeded successfully.");
            }
        } catch (Exception ex) {
            log.warn("Automatic database seeding skipped: {}", ex.getMessage());
        }
    }
}
