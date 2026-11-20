package ai.konstruxio.api;

import ai.konstruxio.api.ApiModels.*;
import ai.konstruxio.domain.Entities.*;
import ai.konstruxio.repo.*;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestController
public class WorkController {
    private final Tasks tasks; private final Issues issues; private final Reports reports;
    private final ProjectService projectService;
    public WorkController(Tasks t, Issues i, Reports r, ProjectService p) {
        tasks=t; issues=i; reports=r; projectService=p;
    }
    @GetMapping("/api/tasks") public List<Task> tasks(@RequestParam UUID projectId,@AuthenticationPrincipal CurrentUser u) {
        projectService.get(projectId,u); return tasks.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(u.organizationId(),projectId);
    }
    @PostMapping("/api/tasks") public Task createTask(@Valid @RequestBody TaskRequest r,@AuthenticationPrincipal CurrentUser u) {
        projectService.get(r.projectId(),u); Task t=new Task(); t.organizationId=u.organizationId(); t.projectId=r.projectId();
        t.title=r.title(); t.description=r.description(); t.priority=r.priority()==null?"MEDIUM":r.priority();
        t.assignedTo=r.assignedTo(); t.dueDate=r.dueDate(); t.createdBy=u.id(); return tasks.save(t);
    }
    @PatchMapping("/api/tasks/{id}") public Task updateTask(@PathVariable UUID id,@RequestBody TaskUpdate r,@AuthenticationPrincipal CurrentUser u) {
        Task t=tasks.findByIdAndOrganizationId(id,u.organizationId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(r.title()!=null)t.title=r.title(); if(r.description()!=null)t.description=r.description();
        if(r.status()!=null)t.status=r.status(); if(r.priority()!=null)t.priority=r.priority(); t.updatedAt=Instant.now(); return tasks.save(t);
    }
    @GetMapping("/api/issues") public List<SiteIssue> issues(@RequestParam UUID projectId,@AuthenticationPrincipal CurrentUser u) {
        projectService.get(projectId,u); return issues.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(u.organizationId(),projectId);
    }
    @PostMapping("/api/issues") public SiteIssue createIssue(@Valid @RequestBody IssueRequest r,@AuthenticationPrincipal CurrentUser u) {
        projectService.get(r.projectId(),u); SiteIssue x=new SiteIssue(); x.organizationId=u.organizationId(); x.projectId=r.projectId();
        x.title=r.title(); x.description=r.description(); x.severity=r.severity()==null?"MEDIUM":r.severity();
        x.locationReference=r.locationReference(); x.trade=r.trade(); x.photoData=r.photoData();
        x.aiSuggestion=r.aiSuggestion(); x.reportedBy=u.id(); return issues.save(x);
    }
    @PatchMapping("/api/issues/{id}") public SiteIssue updateIssue(@PathVariable UUID id,@RequestBody IssueUpdate r,@AuthenticationPrincipal CurrentUser u) {
        SiteIssue x=issues.findByIdAndOrganizationId(id,u.organizationId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(r.status()!=null)x.status=r.status(); if(r.severity()!=null)x.severity=r.severity();
        if(r.trade()!=null)x.trade=r.trade(); if(r.resolvedPhotoData()!=null)x.resolvedPhotoData=r.resolvedPhotoData();
        x.updatedAt=Instant.now(); return issues.save(x);
    }
    @GetMapping("/api/reports") public List<DailyReport> reports(@RequestParam UUID projectId,@AuthenticationPrincipal CurrentUser u) {
        projectService.get(projectId,u); return reports.findAllByOrganizationIdAndProjectIdOrderByReportDateDesc(u.organizationId(),projectId);
    }
    @PostMapping("/api/reports") public DailyReport createReport(@Valid @RequestBody ReportRequest r,@AuthenticationPrincipal CurrentUser u) {
        projectService.get(r.projectId(),u); DailyReport d=new DailyReport(); d.organizationId=u.organizationId(); d.projectId=r.projectId();
        d.reportDate=r.reportDate(); d.weather=r.weather(); d.workersCount=r.workersCount(); d.workCompleted=r.workCompleted();
        d.blockers=r.blockers(); d.materials=r.materials(); d.safetyNotes=r.safetyNotes(); d.createdBy=u.id(); return reports.save(d);
    }
}
