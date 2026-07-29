package com.ordercalculator.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MarketplaceApiConfig {

    // ============= Wildberries API =============
    @Value("${wb.api.token:}")
    private String wbApiToken;

    @Value("${wb.api.base-url:https://suppliers-api.wildberries.ru}")
    private String wbBaseUrl;

    @Value("${wb.api.statistics-url:https://statistics-api.wildberries.ru}")
    private String wbStatisticsUrl;

    @Value("${wb.api.analytics-url:https://analytics-api.wildberries.ru}")
    private String wbAnalyticsUrl;

    // ============= Ozon API =============
    @Value("${ozon.api.client-id:}")
    private String ozonClientId;

    @Value("${ozon.api.key:}")
    private String ozonApiKey;

    @Value("${ozon.api.base-url:https://api-seller.ozon.ru}")
    private String ozonBaseUrl;

    // ============= MoySklad API =============
    @Value("${moysklad.api.token:}")
    private String msApiToken;

    @Value("${moysklad.api.base-url:https://api.moysklad.ru/api/remap/1.2}")
    private String msBaseUrl;

    // Getters
    public String getWbApiToken() { return wbApiToken; }
    public String getWbBaseUrl() { return wbBaseUrl; }
    public String getWbStatisticsUrl() { return wbStatisticsUrl; }
    public String getWbAnalyticsUrl() { return wbAnalyticsUrl; }

    public String getOzonClientId() { return ozonClientId; }
    public String getOzonApiKey() { return ozonApiKey; }
    public String getOzonBaseUrl() { return ozonBaseUrl; }

    public String getMsApiToken() { return msApiToken; }
    public String getMsBaseUrl() { return msBaseUrl; }
}