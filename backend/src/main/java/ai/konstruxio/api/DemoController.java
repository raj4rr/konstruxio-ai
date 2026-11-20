package ai.konstruxio.api;

import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.DemoDataService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/demo")
public class DemoController {
    private final DemoDataService demoService;

    public DemoController(DemoDataService demoService) {
        this.demoService = demoService;
    }

    @PostMapping("/seed")
    public Map<String, Object> seedDemoProject(@AuthenticationPrincipal CurrentUser user) {
        if (user != null) {
            // Seed directly inside current user's organization
            return demoService.seedSampleProject(user.organizationId(), user.id());
        }
        // Seed default demo workspace & user
        return demoService.seedSampleProject(null, null);
    }
}
