package ai.konstruxio.document;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@Component
public class OcrClient {
 private final RestClient client=RestClient.create(); private final String url;
 public OcrClient(@Value("${app.media.base-url:http://localhost:8090}") String url){this.url=url;}
 @SuppressWarnings("unchecked") public String extract(byte[] image, String filename) {
  MultiValueMap<String,Object> parts=new LinkedMultiValueMap<>(); parts.add("file",new ByteArrayResource(image){@Override public String getFilename(){return filename;}});
  Map<String,Object> result=client.post().uri(url+"/ocr").contentType(MediaType.MULTIPART_FORM_DATA).body(parts).retrieve().body(Map.class);
  return String.valueOf(result.getOrDefault("text",""));
 }
}
