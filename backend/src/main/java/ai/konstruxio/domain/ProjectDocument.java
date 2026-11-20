package ai.konstruxio.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "project_documents")
public class ProjectDocument {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @Column(name = "organization_id", nullable = false)
    public UUID organizationId;
    @Column(name = "project_id", nullable = false)
    public UUID projectId;
    @Column(nullable = false)
    public String filename;
    @Column(name = "content_type", nullable = false)
    public String contentType;
    @Column(name = "file_size", nullable = false)
    public long fileSize;
    @Column(name = "uploaded_by", nullable = false)
    public UUID uploadedBy;
    @Column(name = "created_at")
    public Instant createdAt = Instant.now();
}
