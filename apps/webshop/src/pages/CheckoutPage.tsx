import { useState } from "react";
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

  const { data: shippingData } = useQuery(GET_SHIPPING_METHODS, {
    variables: { orderTotal: cart?.subtotal ?? 0, country: shipping.country },
    skip: !cart,
  });

  const [createOrder] = useMutation(CREATE_ORDER);

  const shippingMethods = shippingData?.availableShippingMethods ?? [];
  const selectedMethod = shippingMethods.find((m: { id: string }) => m.id === selectedShippingId);
  const shippingCost = selectedMethod?.price ?? 0;

  const isValid =
    shipping.name.trim() &&
    shipping.address.trim() &&
    shipping.city.trim() &&
    shipping.postalCode.trim() &&
    shipping.country.trim() &&
    cart &&
    cart.items.length > 0;

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
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-500">{t("cart.empty")}</p>
      </div>
    );
  }

  const updateField = (field: keyof ShippingForm, value: string) =>
    setShipping((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("checkout.title")}</h1>

      <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Shipping Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold">{t("checkout.shippingAddress")}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{t("checkout.name")}</label>
                <input
                  required
                  type="text"
                  value={shipping.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">{t("checkout.address")}</label>
                <input
                  required
                  type="text"
                  value={shipping.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("checkout.city")}</label>
                <input
                  required
                  type="text"
                  value={shipping.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("checkout.postalCode")}</label>
                <input
                  required
                  type="text"
                  value={shipping.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("checkout.country")}</label>
                <select
                  value={shipping.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t("checkout.phone")}</label>
                <input
                  type="tel"
                  value={shipping.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          {shippingMethods.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold">{t("checkout.shippingMethod")}</h2>
              <div className="mt-4 space-y-2">
                {shippingMethods.map((m: { id: string; name: string; description?: string; price: number; estimatedDeliveryDays?: number }) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition ${
                      selectedShippingId === m.id ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        value={m.id}
                        checked={selectedShippingId === m.id}
                        onChange={() => setSelectedShippingId(m.id)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <p className="text-sm font-medium">{m.name}</p>
                        {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
                        {m.estimatedDeliveryDays && (
                          <p className="text-xs text-gray-400">
                            {t("checkout.estimatedDays", { days: m.estimatedDeliveryDays })}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {m.price === 0 ? t("checkout.free") : formatPrice(m.price)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold">{t("checkout.notes")}</h2>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("checkout.notesPlaceholder")}
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 h-fit">
          <h2 className="text-lg font-semibold">{t("cart.summary")}</h2>

          <ul className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.product?.name} × {item.quantity}
                </span>
                <span className="font-medium">{formatPrice(item.total)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("cart.subtotal")}</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            {cart.discountAmount != null && cart.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t("cart.discount")}</span>
                <span>-{formatPrice(cart.discountAmount)}</span>
              </div>
            )}
            {shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("checkout.shipping")}</span>
                <span>{formatPrice(shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>{t("cart.total")}</span>
              <span>{formatPrice(cart.total + shippingCost)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="mt-6 w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? t("checkout.placing") : t("checkout.placeOrder")}
          </button>
        </div>
      </form>
    </div>
  );
}
