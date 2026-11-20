package ai.konstruxio.api;

import ai.konstruxio.api.ApiModels.ProjectRequest;
import ai.konstruxio.domain.Entities.Project;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService service;
    public ProjectController(ProjectService service) { this.service=service; }
    @GetMapping public List<Project> list(@AuthenticationPrincipal CurrentUser u) { return service.list(u); }
    @PostMapping public Project create(@Valid @RequestBody ProjectRequest r,@AuthenticationPrincipal CurrentUser u) { return service.create(r,u); }
    @GetMapping("/{id}") public Project get(@PathVariable UUID id,@AuthenticationPrincipal CurrentUser u) { return service.get(id,u); }
    @PatchMapping("/{id}") public Project update(@PathVariable UUID id,@Valid @RequestBody ProjectRequest r,@AuthenticationPrincipal CurrentUser u) { return service.update(id,r,u); }
}
