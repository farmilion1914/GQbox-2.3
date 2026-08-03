package com.ordercalculator.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import java.util.ArrayList;
import java.util.List;

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

    // ============= Ozon API (несколько ИП) =============
    // Формат: clientId1:key1,clientId2:key2,...
    @Value("${ozon.api.accounts:}")
    private String ozonAccounts;

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

    public String getOzonBaseUrl() { return ozonBaseUrl; }

    public String getMsApiToken() { return msApiToken; }
    public String getMsBaseUrl() { return msBaseUrl; }

    /**
     * Получить список всех Ozon аккаунтов (clientId + apiKey)
     */
    public List<OzonAccount> getOzonAccounts() {
        List<OzonAccount> accounts = new ArrayList<>();
        if (ozonAccounts == null || ozonAccounts.isBlank()) return accounts;
        String[] parts = ozonAccounts.split(",");
        for (String part : parts) {
            String[] kv = part.trim().split(":");
            if (kv.length == 2) {
                accounts.add(new OzonAccount(kv[0].trim(), kv[1].trim()));
            }
        }
        return accounts;
    }

    /**
     * Проверить, настроен ли хотя бы один Ozon аккаунт
     */
    public boolean hasOzonAccounts() {
        return !getOzonAccounts().isEmpty();
    }

    public static class OzonAccount {
        private final String clientId;
        private final String apiKey;

        public OzonAccount(String clientId, String apiKey) {
            this.clientId = clientId;
            this.apiKey = apiKey;
        }

        public String getClientId() { return clientId; }
        public String getApiKey() { return apiKey; }
    }
}
