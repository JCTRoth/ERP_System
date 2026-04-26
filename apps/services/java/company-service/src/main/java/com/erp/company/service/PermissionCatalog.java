package com.erp.company.service;

import com.erp.company.entity.GroupPermission;
import com.erp.company.entity.UserCompanyAssignment;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public final class PermissionCatalog {

    public record PermissionDefinition(String code, String resource, String operation, String description) {}

    public record ScopeGrantDefinition(String permissionCode, GroupPermission.ScopeType scopeType, String scopeJson) {}

    private static final List<PermissionDefinition> DEFINITIONS = List.of(
            new PermissionDefinition("company.company.read", "company.company", "read", "Read company settings and metadata"),
            new PermissionDefinition("company.company.create", "company.company", "create", "Create companies"),
            new PermissionDefinition("company.company.update", "company.company", "update", "Update company settings"),
            new PermissionDefinition("company.company.delete", "company.company", "delete", "Delete companies"),
            new PermissionDefinition("company.assignment.read", "company.assignment", "read", "Read company user assignments"),
            new PermissionDefinition("company.assignment.manage", "company.assignment", "manage", "Manage company user assignments"),
            new PermissionDefinition("company.group.read", "company.group", "read", "Read company authorization groups"),
            new PermissionDefinition("company.group.manage", "company.group", "manage", "Manage company authorization groups"),
            new PermissionDefinition("user.user.read", "user.user", "read", "Read user profiles"),
            new PermissionDefinition("user.user.create", "user.user", "create", "Create users"),
            new PermissionDefinition("user.user.update", "user.user", "update", "Update user profiles"),
            new PermissionDefinition("user.user.deactivate", "user.user", "deactivate", "Deactivate users"),
            new PermissionDefinition("shop.product.read", "shop.product", "read", "Read products and catalog data"),
            new PermissionDefinition("shop.product.manage", "shop.product", "manage", "Manage products and catalog data"),
            new PermissionDefinition("orders.order.read", "orders.order", "read", "Read operational orders"),
            new PermissionDefinition("orders.order.manage", "orders.order", "manage", "Manage operational orders"),
            new PermissionDefinition("accounting.record.read", "accounting.record", "read", "Read accounting records"),
            new PermissionDefinition("accounting.record.manage", "accounting.record", "manage", "Manage accounting records"),
            new PermissionDefinition("accounting.record.approve", "accounting.record", "approve", "Approve accounting records"),
            new PermissionDefinition("masterdata.record.read", "masterdata.record", "read", "Read master data"),
            new PermissionDefinition("masterdata.record.manage", "masterdata.record", "manage", "Manage master data"),
            new PermissionDefinition("translation.translation.read", "translation.translation", "read", "Read translations"),
            new PermissionDefinition("translation.translation.manage", "translation.translation", "manage", "Manage translations"),
            new PermissionDefinition("template.template.read", "template.template", "read", "Read templates"),
            new PermissionDefinition("template.template.manage", "template.template", "manage", "Manage templates"),
            new PermissionDefinition("notification.notification.read", "notification.notification", "read", "Read notifications"),
            new PermissionDefinition("notification.notification.manage", "notification.notification", "manage", "Manage notifications"),
            new PermissionDefinition("scripting.script.read", "scripting.script", "read", "Read scripts and UI builder assets"),
            new PermissionDefinition("scripting.script.manage", "scripting.script", "manage", "Manage scripts and UI builder assets")
    );

    private static final Map<UserCompanyAssignment.UserRole, List<ScopeGrantDefinition>> DEFAULT_ROLE_GRANTS;

    static {
        var defaults = new EnumMap<UserCompanyAssignment.UserRole, List<ScopeGrantDefinition>>(UserCompanyAssignment.UserRole.class);

        defaults.put(UserCompanyAssignment.UserRole.SUPER_ADMIN,
                DEFINITIONS.stream()
                        .map(def -> new ScopeGrantDefinition(def.code(), GroupPermission.ScopeType.COMPANY, null))
                        .toList());

        defaults.put(UserCompanyAssignment.UserRole.ADMIN,
                DEFINITIONS.stream()
                        .map(def -> new ScopeGrantDefinition(def.code(), GroupPermission.ScopeType.COMPANY, null))
                        .toList());

        defaults.put(UserCompanyAssignment.UserRole.USER, List.of(
                grant("company.company.read"),
                grant("shop.product.read"),
                grant("shop.product.manage"),
                grant("orders.order.read"),
                grant("orders.order.manage"),
                grant("accounting.record.read"),
                grant("accounting.record.manage"),
                grant("masterdata.record.read"),
                grant("masterdata.record.manage"),
                grant("translation.translation.read"),
                grant("template.template.read"),
                grant("template.template.manage"),
                grant("notification.notification.read"),
                grant("scripting.script.read"),
                grant("scripting.script.manage")
        ));

        defaults.put(UserCompanyAssignment.UserRole.VIEWER,
                DEFINITIONS.stream()
                        .filter(def -> "read".equals(def.operation()))
                        .map(def -> new ScopeGrantDefinition(def.code(), GroupPermission.ScopeType.COMPANY, null))
                        .toList());

        DEFAULT_ROLE_GRANTS = Map.copyOf(defaults);
    }

    private PermissionCatalog() {
    }

    public static List<PermissionDefinition> allDefinitions() {
        return DEFINITIONS;
    }

    public static List<ScopeGrantDefinition> defaultsForRole(UserCompanyAssignment.UserRole role) {
        return DEFAULT_ROLE_GRANTS.getOrDefault(role, List.of());
    }

    public static List<String> systemGroupCodes() {
        return List.of("SUPER_ADMIN", "ADMIN", "USER", "VIEWER");
    }

    private static ScopeGrantDefinition grant(String code) {
        return new ScopeGrantDefinition(code, GroupPermission.ScopeType.COMPANY, null);
    }
}
