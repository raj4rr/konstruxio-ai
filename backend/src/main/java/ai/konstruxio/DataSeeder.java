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
    private final ai.konstruxio.repo.Organizations organizations;

    public DataSeeder(DemoDataService demoService, Projects projects, ai.konstruxio.repo.Organizations organizations) {
        this.demoService = demoService;
        this.projects = projects;
        this.organizations = organizations;
    }

    @Override
    public void run(String... args) {
        try {
            if (projects.count() == 0) {
                log.info("No projects found in database. Seeding sample flagship project...");
                demoService.seedSampleProject(null, null);
                log.info("✓ Sample project 'Skyline Meridian Tower — Phase 2' seeded successfully.");
            } else {
                organizations.findAll().forEach(org -> demoService.seedAllRoleUsers(org.id));
                log.info("✓ Verified role users with standard credentials (Hello@123) for all organizations.");
            }
        } catch (Exception ex) {
            log.warn("Automatic database seeding skipped: {}", ex.getMessage());
        }
    }
}
