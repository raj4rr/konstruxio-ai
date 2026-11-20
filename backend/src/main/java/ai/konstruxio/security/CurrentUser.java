package ai.konstruxio.security;

import java.util.UUID;
public record CurrentUser(UUID id, UUID organizationId, String email, String role) {}
