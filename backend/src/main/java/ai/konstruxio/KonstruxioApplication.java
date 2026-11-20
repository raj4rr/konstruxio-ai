package ai.konstruxio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories(basePackages = "ai.konstruxio.repo")
public class KonstruxioApplication {
    public static void main(String[] args) {
        SpringApplication.run(KonstruxioApplication.class, args);
    }
}
