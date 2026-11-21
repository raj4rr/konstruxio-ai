package ai.konstruxio.api;

import ai.konstruxio.domain.Entities.Rfi;
import ai.konstruxio.repo.Rfis;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/rfis")
public class RfiController {
    private final Rfis rfis;
    private final ProjectService projects;

    public RfiController(Rfis rfis, ProjectService projects) {
        this.rfis = rfis;
        this.projects = projects;
    }

    @GetMapping
    public List<Rfi> list(@PathVariable UUID projectId, @AuthenticationPrincipal CurrentUser user) {
        projects.get(projectId, user);
        return rfis.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId);
    }

    @PostMapping
    public Rfi create(
        @PathVariable UUID projectId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        projects.get(projectId, user);
        Rfi rfi = new Rfi();
        rfi.organizationId = user.organizationId();
        rfi.projectId = projectId;
        rfi.rfiNumber = String.valueOf(body.getOrDefault("rfiNumber", "RFI-" + (System.currentTimeMillis() % 10000)));
        rfi.title = String.valueOf(body.getOrDefault("title", "Untitled RFI"));
        rfi.question = String.valueOf(body.getOrDefault("question", ""));
        rfi.discipline = (String) body.get("discipline");
        rfi.trade = (String) body.get("trade");
        rfi.drawingReference = (String) body.get("drawingReference");
        rfi.suggestedSolution = (String) body.get("suggestedSolution");
        rfi.scheduleImpact = Boolean.TRUE.equals(body.get("scheduleImpact"));
        rfi.costImpact = Boolean.TRUE.equals(body.get("costImpact"));
        rfi.status = String.valueOf(body.getOrDefault("status", "OPEN"));
        rfi.officialResponse = (String) body.get("officialResponse");
        rfi.createdBy = user.id();
        return rfis.save(rfi);
    }

    @PutMapping("/{id}/respond")
    public Rfi respond(
        @PathVariable UUID projectId,
        @PathVariable UUID id,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        projects.get(projectId, user);
        Rfi rfi = rfis.findByIdAndOrganizationId(id, user.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RFI not found"));
        if (body.containsKey("officialResponse")) {
            rfi.officialResponse = body.get("officialResponse");
        }
        rfi.status = body.getOrDefault("status", "ANSWERED");
        rfi.updatedAt = Instant.now();
        return rfis.save(rfi);
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> delete(
        @PathVariable UUID projectId,
        @PathVariable UUID id,
        @AuthenticationPrincipal CurrentUser user
    ) {
        projects.get(projectId, user);
        Rfi rfi = rfis.findByIdAndOrganizationId(id, user.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RFI not found"));
        rfis.delete(rfi);
        return Map.of("deleted", true);
    }
}
