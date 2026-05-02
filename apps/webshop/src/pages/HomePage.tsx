import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { GET_FEATURED_PRODUCTS, GET_CATEGORIES } from "../graphql/queries";
import { useI18n } from "../context/I18nContext";
import ProductCard from "../components/ProductCard";

export default function HomePage() {
  const { t } = useI18n();

  const { data: featuredData, loading: featuredLoading } = useQuery(
    GET_FEATURED_PRODUCTS,
    { variables: { take: 8 } }
  );

  const { data: catData } = useQuery(GET_CATEGORIES);

  const products = featuredData?.featuredProducts ?? [];
  const categories = catData?.rootCategories ?? [];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-4 text-lg text-primary-100">
              {t("home.heroSubtitle")}
            </p>
            <Link
              to="/products"
              className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow hover:bg-primary-50"
            >
              {t("home.shopNow")}
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">{t("home.categories")}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat: { id: string; name: string; description?: string }) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-6 text-center transition hover:border-primary-300 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xl font-bold">
                  {cat.name.charAt(0)}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{t("home.featured")}</h2>
          <Link to="/products" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            {t("home.viewAll")} &rarr;
          </Link>
        </div>

        {featuredLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <p className="mt-8 text-center text-gray-500">{t("home.noProducts")}</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p: {
              id: string; name: string; price: number; compareAtPrice?: number;
              slug?: string; stockQuantity: number;
              images: { url: string; altText?: string; isPrimary: boolean }[];
            }) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
