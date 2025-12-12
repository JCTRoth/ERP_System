import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const GET_CURRENCIES = gql`
  query GetCurrencies {
    currencies(order: { code: ASC }) {
      nodes {
        id
        code
        name
        symbol
        exchangeRate
        isDefault
        isActive
      }
    }
  }
`;

const GET_PAYMENT_TERMS = gql`
  query GetPaymentTerms {
    paymentTerms(order: { name: ASC }) {
      nodes {
        id
        code
        name
        description
        type
        netDays
        discountDays
        discountPercent
        isActive
      }
    }
  }
`;

const GET_UNITS_OF_MEASURE = gql`
  query GetUnitsOfMeasure {
    unitsOfMeasure(order: { name: ASC }) {
      nodes {
        id
        code
        name
        type
        baseUnit
        conversionFactor
        isActive
      }
    }
  }
`;

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
}

interface PaymentTerm {
  id: string;
  code: string;
  name: string;
  description: string;
  type: string;
  netDays: number;
  discountDays: number;
  discountPercent: number;
  isActive: boolean;
}

interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  type: string;
  baseUnit: string | null;
  conversionFactor: number;
  isActive: boolean;
}

type ReferenceType = 'currencies' | 'paymentTerms' | 'units';

export default function ReferenceDataTab() {
  const { t } = useI18n();
  const [activeType, setActiveType] = useState<ReferenceType>('currencies');

  const { data: currenciesData, loading: currenciesLoading } = useQuery(GET_CURRENCIES, {
    skip: activeType !== 'currencies',
  });
  const { data: paymentTermsData, loading: paymentTermsLoading } = useQuery(GET_PAYMENT_TERMS, {
    skip: activeType !== 'paymentTerms',
  });
  const { data: unitsData, loading: unitsLoading } = useQuery(GET_UNITS_OF_MEASURE, {
    skip: activeType !== 'units',
  });

  const referenceTypes = [
    { key: 'currencies', labelKey: 'masterdata.currencies' },
    { key: 'paymentTerms', labelKey: 'masterdata.paymentTerms' },
    { key: 'units', labelKey: 'masterdata.unitsOfMeasure' },
  ];

  const loading = currenciesLoading || paymentTermsLoading || unitsLoading;

  return (
    <div>
      {/* Type Selection */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {referenceTypes.map((type) => (
            <button
              key={type.key}
              onClick={() => setActiveType(type.key as ReferenceType)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeType === type.key
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {t(type.labelKey)}
            </button>
          ))}
        </div>
        <button className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          {t('common.add')}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-8 text-center">{t('common.loading')}</div>
      ) : (
        <>
          {/* Currencies */}
          {activeType === 'currencies' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.code')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.symbol')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.exchangeRate')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('common.status')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {currenciesData?.currencies?.nodes?.map((currency: Currency) => (
                      <tr key={currency.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="font-mono font-medium">{currency.code}</span>
                          {currency.isDefault && (
                            <span className="ml-2 rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                              {t('masterdata.default')}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">{currency.name}</td>
                        <td className="whitespace-nowrap px-6 py-4">{currency.symbol}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono">
                          {currency.exchangeRate.toFixed(4)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              currency.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {currency.isActive ? t('common.active') : t('common.inactive')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment Terms */}
          {activeType === 'paymentTerms' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.code')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.type')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.netDays')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.discount')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('common.status')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paymentTermsData?.paymentTerms?.nodes?.map((term: PaymentTerm) => (
                      <tr key={term.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="font-mono font-medium">{term.code}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div>
                            <p>{term.name}</p>
                            {term.description && (
                              <p className="text-sm text-gray-500">{term.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {t(`masterdata.paymentTermType.${term.type.toLowerCase()}`)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          {term.netDays} {t('masterdata.days')}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          {term.discountPercent > 0 ? (
                            <span>
                              {term.discountPercent}% / {term.discountDays} {t('masterdata.days')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              term.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {term.isActive ? t('common.active') : t('common.inactive')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Units of Measure */}
          {activeType === 'units' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.code')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.type')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.baseUnit')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('masterdata.conversionFactor')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('common.status')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {unitsData?.unitsOfMeasure?.nodes?.map((unit: UnitOfMeasure) => (
                      <tr key={unit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="font-mono font-medium">{unit.code}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">{unit.name}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {t(`masterdata.uomType.${unit.type.toLowerCase()}`)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {unit.baseUnit || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono">
                          {unit.conversionFactor}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              unit.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {unit.isActive ? t('common.active') : t('common.inactive')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
