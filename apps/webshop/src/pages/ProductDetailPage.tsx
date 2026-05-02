import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { ShoppingCartIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";
import { GET_PRODUCT } from "../graphql/queries";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatPrice } from "../lib/utils";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const { data, loading } = useQuery(GET_PRODUCT, {
    variables: { id },
    skip: !id,
  });

  const product = data?.product;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square rounded-xl bg-gray-200" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-gray-200" />
            <div className="h-6 w-1/4 rounded bg-gray-200" />
            <div className="h-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-gray-500">{t("product.notFound")}</p>
        <Link to="/products" className="mt-4 inline-block text-primary-600 hover:underline">
          {t("product.backToProducts")}
        </Link>
      </div>
    );
  }

  const images = product.images ?? [];
  const outOfStock = product.stockQuantity <= 0;
  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Link to="/products" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeftIcon className="h-4 w-4" />
        {t("product.backToProducts")}
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]?.url}
                alt={images[selectedImage]?.altText ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <ShoppingCartIcon className="h-20 w-20" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
              {images.map((img: { id: string; url: string; altText?: string }, idx: number) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                    idx === selectedImage ? "border-primary-500" : "border-transparent"
                  }`}
                >
                  <img src={img.url} alt={img.altText ?? ""} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.category && (
            <Link
              to={`/category/${product.category.id}`}
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="mt-1 text-3xl font-bold text-gray-900">{product.name}</h1>

          {product.brand && (
            <p className="mt-1 text-sm text-gray-500">{product.brand.name}</p>
          )}

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
            {hasDiscount && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
              </span>
            )}
          </div>

          {/* Stock */}
          <p className={`mt-2 text-sm ${outOfStock ? "text-red-600" : "text-green-600"}`}>
            {outOfStock ? t("product.outOfStock") : t("product.inStock")}
          </p>

          {/* SKU / EAN */}
          <div className="mt-3 flex gap-4 text-xs text-gray-400">
            <span>SKU: {product.sku}</span>
            {product.ean && <span>EAN: {product.ean}</span>}
          </div>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">{t("product.variants")}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((v: { id: string; name: string; price: number; stockQuantity: number }) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id === selectedVariant ? null : v.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      selectedVariant === v.id
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    } ${v.stockQuantity <= 0 ? "opacity-50" : ""}`}
                  >
                    {v.name} — {formatPrice(v.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attributes */}
          {product.attributes?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">{t("product.attributes")}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {product.attributes.map((a: { id: string; name: string; value: string }) => (
                  <div key={a.id} className="flex gap-2">
                    <dt className="font-medium text-gray-500">{a.name}:</dt>
                    <dd className="text-gray-900">{a.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-gray-300">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                +
              </button>
            </div>
            <button
              disabled={outOfStock}
              onClick={() => addToCart(product.id, quantity, selectedVariant ?? undefined)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <ShoppingCartIcon className="h-5 w-5" />
              {outOfStock ? t("product.outOfStock") : t("product.addToCart")}
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-900">{t("product.description")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Dimensions / Weight */}
          {(product.weight || product.length) && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">{t("product.specs")}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {product.weight && (
                  <>
                    <dt className="text-gray-500">{t("product.weight")}</dt>
                    <dd>{product.weight} {product.weightUnit}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
