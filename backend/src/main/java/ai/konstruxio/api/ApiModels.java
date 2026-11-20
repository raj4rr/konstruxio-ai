package ai.konstruxio.api;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;

public final class ApiModels {
    private ApiModels() {}
    public record RegisterRequest(@NotBlank String organizationName, @NotBlank String fullName,
                                  @Email @NotBlank String email, @Size(min=10) String password) {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record AuthResponse(String token, String tokenType, UUID userId, UUID organizationId,
                               String fullName, String email, String role) {}
    public record ProjectRequest(@NotBlank String name, String description, String location,
                                 LocalDate startDate, LocalDate endDate) {}
    public record TaskRequest(@NotNull UUID projectId, @NotBlank String title, String description,
                              String priority, UUID assignedTo, LocalDate dueDate) {}
    public record TaskUpdate(String status, String priority, String title, String description) {}
    public record IssueRequest(@NotNull UUID projectId, @NotBlank String title, String description,
                               String severity, String locationReference, String trade,
                               String photoData, String aiSuggestion) {}
    public record IssueUpdate(String status, String severity, String trade, String resolvedPhotoData) {}
    public record ReportRequest(@NotNull UUID projectId, @NotNull LocalDate reportDate, String weather,
                                Integer workersCount, String workCompleted, String blockers,
                                String materials, String safetyNotes) {}
    public record ChatRequest(@NotBlank @Size(max=12000) String message, UUID projectId) {}
    public record ChatResponse(String provider, String model, String answer) {}
}
