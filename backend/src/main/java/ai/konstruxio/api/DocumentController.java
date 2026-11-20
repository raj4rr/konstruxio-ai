package ai.konstruxio.api;

import ai.konstruxio.ai.AiService;
import ai.konstruxio.document.DocumentService;
import ai.konstruxio.document.DocumentService.ChunkHit;
import ai.konstruxio.domain.ProjectDocument;
import ai.konstruxio.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
@RequestMapping("/api/projects/{projectId}/documents")
public class DocumentController {
    private final DocumentService documents;
    private final AiService ai;
    public DocumentController(DocumentService documents, AiService ai) { this.documents=documents; this.ai=ai; }

    @PostMapping(consumes = "multipart/form-data")
    public ProjectDocument upload(@PathVariable UUID projectId, @RequestPart("file") MultipartFile file,
                                  @AuthenticationPrincipal CurrentUser user) {
        return documents.upload(projectId, file, user);
    }

    @GetMapping
    public List<ProjectDocument> list(@PathVariable UUID projectId, @AuthenticationPrincipal CurrentUser user) {
        return documents.list(projectId, user);
    }

    @PostMapping("/ask")
    public DocumentAnswer ask(@PathVariable UUID projectId, @Valid @RequestBody AskRequest request,
                              @AuthenticationPrincipal CurrentUser user) {
        List<ChunkHit> hits = documents.search(projectId, request.question(), user);
        if (hits.isEmpty()) return new DocumentAnswer("retrieval", "postgres-full-text", "I could not find matching passages in this project's uploaded PDFs. Try different terms or upload a text-searchable PDF.", List.of());
        String context = hits.stream().map(h -> "[" + h.filename() + ", page " + h.page() + "] " + h.content())
            .reduce((a,b) -> a + "\n\n" + b).orElse("");
        var answer = ai.chatWithContext(request.question(), context.isBlank() ? "No matching passages were found in the uploaded project documents." : context);
        List<Source> sources = hits.stream().map(h -> new Source(h.filename(), h.page(), h.score())).toList();
        return new DocumentAnswer(answer.provider(), answer.model(), answer.answer(), sources);
    }
    public record AskRequest(@NotBlank String question) {}
    public record Source(String filename, int page, float relevance) {}
    public record DocumentAnswer(String provider, String model, String answer, List<Source> sources) {}
}
