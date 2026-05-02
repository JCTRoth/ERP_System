import { Link } from "react-router-dom";
import { ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatPrice } from "../lib/utils";

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

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:shadow-lg">
      {/* Image */}
      <Link to={`/products/${id}`} className="relative aspect-square overflow-hidden bg-gray-100">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.altText ?? name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <ShoppingCartIcon className="h-12 w-12" />
          </div>
        )}
        {compareAtPrice != null && compareAtPrice > price && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
            {t("product.sale")}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-gray-900">
              {t("product.outOfStock")}
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/products/${id}`}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-primary-600">
            {name}
          </h3>
        </Link>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-gray-900">{formatPrice(price)}</span>
          {compareAtPrice != null && compareAtPrice > price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>
        <div className="mt-auto pt-3">
          <button
            disabled={outOfStock}
            onClick={(e) => {
              e.preventDefault();
              addToCart(id, 1);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            {outOfStock ? t("product.outOfStock") : t("product.addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}
