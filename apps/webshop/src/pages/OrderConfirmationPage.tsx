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

  const { data, loading, error } = useQuery(GET_ORDER, {
    variables: { id },
    skip: !id,
  });

  const order = data?.shopOrder;

  if (loading) {
    return (
      <div className="pt-4 sm:pt-6">
        <div className="page-shell max-w-5xl">
          <div className="glass-panel-strong animate-pulse rounded-[32px] px-6 py-12 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#e7e1d7]" />
            <div className="mx-auto mt-6 h-8 w-1/2 rounded-full bg-[#ddd5ca]" />
            <div className="mx-auto mt-3 h-4 w-1/3 rounded-full bg-[#ddd5ca]" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pt-4 sm:pt-6">
        <div className="page-shell max-w-4xl">
          <div className="glass-panel rounded-[32px] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-900">
              {error ? t("system.unavailableOrder") : t("order.notFound")}
            </p>
            <p className="section-copy mt-3">
              {error ? t("order.notFoundHelp") : t("order.notFoundHelp")}
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex rounded-full border border-primary-300 bg-white px-5 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50"
            >
              {t("order.backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell max-w-5xl">
        <section className="hero-shell rounded-[32px] px-6 py-10 text-white shadow-panel sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/12">
                <CheckCircleIcon className="h-10 w-10 text-[#f3c978]" />
              </div>
              <h1 className="mt-6 text-4xl leading-tight text-white">{t("order.thankYou")}</h1>
              <p className="mt-3 text-base leading-7 text-emerald-50/80">
                {t("order.confirmationText", { number: order.orderNumber })}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/products"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#17352b] transition hover:-translate-y-0.5 hover:bg-[#fffaf1]"
              >
                {t("order.continueShopping")}
              </Link>
              <Link to="/" className="secondary-button justify-center">
                {t("order.backHome")}
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="glass-panel rounded-[32px] p-6">
            <h2 className="text-2xl text-slate-900">{t("order.items")}</h2>
            <ul className="mt-5 space-y-4">
              {order.items.map((item: { id: string; productName: string; quantity: number; total: number }) => (
                <li key={item.id} className="flex items-start justify-between gap-4 border-b border-[#16211f]/8 pb-4 last:border-b-0 last:pb-0">
                  <span className="text-[#5c6966]">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-semibold text-slate-900">{formatPrice(item.total)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-3 border-t border-[#16211f]/10 pt-5 text-sm">
              <div className="flex justify-between text-[#5c6966]">
                <span>{t("cart.subtotal")}</span>
                <span className="text-slate-900">{formatPrice(order.subtotal)}</span>
              </div>
              {order.shippingAmount > 0 && (
                <div className="flex justify-between text-[#5c6966]">
                  <span>{t("checkout.shipping")}</span>
                  <span className="text-slate-900">{formatPrice(order.shippingAmount)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-[#5c6966]">
                  <span>{t("cart.tax")}</span>
                  <span className="text-slate-900">{formatPrice(order.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#16211f]/10 pt-3 text-base font-semibold text-slate-900">
                <span>{t("cart.total")}</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="glass-panel rounded-[32px] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                    {t("order.number")}
                  </p>
                  <p className="mt-2 font-mono text-lg font-semibold text-slate-900">{order.orderNumber}</p>
                </div>
                <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
                  {order.status}
                </span>
              </div>
            </section>

            {order.shippingName && (
              <section className="glass-panel rounded-[32px] p-6">
                <h2 className="text-2xl text-slate-900">{t("order.deliveryAddress")}</h2>
                <p className="mt-4 text-sm leading-7 text-[#5c6966]">
                  {order.shippingName}
                  <br />
                  {order.shippingAddress}
                  <br />
                  {order.shippingPostalCode} {order.shippingCity}
                  <br />
                  {order.shippingCountry}
                </p>
              </section>
            )}

            <section className="glass-panel rounded-[32px] p-6">
              <h2 className="text-2xl text-slate-900">{t("order.nextStepsTitle")}</h2>
              <p className="section-copy mt-3">{t("order.nextStepsCopy")}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
