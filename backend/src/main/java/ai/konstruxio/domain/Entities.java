package ai.konstruxio.domain;

import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

public final class Entities {
    private Entities() {}

    @Entity @Table(name="organizations")
    public static class Organization {
        @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
        @Column(nullable=false) public String name;
        @Column(name="created_at") public Instant createdAt = Instant.now();
        protected Organization() {}
        public Organization(String name) { this.name = name; }
    }

    @Entity @Table(name="app_users")
    public static class AppUser {
        @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
        @Column(name="organization_id", nullable=false) public UUID organizationId;
        @Column(name="full_name", nullable=false) public String fullName;
        @Column(nullable=false, unique=true) public String email;
        @Column(name="password_hash", nullable=false) public String passwordHash;
        @Column(nullable=false) public String role = "ADMIN";
        @Column(name="created_at") public Instant createdAt = Instant.now();
        public AppUser() {}
    }

    @MappedSuperclass
    public abstract static class TenantEntity {
        @Id @GeneratedValue(strategy=GenerationType.UUID) public UUID id;
        @Column(name="organization_id", nullable=false) public UUID organizationId;
        @Column(name="created_at") public Instant createdAt = Instant.now();
    }

    @Entity @Table(name="projects")
    public static class Project extends TenantEntity {
        @Column(nullable=false) public String name;
        @Column(columnDefinition="text") public String description;
        public String location;
        public String status = "ACTIVE";
        @Column(name="start_date") public LocalDate startDate;
        @Column(name="end_date") public LocalDate endDate;
        public Double latitude;
        public Double longitude;
        @Column(name="weather_notes", columnDefinition="text") public String weatherNotes;
        @Column(name="created_by", nullable=false) public UUID createdBy;
        @Column(name="updated_at") public Instant updatedAt = Instant.now();
    }

    @Entity @Table(name="tasks")
    public static class Task extends TenantEntity {
        @Column(name="project_id", nullable=false) public UUID projectId;
        @Column(nullable=false) public String title;
        @Column(columnDefinition="text") public String description;
        public String status = "TODO";
        public String priority = "MEDIUM";
        @Column(name="assigned_to") public UUID assignedTo;
        @Column(name="due_date") public LocalDate dueDate;
        @Column(name="created_by", nullable=false) public UUID createdBy;
        @Column(name="updated_at") public Instant updatedAt = Instant.now();
    }

    @Entity @Table(name="site_issues")
    public static class SiteIssue extends TenantEntity {
        @Column(name="project_id", nullable=false) public UUID projectId;
        @Column(nullable=false) public String title;
        @Column(columnDefinition="text") public String description;
        public String severity = "MEDIUM";
        public String status = "OPEN";
        @Column(name="location_reference") public String locationReference;
        @Column(name="photo_data", columnDefinition="text") public String photoData;
        public String trade;
        @Column(name="ai_suggestion", columnDefinition="text") public String aiSuggestion;
        @Column(name="resolved_photo_data", columnDefinition="text") public String resolvedPhotoData;
        @Column(name="reported_by", nullable=false) public UUID reportedBy;
        @Column(name="updated_at") public Instant updatedAt = Instant.now();
    }

    @Entity @Table(name="daily_reports")
    public static class DailyReport extends TenantEntity {
        @Column(name="project_id", nullable=false) public UUID projectId;
        @Column(name="report_date", nullable=false) public LocalDate reportDate;
        public String weather;
        @Column(name="workers_count") public Integer workersCount;
        @Column(name="work_completed", columnDefinition="text") public String workCompleted;
        @Column(columnDefinition="text") public String blockers;
        @Column(columnDefinition="text") public String materials;
        @Column(name="safety_notes", columnDefinition="text") public String safetyNotes;
        @Column(name="created_by", nullable=false) public UUID createdBy;
    }

    @Entity @Table(name="drawing_sheets")
    public static class DrawingSheet extends TenantEntity {
        @Column(name="project_id", nullable=false) public UUID projectId;
        @Column(nullable=false) public String title;
        @Column(name="sheet_number") public String sheetNumber;
        @Column(name="image_url", nullable=false, columnDefinition="text") public String imageUrl;
    }

    @Entity @Table(name="drawing_pins")
    public static class DrawingPin extends TenantEntity {
        @Column(name="project_id", nullable=false) public UUID projectId;
        @Column(name="drawing_id", nullable=false) public UUID drawingId;
        @Column(name="x_percent", nullable=false) public Double xPercent;
        @Column(name="y_percent", nullable=false) public Double yPercent;
        @Column(nullable=false) public String title;
        @Column(name="pin_type", nullable=false) public String pinType = "ISSUE";
        public String severity = "MEDIUM";
        public String status = "OPEN";
        public String trade;
        @Column(columnDefinition="text") public String description;
        @Column(name="created_by", nullable=false) public UUID createdBy;
    }

    @Entity @Table(name="rfis")
    public static class Rfi extends TenantEntity {
        @Column(name="project_id", nullable=false) public UUID projectId;
        @Column(name="rfi_number", nullable=false) public String rfiNumber;
        @Column(nullable=false) public String title;
        @Column(nullable=false, columnDefinition="text") public String question;
        public String discipline;
        public String trade;
        @Column(name="drawing_reference") public String drawingReference;
        @Column(name="suggested_solution", columnDefinition="text") public String suggestedSolution;
        @Column(name="schedule_impact") public Boolean scheduleImpact = false;
        @Column(name="cost_impact") public Boolean costImpact = false;
        public String status = "OPEN";
        @Column(name="official_response", columnDefinition="text") public String officialResponse;
        @Column(name="created_by", nullable=false) public UUID createdBy;
        @Column(name="updated_at") public java.time.Instant updatedAt = java.time.Instant.now();
    }

    @Entity @Table(name="tm_tickets")
    public static class TmTicket extends TenantEntity {
        @Column(name="project_id", nullable=false) public UUID projectId;
        @Column(name="ticket_number", nullable=false) public String ticketNumber;
        @Column(nullable=false) public String title;
        @Column(name="client_directive") public String clientDirective;
        public String trade;
        @Column(name="labor_hours", columnDefinition="text") public String laborHours;
        @Column(name="materials_used", columnDefinition="text") public String materialsUsed;
        @Column(name="estimated_cost") public java.math.BigDecimal estimatedCost = java.math.BigDecimal.ZERO;
        public String status = "PENDING_APPROVAL";
        @Column(name="customer_signature", columnDefinition="text") public String customerSignature;
        @Column(name="signed_by") public String signedBy;
        @Column(name="signed_at") public java.time.Instant signedAt;
        @Column(name="created_by", nullable=false) public UUID createdBy;
        @Column(name="updated_at") public java.time.Instant updatedAt = java.time.Instant.now();
    }
}
