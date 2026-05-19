import { Fragment } from "react";
import { Link } from "react-router-dom";
import {
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatPrice } from "../lib/utils";

// CartDrawer is controlled by a global state flag to avoid prop drilling.
// We use a simple module-level toggle.
let _setOpen: ((v: boolean) => void) | null = null;
export function openCartDrawer() { _setOpen?.(true); }

import { useState, useEffect } from "react";

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { cart, itemCount, updateQuantity, removeItem } = useCart();
  const { t } = useI18n();

  useEffect(() => { _setOpen = setOpen; return () => { _setOpen = null; }; }, []);

  if (!open) return null;

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-50 bg-[#14231f]/35 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />

      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md p-3 sm:p-4">
        <div className="glass-panel-strong flex h-full flex-col rounded-[32px]">
          <div className="flex items-center justify-between border-b border-[#16211f]/10 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                {t("shop.cart")}
              </p>
              <h2 className="mt-1 text-2xl text-slate-900">
                {t("cart.title")} ({itemCount})
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-[#16211f]/10 bg-white/85 p-2 text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {!cart || cart.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                  <ShoppingBagIcon className="h-8 w-8" />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-900">{t("cart.empty")}</p>
                <p className="section-copy mt-2 max-w-xs">{t("cart.summaryNote")}</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {cart.items.map((item) => (
                  <li key={item.id} className="rounded-[24px] border border-[#16211f]/10 bg-white/80 p-4">
                    <div className="flex gap-3">
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-[#f1ede6]">
                        {item.product?.images?.find((i: { isPrimary: boolean }) => i.isPrimary)?.url || item.product?.images?.[0]?.url ? (
                          <img src={item.product?.images?.find((i: { isPrimary: boolean }) => i.isPrimary)?.url || item.product?.images?.[0]?.url} alt={item.product?.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-[#7d8b87]">
                            {t("product.noImage")}
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                              {item.product?.name}
                            </p>
                            {item.variant?.name && (
                              <p className="mt-1 text-xs text-[#5c6966]">{item.variant.name}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-[#7d8b87] transition hover:text-red-500"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 rounded-full border border-[#16211f]/10 bg-white px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                              className="rounded-full p-1 text-slate-700 transition hover:bg-[#f3efe7]"
                            >
                              <MinusIcon className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center text-sm font-semibold text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="rounded-full p-1 text-slate-700 transition hover:bg-[#f3efe7]"
                            >
                              <PlusIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <p className="text-sm font-semibold text-slate-900">
                            {formatPrice(item.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {cart && cart.items.length > 0 && (
            <div className="border-t border-[#16211f]/10 px-5 py-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#5c6966]">
                  <span>{t("cart.subtotal")}</span>
                  <span className="font-medium text-slate-900">{formatPrice(cart.subtotal)}</span>
                </div>
                {cart.discountAmount != null && cart.discountAmount > 0 && (
                  <div className="flex justify-between text-primary-700">
                    <span>{t("cart.discount")}</span>
                    <span>-{formatPrice(cart.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#16211f]/10 pt-3 text-base font-semibold text-slate-900">
                  <span>{t("cart.total")}</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  to="/cart"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-primary-300 bg-white py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
                >
                  {t("cart.viewCart")}
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setOpen(false)}
                  className="primary-button"
                >
                  {t("cart.checkout")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>
    </Fragment>
  );
}
