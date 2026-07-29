package com.ordercalculator.repository;

import com.google.cloud.firestore.*;
import com.ordercalculator.models.Shipment;
import com.ordercalculator.models.StockData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Repository
public class FirebaseRepository {

    private static final Logger log = LoggerFactory.getLogger(FirebaseRepository.class);

    @Autowired(required = false)
    private Firestore firestore;

    /**
     * Получение всех отгрузок WB
     */
    public List<Shipment> getWbShipments() {
        return getShipments("shipments_wb");
    }

    /**
     * Получение всех отгрузок Ozon
     */
    public List<Shipment> getOzonShipments() {
        return getShipments("shipments_ozon");
    }

    private List<Shipment> getShipments(String collection) {
        if (firestore == null) return new ArrayList<>();
        try {
            QuerySnapshot snapshot = firestore.collection(collection)
                .orderBy("date", Query.Direction.ASCENDING)
                .get()
                .get();
            return snapshot.getDocuments().stream()
                .map(doc -> {
                    Shipment s = doc.toObject(Shipment.class);
                    s.setId(doc.getId());
                    return s;
                })
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to load shipments from {}: {}", collection, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Получение остатков WB
     */
    public List<StockData> getWbStock() {
        return getStockItems("settings", "wbStock");
    }

    /**
     * Получение остатков Ozon
     */
    public List<StockData> getOzonStock() {
        return getStockItems("settings", "ozonStock");
    }

    /**
     * Получение остатков МойСклад
     */
    public List<StockData> getMsStock() {
        return getStockItems("settings", "msStock");
    }

    @SuppressWarnings("unchecked")
    private List<StockData> getStockItems(String collection, String document) {
        if (firestore == null) return new ArrayList<>();
        try {
            DocumentSnapshot doc = firestore.collection(collection).document(document).get().get();
            if (!doc.exists()) return new ArrayList<>();

            Object items = doc.get("items");
            if (items instanceof List) {
                List<Map<String, Object>> rawItems = (List<Map<String, Object>>) items;
                List<StockData> result = new ArrayList<>();
                for (Map<String, Object> raw : rawItems) {
                    StockData sd = new StockData();
                    sd.setArticle(getString(raw, "article"));
                    sd.setName(getString(raw, "name"));
                    sd.setWaiting(getInt(raw, "waiting"));
                    sd.setBalance(getInt(raw, "balance"));
                    result.add(sd);
                }
                return result;
            }
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("Failed to load stock items from {}/{}: {}", collection, document, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * Получение данных продаж из отгрузок за последние N дней
     */
    public Map<String, Integer> getSalesLast30Days() {
        Map<String, Integer> sales = new HashMap<>();
        List<Shipment> allShipments = new ArrayList<>();
        allShipments.addAll(getWbShipments());
        allShipments.addAll(getOzonShipments());

        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, -30);
        Date thirtyDaysAgo = cal.getTime();

        for (Shipment s : allShipments) {
            if (s.getDate() == null) continue;
            try {
                // Shipment date is in format YYYY-MM-DD
                String[] parts = s.getDate().split("-");
                if (parts.length != 3) continue;
                Calendar shipCal = Calendar.getInstance();
                shipCal.set(Calendar.YEAR, Integer.parseInt(parts[0]));
                shipCal.set(Calendar.MONTH, Integer.parseInt(parts[1]) - 1);
                shipCal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(parts[2]));
                
                if (shipCal.getTime().after(thirtyDaysAgo)) {
                    // Use city as "article" proxy for now
                    sales.merge(s.getCity(), s.getQty(), Integer::sum);
                }
            } catch (Exception e) {
                // skip invalid dates
            }
        }
        return sales;
    }

    // ========== Вспомогательные методы ==========

    private String getString(Map<String, Object> map, String key) {
        Object v = map.get(key);
        return v != null ? v.toString() : "";
    }

    private int getInt(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v instanceof Number) return ((Number) v).intValue();
        if (v instanceof String) {
            try { return Integer.parseInt((String) v); } catch (NumberFormatException e) { return 0; }
        }
        return 0;
    }
}