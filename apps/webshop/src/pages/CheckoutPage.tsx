import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatPrice, getSessionId } from "../lib/utils";
import { GET_SHIPPING_METHODS } from "../graphql/queries";
import { CREATE_ORDER } from "../graphql/mutations";
import toast from "react-hot-toast";

interface ShippingForm {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [shipping, setShipping] = useState<ShippingForm>({
    name: "", address: "", city: "", postalCode: "", country: "DE", phone: "",
  });
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: shippingData, error: shippingError } = useQuery(GET_SHIPPING_METHODS, {
    variables: { orderTotal: cart?.subtotal ?? 0, country: shipping.country },
    skip: !cart,
  });

  const [createOrder] = useMutation(CREATE_ORDER);

  const shippingMethods = shippingData?.availableShippingMethods ?? [];
  const selectedMethod = shippingMethods.find((m: { id: string }) => m.id === selectedShippingId);
  const shippingCost = selectedMethod?.price ?? 0;
  const requiresShippingSelection = shippingMethods.length > 0;
  const shippingUnavailable = Boolean(shippingError);

  useEffect(() => {
    if (!selectedShippingId && shippingMethods.length > 0) {
      setSelectedShippingId(shippingMethods[0].id);
    }
  }, [selectedShippingId, shippingMethods]);

  const isValid =
    shipping.name.trim() &&
    shipping.address.trim() &&
    shipping.city.trim() &&
    shipping.postalCode.trim() &&
    shipping.country.trim() &&
    cart &&
    cart.items.length > 0 &&
    (!requiresShippingSelection || !!selectedShippingId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !cart) return;

    setSubmitting(true);
    try {
      // Build a guest customer ID from session
      const sessionId = getSessionId();
      // Use a deterministic UUID from session for guest checkout
      const guestId = sessionId;

      const { data } = await createOrder({
        variables: {
          input: {
            customerId: guestId,
            items: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: item.quantity,
            })),
            notes: notes || null,
            shippingName: shipping.name,
            shippingAddress: shipping.address,
            shippingCity: shipping.city,
            shippingPostalCode: shipping.postalCode,
            shippingCountry: shipping.country,
            shippingPhone: shipping.phone || null,
            billingName: shipping.name,
            billingAddress: shipping.address,
            billingCity: shipping.city,
            billingPostalCode: shipping.postalCode,
            billingCountry: shipping.country,
            shippingMethodId: selectedShippingId || null,
            couponCode: cart.couponCode || null,
          },
        },
      });

      await clearCart();
      const orderId = data?.createShopOrder?.id;
      navigate(`/order/${orderId}`);
    } catch {
      toast.error(t("checkout.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="pt-4 sm:pt-6">
        <div className="page-shell">
          <div className="glass-panel rounded-[32px] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">{t("cart.empty")}</p>
          </div>
        </div>
      </div>
    );
  }

  const updateField = (field: keyof ShippingForm, value: string) =>
    setShipping((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell">
        <section className="glass-panel-strong rounded-[32px] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-kicker-light">{t("checkout.secure")}</span>
              <h1 className="section-title mt-4">{t("checkout.title")}</h1>
              <p className="section-copy mt-3">{t("checkout.intro")}</p>
            </div>

            <span className="pill-badge">{t("cart.summary")}</span>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="glass-panel rounded-[32px] p-6">
              <h2 className="text-2xl text-slate-900">{t("checkout.shippingAddress")}</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="checkout-name">{t("checkout.name")}</label>
                  <input
                    id="checkout-name"
                    required
                    type="text"
                    value={shipping.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="checkout-address">{t("checkout.address")}</label>
                  <input
                    id="checkout-address"
                    required
                    type="text"
                    value={shipping.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="checkout-city">{t("checkout.city")}</label>
                  <input
                    id="checkout-city"
                    required
                    type="text"
                    value={shipping.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="checkout-postal">{t("checkout.postalCode")}</label>
                  <input
                    id="checkout-postal"
                    required
                    type="text"
                    value={shipping.postalCode}
                    onChange={(e) => updateField("postalCode", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="checkout-country">{t("checkout.country")}</label>
                  <select
                    id="checkout-country"
                    value={shipping.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="field-input appearance-none"
                  >
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="checkout-phone">{t("checkout.phone")}</label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    value={shipping.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>
            </section>

            {shippingMethods.length > 0 && (
              <section className="glass-panel rounded-[32px] p-6">
                <h2 className="text-2xl text-slate-900">{t("checkout.shippingMethod")}</h2>
                <div className="mt-5 space-y-3">
                  {shippingMethods.map((method: { id: string; name: string; description?: string; price: number; estimatedDeliveryDays?: number }) => (
                    <label
                      key={method.id}
                      className={`flex cursor-pointer items-start justify-between gap-4 rounded-[24px] border p-4 transition ${
                        selectedShippingId === method.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-[#16211f]/10 bg-white/80 hover:border-primary-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="shipping"
                          value={method.id}
                          checked={selectedShippingId === method.id}
                          onChange={() => setSelectedShippingId(method.id)}
                          className="mt-1 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                          {method.description && (
                            <p className="mt-1 text-sm leading-6 text-[#5c6966]">{method.description}</p>
                          )}
                          {method.estimatedDeliveryDays && (
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#5c6966]">
                              {t("checkout.estimatedDays", { days: method.estimatedDeliveryDays })}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="text-sm font-semibold text-slate-900">
                        {method.price === 0 ? t("checkout.free") : formatPrice(method.price)}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {shippingUnavailable && (
              <section className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-6 text-amber-900">
                <p className="font-semibold">{t("system.unavailableTitle")}</p>
                <p className="mt-2">{t("system.unavailableShipping")}</p>
              </section>
            )}

            <section className="glass-panel rounded-[32px] p-6">
              <h2 className="text-2xl text-slate-900">{t("checkout.notes")}</h2>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("checkout.notesPlaceholder")}
                className="field-input mt-5 resize-none"
              />
            </section>
          </div>

          <aside className="glass-panel h-fit rounded-[32px] p-6 lg:sticky lg:top-32">
            <h2 className="text-2xl text-slate-900">{t("cart.summary")}</h2>

            <ul className="mt-5 space-y-4">
              {cart.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-[#5c6966]">
                    {item.product?.name} × {item.quantity}
                  </span>
                  <span className="font-semibold text-slate-900">{formatPrice(item.total)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-3 border-t border-[#16211f]/10 pt-5 text-sm">
              <div className="flex justify-between text-[#5c6966]">
                <span>{t("cart.subtotal")}</span>
                <span className="text-slate-900">{formatPrice(cart.subtotal)}</span>
              </div>
              {cart.discountAmount != null && cart.discountAmount > 0 && (
                <div className="flex justify-between text-primary-700">
                  <span>{t("cart.discount")}</span>
                  <span>-{formatPrice(cart.discountAmount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between text-[#5c6966]">
                  <span>{t("checkout.shipping")}</span>
                  <span className="text-slate-900">{formatPrice(shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#16211f]/10 pt-3 text-base font-semibold text-slate-900">
                <span>{t("cart.total")}</span>
                <span>{formatPrice(cart.total + shippingCost)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid || submitting}
              className="primary-button mt-6 w-full justify-center disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {submitting ? t("checkout.placing") : t("checkout.placeOrder")}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}
