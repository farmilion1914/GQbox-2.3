package com.ordercalculator.service;

import com.ordercalculator.config.MarketplaceApiConfig;
import com.ordercalculator.config.MarketplaceApiConfig.OzonAccount;
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
        return config.hasOzonAccounts();
    }

    /**
     * Получение остатков со всех аккаунтов Ozon
     */
    public Map<String, ProductStock> getStocks(List<String> articles) {
        Map<String, ProductStock> result = new HashMap<>();
        if (!isConfigured() || articles.isEmpty()) return result;

        for (OzonAccount account : config.getOzonAccounts()) {
            try {
                Map<String, ProductStock> accountStocks = getStocksForAccount(account, articles);
                // Объединяем результаты: если товар есть в нескольких ИП — суммируем
                for (Map.Entry<String, ProductStock> entry : accountStocks.entrySet()) {
                    result.merge(entry.getKey(), entry.getValue(), (existing, incoming) -> {
                        existing.setOzonStock(existing.getOzonStock() + incoming.getOzonStock());
                        return existing;
                    });
                }
            } catch (Exception e) {
                log.error("Ozon stocks error for account {}: {}", account.getClientId(), e.getMessage());
            }
        }
        return result;
    }

    private Map<String, ProductStock> getStocksForAccount(OzonAccount account, List<String> articles) {
        Map<String, ProductStock> result = new HashMap<>();
        try {
            String url = config.getOzonBaseUrl() + "/v2/products/stocks";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Client-Id", account.getClientId());
            headers.set("Api-Key", account.getApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Ozon API принимает max 1000 артикулов за запрос
            int batchSize = 1000;
            for (int i = 0; i < articles.size(); i += batchSize) {
                List<String> batch = articles.subList(i, Math.min(i + batchSize, articles.size()));
                
                Map<String, Object> filter = new HashMap<>();
                filter.put("offer_id", batch);
                Map<String, Object> body = new HashMap<>();
                body.put("filter", filter);
                body.put("limit", 1000);

                HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
                ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, req, Map.class);

                if (resp.getBody() != null) {
                    List<Map<String, Object>> items = (List<Map<String, Object>>) resp.getBody().get("items");
                    if (items != null) {
                        for (Map<String, Object> item : items) {
                            String offerId = (String) item.get("offer_id");
                            if (offerId == null || !articles.contains(offerId)) continue;
                            
                            List<Map<String, Object>> stocks = (List<Map<String, Object>>) item.get("stocks");
                            if (stocks != null) {
                                for (Map<String, Object> stock : stocks) {
                                    if ("available".equals(stock.get("type"))) {
                                        int present = ((Number) stock.getOrDefault("present", 0)).intValue();
                                        result.computeIfAbsent(offerId, k -> {
                                            ProductStock ps = new ProductStock();
                                            ps.setArticle(k);
                                            return ps;
                                        });
                                        result.get(offerId).setOzonStock(
                                            result.get(offerId).getOzonStock() + present
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Ozon stocks error for account {}: {}", account.getClientId(), e.getMessage());
        }
        return result;
    }

    /**
     * Получение продаж со всех аккаунтов Ozon
     */
    public Map<String, ProductSales> getSales(List<String> articles, int days) {
        Map<String, ProductSales> result = new HashMap<>();
        if (!isConfigured() || articles.isEmpty()) return result;

        for (OzonAccount account : config.getOzonAccounts()) {
            try {
                Map<String, ProductSales> accountSales = getSalesForAccount(account, articles, days);
                for (Map.Entry<String, ProductSales> entry : accountSales.entrySet()) {
                    result.merge(entry.getKey(), entry.getValue(), (existing, incoming) -> {
                        existing.setSalesLast30Days(existing.getSalesLast30Days() + incoming.getSalesLast30Days());
                        existing.setSalesLast7Days(existing.getSalesLast7Days() + incoming.getSalesLast7Days());
                        return existing;
                    });
                }
            } catch (Exception e) {
                log.error("Ozon sales error for account {}: {}", account.getClientId(), e.getMessage());
            }
        }
        return result;
    }

    private Map<String, ProductSales> getSalesForAccount(OzonAccount account, List<String> articles, int days) {
        Map<String, ProductSales> result = new HashMap<>();
        try {
            String url = config.getOzonBaseUrl() + "/v1/analytics/data/seller-products";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Client-Id", account.getClientId());
            headers.set("Api-Key", account.getApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);

            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.DAY_OF_YEAR, -days);
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

            Map<String, Object> body = new HashMap<>();
            body.put("date_from", sdf.format(cal.getTime()));
            body.put("date_to", sdf.format(new Date()));
            body.put("metrics", Arrays.asList("ordered_units"));
            body.put("dimension", "sku");
            body.put("limit", 1000);
            body.put("offset", 0);

            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, req, Map.class);

            if (resp.getBody() != null) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) resp.getBody().get("data");
                if (data != null) {
                    for (Map<String, Object> row : data) {
                        Map<String, Object> dims = (Map<String, Object>) row.get("dimensions");
                        if (dims == null) continue;
                        String sku = (String) dims.get("sku");
                        if (sku == null || !articles.contains(sku)) continue;

                        List<Map<String, Object>> metrics = (List<Map<String, Object>>) row.get("metrics");
                        if (metrics != null) {
                            for (Map<String, Object> m : metrics) {
                                if ("ordered_units".equals(m.get("key"))) {
                                    int v = ((Number) m.getOrDefault("value", 0)).intValue();
                                    result.computeIfAbsent(sku, k -> {
                                        ProductSales ps = new ProductSales();
                                        ps.setArticle(k);
                                        return ps;
                                    });
                                    ProductSales ps = result.get(sku);
                                    ps.setSalesLast30Days(ps.getSalesLast30Days() + v);
                                    if (days <= 7) {
                                        ps.setSalesLast7Days(ps.getSalesLast7Days() + v);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Ozon sales error for account {}: {}", account.getClientId(), e.getMessage());
        }
        return result;
    }

    public List<Map<String, Object>> getProducts() {
        List<Map<String, Object>> result = new ArrayList<>();
        if (!isConfigured()) return result;

        for (OzonAccount account : config.getOzonAccounts()) {
            try {
                List<Map<String, Object>> accountProducts = getProductsForAccount(account);
                result.addAll(accountProducts);
            } catch (Exception e) {
                log.error("Ozon products error for account {}: {}", account.getClientId(), e.getMessage());
            }
        }
        return result;
    }

    private List<Map<String, Object>> getProductsForAccount(OzonAccount account) {
        List<Map<String, Object>> result = new ArrayList<>();
        try {
            String url = config.getOzonBaseUrl() + "/v2/product/list";
            HttpHeaders headers = new HttpHeaders();
            headers.set("Client-Id", account.getClientId());
            headers.set("Api-Key", account.getApiKey());
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> filter = new HashMap<>();
            filter.put("visibility", "ALL");
            Map<String, Object> body = new HashMap<>();
            body.put("filter", filter);
            body.put("limit", 1000);

            HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
            ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST, req, Map.class);

            if (resp.getBody() != null) {
                result = (List<Map<String, Object>>) resp.getBody().getOrDefault("items", new ArrayList<>());
            }
        } catch (Exception e) {
            log.error("Ozon products error for account {}: {}", account.getClientId(), e.getMessage());
        }
        return result;
    }
}