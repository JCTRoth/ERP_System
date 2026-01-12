package com.erp.company.graphql;

import com.erp.company.dto.CompanyDto;
import com.erp.company.dto.CreateCompanyRequest;
import com.erp.company.dto.UpdateCompanyRequest;
import com.erp.company.service.CompanyService;
import com.netflix.graphql.dgs.DgsComponent;
import com.netflix.graphql.dgs.DgsMutation;
import com.netflix.graphql.dgs.DgsQuery;
import com.netflix.graphql.dgs.InputArgument;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@DgsComponent
@RequiredArgsConstructor
public class CompanyDataFetcher {

    private final CompanyService companyService;

    @DgsQuery
    public CompanyDto company(@InputArgument String id) {
        return companyService.getCompanyById(UUID.fromString(id));
    }

    @DgsQuery
    public CompanyDto companyByName(@InputArgument String name) {
        return companyService.getCompanyByName(name);
    }

    @DgsQuery
    public List<CompanyDto> companies() {
        return companyService.getAllCompanies();
    }

    @DgsQuery
    public List<CompanyDto> companiesByUser(@InputArgument String userId) {
        return companyService.getCompaniesByUserId(UUID.fromString(userId));
    }

    @DgsQuery
    public int totalCompanies() {
        return companyService.getTotalCompaniesCount();
    }

    @DgsMutation
    public CompanyDto createCompany(@InputArgument Map<String, Object> input) {
        CreateCompanyRequest request = CreateCompanyRequest.builder()
                .name((String) input.get("name"))
                .slug((String) input.get("slug"))
                .description((String) input.get("description"))
                .settingsJson(input.get("settingsJson") instanceof Map<?, ?> ? (Map<String, Object>) input.get("settingsJson") : new java.util.HashMap<>())
                .isActive((Boolean) input.get("isActive"))
                .build();
        return companyService.createCompany(request);
    }

    @DgsMutation
    public CompanyDto updateCompany(@InputArgument String id, @InputArgument Map<String, Object> input) {
        UpdateCompanyRequest request = UpdateCompanyRequest.builder()
                .name((String) input.get("name"))
                .slug((String) input.get("slug"))
                .description((String) input.get("description"))
                .settingsJson(input.get("settingsJson") instanceof Map<?, ?> ? (Map<String, Object>) input.get("settingsJson") : new java.util.HashMap<>())
                .isActive((Boolean) input.get("isActive"))
                .build();
        return companyService.updateCompany(UUID.fromString(id), request);
    }

    @DgsMutation
    public Boolean deleteCompany(@InputArgument String id) {
        companyService.deleteCompany(UUID.fromString(id));
        return true;
    }

    @DgsMutation
    public CompanyDto resetDemoCompany() {
        return companyService.resetDemoCompany();
    }
}
