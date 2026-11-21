package ai.konstruxio.api;

import ai.konstruxio.domain.Entities.AppUser;
import ai.konstruxio.domain.Entities.Organization;
import ai.konstruxio.repo.Organizations;
import ai.konstruxio.repo.Users;
import ai.konstruxio.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final Users users;
    private final Organizations organizations;
    private final PasswordEncoder encoder;

    public UserController(Users users, Organizations organizations, PasswordEncoder encoder) {
        this.users = users;
        this.organizations = organizations;
        this.encoder = encoder;
    }

    /**
     * 1. Get current user's profile
     */
    @GetMapping("/me")
    public Map<String, Object> getCurrentUserProfile(@AuthenticationPrincipal CurrentUser user) {
        AppUser u = users.findById(user.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found"));
        Organization org = organizations.findById(user.organizationId()).orElse(null);

        return Map.of(
            "id", u.id.toString(),
            "fullName", u.fullName,
            "email", u.email,
            "role", u.role,
            "organizationId", u.organizationId.toString(),
            "organizationName", org != null ? org.name : "Konstruxio Organization",
            "createdAt", u.createdAt.toString(),
            "isProjectOwner", isProjectOwner(user)
        );
    }

    /**
     * 2. Update current user's profile
     */
    @PutMapping("/me")
    @Transactional
    public Map<String, Object> updateCurrentUserProfile(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        AppUser u = users.findById(user.id())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found"));

        if (body.containsKey("fullName") && !body.get("fullName").isBlank()) {
            u.fullName = body.get("fullName").trim();
        }

        if (body.containsKey("newPassword") && !body.get("newPassword").isBlank()) {
            String newPassword = body.get("newPassword");
            if (newPassword.length() < 8) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
            }
            if (body.containsKey("currentPassword")) {
                if (!encoder.matches(body.get("currentPassword"), u.passwordHash)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password does not match");
                }
            }
            u.passwordHash = encoder.encode(newPassword);
        }

        users.save(u);
        return getCurrentUserProfile(user);
    }

    /**
     * 3. Get all available roles & permission descriptions
     */
    @GetMapping("/roles")
    public List<Map<String, Object>> getRoles() {
        return List.of(
            Map.of(
                "role", "PROJECT_OWNER",
                "label", "Project Owner (Admin)",
                "description", "Full authority over organization, team members, user roles, billing, and project settings.",
                "permissions", List.of("Manage Users", "Sign T&M Tickets", "Manage Projects", "All Operational Modules")
            ),
            Map.of(
                "role", "PROJECT_MANAGER",
                "label", "Project Manager / Superintendent",
                "description", "Manages site logistics, tasks, issues, daily logs, drawings, and weekly owner handover reports.",
                "permissions", List.of("Manage Tasks & Issues", "Approve Daily Logs", "Drawing Pins", "Weather Defense")
            ),
            Map.of(
                "role", "FIELD_ENGINEER",
                "label", "Field Engineer / Foreman",
                "description", "Voice dictation on site, clash capture (RFIs), snag photo inspections, and task progress.",
                "permissions", List.of("Voice Dictation", "RFI Capture", "Photo Snagging", "Update Task Status")
            ),
            Map.of(
                "role", "SUBCONTRACTOR",
                "label", "Trade Subcontractor",
                "description", "Trade partner responsible for completing assigned tasks and correcting flagged defect items.",
                "permissions", List.of("View Assigned Tasks", "Mark Issues Resolved", "View Drawings")
            ),
            Map.of(
                "role", "VIEWER",
                "label", "Inspector / Owner Representative",
                "description", "Read-only audit access for quality, compliance, and weekly owner executive summaries.",
                "permissions", List.of("Read-Only Blueprints", "View Owner Reports", "View Specifications")
            )
        );
    }

    /**
     * 4. List all users in the organization (PROJECT_OWNER only)
     */
    @GetMapping
    public List<Map<String, Object>> listOrganizationUsers(@AuthenticationPrincipal CurrentUser user) {
        verifyProjectOwner(user);

        List<AppUser> list = users.findAllByOrganizationIdOrderByCreatedAtDesc(user.organizationId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (AppUser u : list) {
            result.add(Map.of(
                "id", u.id.toString(),
                "fullName", u.fullName,
                "email", u.email,
                "role", u.role,
                "organizationId", u.organizationId.toString(),
                "createdAt", u.createdAt.toString(),
                "isSelf", u.id.equals(user.id())
            ));
        }
        return result;
    }

    /**
     * 5. Add / Invite a new team member with role (PROJECT_OWNER only)
     */
    @PostMapping
    @Transactional
    public Map<String, Object> createUser(
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        verifyProjectOwner(user);

        String email = body.getOrDefault("email", "").trim().toLowerCase();
        String fullName = body.getOrDefault("fullName", "").trim();
        String role = body.getOrDefault("role", "FIELD_ENGINEER").trim().toUpperCase();
        String password = body.getOrDefault("password", "Welcome123!").trim();

        if (email.isBlank() || fullName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Full Name and Email are required");
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User with this email already exists");
        }

        // Validate role
        if (!isValidRole(role)) {
            role = "FIELD_ENGINEER";
        }

        AppUser newUser = new AppUser();
        newUser.organizationId = user.organizationId();
        newUser.fullName = fullName;
        newUser.email = email;
        newUser.passwordHash = encoder.encode(password);
        newUser.role = role;

        AppUser saved = users.save(newUser);
        return Map.of(
            "id", saved.id.toString(),
            "fullName", saved.fullName,
            "email", saved.email,
            "role", saved.role,
            "organizationId", saved.organizationId.toString(),
            "createdAt", saved.createdAt.toString()
        );
    }

    /**
     * 6. Change a user's role (PROJECT_OWNER only)
     */
    @PutMapping("/{id}/role")
    @Transactional
    public Map<String, Object> updateUserRole(
        @PathVariable UUID id,
        @RequestBody Map<String, String> body,
        @AuthenticationPrincipal CurrentUser user
    ) {
        verifyProjectOwner(user);

        AppUser target = users.findByIdAndOrganizationId(id, user.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found in organization"));

        String newRole = body.getOrDefault("role", "").trim().toUpperCase();
        if (!isValidRole(newRole)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role specified");
        }

        // Safety: Do not demote yourself if you are the only owner
        if (target.id.equals(user.id()) && !("PROJECT_OWNER".equals(newRole) || "ADMIN".equals(newRole))) {
            long ownerCount = countOwners(user.organizationId());
            if (ownerCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the only Project Owner");
            }
        }

        target.role = newRole;
        users.save(target);

        return Map.of(
            "id", target.id.toString(),
            "fullName", target.fullName,
            "email", target.email,
            "role", target.role,
            "updated", true
        );
    }

    /**
     * 7. Delete / Remove user from organization (PROJECT_OWNER only)
     */
    @DeleteMapping("/{id}")
    @Transactional
    public Map<String, Object> deleteUser(
        @PathVariable UUID id,
        @AuthenticationPrincipal CurrentUser user
    ) {
        verifyProjectOwner(user);

        if (id.equals(user.id())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }

        AppUser target = users.findByIdAndOrganizationId(id, user.organizationId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found in organization"));

        if ("PROJECT_OWNER".equalsIgnoreCase(target.role) || "ADMIN".equalsIgnoreCase(target.role)) {
            long ownerCount = countOwners(user.organizationId());
            if (ownerCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete the only Project Owner");
            }
        }

        users.delete(target);
        return Map.of("deleted", true, "id", id.toString());
    }

    // Role verification helpers
    private boolean isProjectOwner(CurrentUser user) {
        return "PROJECT_OWNER".equalsIgnoreCase(user.role()) || "ADMIN".equalsIgnoreCase(user.role());
    }

    private void verifyProjectOwner(CurrentUser user) {
        if (!isProjectOwner(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Access Denied: Only Project Owners can manage organization team members and user roles.");
        }
    }

    private boolean isValidRole(String role) {
        return Set.of("PROJECT_OWNER", "ADMIN", "PROJECT_MANAGER", "FIELD_ENGINEER", "SUBCONTRACTOR", "VIEWER")
            .contains(role);
    }

    private long countOwners(UUID organizationId) {
        return users.countByOrganizationIdAndRole(organizationId, "PROJECT_OWNER") +
               users.countByOrganizationIdAndRole(organizationId, "ADMIN");
    }
}
