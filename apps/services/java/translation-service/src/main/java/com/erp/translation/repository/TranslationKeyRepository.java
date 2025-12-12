package com.erp.translation.repository;

import com.erp.translation.entity.TranslationKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TranslationKeyRepository extends JpaRepository<TranslationKey, UUID> {

    Optional<TranslationKey> findByKeyNameAndNamespace(String keyName, String namespace);
    
    List<TranslationKey> findByNamespace(String namespace);
    
    List<TranslationKey> findByKeyNameContainingIgnoreCase(String search);
    
    @Query("SELECT DISTINCT k.namespace FROM TranslationKey k WHERE k.namespace IS NOT NULL")
    List<String> findAllNamespaces();
    
    boolean existsByKeyNameAndNamespace(String keyName, String namespace);
    
    @Query("SELECT k FROM TranslationKey k WHERE k.keyName LIKE :prefix%")
    List<TranslationKey> findByKeyNamePrefix(@Param("prefix") String prefix);
}
