import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { GET_PRODUCTS_BY_CATEGORY, GET_CATEGORY } from "../graphql/queries";
import { useI18n } from "../context/I18nContext";
import ProductCard from "../components/ProductCard";

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  const { data: catData } = useQuery(GET_CATEGORY, {
    variables: { id },
    skip: !id || id === "all",
  });

  const { data: productsData, loading } = useQuery(GET_PRODUCTS_BY_CATEGORY, {
    variables: { categoryId: id },
    skip: !id || id === "all",
  });

  const category = catData?.category;
  const products = productsData?.productsByCategory ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">
        {category?.name ?? t("nav.categories")}
      </h1>
      {category?.description && (
        <p className="mt-2 text-gray-600">{category.description}</p>
      )}

      {/* Sub-categories */}
      {category?.subCategories?.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {category.subCategories.map((sub: { id: string; name: string }) => (
            <a
              key={sub.id}
              href={`/category/${sub.id}`}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-primary-400 hover:text-primary-600"
            >
              {sub.name}
            </a>
          ))}
        </div>
      )}

      {loading ? (
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
        <p className="mt-12 text-center text-gray-500">{t("catalog.noResults")}</p>
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
    </div>
  );
}
