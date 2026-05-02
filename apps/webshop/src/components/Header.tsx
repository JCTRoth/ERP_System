import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";

export default function Header() {
  const { itemCount } = useCart();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-sm">
              E
            </div>
            <span className="text-xl font-bold text-gray-900">
              {t("shop.name")}
            </span>
          </Link>

          {/* Search bar - desktop */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex mx-8 flex-1 max-w-lg"
          >
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("shop.searchPlaceholder")}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Language switcher */}
            <button
              onClick={() => setLocale(locale === "en" ? "de" : "en")}
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {locale === "en" ? "DE" : "EN"}
            </button>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 pb-2 text-sm font-medium">
          <Link to="/products" className="text-gray-600 hover:text-primary-600">
            {t("nav.products")}
          </Link>
          <Link to="/category/all" className="text-gray-600 hover:text-primary-600">
            {t("nav.categories")}
          </Link>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 md:hidden">
          <form onSubmit={handleSearch} className="mt-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("shop.searchPlaceholder")}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm"
              />
            </div>
          </form>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              to="/products"
              className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("nav.products")}
            </Link>
            <Link
              to="/category/all"
              className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t("nav.categories")}
            </Link>
            <button
              onClick={() => { setLocale(locale === "en" ? "de" : "en"); setMobileMenuOpen(false); }}
              className="rounded-lg px-3 py-2 text-left text-gray-700 hover:bg-gray-100"
            >
              {locale === "en" ? "Deutsch" : "English"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
