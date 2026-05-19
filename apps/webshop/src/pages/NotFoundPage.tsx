import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell max-w-5xl">
        <section className="hero-shell rounded-[32px] px-6 py-10 text-white shadow-panel sm:px-10">
          <div className="max-w-2xl">
            <span className="section-kicker">{t("notFound.eyebrow")}</span>
            <h1 className="mt-6 text-4xl leading-tight text-white sm:text-5xl">
              {t("notFound.title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-emerald-50/80">
              {t("notFound.copy")}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#17352b] transition hover:-translate-y-0.5 hover:bg-[#fffaf1]"
            >
              {t("notFound.catalogAction")}
            </Link>
            <Link to="/support/contact" className="secondary-button">
              {t("notFound.supportAction")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}