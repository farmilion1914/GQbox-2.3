package com.ordercalculator.service;

import com.ordercalculator.models.*;
import com.ordercalculator.repository.FirebaseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Реализация DataProvider через Firebase.
 * Берёт реальные данные из Firestore (отгрузки, остатки).
 * Активируется только когда firebase.enabled=true.
 */
@Component
@ConditionalOnProperty(name = "firebase.enabled", havingValue = "true")
public class FirebaseDataProvider implements DataProvider {

    private static final Logger log = LoggerFactory.getLogger(FirebaseDataProvider.class);

    @Autowired
    private FirebaseRepository firebaseRepository;

    @Autowired(required = false)
    private WildberriesApiService wbApiService;

    @Autowired(required = false)
    private OzonApiService ozonApiService;

    @Override
    public List<ProductInfo> getAllProducts() {
        log.info("Loading products from Firebase...");
        Map<String, ProductInfo> productMap = new LinkedHashMap<>();

        // 1. Собираем уникальные артикулы из остатков
        Set<String> articles = new HashSet<>();

        // WB stock
        List<StockData> wbStock = firebaseRepository.getWbStock();
        for (StockData sd : wbStock) {
            if (!sd.getArticle().isEmpty()) {
                articles.add(sd.getArticle());
                productMap.computeIfAbsent(sd.getArticle(), a -> {
                    ProductInfo p = new ProductInfo();
                    p.setArticle(a);
                    p.setName(sd.getName().isEmpty() ? a : sd.getName());
                    p.setBoxMultiple(1);
                    return p;
                });
                ProductInfo p = productMap.get(sd.getArticle());
                ProductStock stock = p.getStock();
                if (stock == null) {
                    stock = new ProductStock();
                    stock.setArticle(sd.getArticle());
                    p.setStock(stock);
                }
                stock.setWbStock(stock.getWbStock() + sd.getBalance());
            }
        }

        // Ozon stock
        List<StockData> ozonStock = firebaseRepository.getOzonStock();
        for (StockData sd : ozonStock) {
            if (!sd.getArticle().isEmpty()) {
                articles.add(sd.getArticle());
                productMap.computeIfAbsent(sd.getArticle(), a -> {
                    ProductInfo p = new ProductInfo();
                    p.setArticle(a);
                    p.setName(sd.getName().isEmpty() ? a : sd.getName());
                    p.setBoxMultiple(1);
                    return p;
                });
                ProductInfo p = productMap.get(sd.getArticle());
                ProductStock stock = p.getStock();
                if (stock == null) {
                    stock = new ProductStock();
                    stock.setArticle(sd.getArticle());
                    p.setStock(stock);
                }
                stock.setOzonStock(stock.getOzonStock() + sd.getBalance());
            }
        }

        // MS stock (наш склад)
        List<StockData> msStock = firebaseRepository.getMsStock();
        for (StockData sd : msStock) {
            if (!sd.getArticle().isEmpty()) {
                articles.add(sd.getArticle());
                productMap.computeIfAbsent(sd.getArticle(), a -> {
                    ProductInfo p = new ProductInfo();
                    p.setArticle(a);
                    p.setName(sd.getName().isEmpty() ? a : sd.getName());
                    p.setBoxMultiple(1);
                    return p;
                });
                ProductInfo p = productMap.get(sd.getArticle());
                ProductStock stock = p.getStock();
                if (stock == null) {
                    stock = new ProductStock();
                    stock.setArticle(sd.getArticle());
                    p.setStock(stock);
                }
                stock.setOurWarehouse(stock.getOurWarehouse() + sd.getBalance());
                stock.setInTransit(stock.getInTransit() + sd.getWaiting());
            }
        }

        // 2. Добавляем продажи из отгрузок (по артикулам, если они есть)
        List<ProductInfo> result = new ArrayList<>(productMap.values());
        
        // Если нет товаров с артикулами, создаём примерные из отгрузок
        if (result.isEmpty()) {
            log.warn("No products found with articles, creating from shipments");
            result.addAll(createProductsFromShipments());
        }

        // 3. Донагружаем остатки напрямую из API маркетплейсов (если настроены токены)
        // Приоритет отдаётся данным из API, т.к. они актуальнее выгрузок Excel/Firebase
        if (!articles.isEmpty()) {
            List<String> articleList = new ArrayList<>(articles);

            if (wbApiService != null && wbApiService.isConfigured()) {
                try {
                    Map<String, ProductStock> wbLive = wbApiService.getStocks(articleList);
                    for (Map.Entry<String, ProductStock> e : wbLive.entrySet()) {
                        ProductInfo p = productMap.get(e.getKey());
                        if (p != null && p.getStock() != null) {
                            p.getStock().setWbStock(e.getValue().getWbStock());
                        }
                    }
                    log.info("WB API: обновлено {} остатков", wbLive.size());
                } catch (Exception ex) {
                    log.warn("WB API недоступен, используются данные Firebase: {}", ex.getMessage());
                }
            }

            if (ozonApiService != null && ozonApiService.isConfigured()) {
                try {
                    Map<String, ProductStock> ozonLive = ozonApiService.getStocks(articleList);
                    for (Map.Entry<String, ProductStock> e : ozonLive.entrySet()) {
                        ProductInfo p = productMap.get(e.getKey());
                        if (p != null && p.getStock() != null) {
                            p.getStock().setOzonStock(e.getValue().getOzonStock());
                        }
                    }
                    log.info("Ozon API: обновлено {} остатков", ozonLive.size());
                } catch (Exception ex) {
                    log.warn("Ozon API недоступен, используются данные Firebase: {}", ex.getMessage());
                }
            }
        }

        log.info("Loaded {} products from Firebase", result.size());
        return result;
    }

