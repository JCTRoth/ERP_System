import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import UsersPage from './pages/users/UsersPage';
import TranslationsPage from './pages/translations/TranslationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import UIBuilderPage from './pages/ui-builder/UIBuilderPage';
import ProductsPage from './pages/products/ProductsPage';
import OrdersPage from './pages/orders/OrdersPage';
import AccountingPage from './pages/accounting/AccountingPage';
import MasterdataPage from './pages/masterdata/MasterdataPage';
import TemplatesPage from './pages/templates/TemplatesPage';
import NotFoundPage from './pages/NotFoundPage';
import CustomPageDisplay from './pages/custom-page/CustomPageDisplay';
import CompanySelectPage from './pages/auth/CompanySelectPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const companyAssignments = useAuthStore((state) => state.companyAssignments);
  const isGlobalSuperAdmin = useAuthStore((state) => state.isGlobalSuperAdmin);
  
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!currentCompanyId && companyAssignments.length > 0 && !isGlobalSuperAdmin) {
    return <Navigate to="/auth/select-company" replace />;
  }
  
  return <>{children}</>;
}

function PermissionRoute({
  children,
  permission,
  requiresCompany = false,
}: {
  children: React.ReactNode;
  permission?: string;
  requiresCompany?: boolean;
}) {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const companyAssignments = useAuthStore((state) => state.companyAssignments);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (requiresCompany && !currentCompanyId) {
    if (companyAssignments.length > 0) {
      return <Navigate to="/auth/select-company" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const setTheme = useUIStore((state) => state.setTheme);
  const setShowTranslationKeys = useUIStore((state) => state.setShowTranslationKeys);

  useEffect(() => {
    const scope = currentCompanyId || 'global';

    const scopedTheme = localStorage.getItem(`erp-ui-theme:${scope}`) as 'light' | 'dark' | 'system' | null;
    if (scopedTheme && ['light', 'dark', 'system'].includes(scopedTheme)) {
      setTheme(scopedTheme);
    }

    const scopedShowKeys = localStorage.getItem(`erp-ui-showTranslationKeys:${scope}`);
    if (scopedShowKeys !== null) {
      setShowTranslationKeys(scopedShowKeys === 'true');
    }
  }, [currentCompanyId, setTheme, setShowTranslationKeys]);

  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/auth"
        element={
          <PublicRoute>
            <AuthLayout />
          </PublicRoute>
        }
      >
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Company selection - separate screen after login (authenticated but no company yet) */}
      <Route path="/auth/select-company" element={<CompanySelectPage />} />

      {/* Main Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="companies" element={<PermissionRoute permission="company.company.read"><CompaniesPage /></PermissionRoute>} />
        <Route path="users" element={<PermissionRoute permission="user.user.read"><UsersPage /></PermissionRoute>} />
        <Route path="products" element={<PermissionRoute permission="shop.product.read" requiresCompany><ProductsPage /></PermissionRoute>} />
        <Route path="orders" element={<PermissionRoute permission="orders.order.read" requiresCompany><OrdersPage /></PermissionRoute>} />
        <Route path="accounting" element={<PermissionRoute permission="accounting.record.read" requiresCompany><AccountingPage /></PermissionRoute>} />
        <Route path="masterdata" element={<PermissionRoute permission="masterdata.record.read" requiresCompany><MasterdataPage /></PermissionRoute>} />
        <Route path="templates" element={<PermissionRoute permission="template.template.read" requiresCompany><TemplatesPage /></PermissionRoute>} />
        <Route path="translations" element={<PermissionRoute permission="translation.translation.read" requiresCompany><TranslationsPage /></PermissionRoute>} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ui-builder" element={<PermissionRoute permission="scripting.script.read" requiresCompany><UIBuilderPage /></PermissionRoute>} />
        <Route path="custom-page/:slug" element={<PermissionRoute permission="scripting.script.read" requiresCompany><CustomPageDisplay /></PermissionRoute>} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
