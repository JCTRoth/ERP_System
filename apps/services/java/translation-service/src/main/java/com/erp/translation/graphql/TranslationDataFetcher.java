package com.erp.translation.graphql;

import com.erp.translation.dto.*;
import com.erp.translation.service.LanguageConfigService;
import com.erp.translation.service.TranslationService;
import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsMutation;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.DgsData;
import com.netflix.graphql.dgs.DgsDataFetchingEnvironment;
import com.netflix.graphql.dgs.InputArgument;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@DgsComponent
@RequiredArgsConstructor
public class TranslationDataFetcher {

    private final TranslationService translationService;
    private final LanguageConfigService languageConfigService;

    @DgsQuery
    public TranslationKeyDto translationKey(@InputArgument String id) {
        return translationService.getKeyById(UUID.fromString(id));
    }

    @DgsQuery
    public List<TranslationKeyDto> translationKeys(@InputArgument String namespace) {
        if (namespace != null) {
            return translationService.getKeysByNamespace(namespace);
        }
        return translationService.getAllKeys();
    }

    @DgsQuery
    public List<String> namespaces() {
        return translationService.getAllNamespaces();
    }

    @DgsQuery
    public String translation(@InputArgument String keyName,
                              @InputArgument String namespace,
                              @InputArgument String language,
                              @InputArgument String companyId) {
        UUID companyUuid = companyId != null ? UUID.fromString(companyId) : null;
        return translationService.getTranslation(keyName, namespace, language, companyUuid);
    }

    @DgsQuery
    public TranslationBundleDto translationBundle(@InputArgument String language,
                                                   @InputArgument String companyId,
                                                   @InputArgument String namespace) {
        UUID companyUuid = companyId != null ? UUID.fromString(companyId) : null;
        return translationService.getTranslationBundle(language, companyUuid, namespace);
    }

    @DgsQuery
    public List<TranslationValueDto> translationValues(@InputArgument String keyId) {
        return translationService.getValuesForKey(UUID.fromString(keyId));
    }

    @DgsData(parentType = "TranslationKey", field = "values")
    public List<TranslationValueDto> values(DgsDataFetchingEnvironment dfe) {
        TranslationKeyDto key = dfe.getSource();
        return translationService.getValuesForKey(key.getId());
    }

    @DgsQuery
    public List<TranslationDto> translations(@InputArgument String language,
                                             @InputArgument String companyId) {
        UUID companyUuid = companyId != null ? UUID.fromString(companyId) : null;
        return translationService.getAllTranslations(language, companyUuid);
    }

    @DgsQuery
    public List<LanguageConfigDto> languages() {
        return languageConfigService.getAvailableLanguages();
    }

    @DgsQuery
    public LanguageConfigDto defaultLanguage() {
        return languageConfigService.getDefaultLanguage();
    }

    @DgsMutation
    public TranslationKeyDto createTranslationKey(@InputArgument Map<String, Object> input) {
        CreateTranslationKeyRequest request = CreateTranslationKeyRequest.builder()
                .keyName((String) input.get("keyName"))
                .namespace((String) input.get("namespace"))
                .description((String) input.get("description"))
                .build();
        return translationService.createKey(request);
    }

    @DgsMutation
    public Boolean deleteTranslationKey(@InputArgument String id) {
        translationService.deleteKey(UUID.fromString(id));
        return true;
    }

    @DgsMutation
    public TranslationValueDto setTranslation(@InputArgument Map<String, Object> input) {
        String companyId = (String) input.get("companyId");
        SetTranslationRequest request = SetTranslationRequest.builder()
                .keyId(UUID.fromString((String) input.get("keyId")))
                .language((String) input.get("language"))
                .valueText((String) input.get("valueText"))
                .companyId(companyId != null ? UUID.fromString(companyId) : null)
                .build();
        return translationService.setTranslation(request);
    }

    @DgsMutation
    public Boolean deleteCompanyOverrides(@InputArgument String companyId) {
        translationService.deleteCompanyOverrides(UUID.fromString(companyId));
        return true;
    }
}
