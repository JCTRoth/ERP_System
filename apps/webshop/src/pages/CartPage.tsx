import { useState } from "react";
import { Link } from "react-router-dom";
import { TrashIcon, MinusIcon, PlusIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatPrice } from "../lib/utils";

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem, clearCart, applyCoupon, removeCoupon } = useCart();
  const { t } = useI18n();
  const [couponCode, setCouponCode] = useState("");

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-xl border bg-white p-4">
              <div className="h-20 w-20 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-4 w-1/4 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("cart.title")}</h1>
        {items.length > 0 && (
          <button
            onClick={() => clearCart()}
            className="text-sm text-red-600 hover:text-red-700"
          >
            {t("cart.clearAll")}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">{t("cart.empty")}</p>
          <Link
            to="/products"
            className="mt-4 inline-flex items-center gap-1 text-primary-600 hover:underline"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("cart.continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.product?.images?.find((i: { isPrimary: boolean }) => i.isPrimary)?.url || item.product?.images?.[0]?.url ? (
                    <img src={item.product?.images?.find((i: { isPrimary: boolean }) => i.isPrimary)?.url || item.product?.images?.[0]?.url} alt={item.product?.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400 text-xs">
                      {t("product.noImage")}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{item.product?.name}</h3>
                      {item.variant?.name && (
                        <p className="text-sm text-gray-500">{item.variant.name}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        {formatPrice(item.unitPrice)} {t("cart.each")}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{formatPrice(item.total)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="rounded border border-gray-300 p-1 hover:bg-gray-100"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="rounded border border-gray-300 p-1 hover:bg-gray-100"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {t("cart.remove")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 h-fit">
            <h2 className="text-lg font-semibold text-gray-900">{t("cart.summary")}</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("cart.subtotal")}</span>
                <span className="font-medium">{formatPrice(cart!.subtotal)}</span>
              </div>
              {cart!.discountAmount != null && cart!.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t("cart.discount")} ({cart!.couponCode})</span>
                  <span>-{formatPrice(cart!.discountAmount)}</span>
                </div>
              )}
              {cart!.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t("cart.tax")}</span>
                  <span>{formatPrice(cart!.taxAmount)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-base font-semibold">
                <span>{t("cart.total")}</span>
                <span>{formatPrice(cart!.total)}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mt-4">
              {cart!.couponCode ? (
                <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                  <span className="text-green-700">{cart!.couponCode}</span>
                  <button onClick={() => removeCoupon()} className="text-green-600 hover:text-green-800 text-xs">
                    {t("cart.removeCoupon")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder={t("cart.couponPlaceholder")}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    onClick={() => { if (couponCode.trim()) { applyCoupon(couponCode.trim()); setCouponCode(""); } }}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    {t("cart.applyCoupon")}
                  </button>
                </div>
              )}
            </div>

            <Link
              to="/checkout"
              className="mt-6 block rounded-lg bg-primary-600 py-3 text-center text-sm font-semibold text-white hover:bg-primary-700"
            >
              {t("cart.checkout")}
            </Link>
            <Link
              to="/products"
              className="mt-2 block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              {t("cart.continueShopping")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
