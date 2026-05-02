import { useI18n } from "../context/I18nContext";

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{t("shop.name")}</h3>
            <p className="mt-2 text-sm">{t("footer.description")}</p>
          </div>
          <div>
            <h4 className="font-medium text-white">{t("footer.shop")}</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="/products" className="hover:text-white">{t("nav.products")}</a></li>
              <li><a href="/category/all" className="hover:text-white">{t("nav.categories")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white">{t("footer.support")}</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><span className="hover:text-white">{t("footer.contact")}</span></li>
              <li><span className="hover:text-white">{t("footer.shipping")}</span></li>
              <li><span className="hover:text-white">{t("footer.returns")}</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white">{t("footer.legal")}</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><span className="hover:text-white">{t("footer.privacy")}</span></li>
              <li><span className="hover:text-white">{t("footer.terms")}</span></li>
              <li><span className="hover:text-white">{t("footer.imprint")}</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-700 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} {t("shop.name")}. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
