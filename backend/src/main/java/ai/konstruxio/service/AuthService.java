package ai.konstruxio.service;

import ai.konstruxio.api.ApiModels.*;
import ai.konstruxio.domain.Entities.*;
import ai.konstruxio.repo.*;
import ai.konstruxio.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final Organizations organizations; private final Users users;
    private final PasswordEncoder encoder; private final JwtService jwt;
    public AuthService(Organizations o, Users u, PasswordEncoder e, JwtService j) {
        organizations=o; users=u; encoder=e; jwt=j;
    }
    @Transactional public AuthResponse register(RegisterRequest r) {
        if (users.findByEmailIgnoreCase(r.email()).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        Organization org = organizations.save(new Organization(r.organizationName()));
        AppUser user = new AppUser(); user.organizationId=org.id; user.fullName=r.fullName();
        user.email=r.email().toLowerCase(); user.passwordHash=encoder.encode(r.password()); user.role="ADMIN";
        users.save(user);
        return response(user);
    }
    public AuthResponse login(LoginRequest r) {
        AppUser user=users.findByEmailIgnoreCase(r.email())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid credentials"));
        if (!encoder.matches(r.password(), user.passwordHash))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid credentials");
        return response(user);
    }
    private AuthResponse response(AppUser u) {
        return new AuthResponse(jwt.generate(u.id,u.organizationId,u.email,u.role),"Bearer",
            u.id,u.organizationId,u.fullName,u.email,u.role);
    }
}
