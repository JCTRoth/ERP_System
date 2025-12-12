package com.erp.company.repository;

import com.erp.company.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    Optional<Company> findByName(String name);
    
    Optional<Company> findByNameAndIsDemo(String name, Boolean isDemo);
    
    List<Company> findByIsDemo(Boolean isDemo);
    
    @Query("SELECT c FROM Company c JOIN UserCompanyAssignment uca ON c.id = uca.company.id " +
           "WHERE uca.userId = :userId")
    List<Company> findCompaniesByUserId(@Param("userId") UUID userId);
    
    boolean existsByName(String name);
}
