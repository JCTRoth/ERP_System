import { Fragment } from "react";
import { Link } from "react-router-dom";
import { XMarkIcon, TrashIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{t("cart.title")} ({itemCount})</h2>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-gray-100">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!cart || cart.items.length === 0 ? (
            <p className="text-center text-gray-500 mt-8">{t("cart.empty")}</p>
          ) : (
            <ul className="space-y-4">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
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
                      <p className="text-sm font-medium">{item.product?.name}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {item.variant?.name && (
                      <p className="text-xs text-gray-500">{item.variant.name}</p>
                    )}
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="rounded border p-0.5 hover:bg-gray-100"
                        >
                          <MinusIcon className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="rounded border p-0.5 hover:bg-gray-100"
                        >
                          <PlusIcon className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-sm font-medium">{formatPrice(item.total)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t px-4 py-4">
            <div className="flex justify-between text-sm">
              <span>{t("cart.subtotal")}</span>
              <span className="font-medium">{formatPrice(cart.subtotal)}</span>
            </div>
            {cart.discountAmount != null && cart.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t("cart.discount")}</span>
                <span>-{formatPrice(cart.discountAmount)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between text-base font-semibold">
              <span>{t("cart.total")}</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/cart"
                onClick={() => setOpen(false)}
                className="block rounded-lg border border-primary-600 py-2 text-center text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                {t("cart.viewCart")}
              </Link>
              <Link
                to="/checkout"
                onClick={() => setOpen(false)}
                className="block rounded-lg bg-primary-600 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
              >
                {t("cart.checkout")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
}
