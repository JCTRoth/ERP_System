import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { ChevronLeftIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import { openCartDrawer } from "../components/CartDrawer";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { GET_PRODUCT } from "../graphql/queries";
import { formatPrice } from "../lib/utils";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_PRODUCT, {
    variables: { id },
    skip: !id,
  });

  const product = data?.product;

  if (loading) {
    return (
      <div className="pt-4 sm:pt-6">
        <div className="page-shell">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="glass-panel-strong animate-pulse rounded-[32px] p-6 sm:p-8">
              <div className="aspect-square rounded-[28px] bg-[#e7e1d7]" />
            </div>
            <div className="glass-panel animate-pulse rounded-[32px] p-6 sm:p-8">
              <div className="space-y-4">
                <div className="h-5 w-1/4 rounded-full bg-[#e2dbd1]" />
                <div className="h-12 w-3/4 rounded-full bg-[#ddd5ca]" />
                <div className="h-6 w-1/3 rounded-full bg-[#ddd5ca]" />
                <div className="h-32 rounded-[24px] bg-[#e7e1d7]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-4 sm:pt-6">
        <div className="page-shell">
          <div className="glass-panel rounded-[32px] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">
              {error ? t("system.unavailableTitle") : t("product.notFound")}
            </p>
            <p className="section-copy mt-3">
              {error ? t("system.unavailableProduct") : t("product.notFoundHelp")}
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex rounded-full border border-primary-300 bg-white px-5 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              {t("product.backToProducts")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const activeVariant = product.variants?.find(
    (variant: { id: string }) => variant.id === selectedVariant
  );
  const price = activeVariant?.price ?? product.price;
  const availableStock = activeVariant?.stockQuantity ?? product.stockQuantity;
  const outOfStock = availableStock <= 0;
  const hasDiscount = product.compareAtPrice != null && product.compareAtPrice > price;
  const trustItems = [
    t("product.shippingNotice"),
    t("product.returnNotice"),
    t("product.supportNotice"),
  ];

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell">
        <Link
          to="/products"
          className="pill-badge transition hover:bg-primary-50 hover:text-primary-700"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t("product.backToProducts")}
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="glass-panel-strong rounded-[32px] p-6 sm:p-8">
            <div className="grid gap-4 xl:grid-cols-[96px_minmax(0,1fr)]">
              {images.length > 1 && (
                <div className="order-2 flex gap-2 overflow-x-auto xl:order-1 xl:flex-col">
                  {images.map((image: { id: string; url: string; altText?: string }, index: number) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      className={`overflow-hidden rounded-[20px] border-2 transition ${
                        index === selectedImage
                          ? "border-primary-500 shadow-float"
                          : "border-transparent opacity-80 hover:border-primary-200 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.altText ?? ""}
                        className="h-20 w-20 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className={images.length > 1 ? "order-1 xl:order-2" : undefined}>
                <div className="relative aspect-square overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(243,201,120,0.18),transparent_30%),linear-gradient(180deg,#fbfaf7_0%,#f1ede6_100%)]">
                  {images.length > 0 ? (
                    <img
                      src={images[selectedImage]?.url}
                      alt={images[selectedImage]?.altText ?? product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#7d8b87]">
                      <ShoppingCartIcon className="h-20 w-20" />
                    </div>
                  )}

                  {hasDiscount && (
                    <div className="absolute left-4 top-4 rounded-full bg-[#17352b]/85 px-4 py-2 text-sm font-semibold text-white">
                      {t("product.sale")} · -
                      {Math.round((1 - price / product.compareAtPrice) * 100)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-[32px] p-6 sm:p-8">
            {product.category && (
              <Link
                to={`/category/${product.category.id}`}
                className="pill-badge transition hover:bg-primary-50 hover:text-primary-700"
              >
                {product.category.name}
              </Link>
            )}

            <h1 className="mt-4 text-4xl leading-tight text-slate-900">{product.name}</h1>

            {product.brand && (
              <p className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-[#5c6966]">
                {product.brand.name}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-4xl font-semibold text-slate-900">{formatPrice(price)}</span>
              {hasDiscount && (
                <span className="text-lg text-[#8d8f90] line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
              {activeVariant && (
                <span className="pill-badge bg-primary-50 text-primary-700">{activeVariant.name}</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  outOfStock
                    ? "bg-red-50 text-red-700"
                    : "bg-primary-50 text-primary-700"
                }`}
              >
                {outOfStock ? t("product.outOfStock") : t("product.inStock")}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-[#5c6966]">
                SKU: {product.sku}
              </span>
              {product.ean && (
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-[#5c6966]">
                  EAN: {product.ean}
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-[#16211f]/10 bg-white/80 px-4 py-4 text-sm font-medium text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>

            {product.variants?.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                  {t("product.variants")}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((variant: { id: string; name: string; price: number; stockQuantity: number }) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariant(variant.id === selectedVariant ? null : variant.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selectedVariant === variant.id
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-[#16211f]/10 bg-white/80 text-slate-700 hover:border-primary-300 hover:text-primary-700"
                      } ${variant.stockQuantity <= 0 ? "opacity-50" : ""}`}
                    >
                      {variant.name} · {formatPrice(variant.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-4 rounded-[28px] border border-[#16211f]/10 bg-white/80 p-5 sm:grid-cols-[auto_1fr] sm:items-end">
              <div>
                <label className="field-label">{t("product.quantity")}</label>
                <div className="flex items-center rounded-full border border-[#16211f]/10 bg-white px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="rounded-full px-3 py-2 text-slate-700 transition hover:bg-[#f3efe7]"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-slate-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => current + 1)}
                    className="rounded-full px-3 py-2 text-slate-700 transition hover:bg-[#f3efe7]"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={outOfStock}
                onClick={async () => {
                  await addToCart(product.id, quantity, activeVariant?.id);
                  openCartDrawer();
                }}
                className="primary-button w-full justify-center disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto sm:min-w-[220px]"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                {outOfStock ? t("product.outOfStock") : t("product.addToCart")}
              </button>
            </div>

            {product.description && (
              <div className="mt-8 rounded-[28px] border border-[#16211f]/10 bg-white/70 p-5">
                <h2 className="text-xl text-slate-900">{t("product.description")}</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#5c6966]">
                  {product.description}
                </p>
              </div>
            )}

            {(product.attributes?.length > 0 || product.weight) && (
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {product.attributes?.length > 0 && (
                  <div className="rounded-[28px] border border-[#16211f]/10 bg-white/70 p-5">
                    <h2 className="text-xl text-slate-900">{t("product.attributes")}</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                      {product.attributes.map((attribute: { id: string; name: string; value: string }) => (
                        <div
                          key={attribute.id}
                          className="flex items-start justify-between gap-4 border-b border-[#16211f]/8 pb-3 last:border-b-0 last:pb-0"
                        >
                          <dt className="font-medium text-[#5c6966]">{attribute.name}</dt>
                          <dd className="text-right text-slate-900">{attribute.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {product.weight && (
                  <div className="rounded-[28px] border border-[#16211f]/10 bg-white/70 p-5">
                    <h2 className="text-xl text-slate-900">{t("product.specs")}</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <dt className="font-medium text-[#5c6966]">{t("product.weight")}</dt>
                        <dd className="text-slate-900">
                          {product.weight} {product.weightUnit}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
