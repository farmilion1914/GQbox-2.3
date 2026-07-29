package com.ordercalculator.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.cloud.firestore.Firestore;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.config.path:classpath:serviceAccountKey.json}")
    private String configPath;

    @Value("${firebase.project.id:shipments-f48c2}")
    private String projectId;

    @PostConstruct
    public void initFirebase() {
        if (FirebaseApp.getApps().isEmpty()) {
            try {
                FirebaseOptions.Builder builder = FirebaseOptions.builder()
                    .setProjectId(projectId);

                // Try to load service account key from classpath
                try {
                    InputStream serviceAccount = new ClassPathResource("serviceAccountKey.json").getInputStream();
                    builder.setCredentials(GoogleCredentials.fromStream(serviceAccount));
                    log.info("Firebase initialized with service account key");
                } catch (IOException e) {
                    // Fallback: use application default credentials
                    log.warn("serviceAccountKey.json not found, using application default credentials");
                    builder.setCredentials(GoogleCredentials.getApplicationDefault());
                }

                FirebaseApp.initializeApp(builder.build());
                log.info("FirebaseApp initialized successfully for project: {}", projectId);
            } catch (Exception e) {
                log.error("Failed to initialize Firebase: {}", e.getMessage());
                // Don't crash the app - it can still work with mock data
            }
        }
    }

    @Bean
    public Firestore firestore() {
        try {
            return FirestoreClient.getFirestore();
        } catch (Exception e) {
            log.warn("Firestore not available, will use mock data: {}", e.getMessage());
            return null;
        }
    }
}