package com.erp.translation.repository;

import com.erp.translation.entity.TranslationValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TranslationValueRepository extends JpaRepository<TranslationValue, UUID> {

    List<TranslationValue> findByKeyId(UUID keyId);
    
    Optional<TranslationValue> findByKeyIdAndLanguageAndCompanyIdIsNull(UUID keyId, String language);
    
    Optional<TranslationValue> findByKeyIdAndLanguageAndCompanyId(UUID keyId, String language, UUID companyId);
    
    @Query("SELECT v FROM TranslationValue v WHERE v.key.id = :keyId AND v.language = :language " +
           "AND (v.companyId = :companyId OR v.companyId IS NULL) " +
           "ORDER BY CASE WHEN v.companyId IS NOT NULL THEN 0 ELSE 1 END")
    List<TranslationValue> findByKeyAndLanguageWithFallback(
            @Param("keyId") UUID keyId, 
            @Param("language") String language,
            @Param("companyId") UUID companyId
    );
    
    @Query("SELECT v FROM TranslationValue v JOIN FETCH v.key " +
           "WHERE v.language = :language AND v.companyId IS NULL")
    List<TranslationValue> findAllDefaultByLanguage(@Param("language") String language);
    
    @Query("SELECT v FROM TranslationValue v JOIN FETCH v.key " +
           "WHERE v.language = :language AND v.companyId = :companyId")
    List<TranslationValue> findAllByLanguageAndCompany(
            @Param("language") String language, 
            @Param("companyId") UUID companyId
    );
    
    @Query("SELECT v FROM TranslationValue v JOIN FETCH v.key k " +
           "WHERE v.language = :language AND k.namespace = :namespace AND v.companyId IS NULL")
    List<TranslationValue> findByLanguageAndNamespace(
            @Param("language") String language, 
            @Param("namespace") String namespace
    );
    
    void deleteByCompanyId(UUID companyId);
    
    void deleteByKeyId(UUID keyId);
}
