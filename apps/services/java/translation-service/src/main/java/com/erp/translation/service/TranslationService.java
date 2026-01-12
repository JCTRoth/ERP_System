package com.erp.translation.service;

import com.erp.translation.dto.*;
import com.erp.translation.entity.TranslationKey;
import com.erp.translation.entity.TranslationValue;
import com.erp.translation.exception.DuplicateResourceException;
import com.erp.translation.exception.ResourceNotFoundException;
import com.erp.translation.repository.TranslationKeyRepository;
import com.erp.translation.repository.TranslationValueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranslationService {

    private final TranslationKeyRepository keyRepository;
    private final TranslationValueRepository valueRepository;

    @Value("${app.fallback-language:en}")
    private String fallbackLanguage;

    // ==================== Translation Keys ====================

    @Transactional(readOnly = true)
    public List<TranslationKeyDto> getAllKeys() {
        return keyRepository.findAll().stream()
                .map(this::toKeyDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TranslationKeyDto> getKeysByNamespace(String namespace) {
        return keyRepository.findByNamespace(namespace).stream()
                .map(this::toKeyDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TranslationKeyDto getKeyById(UUID id) {
        return keyRepository.findById(id)
                .map(this::toKeyDto)
                .orElseThrow(() -> new ResourceNotFoundException("TranslationKey", "id", id));
    }

    @Transactional(readOnly = true)
    public List<String> getAllNamespaces() {
        return keyRepository.findAllNamespaces();
    }

    @Transactional
    // @CacheEvict(value = "translations", allEntries = true)
    public TranslationKeyDto createKey(CreateTranslationKeyRequest request) {
        String namespace = request.getNamespace() != null ? request.getNamespace() : "common";
        
        if (keyRepository.existsByKeyNameAndNamespace(request.getKeyName(), namespace)) {
            throw new DuplicateResourceException("TranslationKey", "keyName", request.getKeyName());
        }

        TranslationKey key = TranslationKey.builder()
                .keyName(request.getKeyName())
                .namespace(namespace)
                .description(request.getDescription())
                .build();

        TranslationKey saved = keyRepository.save(key);
        log.info("Created translation key: {}.{}", namespace, saved.getKeyName());
        return toKeyDto(saved);
    }

    @Transactional
    // @CacheEvict(value = "translations", allEntries = true)
    public void deleteKey(UUID id) {
        TranslationKey key = keyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TranslationKey", "id", id));
        
        valueRepository.deleteByKeyId(id);
        keyRepository.delete(key);
        log.info("Deleted translation key: {}", key.getKeyName());
    }

    // ==================== Translation Values ====================

    @Transactional
    // @CacheEvict(value = "translations", allEntries = true)
    public TranslationValueDto setTranslation(SetTranslationRequest request) {
        TranslationKey key = keyRepository.findById(request.getKeyId())
                .orElseThrow(() -> new ResourceNotFoundException("TranslationKey", "id", request.getKeyId()));

        TranslationValue value;
        
        if (request.getCompanyId() != null) {
            // Company-specific override
            value = valueRepository.findByKeyIdAndLanguageAndCompanyId(
                    request.getKeyId(), request.getLanguage(), request.getCompanyId()
            ).orElseGet(() -> TranslationValue.builder()
                    .key(key)
                    .language(request.getLanguage())
                    .companyId(request.getCompanyId())
                    .build());
        } else {
            // Default translation
            value = valueRepository.findByKeyIdAndLanguageAndCompanyIdIsNull(
                    request.getKeyId(), request.getLanguage()
            ).orElseGet(() -> TranslationValue.builder()
                    .key(key)
                    .language(request.getLanguage())
                    .build());
        }

        value.setValueText(request.getValueText());
        TranslationValue saved = valueRepository.save(value);
        
        log.debug("Set translation for key {} in language {}", key.getKeyName(), request.getLanguage());
        return toValueDto(saved);
    }

    @Transactional(readOnly = true)
    public String getTranslation(String keyName, String namespace, String language, UUID companyId) {
        Optional<TranslationKey> keyOpt = keyRepository.findByKeyNameAndNamespace(keyName, namespace);
        
        if (keyOpt.isEmpty()) {
            return keyName; // Return key as fallback
        }

        TranslationKey key = keyOpt.get();

        // Try to find company override first
        if (companyId != null) {
            Optional<TranslationValue> companyValue = valueRepository
                    .findByKeyIdAndLanguageAndCompanyId(key.getId(), language, companyId);
            if (companyValue.isPresent() && companyValue.get().getValueText() != null) {
                return companyValue.get().getValueText();
            }
        }

        // Try default for requested language
        Optional<TranslationValue> defaultValue = valueRepository
                .findByKeyIdAndLanguageAndCompanyIdIsNull(key.getId(), language);
        if (defaultValue.isPresent() && defaultValue.get().getValueText() != null) {
            return defaultValue.get().getValueText();
        }

        // Fallback to default language
        if (!language.equals(fallbackLanguage)) {
            Optional<TranslationValue> fallbackValue = valueRepository
                    .findByKeyIdAndLanguageAndCompanyIdIsNull(key.getId(), fallbackLanguage);
            if (fallbackValue.isPresent() && fallbackValue.get().getValueText() != null) {
                return fallbackValue.get().getValueText();
            }
        }

        // Return key as last resort
        return keyName;
    }

    @Transactional(readOnly = true)
    // @Cacheable(value = "translations", key = "#language + '-' + (#companyId != null ? #companyId : 'default') + '-' + (#namespace != null ? #namespace : 'all')")
    public TranslationBundleDto getTranslationBundle(String language, UUID companyId, String namespace) {
        Map<String, String> translations = new HashMap<>();

        // Get all default translations for this language
        List<TranslationValue> defaultValues;
        if (namespace != null) {
            defaultValues = valueRepository.findByLanguageAndNamespace(language, namespace);
        } else {
            defaultValues = valueRepository.findAllDefaultByLanguage(language);
        }

        for (TranslationValue value : defaultValues) {
            String fullKey = value.getKey().getNamespace() + "." + value.getKey().getKeyName();
            translations.put(fullKey, value.getValueText());
        }

        // If fallback needed, get fallback translations for missing keys
        if (!language.equals(fallbackLanguage)) {
            List<TranslationValue> fallbackValues;
            if (namespace != null) {
                fallbackValues = valueRepository.findByLanguageAndNamespace(fallbackLanguage, namespace);
            } else {
                fallbackValues = valueRepository.findAllDefaultByLanguage(fallbackLanguage);
            }

            for (TranslationValue value : fallbackValues) {
                String fullKey = value.getKey().getNamespace() + "." + value.getKey().getKeyName();
                translations.putIfAbsent(fullKey, value.getValueText());
            }
        }

        // Apply company overrides if specified
        if (companyId != null) {
            List<TranslationValue> overrides = valueRepository.findAllByLanguageAndCompany(language, companyId);
            for (TranslationValue value : overrides) {
                String fullKey = value.getKey().getNamespace() + "." + value.getKey().getKeyName();
                translations.put(fullKey, value.getValueText());
            }
        }

        return TranslationBundleDto.builder()
                .language(language)
                .companyId(companyId)
                .namespace(namespace)
                .translations(translations)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TranslationValueDto> getValuesForKey(UUID keyId) {
        return valueRepository.findByKeyId(keyId).stream()
                .map(this::toValueDto)
                .collect(Collectors.toList());
    }

    @Transactional
    // @CacheEvict(value = "translations", allEntries = true)
    public void deleteCompanyOverrides(UUID companyId) {
        valueRepository.deleteByCompanyId(companyId);
        log.info("Deleted all translation overrides for company {}", companyId);
    }

    // ==================== Mappers ====================

    private TranslationKeyDto toKeyDto(TranslationKey key) {
        return TranslationKeyDto.builder()
                .id(key.getId())
                .keyName(key.getKeyName())
                .namespace(key.getNamespace())
                .description(key.getDescription())
                .createdAt(key.getCreatedAt())
                .updatedAt(key.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    // @Cacheable(value = "translations", key = "#language + '-' + (#companyId != null ? #companyId : 'default')")
    public List<TranslationDto> getAllTranslations(String language, UUID companyId) {
        Map<String, String> translations = new HashMap<>();

        // Get all default translations for this language
        List<TranslationValue> defaultValues = valueRepository.findAllDefaultByLanguage(language);
        for (TranslationValue value : defaultValues) {
            String fullKey = value.getKey().getNamespace() + "." + value.getKey().getKeyName();
            translations.put(fullKey, value.getValueText());
        }

        // If fallback needed, get fallback translations for missing keys
        if (!language.equals(fallbackLanguage)) {
            List<TranslationValue> fallbackValues = valueRepository.findAllDefaultByLanguage(fallbackLanguage);
            for (TranslationValue value : fallbackValues) {
                String fullKey = value.getKey().getNamespace() + "." + value.getKey().getKeyName();
                translations.putIfAbsent(fullKey, value.getValueText());
            }
        }

        // Apply company overrides if specified
        if (companyId != null) {
            List<TranslationValue> overrides = valueRepository.findAllByLanguageAndCompany(language, companyId);
            for (TranslationValue value : overrides) {
                String fullKey = value.getKey().getNamespace() + "." + value.getKey().getKeyName();
                translations.put(fullKey, value.getValueText());
            }
        }

        // Convert to list of TranslationDto
        return translations.entrySet().stream()
                .map(entry -> TranslationDto.builder()
                        .key(entry.getKey())
                        .value(entry.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    private TranslationValueDto toValueDto(TranslationValue value) {
        return TranslationValueDto.builder()
                .id(value.getId())
                .keyId(value.getKey().getId())
                .keyName(value.getKey().getKeyName())
                .language(value.getLanguage())
                .valueText(value.getValueText())
                .companyId(value.getCompanyId())
                .isOverride(value.getCompanyId() != null)
                .createdAt(value.getCreatedAt())
                .updatedAt(value.getUpdatedAt())
                .build();
    }
}
