import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
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
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="masterdata" element={<MasterdataPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="translations" element={<TranslationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ui-builder" element={<UIBuilderPage />} />
        <Route path="custom-page/:slug" element={<CustomPageDisplay />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
