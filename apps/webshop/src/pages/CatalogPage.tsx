import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { Link, useSearchParams } from "react-router-dom";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { GET_PRODUCTS, SEARCH_PRODUCTS, GET_CATEGORIES } from "../graphql/queries";
import { useI18n } from "../context/I18nContext";
import ProductCard from "../components/ProductCard";

type SortOption = "name" | "price-asc" | "price-desc";

export default function CatalogPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedSearch = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(appliedSearch);
  const [sort, setSort] = useState<SortOption>("name");

  useEffect(() => {
    setSearch(appliedSearch);
  }, [appliedSearch]);

  const isSearching = appliedSearch.trim().length > 0;

  const { data: productsData, loading: productsLoading, error: productsError } = useQuery(GET_PRODUCTS, {
    variables: { first: 50 },
    skip: isSearching,
  });

  const { data: searchData, loading: searchLoading, error: searchError } = useQuery(SEARCH_PRODUCTS, {
    variables: { searchTerm: appliedSearch.trim() },
    skip: !isSearching,
  });

  const { data: catData, error: categoriesError } = useQuery(GET_CATEGORIES);

  const rawProducts = isSearching
    ? searchData?.searchProducts ?? []
    : productsData?.products?.nodes ?? [];

  const loading = isSearching ? searchLoading : productsLoading;
  const categories = catData?.rootCategories ?? [];
  const backendUnavailable = Boolean(productsError || searchError || categoriesError);

  // Sort
  const products = [...rawProducts].sort((a: { name: string; price: number }, b: { name: string; price: number }) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return a.name.localeCompare(b.name);
  });

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchParams(search.trim() ? { q: search.trim() } : {});
  };

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell">
        <section className="glass-panel-strong rounded-[32px] px-6 py-8 sm:px-8">
          <div className="max-w-2xl">
            <span className="section-kicker-light">{t("catalog.eyebrow")}</span>
            <h1 className="section-title mt-4">{t("catalog.title")}</h1>
            <p className="section-copy mt-3">{t("catalog.intro")}</p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="glass-panel h-fit rounded-[28px] p-5 lg:sticky lg:top-32">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("catalog.filterTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5c6966]">{t("catalog.filterCopy")}</p>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSearchParams({});
                }}
                className="w-full rounded-2xl border border-[#16211f]/10 bg-white/80 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
              >
                {t("catalog.allProducts")}
              </button>
              {categories.map((cat: { id: string; name: string }) => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.id}`}
                  className="block rounded-2xl border border-[#16211f]/10 bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:bg-white hover:text-primary-700"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </aside>

          <div>
            <div className="glass-panel rounded-[28px] p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <form onSubmit={handleSearch} className="flex-1" role="search">
                  <label htmlFor="catalog-search" className="field-label">
                    {t("catalog.searchLabel")}
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#72817d]" />
                    <input
                      id="catalog-search"
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("catalog.searchPlaceholder")}
                      className="field-input pl-11 pr-4"
                    />
                  </div>
                </form>

                <div className="min-w-[220px]">
                  <label htmlFor="catalog-sort" className="field-label">
                    {t("catalog.sortLabel")}
                  </label>
                  <div className="relative">
                    <FunnelIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#72817d]" />
                    <select
                      id="catalog-sort"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortOption)}
                      className="field-input appearance-none pl-11"
                    >
                      <option value="name">{t("catalog.sortName")}</option>
                      <option value="price-asc">{t("catalog.sortPriceAsc")}</option>
                      <option value="price-desc">{t("catalog.sortPriceDesc")}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-[#16211f]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#5c6966]">
                  {t("catalog.resultCount", { count: products.length })}
                </p>

                {isSearching && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="pill-badge">
                      {t("catalog.activeSearch")} “{appliedSearch}”
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setSearchParams({});
                      }}
                      className="text-sm font-semibold text-primary-700 transition hover:text-primary-800"
                    >
                      {t("catalog.clearSearch")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="mt-6 catalog-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-panel animate-pulse rounded-[28px] p-4">
                    <div className="aspect-[4/4.5] rounded-[24px] bg-[#e7e1d7]" />
                    <div className="mt-4 space-y-3">
                      <div className="h-4 w-2/3 rounded-full bg-[#e2dbd1]" />
                      <div className="h-4 w-1/3 rounded-full bg-[#e2dbd1]" />
                      <div className="h-11 rounded-full bg-[#ddd5ca]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : backendUnavailable ? (
              <div className="glass-panel mt-6 rounded-[28px] px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">{t("system.unavailableTitle")}</p>
                <p className="section-copy mt-3">{t("system.unavailableCatalog")}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="glass-panel mt-6 rounded-[28px] px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">{t("catalog.noResults")}</p>
                <p className="section-copy mt-3">{t("catalog.filterCopy")}</p>
              </div>
            ) : (
              <div className="mt-6 catalog-grid">
                {products.map((p: {
                  id: string; name: string; price: number; compareAtPrice?: number;
                  slug?: string; stockQuantity: number;
                  images: { url: string; altText?: string; isPrimary: boolean }[];
                }) => (
                  <ProductCard key={p.id} {...p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
