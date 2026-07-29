package com.ordercalculator.service;

import com.ordercalculator.models.*;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

@Service
public class OrderCalculatorService {
    
    private final CalculationConfig config;
    
    public OrderCalculatorService() {
        this.config = new CalculationConfig();
    }
    
    public OrderCalculatorService(CalculationConfig config) {
        this.config = config;
    }
    
    public double calculateDailySales(ProductInfo product) {
        if (product.getSales() == null) {
            return 0.0;
        }
        
        int period = config.getSalesPeriodDays();
        int sales = product.getSales().getSalesLast30Days();
        
        if (period == 7) {
            sales = product.getSales().getSalesLast7Days();
        } else if (period == 1) {
            sales = product.getSales().getSalesToday();
        }
        
        return period > 0 ? (double) sales / period : 0.0;
    }
    
    public int calculateTotalAvailableStock(ProductInfo product) {
        if (product.getStock() == null) {
            return 0;
        }
        ProductStock stock = product.getStock();
        return stock.getOurWarehouse() + 
               stock.getInTransit() + 
               stock.getWbStock() + 
               stock.getOzonStock();
    }
    
    public double calculateDaysOfStock(ProductInfo product) {
        double dailySales = calculateDailySales(product);
        if (dailySales <= 0) {
            return 999.0;
        }
        int totalStock = calculateTotalAvailableStock(product);
        return totalStock / dailySales;
    }
    
    public int calculateNeedForPeriod(ProductInfo product, int days) {
        double dailySales = calculateDailySales(product);
        double need = dailySales * days;
        
        if (product.getBoxMultiple() > 1) {
            need = Math.ceil(need / product.getBoxMultiple()) * product.getBoxMultiple();
        }
        
        return (int) need;
    }
    
    public int calculateOrderQuantity(ProductInfo product, int days) {
        int need = calculateNeedForPeriod(product, days);
        int available = calculateTotalAvailableStock(product);
        
        if (product.getStock() != null && product.getStock().getSupplierDebt() > 0) {
            available += product.getStock().getSupplierDebt();
        }
        
        int order = need - available;
        
        if (order < config.getMinOrderQuantity()) {
            order = 0;
        }
        
        if (product.getBoxMultiple() > 1 && order > 0) {
            order = (int) (Math.ceil((double) order / product.getBoxMultiple()) * product.getBoxMultiple());
        }
        
        return Math.max(0, order);
    }
    
    public String determinePriority(ProductInfo product) {
        double days = calculateDaysOfStock(product);
        
        if (days <= config.getUrgentThresholdDays()) {
            return "urgent";
        } else if (days <= config.getNormalThresholdDays()) {
            return "normal";
        } else {
            return "planned";
        }
    }
    
    public ProductInfo calculateProduct(ProductInfo product) {
        product.setDailySales(calculateDailySales(product));
        product.setDaysOfStock(calculateDaysOfStock(product));
        product.setOrderPriority(determinePriority(product));
        
        int order = 0;
        String priority = product.getOrderPriority();
        
        if ("urgent".equals(priority)) {
            order = calculateOrderQuantity(product, config.getUrgentHorizonDays());
        } else if ("normal".equals(priority)) {
            order = calculateOrderQuantity(product, config.getNormalHorizonDays());
        } else {
            order = calculateOrderQuantity(product, config.getPlannedHorizonDays());
        }
        
        product.setRecommendedOrder(order);
        return product;
    }
    
    public OrderCalculationResult calculateAll(List<ProductInfo> products) {
        OrderCalculationResult result = new OrderCalculationResult();
        List<ProductInfo> calculatedProducts = new ArrayList<>();
        
        for (ProductInfo product : products) {
            ProductInfo calculated = calculateProduct(product);
            calculatedProducts.add(calculated);
            
            if (calculated.getRecommendedOrder() > 0) {
                int order = calculated.getRecommendedOrder();
                double cost = order * calculated.getPurchasePrice();
                
                result.setTotalQuantity(result.getTotalQuantity() + order);
                result.setTotalCost(result.getTotalCost() + cost);
                result.setTotalWeightKg(result.getTotalWeightKg() + order * calculated.getWeightKg());
                result.setTotalVolumeM3(result.getTotalVolumeM3() + order * calculated.getVolumeM3());
                
                String priority = calculated.getOrderPriority();
                if ("urgent".equals(priority)) {
                    result.setTotalUrgentQuantity(result.getTotalUrgentQuantity() + order);
                    result.setTotalUrgentCost(result.getTotalUrgentCost() + cost);
                    result.getUrgentProducts().add(calculated);
                } else if ("normal".equals(priority)) {
                    result.setTotalNormalQuantity(result.getTotalNormalQuantity() + order);
                    result.setTotalNormalCost(result.getTotalNormalCost() + cost);
                    result.getNormalProducts().add(calculated);
                } else {
                    result.setTotalPlannedQuantity(result.getTotalPlannedQuantity() + order);
                    result.setTotalPlannedCost(result.getTotalPlannedCost() + cost);
                    result.getPlannedProducts().add(calculated);
                }
            }
        }
        
        result.setProducts(calculatedProducts);
        return result;
    }
    
    public CalculationConfig getConfig() {
        return config;
    }
}