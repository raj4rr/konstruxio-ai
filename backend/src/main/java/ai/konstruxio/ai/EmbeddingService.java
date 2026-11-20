package ai.konstruxio.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.*;

@Service
public class EmbeddingService {
    private final RestClient client = RestClient.create();
    private final String baseUrl, model;
    public EmbeddingService(@Value("${app.ai.ollama-base-url}") String baseUrl, @Value("${app.ai.embedding-model:nomic-embed-text}") String model) { this.baseUrl=baseUrl; this.model=model; }
    @SuppressWarnings("unchecked")
    public float[] embed(String text) {
        Map<String,Object> response = client.post().uri(baseUrl + "/api/embed").body(Map.of("model", model, "input", text)).retrieve().body(Map.class);
        List<Number> values = (List<Number>) ((List<?>) response.get("embeddings")).get(0);
        float[] vector = new float[values.size()]; for (int i=0;i<values.size();i++) vector[i]=values.get(i).floatValue();
        if (vector.length != 768) throw new IllegalStateException("Embedding model must return 768 dimensions; got " + vector.length);
        return vector;
    }
    public static String toPgVector(float[] vector) { StringJoiner j=new StringJoiner(",","[","]"); for(float v:vector) j.add(Float.toString(v)); return j.toString(); }
}
