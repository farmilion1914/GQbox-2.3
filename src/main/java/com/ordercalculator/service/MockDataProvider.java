package com.ordercalculator.service;

import com.ordercalculator.models.ProductInfo;
import com.ordercalculator.models.ProductSales;
import com.ordercalculator.models.ProductStock;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class MockDataProvider implements DataProvider {
    
    private final List<ProductInfo> products = new ArrayList<>();
    private final Map<String, ProductStock> stocks = new HashMap<>();
    private final Map<String, ProductSales> sales = new HashMap<>();
    
    public MockDataProvider() {
        initTestData();
    }
    
    private void initTestData() {
        // Товар 1: S10002E/02
        ProductInfo p1 = new ProductInfo();
        p1.setArticle("S10002E/02");
        p1.setName("Кабель LIGHTNING GQbox Standart 1м");
        p1.setColor("Белый");
        p1.setSupplier("Wendy");
        p1.setPurchasePrice(24.30);
        p1.setPriceWithDelivery(34.05);
        p1.setCostPrice(42.98);
        p1.setWeightKg(0.28);
        p1.setVolumeM3(1000.0);
        p1.setBoxMultiple(1000);
        products.add(p1);
        
        ProductStock stock1 = new ProductStock();
        stock1.setArticle("S10002E/02");
        stock1.setOurWarehouse(50000);
        stock1.setInTransit(35000);
        stock1.setWbStock(20000);
        stock1.setOzonStock(15000);
        stock1.setSupplierDebt(0);
        stocks.put("S10002E/02", stock1);
        
        ProductSales sales1 = new ProductSales();
        sales1.setArticle("S10002E/02");
        sales1.setSalesLast30Days(572);
        sales1.setSalesLast7Days(120);
        sales1.setSalesToday(15);
        sales.put("S10002E/02", sales1);
        
        // Товар 2: S10017/02
        ProductInfo p2 = new ProductInfo();
        p2.setArticle("S10017/02");
        p2.setName("Кабель LIGHTNING Premium 1м");
        p2.setColor("Черный");
        p2.setSupplier("Angela");
        p2.setPurchasePrice(81.00);
        p2.setPriceWithDelivery(87.81);
        p2.setCostPrice(97.81);
        p2.setWeightKg(0.31);
        p2.setVolumeM3(1000.0);
        p2.setBoxMultiple(1000);
        products.add(p2);
        
        ProductStock stock2 = new ProductStock();
        stock2.setArticle("S10017/02");
        stock2.setOurWarehouse(50000);
        stock2.setInTransit(0);
        stock2.setWbStock(10000);
        stock2.setOzonStock(8000);
        stock2.setSupplierDebt(13400);
        stocks.put("S10017/02", stock2);
        
        ProductSales sales2 = new ProductSales();
        sales2.setArticle("S10017/02");
        sales2.setSalesLast30Days(489);
        sales2.setSalesLast7Days(120);
        sales2.setSalesToday(20);
        sales.put("S10017/02", sales2);
        
        // Товар 3: S10005/02
        ProductInfo p3 = new ProductInfo();
        p3.setArticle("S10005/02");
        p3.setName("Кабель TYPE-C GQbox Standart Белый 1м");
        p3.setColor("Белый");
        p3.setSupplier("Wendy");
        p3.setPurchasePrice(24.30);
        p3.setPriceWithDelivery(34.14);
        p3.setCostPrice(43.07);
        p3.setWeightKg(0.28);
        p3.setVolumeM3(1000.0);
        p3.setBoxMultiple(1000);
        products.add(p3);
        
        ProductStock stock3 = new ProductStock();
        stock3.setArticle("S10005/02");
        stock3.setOurWarehouse(100000);
        stock3.setInTransit(50000);
        stock3.setWbStock(30000);
        stock3.setOzonStock(20000);
        stock3.setSupplierDebt(10300);
        stocks.put("S10005/02", stock3);
        
        ProductSales sales3 = new ProductSales();
        sales3.setArticle("S10005/02");
        sales3.setSalesLast30Days(1151);
        sales3.setSalesLast7Days(300);
        sales3.setSalesToday(45);
        sales.put("S10005/02", sales3);
        
        // Товар 4: S10011-PR/02-W
        ProductInfo p4 = new ProductInfo();
        p4.setArticle("S10011-PR/02-W");
        p4.setName("Кабель LIGHTNING - TYPE-C Premium 1м");
        p4.setColor("Белый");
        p4.setSupplier("Wendy");
        p4.setPurchasePrice(54.00);
        p4.setPriceWithDelivery(59.25);
        p4.setCostPrice(69.25);
        p4.setWeightKg(0.30);
        p4.setVolumeM3(1000.0);
        p4.setBoxMultiple(1000);
        products.add(p4);
        
        ProductStock stock4 = new ProductStock();
        stock4.setArticle("S10011-PR/02-W");
        stock4.setOurWarehouse(170000);
        stock4.setInTransit(0);
        stock4.setWbStock(50000);
        stock4.setOzonStock(30000);
        stock4.setSupplierDebt(66200);
        stocks.put("S10011-PR/02-W", stock4);
        
        ProductSales sales4 = new ProductSales();
        sales4.setArticle("S10011-PR/02-W");
        sales4.setSalesLast30Days(554);
        sales4.setSalesLast7Days(150);
        sales4.setSalesToday(25);
        sales.put("S10011-PR/02-W", sales4);
        
        // Товар 5: S19001-W
        ProductInfo p5 = new ProductInfo();
        p5.setArticle("S19001-W");
        p5.setName("СЗУ 20PD ПРЕМИУМ-W");
        p5.setColor("Белый");
        p5.setSupplier("Wendy");
        p5.setPurchasePrice(101.25);
        p5.setPriceWithDelivery(122.73);
        p5.setCostPrice(131.23);
        p5.setWeightKg(0.32);
        p5.setVolumeM3(1000.0);
        p5.setBoxMultiple(500);
        products.add(p5);
        
        ProductStock stock5 = new ProductStock();
        stock5.setArticle("S19001-W");
        stock5.setOurWarehouse(30000);
        stock5.setInTransit(54000);
        stock5.setWbStock(50000);
        stock5.setOzonStock(30000);
        stock5.setSupplierDebt(0);
        stocks.put("S19001-W", stock5);
        
        ProductSales sales5 = new ProductSales();
        sales5.setArticle("S19001-W");
        sales5.setSalesLast30Days(1312);
        sales5.setSalesLast7Days(400);
        sales5.setSalesToday(60);
        sales.put("S19001-W", sales5);
    }
    
    @Override
    public List<ProductInfo> getAllProducts() {
        return products;
    }
    
    @Override
    public Map<String, ProductStock> getProductStocks(List<String> articles) {
        Map<String, ProductStock> result = new HashMap<>();
        for (String article : articles) {
            result.put(article, stocks.get(article));
        }
        return result;
    }
    
    @Override
    public Map<String, ProductSales> getProductSales(List<String> articles) {
        Map<String, ProductSales> result = new HashMap<>();
        for (String article : articles) {
            result.put(article, sales.get(article));
        }
        return result;
    }
}