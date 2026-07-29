package com.ordercalculator.models;

import lombok.Data;
import java.util.Date;
import java.util.List;

/**
 * Модель отгрузки из Firebase (соответствует данным GQbox)
 */
@Data
public class Shipment {
    private String id;
    private String date;          // Дата отгрузки (YYYY-MM-DD)
    private String city;          // Город назначения
    private int qty;              // Количество
    private String source;        // "Wildberries" или "Ozon"
    private String marketplace;   // "Wildberries" или "Ozon"
    private String status;        // in_work, waiting, rejected, sent, ready
    private String linkId;        // Связь с логистикой
    private List<QtyHistory> qtyHistory;

    @Data
    public static class QtyHistory {
        private int oldQty;
        private int newQty;
        private int diff;
        private String time;
        private String user;
    }
}