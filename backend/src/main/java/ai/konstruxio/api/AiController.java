package ai.konstruxio.api;

import ai.konstruxio.api.ApiModels.*;
import ai.konstruxio.ai.AiService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/ai")
public class AiController {
    private final AiService ai;
    public AiController(AiService ai) { this.ai=ai; }
    @PostMapping("/chat") public ChatResponse chat(@Valid @RequestBody ChatRequest r) { return ai.chat(r.message()); }
}
