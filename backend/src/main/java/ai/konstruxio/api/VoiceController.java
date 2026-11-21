package ai.konstruxio.api;

import ai.konstruxio.ai.AiService;
import ai.konstruxio.domain.Entities.*;
import ai.konstruxio.repo.*;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/voice")
public class VoiceController {
    private final RestClient client = RestClient.create();
    private final String mediaUrl;
    private final AiService aiService;
    private final Tasks tasksRepo;
    private final Issues issuesRepo;
    private final Reports reportsRepo;
    private final Rfis rfisRepo;
    private final TmTickets tmTicketsRepo;
    private final ProjectService projectService;

    public VoiceController(
        @Value("${app.media.base-url:http://localhost:8090}") String mediaUrl,
        AiService aiService,
        Tasks tasksRepo,
        Issues issuesRepo,
        Reports reportsRepo,
        Rfis rfisRepo,
        TmTickets tmTicketsRepo,
        ProjectService projectService
    ) {
        this.mediaUrl = mediaUrl;
        this.aiService = aiService;
        this.tasksRepo = tasksRepo;
        this.issuesRepo = issuesRepo;
        this.reportsRepo = reportsRepo;
        this.rfisRepo = rfisRepo;
        this.tmTicketsRepo = tmTicketsRepo;
        this.projectService = projectService;
    }

    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<?, ?> transcribe(
        @RequestPart("file") MultipartFile file,
        @RequestParam(defaultValue = "en") String language,
        @AuthenticationPrincipal CurrentUser user
    ) {
        return callMediaTranscription(file, language);
    }

    @PostMapping(value = "/analyze-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> analyzeAudio(
        @RequestPart("file") MultipartFile file,
        @RequestParam(defaultValue = "en") String language,
        @AuthenticationPrincipal CurrentUser user
    ) {
        Map<String, Object> transcription = callMediaTranscription(file, language);
        String text = String.valueOf(transcription.getOrDefault("text", ""));
        if (text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No speech recognized in recording.");
        }
        Map<String, Object> extracted = aiService.parseFieldNote(text);
        return Map.of("transcript", text, "extraction", extracted);
    }

    @PostMapping("/analyze-text")
    public Map<String, Object> analyzeText(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        String text = body.getOrDefault("text", "").trim();
        if (text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Field note text is required.");
        }
        Map<String, Object> extracted = aiService.parseFieldNote(text);
        return Map.of("transcript", text, "extraction", extracted);
    }

    @PostMapping("/commit")
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> commitActions(
        @RequestBody Map<String, Object> payload,
        @AuthenticationPrincipal CurrentUser user
    ) {
        UUID projectId = UUID.fromString(String.valueOf(payload.get("projectId")));
        projectService.get(projectId, user);

        int tasksCreated = 0;
        int issuesCreated = 0;
        int rfisCreated = 0;
        int tmTicketsCreated = 0;
        boolean reportSaved = false;

        // 1. Daily Report
        if (payload.containsKey("dailyReport") && payload.get("dailyReport") instanceof Map) {
            Map<String, Object> dr = (Map<String, Object>) payload.get("dailyReport");
            LocalDate reportDate = LocalDate.now();
            DailyReport report = new DailyReport();
            report.organizationId = user.organizationId();
            report.projectId = projectId;
            report.reportDate = reportDate;
            report.weather = (String) dr.getOrDefault("weather", "Normal");
            Object workers = dr.get("workersCount");
            report.workersCount = workers instanceof Number ? ((Number) workers).intValue() : 8;
            report.workCompleted = (String) dr.getOrDefault("workCompleted", "");
            report.blockers = (String) dr.getOrDefault("blockers", "");
            report.materials = (String) dr.getOrDefault("materials", "");
            report.safetyNotes = (String) dr.getOrDefault("safetyNotes", "");
            report.createdBy = user.id();
            try {
                reportsRepo.save(report);
                reportSaved = true;
            } catch (Exception ignored) {
                // If report already exists for today, we still proceed with tasks/issues
            }
        }

        // 2. Tasks
        if (payload.containsKey("tasks") && payload.get("tasks") instanceof List) {
            List<Map<String, Object>> taskList = (List<Map<String, Object>>) payload.get("tasks");
            for (Map<String, Object> tm : taskList) {
                String title = (String) tm.get("title");
                if (title != null && !title.isBlank()) {
                    Task t = new Task();
                    t.organizationId = user.organizationId();
                    t.projectId = projectId;
                    t.title = title;
                    t.description = (String) tm.getOrDefault("description", "");
                    t.priority = (String) tm.getOrDefault("priority", "MEDIUM");
                    t.status = "TODO";
                    t.createdBy = user.id();
                    tasksRepo.save(t);
                    tasksCreated++;
                }
            }
        }

        // 3. Site Issues
        if (payload.containsKey("issues") && payload.get("issues") instanceof List) {
            List<Map<String, Object>> issueList = (List<Map<String, Object>>) payload.get("issues");
            for (Map<String, Object> im : issueList) {
                String title = (String) im.get("title");
                if (title != null && !title.isBlank()) {
                    SiteIssue si = new SiteIssue();
                    si.organizationId = user.organizationId();
                    si.projectId = projectId;
                    si.title = title;
                    si.description = (String) im.getOrDefault("description", "");
                    si.severity = (String) im.getOrDefault("severity", "MEDIUM");
                    si.trade = (String) im.getOrDefault("trade", "General");
                    si.locationReference = (String) im.getOrDefault("locationReference", "Site");
                    si.status = "OPEN";
                    si.reportedBy = user.id();
                    issuesRepo.save(si);
                    issuesCreated++;
                }
            }
        }

        // 4. KONSTRUXIO RFIs
        if (payload.containsKey("rfis") && payload.get("rfis") instanceof List) {
            List<Map<String, Object>> rfiList = (List<Map<String, Object>>) payload.get("rfis");
            for (Map<String, Object> rm : rfiList) {
                String title = (String) rm.get("title");
                if (title != null && !title.isBlank()) {
                    Rfi rfi = new Rfi();
                    rfi.organizationId = user.organizationId();
                    rfi.projectId = projectId;
                    rfi.rfiNumber = (String) rm.getOrDefault("rfiNumber", "RFI-" + (100 + rfisRepo.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId).size() + 1));
                    rfi.title = title;
                    rfi.question = (String) rm.getOrDefault("question", title);
                    rfi.discipline = (String) rm.getOrDefault("discipline", "General");
                    rfi.trade = (String) rm.getOrDefault("trade", "General");
                    rfi.drawingReference = (String) rm.getOrDefault("drawingReference", "Level 2 Floor Plan");
                    rfi.suggestedSolution = (String) rm.getOrDefault("suggestedSolution", "");
                    rfi.scheduleImpact = Boolean.TRUE.equals(rm.get("scheduleImpact"));
                    rfi.costImpact = Boolean.TRUE.equals(rm.get("costImpact"));
                    rfi.status = "OPEN";
                    rfi.createdBy = user.id();
                    rfisRepo.save(rfi);
                    rfisCreated++;
                }
            }
        }