    /**
     * Проверка статуса подключения к API маркетплейсов.
     */
    public Map<String, Boolean> getApiStatus() {
        Map<String, Boolean> status = new LinkedHashMap<>();
        status.put("wildberries", wbApiService != null && wbApiService.isConfigured());
        status.put("ozon", ozonApiService != null && ozonApiService.isConfigured());
        return status;
    }

    private List<ProductInfo> createProductsFromShipments() {
        Map<String, ProductInfo> byCity = new LinkedHashMap<>();
        
        List<Shipment> wb = firebaseRepository.getWbShipments();
        List<Shipment> oz = firebaseRepository.getOzonShipments();
        
        for (Shipment s : wb) {
            byCity.computeIfAbsent(s.getCity() + "_WB", k -> {
                ProductInfo p = new ProductInfo();
                p.setArticle(k);
                p.setName("Отгрузка " + s.getCity() + " (WB)");
                p.setBoxMultiple(1);
                return p;
            });
        }
        for (Shipment s : oz) {
            byCity.computeIfAbsent(s.getCity() + "_OZON", k -> {
                ProductInfo p = new ProductInfo();
                p.setArticle(k);
                p.setName("Отгрузка " + s.getCity() + " (Ozon)");
                p.setBoxMultiple(1);
                return p;
            });
        }
        
        return new ArrayList<>(byCity.values());
    }

    @Override
    public Map<String, ProductStock> getProductStocks(List<String> articles) {
        Map<String, ProductStock> result = new HashMap<>();
        
        // WB stock
        for (StockData sd : firebaseRepository.getWbStock()) {
            if (articles.contains(sd.getArticle())) {
                result.computeIfAbsent(sd.getArticle(), k -> {
                    ProductStock ps = new ProductStock();
                    ps.setArticle(k);
                    return ps;
                });
                ProductStock ps = result.get(sd.getArticle());
                ps.setWbStock(ps.getWbStock() + sd.getBalance());
            }
        }

        // Ozon stock
        for (StockData sd : firebaseRepository.getOzonStock()) {
            if (articles.contains(sd.getArticle())) {
                result.computeIfAbsent(sd.getArticle(), k -> {
                    ProductStock ps = new ProductStock();
                    ps.setArticle(k);
                    return ps;
                });
                ProductStock ps = result.get(sd.getArticle());
                ps.setOzonStock(ps.getOzonStock() + sd.getBalance());
            }
        }

        // MS stock
        for (StockData sd : firebaseRepository.getMsStock()) {
            if (articles.contains(sd.getArticle())) {
                result.computeIfAbsent(sd.getArticle(), k -> {
                    ProductStock ps = new ProductStock();
                    ps.setArticle(k);
                    return ps;
                });
                ProductStock ps = result.get(sd.getArticle());
                ps.setOurWarehouse(ps.getOurWarehouse() + sd.getBalance());
                ps.setInTransit(ps.getInTransit() + sd.getWaiting());
            }
        }

        return result;
    }

    @Override
    public Map<String, ProductSales> getProductSales(List<String> articles) {
        Map<String, ProductSales> result = new HashMap<>();
        
        // 1. Firebase данные (из отгрузок)
        Map<String, Integer> salesData = firebaseRepository.getSalesLast30Days();
        
        for (String article : articles) {
            ProductSales ps = new ProductSales();
            ps.setArticle(article);
            ps.setSalesLast30Days(salesData.getOrDefault(article, 0));
            result.put(article, ps);
        }

        // 2. Донагружаем продажи из API Ozon (если настроен)
        if (ozonApiService != null && ozonApiService.isConfigured() && !articles.isEmpty()) {
            try {
                Map<String, ProductSales> ozonSales = ozonApiService.getSales(articles, 30);
                for (Map.Entry<String, ProductSales> e : ozonSales.entrySet()) {
                    result.merge(e.getKey(), e.getValue(), (existing, incoming) -> {
                        existing.setSalesLast30Days(existing.getSalesLast30Days() + incoming.getSalesLast30Days());
                        existing.setSalesLast7Days(incoming.getSalesLast7Days());
                        return existing;
                    });
                }
                log.info("Ozon API: обновлено {} продаж", ozonSales.size());
            } catch (Exception ex) {
                log.warn("Ozon API продажи недоступны: {}", ex.getMessage());
            }
        }

        // 3. Донагружаем продажи из API WB (если настроен)
        if (wbApiService != null && wbApiService.isConfigured() && !articles.isEmpty()) {
            try {
                Map<String, ProductSales> wbSales = wbApiService.getSales(articles, 30);
                for (Map.Entry<String, ProductSales> e : wbSales.entrySet()) {
                    result.merge(e.getKey(), e.getValue(), (existing, incoming) -> {
                        existing.setSalesLast30Days(existing.getSalesLast30Days() + incoming.getSalesLast30Days());
                        existing.setSalesLast7Days(existing.getSalesLast7Days() + incoming.getSalesLast7Days());
                        return existing;
                    });
                }
                log.info("WB API: обновлено {} продаж", wbSales.size());
            } catch (Exception ex) {
                log.warn("WB API продажи недоступны: {}", ex.getMessage());
            }
        }

        return result;
    }
}
