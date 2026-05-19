import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { GET_FEATURED_PRODUCTS, GET_CATEGORIES } from "../graphql/queries";
import { useI18n } from "../context/I18nContext";
import ProductCard from "../components/ProductCard";

export default function HomePage() {
  const { t } = useI18n();

  const { data: featuredData, loading: featuredLoading, error: featuredError } = useQuery(
    GET_FEATURED_PRODUCTS,
    { variables: { take: 8 } }
  );

  const { data: catData, error: categoriesError } = useQuery(GET_CATEGORIES);

  const products = featuredData?.featuredProducts ?? [];
  const categories = catData?.rootCategories ?? [];
  const highlights = [
    {
      title: t("home.metricDispatchTitle"),
      copy: t("home.metricDispatchCopy"),
    },
    {
      title: t("home.metricCatalogTitle"),
      copy: t("home.metricCatalogCopy"),
    },
    {
      title: t("home.metricSupportTitle"),
      copy: t("home.metricSupportCopy"),
    },
  ];
  const valueCards = [
    {
      title: t("home.valueOneTitle"),
      copy: t("home.valueOneCopy"),
    },
    {
      title: t("home.valueTwoTitle"),
      copy: t("home.valueTwoCopy"),
    },
    {
      title: t("home.valueThreeTitle"),
      copy: t("home.valueThreeCopy"),
    },
  ];
  const categoryStyles = [
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,240,220,0.86))]",
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(235,246,241,0.92))]",
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(241,242,248,0.92))]",
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(244,236,231,0.92))]",
  ];
  const backendUnavailable = Boolean(featuredError || categoriesError);

  return (
    <div className="pt-4 sm:pt-6">
      <section className="page-shell">
        <div className="hero-shell relative overflow-hidden rounded-[36px] px-6 py-8 text-white shadow-panel sm:px-10 sm:py-12 lg:px-12 lg:py-16">
          <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-[#f3c978]/20 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-2xl">
              <span className="section-kicker">{t("home.heroEyebrow")}</span>
              <h1 className="mt-6 text-4xl leading-[1.02] text-white sm:text-5xl lg:text-[4rem]">
                {t("home.heroTitle")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/80 sm:text-lg">
                {t("home.heroSubtitle")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#17352b] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#fffaf1]"
                >
                  {t("home.shopNow")}
                </Link>
                <Link to="/category/all" className="secondary-button">
                  {t("home.heroSecondary")}
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-50/90">
                  {t("footer.promiseOne")}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-50/90">
                  {t("footer.promiseTwo")}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-emerald-50/90">
                  {t("footer.promiseThree")}
                </span>
              </div>
            </div>

            <div className="grid gap-4 lg:max-w-md lg:justify-self-end">
              <div className="glass-panel rounded-[28px] p-5 text-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5c6966]">
                  {t("home.categories")}
                </p>
                {backendUnavailable ? (
                  <div className="mt-4 rounded-[24px] border border-[#16211f]/10 bg-white/80 px-4 py-5 text-sm leading-6 text-[#4e5b58]">
                    <p className="font-semibold text-slate-900">{t("system.unavailableTitle")}</p>
                    <p className="mt-2">{t("system.unavailableHome")}</p>
                  </div>
                ) : categories.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {categories.slice(0, 3).map((category: { id: string; name: string; description?: string }) => (
                      <Link
                        key={category.id}
                        to={`/category/${category.id}`}
                        className="block rounded-2xl border border-[#16211f]/8 bg-white/80 px-4 py-3 transition hover:border-primary-300 hover:bg-white"
                      >
                        <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                        <p className="mt-1 text-sm leading-6 text-[#5c6966]">
                          {category.description || t("catalog.filterCopy")}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[#5c6966]">
                    {t("home.featuredIntro")}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {highlights.map((item) => (
                  <div key={item.title} className="glass-panel rounded-[24px] p-4 text-slate-900">
                    <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#5c6966]">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!backendUnavailable && categories.length > 0 && (
        <section className="page-shell py-16" id="category-collections">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-kicker-light">{t("home.categories")}</span>
              <h2 className="section-title mt-4">{t("home.categories")}</h2>
              <p className="section-copy mt-3">{t("home.categoriesIntro")}</p>
            </div>

            <Link
              to="/category/all"
              className="pill-badge w-fit transition hover:bg-primary-50 hover:text-primary-700"
            >
              {t("home.heroSecondary")}
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((cat: { id: string; name: string; description?: string }, index: number) => (
              <Link
                key={cat.id}
                to={`/category/${cat.id}`}
                className={`glass-panel card-hover relative overflow-hidden rounded-[28px] p-6 ${categoryStyles[index % categoryStyles.length]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-lg font-semibold text-[#17352b] shadow-sm">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <span className="pill-badge bg-white/70 text-[#17352b]">/{cat.name.charAt(0)}</span>
                </div>

                <h3 className="mt-8 text-2xl text-slate-900">{cat.name}</h3>
                <p className="mt-3 text-sm leading-6 text-[#4e5b58]">
                  {cat.description || t("catalog.filterCopy")}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                  {t("category.explore")}
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="page-shell pb-16">
        <div className="glass-panel-strong rounded-[32px] px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="section-kicker-light">{t("home.featuredEyebrow")}</span>
              <h2 className="section-title mt-4">{t("home.featured")}</h2>
              <p className="section-copy mt-3">{t("home.featuredIntro")}</p>
            </div>

            <Link
              to="/products"
              className="pill-badge w-fit transition hover:bg-primary-50 hover:text-primary-700"
            >
              {t("home.viewAll")}
            </Link>
          </div>

          {featuredLoading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-panel animate-pulse rounded-[28px] p-4">
                  <div className="aspect-[4/4.5] rounded-[24px] bg-[#e7e1d7]" />
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-2/3 rounded-full bg-[#e2dbd1]" />
                    <div className="h-4 w-1/3 rounded-full bg-[#e2dbd1]" />
                    <div className="h-11 rounded-full bg-[#ddd5ca]" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredError ? (
            <div className="mt-8 rounded-[28px] border border-[#16211f]/10 bg-white/80 px-6 py-10 text-center">
              <p className="text-lg font-semibold text-slate-900">{t("system.unavailableTitle")}</p>
              <p className="section-copy mt-3">{t("system.unavailableFeatured")}</p>
            </div>
          ) : products.length === 0 ? (
            <p className="mt-8 text-center text-[#5c6966]">{t("home.noProducts")}</p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((p: {
                id: string; name: string; price: number; compareAtPrice?: number;
                slug?: string; stockQuantity: number;
                images: { url: string; altText?: string; isPrimary: boolean }[];
              }) => (
                <ProductCard key={p.id} {...p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="page-shell pb-4 sm:pb-8">
        <div className="max-w-2xl">
          <span className="section-kicker-light">{t("home.valueEyebrow")}</span>
          <h2 className="section-title mt-4">{t("home.valueTitle")}</h2>
          <p className="section-copy mt-3">{t("home.valueIntro")}</p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {valueCards.map((card, index) => (
            <div key={card.title} className="glass-panel card-hover rounded-[28px] p-6">
              <span className="pill-badge">0{index + 1}</span>
              <h3 className="mt-6 text-2xl text-slate-900">{card.title}</h3>
              <p className="section-copy mt-3">{card.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
