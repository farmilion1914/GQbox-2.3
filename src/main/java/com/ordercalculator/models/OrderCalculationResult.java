package com.ordercalculator.models;

import lombok.Data;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
public class OrderCalculationResult {
    private Date timestamp = new Date();
    private List<ProductInfo> products = new ArrayList<>();
    
    private int totalUrgentQuantity = 0;
    private int totalNormalQuantity = 0;
    private int totalPlannedQuantity = 0;
    private int totalQuantity = 0;
    
    private double totalUrgentCost = 0.0;
    private double totalNormalCost = 0.0;
    private double totalPlannedCost = 0.0;
    private double totalCost = 0.0;
    
    private double totalWeightKg = 0.0;
    private double totalVolumeM3 = 0.0;
    
    private List<ProductInfo> urgentProducts = new ArrayList<>();
    private List<ProductInfo> normalProducts = new ArrayList<>();
    private List<ProductInfo> plannedProducts = new ArrayList<>();
    
    public CalculationSummary getSummary() {
        return new CalculationSummary(this);
    }
    
    @Data
    public static class CalculationSummary {
        private int totalProducts;
        private int productsToOrder;
        private int totalQuantity;
        private double totalCost;
        private double totalWeightKg;
        private double totalVolumeM3;
        private PrioritySummary urgent;
        private PrioritySummary normal;
        private PrioritySummary planned;
        
        public CalculationSummary(OrderCalculationResult result) {
            this.totalProducts = result.getProducts().size();
            this.productsToOrder = (int) result.getProducts().stream()
                .filter(p -> p.getRecommendedOrder() > 0).count();
            this.totalQuantity = result.getTotalQuantity();
            this.totalCost = result.getTotalCost();
            this.totalWeightKg = result.getTotalWeightKg();
            this.totalVolumeM3 = result.getTotalVolumeM3();
            
            this.urgent = new PrioritySummary(
                result.getUrgentProducts().size(),
                result.getTotalUrgentQuantity(),
                result.getTotalUrgentCost()
            );
            this.normal = new PrioritySummary(
                result.getNormalProducts().size(),
                result.getTotalNormalQuantity(),
                result.getTotalNormalCost()
            );
            this.planned = new PrioritySummary(
                result.getPlannedProducts().size(),
                result.getTotalPlannedQuantity(),
                result.getTotalPlannedCost()
            );
        }
    }
    
    @Data
    public static class PrioritySummary {
        private int products;
        private int quantity;
        private double cost;
        
        public PrioritySummary(int products, int quantity, double cost) {
            this.products = products;
            this.quantity = quantity;
            this.cost = cost;
        }
    }
}