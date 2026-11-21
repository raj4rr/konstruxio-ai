package ai.konstruxio.api;

import ai.konstruxio.domain.Entities.TmTicket;
import ai.konstruxio.repo.TmTickets;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/tm-tickets")
public class TmTicketController {
    private final TmTickets tickets;
    private final ProjectService projects;

    public TmTicketController(TmTickets tickets, ProjectService projects) {
        this.tickets = tickets;
        this.projects = projects;
    }

    @GetMapping
    public List<TmTicket> list(@PathVariable UUID projectId, @AuthenticationPrincipal CurrentUser user) {
        projects.get(projectId, user);
        return tickets.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId);
    }

    @PostMapping
    public TmTicket create(
        @PathVariable UUID projectId,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        projects.get(projectId, user);
        TmTicket t = new TmTicket();
        t.organizationId = user.organizationId();
        t.projectId = projectId;
        t.ticketNumber = String.valueOf(body.getOrDefault("ticketNumber", "TM-" + (System.currentTimeMillis() % 10000)));
        t.title = String.valueOf(body.getOrDefault("title", "Extra Work Ticket"));
        t.clientDirective = (String) body.get("clientDirective");
        t.trade = (String) body.get("trade");
        t.laborHours = (String) body.get("laborHours");
        t.materialsUsed = (String) body.get("materialsUsed");
        Object cost = body.get("estimatedCost");
        if (cost instanceof Number) {
            t.estimatedCost = BigDecimal.valueOf(((Number) cost).doubleValue());
        } else if (cost instanceof String) {
            try { t.estimatedCost = new BigDecimal((String) cost); } catch (Exception ignored) {}
        }
        t.status = String.valueOf(body.getOrDefault("status", "PENDING_APPROVAL"));
        t.createdBy = user.id();
        return tickets.save(t);
    }

    @PutMapping("/{id}/sign")
    public TmTicket sign(
        @PathVariable UUID projectId,
        @PathVariable UUID id,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        projects.get(projectId, user);
        TmTicket t = tickets.findByIdAndOrganizationId(id, user.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "T&M Ticket not found"));
        t.signedBy = body.getOrDefault("signedBy", user.email());
        t.customerSignature = body.getOrDefault("signature", "DIGITALLY_APPROVED");
        t.signedAt = Instant.now();
        t.status = "APPROVED";
        t.updatedAt = Instant.now();
        return tickets.save(t);
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> delete(
        @PathVariable UUID projectId,
        @PathVariable UUID id,
        @AuthenticationPrincipal CurrentUser user
    ) {
        projects.get(projectId, user);
        TmTicket t = tickets.findByIdAndOrganizationId(id, user.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "T&M Ticket not found"));
        tickets.delete(t);
        return Map.of("deleted", true);
    }
}
