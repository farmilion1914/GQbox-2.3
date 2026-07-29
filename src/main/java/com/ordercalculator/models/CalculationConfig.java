package com.ordercalculator.models;

import lombok.Data;

@Data
public class CalculationConfig {
    private int salesPeriodDays = 30;
    private int urgentHorizonDays = 20;
    private int normalHorizonDays = 30;
    private int plannedHorizonDays = 45;
    private int urgentThresholdDays = 7;
    private int normalThresholdDays = 15;
    private int minOrderQuantity = 10;
}