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

import java.text.SimpleDateFormat;
import java.util.*;

@Service
public class OzonApiService {
    private static final Logger log = LoggerFactory.getLogger(OzonApiService.class);
    @Autowired private MarketplaceApiConfig config;
    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isConfigured() {
        return config.getOzonClientId() != null && !config.getOzonClientId().isEmpty()
            && config.getOzonApiKey() != null && !config.getOzonApiKey().isEmpty();
    }

    public Map<String, ProductStock> getStocks(List<String> articles) {
        Map<String, ProductStock> result = new HashMap<>();
        if (!isConfigured() || articles.isEmpty()) return result;
        try {
            String url = config.getOzonBaseUrl() + "/v2/products/stocks";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Client-Id", config.getOzonClientId());
            headers.set("Api-Key", config.getOzonApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> filter = new HashMap<>(); filter.put("offer_id", articles);
            Map<String, Object> body = new HashMap<>(); body.put("filter", filter); body.put("limit", 1000);
            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, req, Map.class);
            if (resp.getBody() != null) {
                List<Map<String, Object>> items = (List<Map<String, Object>>) resp.getBody().get("items");
                if (items != null) for (Map<String, Object> item : items) {
                    String offerId = (String) item.get("offer_id");
                    if (offerId == null || !articles.contains(offerId)) continue;
                    List<Map<String, Object>> stocks = (List<Map<String, Object>>) item.get("stocks");
                    if (stocks != null) for (Map<String, Object> stock : stocks) {
                        if ("available".equals(stock.get("type"))) {
                            int present = ((Number) stock.getOrDefault("present", 0)).intValue();
                            result.computeIfAbsent(offerId, k -> { ProductStock ps = new ProductStock(); ps.setArticle(k); return ps; });
                            result.get(offerId).setOzonStock(result.get(offerId).getOzonStock() + present);
                        }
                    }
                }
            }
        } catch (Exception e) { log.error("Ozon stocks error: {}", e.getMessage()); }
        return result;
    }

    public Map<String, ProductSales> getSales(List<String> articles, int days) {
        Map<String, ProductSales> result = new HashMap<>();
        if (!isConfigured() || articles.isEmpty()) return result;
        try {
            String url = config.getOzonBaseUrl() + "/v1/analytics/data/seller-products";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Client-Id", config.getOzonClientId());
            headers.set("Api-Key", config.getOzonApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);
            Calendar cal = Calendar.getInstance(); cal.add(Calendar.DAY_OF_YEAR, -days);
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
            Map<String, Object> body = new HashMap<>();
            body.put("date_from", sdf.format(cal.getTime()));
            body.put("date_to", sdf.format(new Date()));
            body.put("metrics", Arrays.asList("ordered_units"));
            body.put("dimension", "sku"); body.put("limit", 1000); body.put("offset", 0);
            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, req, Map.class);
            if (resp.getBody() != null) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) resp.getBody().get("data");
                if (data != null) for (Map<String, Object> row : data) {
                    Map<String, Object> dims = (Map<String, Object>) row.get("dimensions");
                    if (dims == null) continue;
                    String sku = (String) dims.get("sku");
                    if (sku == null || !articles.contains(sku)) continue;
                    List<Map<String, Object>> metrics = (List<Map<String, Object>>) row.get("metrics");
                    if (metrics != null) for (Map<String, Object> m : metrics) {
                        if ("ordered_units".equals(m.get("key"))) {
                            int v = ((Number) m.getOrDefault("value", 0)).intValue();
                            result.computeIfAbsent(sku, k -> { ProductSales ps = new ProductSales(); ps.setArticle(k); return ps; });
                            ProductSales ps = result.get(sku);
                            ps.setSalesLast30Days(ps.getSalesLast30Days() + v);
                            if (days <= 7) ps.setSalesLast7Days(ps.getSalesLast7Days() + v);
                        }
                    }
                }
            }
        } catch (Exception e) { log.error("Ozon sales error: {}", e.getMessage()); }
        return result;
    }

    public List<Map<String, Object>> getProducts() {
        List<Map<String, Object>> result = new ArrayList<>();
        if (!isConfigured()) return result;
        try {
            String url = config.getOzonBaseUrl() + "/v2/product/list";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Client-Id", config.getOzonClientId());
            headers.set("Api-Key", config.getOzonApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> filter = new HashMap<>(); filter.put("visibility", "ALL");
            Map<String, Object> body = new HashMap<>(); body.put("filter", filter); body.put("limit", 1000);
            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, req, Map.class);
            if (resp.getBody() != null) result = (List<Map<String, Object>>) resp.getBody().getOrDefault("items", new ArrayList<>());
        } catch (Exception e) { log.error("Ozon products error: {}", e.getMessage()); }
        return result;
    }
}
