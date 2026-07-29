package com.ordercalculator.models;

import lombok.Data;

/**
 * Модель остатков товара из Firebase (WB, Ozon, MS остатки)
 */
@Data
public class StockData {
    private String article;
    private String name;
    private int waiting;
    private int balance;
    private int wbBalance;
    private int ozonBalance;
    private int ourWarehouse;
    private int inTransit;
    private int supplierDebt;
}