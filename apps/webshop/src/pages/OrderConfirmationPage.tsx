import { useParams, Link } from "react-router-dom";
import { useQuery, gql } from "@apollo/client";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { useI18n } from "../context/I18nContext";
import { formatPrice } from "../lib/utils";

const GET_ORDER = gql`
  query GetShopOrder($id: UUID!) {
    shopOrder(id: $id) {
      id
      orderNumber
      status
      subtotal
      taxAmount
      shippingAmount
      totalAmount
      notes
      shippingName
      shippingAddress
      shippingCity
      shippingPostalCode
      shippingCountry
      createdAt
      items {
        id
        productName
        productSku
        quantity
        unitPrice
        total
      }
    }
  }
`;

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  const { data, loading } = useQuery(GET_ORDER, {
    variables: { id },
    skip: !id,
  });

  const order = data?.shopOrder;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-200" />
          <div className="mx-auto h-6 w-1/2 rounded bg-gray-200" />
          <div className="mx-auto h-4 w-1/3 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-500">{t("order.notFound")}</p>
        <Link to="/" className="mt-4 inline-block text-primary-600 hover:underline">
          {t("order.backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Success Header */}
      <div className="text-center">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{t("order.thankYou")}</h1>
        <p className="mt-2 text-gray-600">
          {t("order.confirmationText", { number: order.orderNumber })}
        </p>
      </div>

      {/* Order Details */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("order.number")}</span>
          <span className="font-mono font-semibold">{order.orderNumber}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-gray-500">{t("order.status")}</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {order.status}
          </span>
        </div>

        {/* Items */}
        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold">{t("order.items")}</h3>
          <ul className="mt-3 space-y-2">
            {order.items.map((item: { id: string; productName: string; quantity: number; unitPrice: number; total: number }) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-medium">{formatPrice(item.total)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("cart.subtotal")}</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.shippingAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t("checkout.shipping")}</span>
              <span>{formatPrice(order.shippingAmount)}</span>
            </div>
          )}
          {order.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t("cart.tax")}</span>
              <span>{formatPrice(order.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>{t("cart.total")}</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        {/* Shipping Address */}
        {order.shippingName && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold">{t("checkout.shippingAddress")}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {order.shippingName}<br />
              {order.shippingAddress}<br />
              {order.shippingPostalCode} {order.shippingCity}<br />
              {order.shippingCountry}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          {t("order.continueShopping")}
        </Link>
      </div>
    </div>
  );
}
