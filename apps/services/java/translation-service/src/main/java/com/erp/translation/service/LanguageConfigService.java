package com.erp.translation.service;

import com.erp.translation.dto.LanguageConfigDto;
import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "app")
@Getter
public class LanguageConfigService {

    private final List<LanguageConfig> languages = new ArrayList<>();
    private String fallbackLanguage = "en";

    public void setFallbackLanguage(String fallbackLanguage) {
        this.fallbackLanguage = fallbackLanguage;
    }

    public List<LanguageConfigDto> getAvailableLanguages() {
        return languages.stream()
                .map(lang -> LanguageConfigDto.builder()
                        .code(lang.getCode())
                        .name(lang.getName())
                        .flag(lang.getFlag())
                        .isDefault(lang.isDefault())
                        .build())
                .toList();
    }

    public LanguageConfigDto getDefaultLanguage() {
        return languages.stream()
                .filter(LanguageConfig::isDefault)
                .map(lang -> LanguageConfigDto.builder()
                        .code(lang.getCode())
                        .name(lang.getName())
                        .flag(lang.getFlag())
                        .isDefault(true)
                        .build())
                .findFirst()
                .orElse(LanguageConfigDto.builder()
                        .code("en")
                        .name("English")
                        .flag("🇺🇸")
                        .isDefault(true)
                        .build());
    }

    public boolean isValidLanguage(String code) {
        return languages.stream().anyMatch(lang -> lang.getCode().equals(code));
    }

    public static class LanguageConfig {
        private String code;
        private String name;
        private String flag;
        private boolean defaultLanguage;

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public String getFlag() {
            return flag;
        }

        public void setCode(String code) {
            this.code = code;
        }

        public void setName(String name) {
            this.name = name;
        }

        public void setFlag(String flag) {
            this.flag = flag;
        }

        public void setDefault(boolean aDefault) {
            this.defaultLanguage = aDefault;
        }

        public boolean isDefault() {
            return defaultLanguage;
        }
    }
}
