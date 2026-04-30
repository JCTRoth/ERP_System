import { useQuery, gql } from '@apollo/client';
import { useI18n } from '../providers/I18nProvider';

const GET_DEFAULT_CURRENCY = gql`
  query GetDefaultCurrency {
    currencies(where: { isBaseCurrency: { eq: true } }, first: 1) {
      nodes {
        code
        symbol
        decimalPlaces
      }
    }
  }
`;

const LOCALE_MAP: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  fr: 'fr-FR',
  ru: 'ru-RU',
};

interface UseCurrencyResult {
  currencyCode: string;
  locale: string;
  loading: boolean;
  formatCurrency: (amount: number, currency?: string) => string;
}

export function useCurrency(): UseCurrencyResult {
  const { language } = useI18n();
  const locale = LOCALE_MAP[language] || 'de-DE';

  const { data, loading } = useQuery(GET_DEFAULT_CURRENCY, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-first',
  });

  const defaultCurrency = data?.currencies?.nodes?.[0];
  const currencyCode = defaultCurrency?.code || 'EUR';

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || currencyCode,
    }).format(amount);
  };

  return { currencyCode, locale, loading, formatCurrency };
}
