import { Link } from "react-router-dom";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatPrice } from "../lib/utils";
import { openCartDrawer } from "./CartDrawer";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  slug?: string | null;
  stockQuantity: number;
  images: { url: string; altText?: string | null; isPrimary: boolean }[];
}

export default function ProductCard({
  id,
  name,
  price,
  compareAtPrice,
  stockQuantity,
  images,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { t } = useI18n();
  const primaryImage = images.find((i) => i.isPrimary) ?? images[0];
  const outOfStock = stockQuantity <= 0;
  const discountPercentage =
    compareAtPrice != null && compareAtPrice > price
      ? Math.round((1 - price / compareAtPrice) * 100)
      : null;
  const savings =
    compareAtPrice != null && compareAtPrice > price ? compareAtPrice - price : null;

  return (
    <article className="glass-panel group card-hover flex h-full flex-col overflow-hidden rounded-[28px]">
      <Link
        to={`/products/${id}`}
        className="relative aspect-[4/4.5] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(243,201,120,0.18),transparent_32%),linear-gradient(180deg,#fbfaf7_0%,#f1ede6_100%)]"
      >
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.altText ?? name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#7d8b87]">
            <ShoppingCartIcon className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              outOfStock
                ? "bg-white/90 text-[#7a2d2d]"
                : "bg-white/90 text-[#17352b]"
            }`}
          >
            {outOfStock ? t("product.outOfStock") : t("product.inStock")}
          </span>
          {discountPercentage != null && (
            <span className="rounded-full bg-[#17352b]/85 px-3 py-1 text-xs font-semibold text-white">
              -{discountPercentage}%
            </span>
          )}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900">
              {t("product.outOfStock")}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#14231f]/75 to-transparent p-4 text-white opacity-0 transition duration-300 group-hover:opacity-100">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            {t("product.quickAdd")}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <Link to={`/products/${id}`}>
          <h3 className="line-clamp-2 text-lg text-slate-900 transition hover:text-primary-700">
            {name}
          </h3>
        </Link>

        <p className="mt-3 text-sm leading-6 text-[#5c6966]">
          {outOfStock ? t("product.outOfStock") : t("product.shippingNotice")}
        </p>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">
                {formatPrice(price)}
              </span>
              {compareAtPrice != null && compareAtPrice > price && (
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(compareAtPrice)}
                </span>
              )}
            </div>
            {savings != null && (
              <p className="mt-1 text-sm font-medium text-primary-700">
                {t("product.sale")} · {formatPrice(savings)}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={async (e) => {
              e.preventDefault();
              await addToCart(id, 1);
              openCartDrawer();
            }}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#17352b] text-white shadow-float transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            <ShoppingCartIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 border-t border-[#16211f]/10 pt-4">
          <Link
            to={`/products/${id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 transition hover:text-primary-800"
          >
            {t("product.viewDetails")}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
