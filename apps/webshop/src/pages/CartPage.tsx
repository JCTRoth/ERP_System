import { useState } from "react";
import { Link } from "react-router-dom";
import { TrashIcon, MinusIcon, PlusIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatPrice } from "../lib/utils";

export default function CartPage() {
  const { cart, loading, error, updateQuantity, removeItem, clearCart, applyCoupon, removeCoupon } = useCart();
  const { t } = useI18n();
  const [couponCode, setCouponCode] = useState("");
  const promises = [
    t("footer.promiseOne"),
    t("footer.promiseTwo"),
    t("footer.promiseThree"),
  ];

  if (loading) {
    return (
      <div className="pt-4 sm:pt-6">
        <div className="page-shell">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-panel animate-pulse rounded-[28px] p-5">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 rounded-[24px] bg-[#e7e1d7]" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 w-1/2 rounded-full bg-[#e2dbd1]" />
                      <div className="h-4 w-1/4 rounded-full bg-[#e2dbd1]" />
                      <div className="h-12 w-1/3 rounded-full bg-[#ddd5ca]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="glass-panel animate-pulse rounded-[32px] p-6">
              <div className="space-y-3">
                <div className="h-5 w-1/3 rounded-full bg-[#e2dbd1]" />
                <div className="h-4 rounded-full bg-[#e2dbd1]" />
                <div className="h-4 rounded-full bg-[#e2dbd1]" />
                <div className="h-12 rounded-full bg-[#ddd5ca]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const cartUnavailable = Boolean(error) && !loading;

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell">
        <section className="glass-panel-strong rounded-[32px] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-kicker-light">{t("cart.title")}</span>
              <h1 className="section-title mt-4">{t("cart.title")}</h1>
              <p className="section-copy mt-3">{t("cart.summaryNote")}</p>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => clearCart()}
                className="text-sm font-semibold text-red-600 transition hover:text-red-700"
              >
                {t("cart.clearAll")}
              </button>
            )}
          </div>
        </section>

        {cartUnavailable ? (
          <div className="glass-panel mt-6 rounded-[32px] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">{t("system.unavailableTitle")}</p>
            <p className="section-copy mt-3">{t("system.unavailableCart")}</p>
            <Link to="/products" className="primary-button mt-6">
              {t("cart.continueShopping")}
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="glass-panel mt-6 rounded-[32px] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">{t("cart.empty")}</p>
            <p className="section-copy mt-3">{t("cart.summaryNote")}</p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary-300 bg-white px-5 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t("cart.continueShopping")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="glass-panel rounded-[28px] p-5">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[24px] bg-[#f1ede6]">
                      {item.product?.images?.find((i: { isPrimary: boolean }) => i.isPrimary)?.url || item.product?.images?.[0]?.url ? (
                        <img src={item.product?.images?.find((i: { isPrimary: boolean }) => i.isPrimary)?.url || item.product?.images?.[0]?.url} alt={item.product?.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#7d8b87]">
                          {t("product.noImage")}
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-slate-900">{item.product?.name}</h2>
                          {item.variant?.name && (
                            <p className="mt-1 text-sm text-[#5c6966]">{item.variant.name}</p>
                          )}
                          <p className="mt-2 text-sm text-[#5c6966]">
                            {formatPrice(item.unitPrice)} {t("cart.each")}
                          </p>
                        </div>

                        <p className="text-lg font-semibold text-slate-900">{formatPrice(item.total)}</p>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 rounded-full border border-[#16211f]/10 bg-white px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="rounded-full p-1 text-slate-700 transition hover:bg-[#f3efe7]"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="rounded-full p-1 text-slate-700 transition hover:bg-[#f3efe7]"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 transition hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                          {t("cart.remove")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="glass-panel h-fit rounded-[32px] p-6 lg:sticky lg:top-32">
              <h2 className="text-2xl text-slate-900">{t("cart.summary")}</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-[#5c6966]">
                  <span>{t("cart.subtotal")}</span>
                  <span className="font-medium text-slate-900">{formatPrice(cart!.subtotal)}</span>
                </div>
                {cart!.discountAmount != null && cart!.discountAmount > 0 && (
                  <div className="flex justify-between text-primary-700">
                    <span>
                      {t("cart.discount")} ({cart!.couponCode})
                    </span>
                    <span>-{formatPrice(cart!.discountAmount)}</span>
                  </div>
                )}
                {cart!.taxAmount > 0 && (
                  <div className="flex justify-between text-[#5c6966]">
                    <span>{t("cart.tax")}</span>
                    <span className="text-slate-900">{formatPrice(cart!.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#16211f]/10 pt-3 text-base font-semibold text-slate-900">
                  <span>{t("cart.total")}</span>
                  <span>{formatPrice(cart!.total)}</span>
                </div>
              </div>

              <div className="mt-6">
                {cart!.couponCode ? (
                  <div className="flex items-center justify-between rounded-[20px] bg-primary-50 px-4 py-3 text-sm">
                    <span className="font-semibold text-primary-700">{cart!.couponCode}</span>
                    <button
                      type="button"
                      onClick={() => removeCoupon()}
                      className="text-xs font-semibold text-primary-700 transition hover:text-primary-800"
                    >
                      {t("cart.removeCoupon")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder={t("cart.couponPlaceholder")}
                      className="field-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (couponCode.trim()) {
                          applyCoupon(couponCode.trim());
                          setCouponCode("");
                        }
                      }}
                      className="w-full rounded-full border border-[#16211f]/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
                    >
                      {t("cart.applyCoupon")}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {promises.map((promise) => (
                  <span key={promise} className="pill-badge">
                    {promise}
                  </span>
                ))}
              </div>

              <Link to="/checkout" className="primary-button mt-6 w-full justify-center">
                {t("cart.checkout")}
              </Link>
              <Link
                to="/products"
                className="mt-3 block text-center text-sm font-semibold text-[#5c6966] transition hover:text-primary-700"
              >
                {t("cart.continueShopping")}
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
