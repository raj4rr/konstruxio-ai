package ai.konstruxio.document;

import ai.konstruxio.domain.ProjectDocument;
import ai.konstruxio.ai.EmbeddingService;
import org.apache.pdfbox.rendering.PDFRenderer;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import ai.konstruxio.repo.DocumentRepository;
import ai.konstruxio.security.CurrentUser;
import ai.konstruxio.service.ProjectService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.io.IOException;
import java.util.*;

@Service
public class DocumentService {
    private final DocumentRepository documents;
    private final JdbcTemplate jdbc;
    private final ProjectService projects;
    private final EmbeddingService embeddings;
    private final OcrClient ocr;

    public DocumentService(DocumentRepository documents, JdbcTemplate jdbc, ProjectService projects, EmbeddingService embeddings, OcrClient ocr) {
        this.documents = documents; this.jdbc = jdbc; this.projects = projects; this.embeddings=embeddings; this.ocr=ocr;
    }

    @Transactional
    public ProjectDocument upload(UUID projectId, MultipartFile file, CurrentUser user) {
        projects.get(projectId, user);
        if (file.isEmpty() || file.getSize() > 15L * 1024 * 1024)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF must be non-empty and at most 15 MB");
        if (!"application/pdf".equalsIgnoreCase(file.getContentType()) ||
                file.getOriginalFilename() == null || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".pdf"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PDF documents are supported");
        ProjectDocument doc = new ProjectDocument();
        doc.organizationId = user.organizationId(); doc.projectId = projectId;
        doc.filename = sanitizeFilename(file.getOriginalFilename()); doc.contentType = "application/pdf";
        doc.fileSize = file.getSize(); doc.uploadedBy = user.id();
        documents.save(doc);
        try (PDDocument pdf = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            PDFRenderer renderer = new PDFRenderer(pdf);
            int pages = pdf.getNumberOfPages();
            if (pages > 300) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF exceeds the 300-page processing limit");
            for (int page = 1; page <= pages; page++) {
                stripper.setStartPage(page); stripper.setEndPage(page);
                String text = stripper.getText(pdf);
                if (text == null || text.replaceAll("\\s+", "").length() < 20) {
                    try { BufferedImage image = renderer.renderImageWithDPI(page - 1, 180); ByteArrayOutputStream png = new ByteArrayOutputStream(); ImageIO.write(image, "png", png); text = ocr.extract(png.toByteArray(), "page-" + page + ".png"); }
                    catch (Exception ocrError) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OCR failed on PDF page " + page + ". Check the media service."); }
                }
                List<String> chunks = chunk(text, 1200, 180);
                for (int i = 0; i < chunks.size(); i++) {
                    float[] vector = embeddings.embed(chunks.get(i));
                    jdbc.update("INSERT INTO document_chunks (organization_id, project_id, document_id, page_number, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?, ?, CAST(? AS vector))",
                        user.organizationId(), projectId, doc.id, page, i, chunks.get(i), EmbeddingService.toPgVector(vector));
                }
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read PDF. It may be encrypted or invalid.");
        }
        return doc;
    }

    public List<ProjectDocument> list(UUID projectId, CurrentUser user) {
        projects.get(projectId, user);
        return documents.findAllByOrganizationIdAndProjectIdOrderByCreatedAtDesc(user.organizationId(), projectId);
    }

    public List<ChunkHit> search(UUID projectId, String question, CurrentUser user) {
        projects.get(projectId, user);
        float[] queryVector = embeddings.embed(question);
        String sql = "SELECT c.content, c.page_number, d.filename, (1 - (c.embedding <=> CAST(? AS vector))) AS score " +
            "FROM document_chunks c JOIN project_documents d ON d.id=c.document_id " +
            "WHERE c.organization_id=? AND c.project_id=? AND c.embedding IS NOT NULL " +
            "ORDER BY c.embedding <=> CAST(? AS vector) LIMIT 6";
        String vector = EmbeddingService.toPgVector(queryVector);
        return jdbc.query(sql, (rs, n) -> new ChunkHit(rs.getString("filename"), rs.getInt("page_number"),
            rs.getString("content"), rs.getFloat("score")), vector, user.organizationId(), projectId, vector);
    }

    private static String sanitizeFilename(String name) {
        if (name == null) return "uploaded.pdf";
        String safe = name.replaceAll("[^A-Za-z0-9._ -]", "_");
        return safe.substring(0, Math.min(safe.length(), 240));
    }
    private static List<String> chunk(String text, int size, int overlap) {
        String normalized = text == null ? "" : text.replaceAll("\\s+", " ").trim();
        List<String> out = new ArrayList<>();
        for (int start = 0; start < normalized.length(); start += size - overlap) {
            String part = normalized.substring(start, Math.min(normalized.length(), start + size)).trim();
            if (!part.isBlank()) out.add(part);
            if (start + size >= normalized.length()) break;
        }
        return out;
    }
    public record ChunkHit(String filename, int page, String content, float score) {}
}
