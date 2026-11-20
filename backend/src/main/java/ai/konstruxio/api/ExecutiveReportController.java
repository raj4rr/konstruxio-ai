package ai.konstruxio.api;

import ai.konstruxio.ai.AiService;
import ai.konstruxio.domain.Entities.*;
import ai.konstruxio.repo.*;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import ai.konstruxio.service.WeatherService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
public class ExecutiveReportController {
    private final ProjectService projectService;
    private final WeatherService weatherService;
    private final Reports reportsRepo;
    private final Tasks tasksRepo;
    private final Issues issuesRepo;
    private final DrawingPins pinsRepo;
    private final AiService aiService;

    public ExecutiveReportController(
        ProjectService projectService,
        WeatherService weatherService,
        Reports reportsRepo,
        Tasks tasksRepo,
        Issues issuesRepo,
        DrawingPins pinsRepo,
        AiService aiService
    ) {
        this.projectService = projectService;
        this.weatherService = weatherService;
        this.reportsRepo = reportsRepo;
        this.tasksRepo = tasksRepo;
        this.issuesRepo = issuesRepo;
        this.pinsRepo = pinsRepo;
        this.aiService = aiService;
    }

    @GetMapping("/api/projects/{projectId}/weather")
    public WeatherService.WeatherInfo getWeather(
        @PathVariable UUID projectId,
        @AuthenticationPrincipal CurrentUser user
    ) {
        Project p = projectService.get(projectId, user);
        return weatherService.getWeather(p.latitude, p.longitude);
    }

    @GetMapping("/api/projects/{projectId}/reports/executive")
    public Map<String, Object> getExecutiveReport(
        @PathVariable UUID projectId,
        @AuthenticationPrincipal CurrentUser user
    ) {
        Project project = projectService.get(projectId, user);
        List<DailyReport> dailyReports = reportsRepo.findAllByOrganizationIdAndProjectIdOrderByReportDateDesc(user.organizationId(), projectId);
        List<Task> tasks = tasksRepo.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId);
        List<SiteIssue> issues = issuesRepo.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId);
        List<DrawingPin> pins = pinsRepo.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId);

        long completedTasks = tasks.stream().filter(t -> "DONE".equalsIgnoreCase(t.status) || "COMPLETED".equalsIgnoreCase(t.status)).count();
        long openIssues = issues.stream().filter(i -> "OPEN".equalsIgnoreCase(i.status)).count();
        long criticalIssues = issues.stream().filter(i -> "CRITICAL".equalsIgnoreCase(i.severity) && !"RESOLVED".equalsIgnoreCase(i.status)).count();

        WeatherService.WeatherInfo weather = weatherService.getWeather(project.latitude, project.longitude);

        // Build data summary for LLM
        StringBuilder data = new StringBuilder();
        data.append("Active tasks: ").append(tasks.size()).append(" (Completed: ").append(completedTasks).append(")\n");
        data.append("Site issues: ").append(issues.size()).append(" (Open: ").append(openIssues).append(", Critical: ").append(criticalIssues).append(")\n");
        data.append("Drawing defect pins: ").append(pins.size()).append("\n");
        data.append("Current weather: ").append(weather.condition()).append(", ").append(weather.temperature()).append("°C. ").append(weather.advisory()).append("\n");
        data.append("Recent daily logs:\n");

        int limit = Math.min(dailyReports.size(), 7);
        for (int i = 0; i < limit; i++) {
            DailyReport dr = dailyReports.get(i);
            data.append("- Date: ").append(dr.reportDate)
                .append(", Workers: ").append(dr.workersCount)
                .append(", Work: ").append(dr.workCompleted)
                .append(", Blockers: ").append(dr.blockers == null ? "None" : dr.blockers)
                .append("\n");
        }

        String summaryMarkdown = aiService.generateWeeklyExecutiveReport(project.name, project.location, data.toString());

        Map<String, Object> metrics = Map.of(
            "totalTasks", tasks.size(),
            "completedTasks", completedTasks,
            "openIssues", openIssues,
            "criticalIssues", criticalIssues,
            "drawingPins", pins.size(),
            "dailyLogsCount", dailyReports.size(),
            "weather", weather
        );

        return Map.of(
            "projectName", project.name,
            "generatedAt", LocalDate.now().toString(),
            "summaryMarkdown", summaryMarkdown,
            "metrics", metrics
        );
    }
}