        // 5. KONSTRUXIO Time & Material (T&M) Extra Work Tickets
        if (payload.containsKey("tmTickets") && payload.get("tmTickets") instanceof List) {
            List<Map<String, Object>> tmList = (List<Map<String, Object>>) payload.get("tmTickets");
            for (Map<String, Object> tmm : tmList) {
                String title = (String) tmm.get("title");
                if (title != null && !title.isBlank()) {
                    TmTicket t = new TmTicket();
                    t.organizationId = user.organizationId();
                    t.projectId = projectId;
                    t.ticketNumber = (String) tmm.getOrDefault("ticketNumber", "TM-" + (200 + tmTicketsRepo.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId).size() + 1));
                    t.title = title;
                    t.clientDirective = (String) tmm.getOrDefault("clientDirective", "Requested verbally on site");
                    t.trade = (String) tmm.getOrDefault("trade", "General");
                    t.laborHours = (String) tmm.getOrDefault("laborHours", "TBD");
                    t.materialsUsed = (String) tmm.getOrDefault("materialsUsed", "TBD");
                    Object cost = tmm.get("estimatedCost");
                    if (cost instanceof Number) {
                        t.estimatedCost = java.math.BigDecimal.valueOf(((Number) cost).doubleValue());
                    }
                    t.status = "PENDING_APPROVAL";
                    t.createdBy = user.id();
                    tmTicketsRepo.save(t);
                    tmTicketsCreated++;
                }
            }
        }

        return Map.of(
            "success", true,
            "reportSaved", reportSaved,
            "tasksCreated", tasksCreated,
            "issuesCreated", issuesCreated,
            "rfisCreated", rfisCreated,
            "tmTicketsCreated", tmTicketsCreated
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callMediaTranscription(MultipartFile file, String language) {
        if (file.isEmpty() || file.getSize() > 25L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Audio must be non-empty and no larger than 25 MB");
        }
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!(type.startsWith("audio/") || type.equals("video/webm") || type.equals("application/octet-stream"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported audio content type");
        }
        try {
            MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
            parts.add("file", new ByteArrayResource(file.getBytes()) {
                @Override public String getFilename() {
                    return file.getOriginalFilename() == null ? "recording.webm" : file.getOriginalFilename();
                }
            });
            parts.add("language", language);
            return client.post().uri(mediaUrl + "/transcribe")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts).retrieve().body(Map.class);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Speech transcription service failed: " + ex.getMessage());
        }
    }
}
