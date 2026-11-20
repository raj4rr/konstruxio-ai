package ai.konstruxio.api;

import ai.konstruxio.domain.Entities.DrawingPin;
import ai.konstruxio.domain.Entities.DrawingSheet;
import ai.konstruxio.repo.DrawingPins;
import ai.konstruxio.repo.DrawingSheets;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
public class DrawingController {
    private final DrawingSheets sheetsRepo;
    private final DrawingPins pinsRepo;
    private final ProjectService projectService;

    public DrawingController(DrawingSheets sheetsRepo, DrawingPins pinsRepo, ProjectService projectService) {
        this.sheetsRepo = sheetsRepo;
        this.pinsRepo = pinsRepo;
        this.projectService = projectService;
    }

    @GetMapping("/api/projects/{projectId}/drawings")
    public List<DrawingSheet> listDrawings(@PathVariable UUID projectId, @AuthenticationPrincipal CurrentUser user) {
        projectService.get(projectId, user);
        List<DrawingSheet> list = sheetsRepo.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId);
        if (list.isEmpty()) {
            // Seed a default architectural plan for immediate visual usability
            DrawingSheet sample = new DrawingSheet();
            sample.organizationId = user.organizationId();
            sample.projectId = projectId;
            sample.title = "Level 2 - Architectural Layout & Partitions";
            sample.sheetNumber = "A-201";
            sample.imageUrl = "/blueprint-sample.svg";
            sheetsRepo.save(sample);
            return List.of(sample);
        }
        return list;
    }

    @PostMapping("/api/projects/{projectId}/drawings")
    public DrawingSheet createDrawing(
        @PathVariable UUID projectId,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        projectService.get(projectId, user);
        String title = body.getOrDefault("title", "New Floor Plan").trim();
        String sheetNumber = body.getOrDefault("sheetNumber", "A-101").trim();
        String imageUrl = body.getOrDefault("imageUrl", "/blueprint-sample.svg").trim();

        DrawingSheet ds = new DrawingSheet();
        ds.organizationId = user.organizationId();
        ds.projectId = projectId;
        ds.title = title;
        ds.sheetNumber = sheetNumber;
        ds.imageUrl = imageUrl.isBlank() ? "/blueprint-sample.svg" : imageUrl;
        return sheetsRepo.save(ds);
    }

    @GetMapping("/api/drawings/{drawingId}/pins")
    public List<DrawingPin> listPins(@PathVariable UUID drawingId, @AuthenticationPrincipal CurrentUser user) {
        return pinsRepo.findAllByOrganizationIdAndDrawingIdOrderByCreatedAtDesc(user.organizationId(), drawingId);
    }

    @PostMapping("/api/drawings/{drawingId}/pins")
    public DrawingPin createPin(
        @PathVariable UUID drawingId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        DrawingSheet sheet = sheetsRepo.findById(drawingId)
            .filter(s -> s.organizationId.equals(user.organizationId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Drawing sheet not found"));

        DrawingPin pin = new DrawingPin();
        pin.organizationId = user.organizationId();
        pin.projectId = sheet.projectId;
        pin.drawingId = drawingId;
        pin.xPercent = ((Number) body.getOrDefault("xPercent", 50.0)).doubleValue();
        pin.yPercent = ((Number) body.getOrDefault("yPercent", 50.0)).doubleValue();
        pin.title = (String) body.getOrDefault("title", "New Pin");
        pin.pinType = (String) body.getOrDefault("pinType", "ISSUE");
        pin.severity = (String) body.getOrDefault("severity", "MEDIUM");
        pin.status = (String) body.getOrDefault("status", "OPEN");
        pin.trade = (String) body.getOrDefault("trade", "General");
        pin.description = (String) body.getOrDefault("description", "");
        pin.createdBy = user.id();

        return pinsRepo.save(pin);
    }

    @PatchMapping("/api/drawings/pins/{pinId}")
    public DrawingPin updatePin(
        @PathVariable UUID pinId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        DrawingPin pin = pinsRepo.findById(pinId)
            .filter(p -> p.organizationId.equals(user.organizationId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pin not found"));

        if (body.containsKey("status")) pin.status = (String) body.get("status");
        if (body.containsKey("title")) pin.title = (String) body.get("title");
        if (body.containsKey("severity")) pin.severity = (String) body.get("severity");
        if (body.containsKey("description")) pin.description = (String) body.get("description");

        return pinsRepo.save(pin);
    }

    @DeleteMapping("/api/drawings/pins/{pinId}")
    public void deletePin(@PathVariable UUID pinId, @AuthenticationPrincipal CurrentUser user) {
        DrawingPin pin = pinsRepo.findById(pinId)
            .filter(p -> p.organizationId.equals(user.organizationId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pin not found"));
        pinsRepo.delete(pin);
    }
}
