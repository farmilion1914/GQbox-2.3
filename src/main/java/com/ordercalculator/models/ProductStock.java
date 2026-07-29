package com.ordercalculator.models;

import lombok.Data;

@Data
public class ProductStock {
    private String article;
    private int ourWarehouse = 0;
    private int inTransit = 0;
    private int wbStock = 0;
    private int ozonStock = 0;
    private int supplierDebt = 0;
}