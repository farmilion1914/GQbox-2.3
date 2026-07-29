package com.ordercalculator.models;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
public class ProductInfo {
    private String article;
    private String name;
    private String color = "Серый";
    private String supplier;
    private double purchasePrice;
    private double priceWithDelivery;
    private double costPrice;
    private double weightKg = 0.0;
    private double volumeM3 = 0.0;
    private int boxMultiple = 1;
    
    // Данные по продажам и остаткам
    private ProductStock stock;
    private ProductSales sales;
    
    // Расчётные поля
    private double dailySales = 0.0;
    private double daysOfStock = 0.0;
    private int recommendedOrder = 0;
    private String orderPriority = "normal"; // urgent / normal / planned
}