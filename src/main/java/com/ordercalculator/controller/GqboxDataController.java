package com.ordercalculator.controller;

import com.ordercalculator.models.*;
import com.ordercalculator.repository.FirebaseRepository;
import com.ordercalculator.service.FirebaseDataProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * REST API для доступа к данным GQbox из Firebase.
 * Позволяет фронтенду получать данные для расчёта.
 */
@RestController
@RequestMapping("/api/gqbox")
@CrossOrigin(origins = "*")
public class GqboxDataController {

    @Autowired(required = false)
    private FirebaseRepository firebaseRepository;

    @Autowired(required = false)
    private FirebaseDataProvider firebaseDataProvider;

    /**
     * GET /api/gqbox/shipments?mp=Wildberries
     * Получение отгрузок по площадке
     */
    @GetMapping("/shipments")
    public ResponseEntity<List<Map<String, Object>>> getShipments(
            @RequestParam(value = "mp", defaultValue = "all") String mp) {
        
        if (firebaseRepository == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Shipment> result = new ArrayList<>();
        if ("all".equals(mp) || "Wildberries".equals(mp)) {
            result.addAll(firebaseRepository.getWbShipments());
        }
        if ("all".equals(mp) || "Ozon".equals(mp)) {
            result.addAll(firebaseRepository.getOzonShipments());
        }

        List<Map<String, Object>> response = result.stream().map(s -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", s.getId());
            m.put("date", s.getDate());
            m.put("city", s.getCity());
            m.put("qty", s.getQty());
            m.put("source", s.getSource());
            m.put("marketplace", s.getMarketplace() != null ? s.getMarketplace() : s.getSource());
            m.put("status", s.getStatus());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/gqbox/stock?type=wb
     * Получение остатков
     */
    @GetMapping("/stock")
    public ResponseEntity<List<StockData>> getStock(
            @RequestParam(value = "type", defaultValue = "ms") String type) {
        
        if (firebaseRepository == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<StockData> result;
        switch (type.toLowerCase()) {
            case "wb": result = firebaseRepository.getWbStock(); break;
            case "ozon": result = firebaseRepository.getOzonStock(); break;
            default: result = firebaseRepository.getMsStock(); break;
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/gqbox/products
     * Получение всех товаров для расчёта (из Firebase)
     */
    @GetMapping("/products")
    public ResponseEntity<List<ProductInfo>> getProducts() {
        if (firebaseDataProvider == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<ProductInfo> products = firebaseDataProvider.getAllProducts();
        return ResponseEntity.ok(products);
    }

    /**
     * GET /api/gqbox/health
     * Проверка состояния сервера
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", firebaseRepository != null ? "firebase_connected" : "mock_mode");
        status.put("timestamp", new Date().toString());
        status.put("version", "2.0.0");
        return ResponseEntity.ok(status);
    }

    /**
     * GET /api/gqbox/marketplace-status
     * Проверка подключения к API Wildberries и Ozon (настроены ли токены).
     */
    @GetMapping("/marketplace-status")
    public ResponseEntity<Map<String, Object>> marketplaceStatus() {
        Map<String, Object> result = new HashMap<>();
        if (firebaseDataProvider != null) {
            result.put("marketplaces", firebaseDataProvider.getApiStatus());
        } else {
            result.put("marketplaces", Map.of("wildberries", false, "ozon", false));
        }
        return ResponseEntity.ok(result);
    }
}


