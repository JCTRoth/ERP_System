package com.erp.company.graphql;

import com.erp.company.dto.CompanyDto;
import com.erp.company.dto.CreateCompanyRequest;
import com.erp.company.dto.UpdateCompanyRequest;
import com.erp.company.exception.AccessDeniedException;
import com.erp.company.service.CompanyService;
import com.erp.company.service.RequestAuthorizationService;
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
    private final RequestAuthorizationService requestAuthorizationService;

    @DgsQuery
    public CompanyDto company(@InputArgument String id) {
        requestAuthorizationService.requirePermission("company.company.read");
        var companyId = UUID.fromString(id);
        requestAuthorizationService.requireCompanyAccess(companyId);
        return companyService.getCompanyById(companyId);
    }

    @DgsQuery
    public CompanyDto companyByName(@InputArgument String name) {
        requestAuthorizationService.requirePermission("company.company.read");
        return companyService.getCompanyByName(name);
    }

    @DgsQuery
    public List<CompanyDto> companies() {
        if (!requestAuthorizationService.isGlobalSuperAdmin()) {
            requestAuthorizationService.requirePermission("company.company.read");
            var currentCompanyId = requestAuthorizationService.getCurrentCompanyId();
            if (currentCompanyId != null) {
                return List.of(companyService.getCompanyById(currentCompanyId));
            }
            return List.of();
        }

        return companyService.getAllCompanies();
    }

    @DgsQuery
    public List<CompanyDto> companiesByUser(@InputArgument String userId) {
        var targetUserId = UUID.fromString(userId);
        var currentUserId = requestAuthorizationService.getCurrentUserId();
        if (!requestAuthorizationService.isGlobalSuperAdmin() && (currentUserId == null || !currentUserId.equals(targetUserId))) {
            throw new AccessDeniedException("Only the current user or a global super admin can list companies by user");
        }
        return companyService.getCompaniesByUserId(targetUserId);
    }

    @DgsQuery
    public int totalCompanies() {
        if (!requestAuthorizationService.isGlobalSuperAdmin()) {
            requestAuthorizationService.requirePermission("company.company.read");
            return requestAuthorizationService.getCurrentCompanyId() != null ? 1 : 0;
        }

        return companyService.getTotalCompaniesCount();
    }

    @DgsMutation
    @SuppressWarnings("unchecked")
    public CompanyDto createCompany(@InputArgument Map<String, Object> input) {
        if (!requestAuthorizationService.isGlobalSuperAdmin()) {
            requestAuthorizationService.requirePermission("company.company.create");
        }

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
    @SuppressWarnings("unchecked")
    public CompanyDto updateCompany(@InputArgument String id, @InputArgument Map<String, Object> input) {
        requestAuthorizationService.requirePermission("company.company.update");
        requestAuthorizationService.requireCompanyAccess(UUID.fromString(id));

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
        if (!requestAuthorizationService.isGlobalSuperAdmin()) {
            requestAuthorizationService.requirePermission("company.company.delete");
        }

        companyService.deleteCompany(UUID.fromString(id));
        return true;
    }

    @DgsMutation
    public CompanyDto resetDemoCompany() {
        if (!requestAuthorizationService.isGlobalSuperAdmin()) {
            requestAuthorizationService.requirePermission("company.company.delete");
        }

        return companyService.resetDemoCompany();
    }
}
