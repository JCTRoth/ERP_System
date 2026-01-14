package com.erp.company.service;

import com.erp.company.dto.CompanyDto;
import com.erp.company.dto.CreateCompanyRequest;
import com.erp.company.dto.UpdateCompanyRequest;
import com.erp.company.entity.Company;
import com.erp.company.exception.DuplicateResourceException;
import com.erp.company.exception.InvalidRequestException;
import com.erp.company.exception.ResourceNotFoundException;
import com.erp.company.mapper.CompanyMapper;
import com.erp.company.repository.CompanyRepository;
import com.erp.company.repository.DynamicFieldDefinitionRepository;
import com.erp.company.repository.DynamicFieldValueRepository;
import com.erp.company.repository.UserCompanyAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserCompanyAssignmentRepository assignmentRepository;
    private final DynamicFieldDefinitionRepository fieldDefinitionRepository;
    private final DynamicFieldValueRepository fieldValueRepository;
    private final CompanyMapper companyMapper;

    @Value("${app.demo-company.name:Demo_Corporation}")
    private String demoCompanyName;

    @Transactional(readOnly = true)
    public List<CompanyDto> getAllCompanies() {
        return companyMapper.toDtoList(companyRepository.findAll());
    }

    @Transactional(readOnly = true)
    public CompanyDto getCompanyById(UUID id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        return companyMapper.toDto(company);
    }

    @Transactional(readOnly = true)
    public CompanyDto getCompanyByName(String name) {
        Company company = companyRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "name", name));
        return companyMapper.toDto(company);
    }

    @Transactional(readOnly = true)
    public List<CompanyDto> getCompaniesByUserId(UUID userId) {
        return companyMapper.toDtoList(companyRepository.findCompaniesByUserId(userId));
    }

    @Transactional
    public CompanyDto createCompany(CreateCompanyRequest request) {
        if (companyRepository.existsByName(request.getName())) {
            throw new DuplicateResourceException("Company", "name", request.getName());
        }

        Company company = Company.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .description(request.getDescription())
                .settingsJson(request.getSettingsJson())
                .isDemo(false)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        Company saved = companyRepository.save(company);
        log.info("Created company: {} ({})", saved.getName(), saved.getId());
        return companyMapper.toDto(saved);
    }

    @Transactional
    public CompanyDto updateCompany(UUID id, UpdateCompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));

        if (request.getName() != null && !request.getName().equals(company.getName())) {
            if (companyRepository.existsByName(request.getName())) {
                throw new DuplicateResourceException("Company", "name", request.getName());
            }
            company.setName(request.getName());
        }

        if (request.getSlug() != null) {
            company.setSlug(request.getSlug());
        }

        if (request.getDescription() != null) {
            company.setDescription(request.getDescription());
        }

        if (request.getSettingsJson() != null) {
            company.setSettingsJson(request.getSettingsJson());
        }

        if (request.getIsActive() != null) {
            company.setIsActive(request.getIsActive());
        }

        Company saved = companyRepository.save(company);
        log.info("Updated company: {} ({})", saved.getName(), saved.getId());
        return companyMapper.toDto(saved);
    }

    @Transactional
    public void deleteCompany(UUID id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));

        if (company.getIsDemo()) {
            throw new InvalidRequestException("Demo company cannot be deleted, only reset");
        }

        // Delete in order: values -> definitions -> assignments -> company
        fieldValueRepository.deleteAllByCompanyId(id);
        fieldDefinitionRepository.deleteAllByCompanyId(id);
        assignmentRepository.deleteAllByCompanyId(id);
        companyRepository.delete(company);
        
        log.info("Deleted company: {} ({})", company.getName(), id);
    }

    @Transactional
    public CompanyDto updateCompanyLogo(UUID id, String logoUrl) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));

        company.setLogoUrl(logoUrl);
        Company saved = companyRepository.save(company);
        log.info("Updated logo for company: {} ({})", saved.getName(), saved.getId());
        return companyMapper.toDto(saved);
    }

    @Transactional
    public CompanyDto resetDemoCompany() {
        Company demoCompany = companyRepository.findByNameAndIsDemo(demoCompanyName, true)
                .orElseThrow(() -> new ResourceNotFoundException("Demo company not found"));

        UUID companyId = demoCompany.getId();

        // Delete all related data
        fieldValueRepository.deleteAllByCompanyId(companyId);
        fieldDefinitionRepository.deleteAllByCompanyId(companyId);
        assignmentRepository.deleteAllByCompanyId(companyId);

        // Reset company settings
        demoCompany.setSettingsJson(Map.of(
                "theme", "default",
                "timezone", "UTC"
        ));
        demoCompany.setLogoUrl(null);

        Company saved = companyRepository.save(demoCompany);
        log.info("Reset demo company: {} ({})", saved.getName(), saved.getId());
        
        return companyMapper.toDto(saved);
    }

    @Transactional
    public CompanyDto createDemoCompanyIfNotExists() {
        return companyRepository.findByNameAndIsDemo(demoCompanyName, true)
                .map(companyMapper::toDto)
                .orElseGet(() -> {
                    String slug = demoCompanyName.toLowerCase().replace("_", "-").replace(" ", "-");
                    log.info("Intending to create demo company with name '{}' and slug '{}'", demoCompanyName, slug);
                    Company demoCompany = Company.builder()
                            .name(demoCompanyName)
                            .slug(slug)
                            .isDemo(true)
                            .settingsJson(Map.of(
                                    "theme", "default",
                                    "timezone", "UTC"
                            ))
                            .build();
                    Company saved = companyRepository.save(demoCompany);
                    log.info("Created demo company: {} ({})", saved.getName(), saved.getId());
                    return companyMapper.toDto(saved);
                });
    }

    public int getTotalCompaniesCount() {
        return (int) companyRepository.count();
    }
}
