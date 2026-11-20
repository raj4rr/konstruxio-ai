package ai.konstruxio.service;

import ai.konstruxio.api.ApiModels.ProjectRequest;
import ai.konstruxio.domain.Entities.Project;
import ai.konstruxio.repo.Projects;
import ai.konstruxio.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class ProjectService {
    private final Projects projects;
    public ProjectService(Projects projects) { this.projects=projects; }
    public List<Project> list(CurrentUser u) { return projects.findAllByOrganizationIdOrderByCreatedAtDesc(u.organizationId()); }
    public Project get(UUID id, CurrentUser u) { return projects.findByIdAndOrganizationId(id,u.organizationId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)); }
    public Project create(ProjectRequest r, CurrentUser u) {
        Project p=new Project(); p.organizationId=u.organizationId(); p.createdBy=u.id();
        p.name=r.name(); p.description=r.description(); p.location=r.location();
        p.startDate=r.startDate(); p.endDate=r.endDate(); return projects.save(p);
    }
    public Project update(UUID id, ProjectRequest r, CurrentUser u) {
        Project p=get(id,u); p.name=r.name(); p.description=r.description(); p.location=r.location();
        p.startDate=r.startDate(); p.endDate=r.endDate(); p.updatedAt=java.time.Instant.now();
        return projects.save(p);
    }
}
