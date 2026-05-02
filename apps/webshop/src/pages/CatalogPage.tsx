import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useSearchParams } from "react-router-dom";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { GET_PRODUCTS, SEARCH_PRODUCTS, GET_CATEGORIES } from "../graphql/queries";
import { useI18n } from "../context/I18nContext";
import ProductCard from "../components/ProductCard";

type SortOption = "name" | "price-asc" | "price-desc";

export default function CatalogPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(initialQ);
  const [sort, setSort] = useState<SortOption>("name");

  const isSearching = search.trim().length > 0;

  const { data: productsData, loading: productsLoading } = useQuery(GET_PRODUCTS, {
    variables: { first: 50 },
    skip: isSearching,
  });

  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_PRODUCTS, {
    variables: { searchTerm: search.trim() },
    skip: !isSearching,
  });

  const { data: catData } = useQuery(GET_CATEGORIES);

  const rawProducts = isSearching
    ? searchData?.searchProducts ?? []
    : productsData?.products?.nodes ?? [];

  const loading = isSearching ? searchLoading : productsLoading;
  const categories = catData?.rootCategories ?? [];

  // Sort
  const products = [...rawProducts].sort((a: { name: string; price: number }, b: { name: string; price: number }) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return a.name.localeCompare(b.name);
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(search.trim() ? { q: search.trim() } : {});
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("catalog.title")}</h1>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">{t("nav.categories")}</h3>
            <ul className="mt-3 space-y-1">
              <li>
                <button
                  onClick={() => { setSearch(""); setSearchParams({}); }}
                  className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("catalog.allProducts")}
                </button>
              </li>
              {categories.map((cat: { id: string; name: string }) => (
                <li key={cat.id}>
                  <a
                    href={`/category/${cat.id}`}
                    className="block rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {cat.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          {/* Search + Sort Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("catalog.searchPlaceholder")}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </form>
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="name">{t("catalog.sortName")}</option>
                <option value="price-asc">{t("catalog.sortPriceAsc")}</option>
                <option value="price-desc">{t("catalog.sortPriceDesc")}</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <p className="mt-4 text-sm text-gray-500">
            {t("catalog.resultCount", { count: products.length })}
          </p>

          {/* Product Grid */}
          {loading ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border bg-white">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-5 w-1/3 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="mt-12 text-center text-gray-500">{t("catalog.noResults")}</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
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
  );
}
