package com.ordercalculator.service;

import com.ordercalculator.config.MarketplaceApiConfig;
import com.ordercalculator.models.ProductSales;
import com.ordercalculator.models.ProductStock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Сервис для работы с API Wildberries.
 * Получает остатки и статистику продаж по артикулам.
 */
@Service
public class WildberriesApiService {

    private static final Logger log = LoggerFactory.getLogger(WildberriesApiService.class);

    @Autowired
    private MarketplaceApiConfig config;

    private final RestTemplate restTemplate;

    public WildberriesApiService() {
        this.restTemplate = new RestTemplate();
    }

    /**
     * Проверяет, настроен ли API WB
     */
    public boolean isConfigured() {
        return config.getWbApiToken() != null && !config.getWbApiToken().isEmpty();
    }

    /**
     * Получение остатков WB по артикулам через API продавца.
     * GET https://suppliers-api.wildberries.ru/api/v3/stocks
     */
    public Map<String, ProductStock> getStocks(List<String> articles) {
        Map<String, ProductStock> result = new HashMap<>();
        if (!isConfigured() || articles.isEmpty()) return result;

        try {
            String url = config.getWbBaseUrl() + "/api/v3/stocks";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", config.getWbApiToken());
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            // Запрашиваем остатки по всем складам
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sku", articles);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.POST, request, Map.class
            );

            if (response.getBody() != null) {
                List<Map<String, Object>> stocks = (List<Map<String, Object>>) response.getBody().get("stocks");
                if (stocks != null) {
                    for (Map<String, Object> stock : stocks) {
                        String sku = (String) stock.get("sku");
                        int quantity = ((Number) stock.getOrDefault("quantity", 0)).intValue();
                        
                        if (sku != null && articles.contains(sku)) {
                            result.computeIfAbsent(sku, k -> {
                                ProductStock ps = new ProductStock();
                                ps.setArticle(k);
                                return ps;
                            });
                            result.get(sku).setWbStock(result.get(sku).getWbStock() + quantity);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch WB stocks: {}", e.getMessage());
        }

        return result;
    }

    /**
     * Получение статистики продаж за последние N дней через API статистики.
     * GET https://statistics-api.wildberries.ru/api/v1/supplier/reportDetailByPeriod
     */
    public Map<String, ProductSales> getSales(List<String> articles, int days) {
        Map<String, ProductSales> result = new HashMap<>();
        if (!isConfigured() || articles.isEmpty()) return result;

        try {
            String url = config.getWbStatisticsUrl() + "/api/v1/supplier/reportDetailByPeriod";
            
            // Дата начала периода
            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.DAY_OF_YEAR, -days);
            Date dateFrom = cal.getTime();
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", config.getWbApiToken());
            
            // Строим URL с параметрами
            String requestUrl = url + "?dateFrom=" + new java.text.SimpleDateFormat("yyyy-MM-dd").format(dateFrom);
            
            HttpEntity<?> request = new HttpEntity<>(headers);
            
            ResponseEntity<List> response = restTemplate.exchange(
                requestUrl, HttpMethod.GET, request, List.class
            );

            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    Map<String, Object> row = (Map<String, Object>) item;
                    String sa = (String) row.get("sa"); // Артикул продавца
                    int quantity = ((Number) row.getOrDefault("quantity", 0)).intValue();
                    
                    if (sa != null && articles.contains(sa)) {
                        result.computeIfAbsent(sa, k -> {
                            ProductSales ps = new ProductSales();
                            ps.setArticle(k);
                            return ps;
                        });
                        ProductSales ps = result.get(sa);
                        ps.setSalesLast30Days(ps.getSalesLast30Days() + quantity);
                        if (days <= 7) {
                            ps.setSalesLast7Days(ps.getSalesLast7Days() + quantity);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch WB sales: {}", e.getMessage());
        }

        return result;
    }

    /**
     * Получение остатков с детализацией по складам
     */
    public Map<String, Integer> getWarehouseStocks() {
        Map<String, Integer> result = new HashMap<>();
        if (!isConfigured()) return result;

        try {
            String url = config.getWbBaseUrl() + "/api/v3/warehouses";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", config.getWbApiToken());
            
            HttpEntity<?> request = new HttpEntity<>(headers);
            
            ResponseEntity<List> response = restTemplate.exchange(
                url, HttpMethod.GET, request, List.class
            );

            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    Map<String, Object> wh = (Map<String, Object>) item;
                    String name = (String) wh.get("name");
                    int cargoType = ((Number) wh.getOrDefault("cargoType", 0)).intValue();
                    // 1 = FBO, 2 = FBS
                    if (cargoType == 1) {
                        result.put(name, ((Number) wh.getOrDefault("stocks", 0)).intValue());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch WB warehouses: {}", e.getMessage());
        }

        return result;
    }

    /**
     * Получение товаров из API Wildberries
     */
    public List<Map<String, Object>> getProducts() {
        List<Map<String, Object>> result = new ArrayList<>();
        if (!isConfigured()) return result;

        try {
            String url = config.getWbBaseUrl() + "/api/v3/cards?limit=100";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", config.getWbApiToken());
            
            HttpEntity<?> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url, HttpMethod.GET, request, Map.class
            );

            if (response.getBody() != null) {
                result = (List<Map<String, Object>>) response.getBody().getOrDefault("cards", new ArrayList<>());
            }
        } catch (Exception e) {
            log.error("Failed to fetch WB products: {}", e.getMessage());
        }

        return result;
    }
}