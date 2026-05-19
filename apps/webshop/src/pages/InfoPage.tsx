import { Link, useParams } from "react-router-dom";
import { infoPageNavigation, infoPages, InfoPageScope } from "../content/infoPages";
import { useI18n } from "../context/I18nContext";
import NotFoundPage from "./NotFoundPage";

interface InfoPageProps {
  scope: InfoPageScope;
}

export default function InfoPage({ scope }: InfoPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();

  if (!slug) {
    return <NotFoundPage />;
  }

  const page = infoPages[scope][slug];

  if (!page) {
    return <NotFoundPage />;
  }

  const navigation = infoPageNavigation[scope];

  return (
    <div className="pt-4 sm:pt-6">
      <div className="page-shell">
        <section className="glass-panel-strong rounded-[32px] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="section-kicker-light">{t(page.eyebrowKey)}</span>
              <h1 className="section-title mt-4">{t(page.titleKey)}</h1>
              <p className="section-copy mt-3">{t(page.introKey)}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/products" className="pill-badge transition hover:bg-primary-50 hover:text-primary-700">
                {t("info.backToShop")}
              </Link>
              <Link to="/category/all" className="pill-badge transition hover:bg-primary-50 hover:text-primary-700">
                {t("info.exploreCollections")}
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {page.sections.map((section) => (
              <section key={section.titleKey} className="glass-panel rounded-[28px] p-6">
                <h2 className="text-2xl text-slate-900">{t(section.titleKey)}</h2>
                <p className="section-copy mt-4">{t(section.copyKey)}</p>
              </section>
            ))}
          </div>

          <aside className="glass-panel h-fit rounded-[28px] p-6 lg:sticky lg:top-32">
            <h2 className="text-2xl text-slate-900">{t(navigation.titleKey)}</h2>
            <p className="section-copy mt-3">{t(navigation.noteKey)}</p>

            <nav className="mt-6 space-y-2">
              {navigation.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="block rounded-2xl border border-[#16211f]/10 bg-white/75 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}