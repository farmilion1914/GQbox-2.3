package com.ordercalculator.models;

import lombok.Data;

@Data
public class ProductSales {
    private String article;
    private int salesLast30Days = 0;
    private int salesLast7Days = 0;
    private int salesToday = 0;
}