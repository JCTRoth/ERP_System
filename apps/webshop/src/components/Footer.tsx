import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

export default function Footer() {
  const { t } = useI18n();
  const promises = [
    t("footer.promiseOne"),
    t("footer.promiseTwo"),
    t("footer.promiseThree"),
  ];

  return (
    <footer className="mt-20 pb-6">
      <div className="page-shell">
        <div className="hero-shell rounded-[32px] px-6 py-8 text-white shadow-panel sm:px-10 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-kicker">{t("footer.shop")}</span>
              <h2 className="mt-5 text-3xl text-white sm:text-4xl">
                {t("footer.ctaTitle")}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-emerald-50/78">
                {t("footer.ctaCopy")}
              </p>
            </div>

            <Link to="/products" className="secondary-button w-fit whitespace-nowrap">
              {t("footer.ctaAction")}
            </Link>
          </div>
        </div>

        <div className="glass-panel mt-6 rounded-[32px] px-6 py-10 sm:px-10">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17352b] text-lg font-semibold text-white shadow-float">
                E
              </div>
              <h3 className="mt-4 text-2xl text-slate-900">{t("shop.name")}</h3>
              <p className="section-copy mt-3">{t("footer.description")}</p>
              <p className="mt-4 text-sm font-medium text-[#24302d]">
                {t("footer.madeFor")}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                {t("footer.shop")}
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>
                  <Link to="/products" className="transition hover:text-primary-700">
                    {t("nav.products")}
                  </Link>
                </li>
                <li>
                  <Link to="/category/all" className="transition hover:text-primary-700">
                    {t("nav.categories")}
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="transition hover:text-primary-700">
                    {t("shop.cart")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                {t("footer.support")}
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>
                  <Link to="/support/contact" className="transition hover:text-primary-700">
                    {t("footer.contact")}
                  </Link>
                </li>
                <li>
                  <Link to="/support/shipping" className="transition hover:text-primary-700">
                    {t("footer.shipping")}
                  </Link>
                </li>
                <li>
                  <Link to="/support/returns" className="transition hover:text-primary-700">
                    {t("footer.returns")}
                  </Link>
                </li>
                <li>{t("footer.hours")}</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                {t("footer.legal")}
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>
                  <Link to="/legal/privacy" className="transition hover:text-primary-700">
                    {t("footer.privacy")}
                  </Link>
                </li>
                <li>
                  <Link to="/legal/terms" className="transition hover:text-primary-700">
                    {t("footer.terms")}
                  </Link>
                </li>
                <li>
                  <Link to="/legal/imprint" className="transition hover:text-primary-700">
                    {t("footer.imprint")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-[#16211f]/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {promises.map((promise) => (
                <span key={promise} className="pill-badge">
                  {promise}
                </span>
              ))}
            </div>

            <p className="text-sm text-[#5c6966]">
              &copy; {new Date().getFullYear()} {t("shop.name")}. {t("footer.rights")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
