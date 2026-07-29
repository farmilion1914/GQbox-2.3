package com.ordercalculator.controller;

import com.ordercalculator.models.OrderCalculationResult;
import com.ordercalculator.models.ProductInfo;
import com.ordercalculator.service.DataProvider;
import com.ordercalculator.service.FirebaseDataProvider;
import com.ordercalculator.service.OrderCalculatorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/order")
@CrossOrigin(origins = "*")
public class OrderController {
    
    @Autowired
    private DataProvider dataProvider;
    
    @Autowired
    private OrderCalculatorService calculatorService;

    @Autowired(required = false)
    private FirebaseDataProvider firebaseDataProvider;
    
    @GetMapping("/calculate")
    public OrderCalculationResult calculateOrder(
            @RequestParam(value = "filter", defaultValue = "all") String filter,
            @RequestParam(value = "minOrder", defaultValue = "0") int minOrder) {
        List<ProductInfo> products = dataProvider.getAllProducts();
        
        // Подготовка данных
        List<String> articles = products.stream()
            .map(ProductInfo::getArticle)
            .toList();
        
        var stocks = dataProvider.getProductStocks(articles);
        var sales = dataProvider.getProductSales(articles);
        
        for (ProductInfo product : products) {
            product.setStock(stocks.get(product.getArticle()));
            product.setSales(sales.get(product.getArticle()));
        }
        
        OrderCalculationResult result = calculatorService.calculateAll(products);
        
        // Фильтр по приоритету
        if (!"all".equals(filter)) {
            result.setUrgentProducts(filterProductsByPriority(result.getUrgentProducts(), filter, "urgent"));
            result.setNormalProducts(filterProductsByPriority(result.getNormalProducts(), filter, "normal"));
            result.setPlannedProducts(filterProductsByPriority(result.getPlannedProducts(), filter, "planned"));
            result.setProducts(filterProductsByPriority(result.getProducts(), filter, null));
        }
        
        return result;
    }
    
    private List<ProductInfo> filterProductsByPriority(List<ProductInfo> products, String filter, String priority) {
        if ("all".equals(filter)) return products;
        if (priority != null && !filter.equals(priority)) return List.of();
        return products.stream()
            .filter(p -> p.getOrderPriority().equals(filter))
            .collect(Collectors.toList());
    }
    
    @GetMapping("/products")
    public List<ProductInfo> getProducts() {
        return dataProvider.getAllProducts();
    }
    
    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        var config = calculatorService.getConfig();
        Map<String, Object> result = new HashMap<>();
        result.put("urgentHorizon", config.getUrgentHorizonDays());
        result.put("normalHorizon", config.getNormalHorizonDays());
        result.put("plannedHorizon", config.getPlannedHorizonDays());
        result.put("urgentThreshold", config.getUrgentThresholdDays());
        result.put("normalThreshold", config.getNormalThresholdDays());
        result.put("minOrderQty", config.getMinOrderQuantity());
        result.put("salesPeriodDays", config.getSalesPeriodDays());
        return result;
    }

    @GetMapping("/api-status")
    public Map<String, Object> getApiStatus() {
        Map<String, Object> result = new HashMap<>();
        if (firebaseDataProvider != null) {
            result.put("marketplaces", firebaseDataProvider.getApiStatus());
            result.put("firebaseConnected", true);
        } else {
            result.put("marketplaces", Map.of("wildberries", false, "ozon", false));
            result.put("firebaseConnected", false);
        }
        return result;
    }
}


