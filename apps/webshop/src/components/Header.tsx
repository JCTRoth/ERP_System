import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { openCartDrawer } from "./CartDrawer";

export default function Header() {
  const { itemCount } = useCart();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  const isProductsActive = location.pathname.startsWith("/products");
  const isCategoriesActive = location.pathname.startsWith("/category");
  const navClass = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      active
        ? "bg-primary-50 text-primary-700"
        : "text-slate-700 hover:bg-white/70 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="page-shell">
        <div className="hidden items-center justify-between rounded-full bg-[#17352b] px-5 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-emerald-50 shadow-panel md:flex">
          <p className="text-emerald-50/85">{t("shop.announcement")}</p>
          <div className="flex items-center gap-5 text-emerald-50/60">
            <span>{t("footer.promiseOne")}</span>
            <span>{t("footer.promiseTwo")}</span>
            <span>{t("footer.promiseThree")}</span>
          </div>
        </div>

        <div className="glass-panel mt-3 rounded-[28px] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17352b] text-lg font-semibold text-white shadow-float">
                E
              </div>
              <div>
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#5c6966]">
                  {t("home.heroEyebrow")}
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  {t("shop.name")}
                </div>
              </div>
            </Link>

            <form
              onSubmit={handleSearch}
              className="hidden flex-1 lg:block"
              role="search"
            >
              <label htmlFor="desktop-search" className="sr-only">
                {t("shop.searchAria")}
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#72817d]" />
                <input
                  id="desktop-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("shop.searchPlaceholder")}
                  className="field-input pl-11 pr-4"
                />
              </div>
            </form>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Link
                to="/cart"
                className="hidden rounded-full border border-[#16211f]/10 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700 sm:inline-flex"
              >
                {t("shop.cart")}
              </Link>

              <button
                type="button"
                onClick={() => setLocale(locale === "en" ? "de" : "en")}
                className="hidden rounded-full border border-[#16211f]/10 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700 sm:inline-flex lg:hidden"
              >
                {locale === "en" ? "DE" : "EN"}
              </button>

              <button
                type="button"
                onClick={openCartDrawer}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#17352b] text-white shadow-float transition hover:-translate-y-0.5"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f3c978] px-1.5 text-[0.7rem] font-bold text-[#17352b]">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? t("shop.closeMenu") : t("shop.openMenu")}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/80 text-slate-800 lg:hidden"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 hidden items-center justify-between gap-4 lg:flex">
            <nav className="flex items-center gap-2 rounded-full bg-white/60 p-1">
              <Link to="/products" className={navClass(isProductsActive)}>
                {t("nav.products")}
              </Link>
              <Link to="/category/all" className={navClass(isCategoriesActive)}>
                {t("nav.categories")}
              </Link>
            </nav>

            <div className="flex items-center gap-3 text-sm text-[#5c6966]">
              <button
                type="button"
                onClick={() => setLocale(locale === "en" ? "de" : "en")}
                className="rounded-full border border-[#16211f]/10 bg-white/85 px-4 py-2 font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
              >
                {locale === "en" ? "DE" : "EN"}
              </button>
              <span className="h-1 w-1 rounded-full bg-[#8fa8a0]" />
              <span>{t("footer.hours")}</span>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="mt-4 border-t border-[#16211f]/10 pt-4 lg:hidden">
              <form onSubmit={handleSearch} className="relative" role="search">
                <label htmlFor="mobile-search" className="sr-only">
                  {t("shop.searchAria")}
                </label>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#72817d]" />
                <input
                  id="mobile-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("shop.searchPlaceholder")}
                  className="field-input pl-11 pr-4"
                />
              </form>

              <nav className="mt-4 grid gap-2">
                <Link
                  to="/products"
                  className={navClass(isProductsActive)}
                >
                  {t("nav.products")}
                </Link>
                <Link
                  to="/category/all"
                  className={navClass(isCategoriesActive)}
                >
                  {t("nav.categories")}
                </Link>
                <Link to="/cart" className={navClass(location.pathname === "/cart")}>
                  {t("shop.cart")}
                </Link>
              </nav>

              <button
                type="button"
                onClick={() => setLocale(locale === "en" ? "de" : "en")}
                className="mt-4 inline-flex rounded-full border border-[#16211f]/10 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
              >
                {locale === "en" ? "Deutsch" : "English"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
