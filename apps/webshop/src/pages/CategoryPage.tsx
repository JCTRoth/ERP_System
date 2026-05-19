import { Link, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import {
  GET_CATEGORIES,
  GET_CATEGORY,
  GET_PRODUCTS,
  GET_PRODUCTS_BY_CATEGORY,
} from "../graphql/queries";
import { useI18n } from "../context/I18nContext";
import ProductCard from "../components/ProductCard";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const showAllCollections = id === "all";

  const { data: catData, error: categoryError } = useQuery(GET_CATEGORY, {
    variables: { id },
    skip: !id || showAllCollections,
  });

  const { data: productsData, loading, error: productsError } = useQuery(GET_PRODUCTS_BY_CATEGORY, {
    variables: { categoryId: id },
    skip: !id || showAllCollections,
  });

  const { data: rootCategoryData, error: rootCategoryError } = useQuery(GET_CATEGORIES, {
    skip: !showAllCollections,
  });

  const { data: allProductsData, loading: allProductsLoading, error: allProductsError } = useQuery(GET_PRODUCTS, {
    variables: { first: 12 },
    skip: !showAllCollections,
  });

  const category = catData?.category;
  const products = showAllCollections
    ? allProductsData?.products?.nodes ?? []
    : productsData?.productsByCategory ?? [];
  const subCategories = showAllCollections
    ? rootCategoryData?.rootCategories ?? []
    : category?.subCategories ?? [];
  const pageTitle = showAllCollections
    ? t("category.allTitle")
    : category?.name ?? t("nav.categories");
  const pageDescription = showAllCollections
    ? t("category.allDescription")
    : category?.description ?? t("catalog.filterCopy");
  const isLoading = showAllCollections ? allProductsLoading : loading;
  const backendUnavailable = Boolean(categoryError || productsError || rootCategoryError || allProductsError);

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell">
        <section className="glass-panel-strong rounded-[32px] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-kicker-light">{t("nav.categories")}</span>
              <h1 className="section-title mt-4">{pageTitle}</h1>
              <p className="section-copy mt-3">{pageDescription}</p>
            </div>

            <Link
              to="/products"
              className="pill-badge w-fit transition hover:bg-primary-50 hover:text-primary-700"
            >
              {t("category.exploreAll")}
            </Link>
          </div>

          {subCategories.length > 0 && (
            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                {showAllCollections ? t("nav.categories") : t("category.subcategories")}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {subCategories.map((sub: { id: string; name: string }) => (
                  <Link
                    key={sub.id}
                    to={`/category/${sub.id}`}
                    className="rounded-full border border-[#16211f]/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {isLoading ? (
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
            <p className="section-copy mt-3">{t("system.unavailableCategory")}</p>
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
  );
}
