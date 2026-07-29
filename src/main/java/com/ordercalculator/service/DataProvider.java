package com.ordercalculator.service;

import com.ordercalculator.models.ProductInfo;
import com.ordercalculator.models.ProductSales;
import com.ordercalculator.models.ProductStock;
import java.util.List;
import java.util.Map;

public interface DataProvider {
    List<ProductInfo> getAllProducts();
    Map<String, ProductStock> getProductStocks(List<String> articles);
    Map<String, ProductSales> getProductSales(List<String> articles);
}