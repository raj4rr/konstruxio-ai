package ai.konstruxio.api;

import ai.konstruxio.ai.AiService;
import ai.konstruxio.document.OcrClient;
import ai.konstruxio.domain.Entities.SiteIssue;
import ai.konstruxio.repo.Issues;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/inspections")
public class InspectionController {
    private final AiService aiService;
    private final OcrClient ocrClient;
    private final Issues issuesRepo;
    private final ProjectService projectService;

    public InspectionController(AiService aiService, OcrClient ocrClient, Issues issuesRepo, ProjectService projectService) {
        this.aiService = aiService;
        this.ocrClient = ocrClient;
        this.issuesRepo = issuesRepo;
        this.projectService = projectService;
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> analyzePhoto(
        @RequestPart(value = "file", required = false) MultipartFile file,
        @RequestParam(value = "tradeHint", required = false) String tradeHint,
        @RequestParam(value = "userNotes", required = false) String userNotes,
        @AuthenticationPrincipal CurrentUser user
    ) {
        String detectedText = "";
        String photoBase64 = "";

        if (file != null && !file.isEmpty()) {
            try {
                byte[] bytes = file.getBytes();
                photoBase64 = "data:" + (file.getContentType() != null ? file.getContentType() : "image/jpeg") +
                    ";base64," + Base64.getEncoder().encodeToString(bytes);
                try {
                    detectedText = ocrClient.extract(bytes, file.getOriginalFilename() != null ? file.getOriginalFilename() : "inspection.jpg");
                } catch (Exception ignored) {}
            } catch (Exception ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not process image: " + ex.getMessage());
            }
        }

        Map<String, Object> aiResult = aiService.analyzeInspection(tradeHint, userNotes, detectedText);
        Map<String, Object> response = new HashMap<>(aiResult);
        response.put("photoData", photoBase64);
        response.put("detectedText", detectedText);
        return response;
    }

    @PostMapping("/create-issue")
    public SiteIssue createInspectionIssue(
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        UUID projectId = UUID.fromString(String.valueOf(body.get("projectId")));
        projectService.get(projectId, user);

        SiteIssue issue = new SiteIssue();
        issue.organizationId = user.organizationId();
        issue.projectId = projectId;
        issue.title = (String) body.getOrDefault("title", "Site Defect");
        issue.description = (String) body.getOrDefault("description", "");
        issue.severity = (String) body.getOrDefault("severity", "MEDIUM");
        issue.status = "OPEN";
        issue.locationReference = (String) body.getOrDefault("locationReference", "Site");
        issue.trade = (String) body.getOrDefault("trade", "General");
        issue.photoData = (String) body.get("photoData");
        issue.aiSuggestion = (String) body.get("aiSuggestion");
        issue.reportedBy = user.id();

        return issuesRepo.save(issue);
    }
}
