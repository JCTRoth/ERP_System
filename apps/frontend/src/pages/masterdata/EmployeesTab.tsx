import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const GET_EMPLOYEES = gql`
  query GetEmployees($first: Int, $where: EmployeeFilterInput) {
    employees(first: $first, where: $where, order: { employeeNumber: ASC }) {
      nodes {
        id
        employeeNumber
        firstName
        lastName
        email
        phone
        jobTitle
        employmentType
        status
        hireDate
        department {
          id
          name
        }
        manager {
          id
          firstName
          lastName
        }
      }
      totalCount
    }
  }
`;

const GET_DEPARTMENTS = gql`
  query GetDepartments {
    departments(order: { name: ASC }) {
      nodes {
        id
        code
        name
        employeeCount
        manager {
          firstName
          lastName
        }
      }
    }
  }
`;

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  employmentType: string;
  status: string;
  hireDate: string;
  department: { id: string; name: string } | null;
  manager: { id: string; firstName: string; lastName: string } | null;
}

interface Department {
  id: string;
  code: string;
  name: string;
  employeeCount: number;
  manager: { firstName: string; lastName: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  TERMINATED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PROBATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function EmployeesTab() {
  const { t } = useI18n();
  const [view, setView] = useState<'employees' | 'departments'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: employeesData, loading: employeesLoading } = useQuery(GET_EMPLOYEES, {
    variables: {
      first: 100,
      where: {
        ...(departmentFilter !== 'all' && { departmentId: { eq: departmentFilter } }),
        ...(statusFilter !== 'all' && { status: { eq: statusFilter } }),
      },
    },
  });

  const { data: departmentsData, loading: departmentsLoading } = useQuery(GET_DEPARTMENTS);

  const filteredEmployees = employeesData?.employees?.nodes?.filter((emp: Employee) =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      {/* View Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView('employees')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === 'employees'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {t('masterdata.employees')}
          </button>
          <button
            onClick={() => setView('departments')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === 'departments'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {t('masterdata.departments')}
          </button>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          {view === 'employees' ? t('masterdata.addEmployee') : t('masterdata.addDepartment')}
        </button>
      </div>

      {view === 'employees' ? (
        <>
          {/* Filters */}
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('masterdata.searchEmployees')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input"
            >
              <option value="all">{t('masterdata.allDepartments')}</option>
              {departmentsData?.departments?.nodes?.map((dept: Department) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">{t('common.allStatuses')}</option>
              <option value="ACTIVE">{t('common.active')}</option>
              <option value="ON_LEAVE">{t('masterdata.onLeave')}</option>
              <option value="PROBATION">{t('masterdata.probation')}</option>
              <option value="TERMINATED">{t('masterdata.terminated')}</option>
            </select>
          </div>

          {/* Employees Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('masterdata.employee')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('masterdata.employeeNumber')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('masterdata.department')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('masterdata.jobTitle')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('masterdata.hireDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {employeesLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : filteredEmployees?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {t('masterdata.noEmployees')}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees?.map((employee: Employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30">
                              {employee.firstName[0]}
                              {employee.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="font-mono text-sm">{employee.employeeNumber}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {employee.department?.name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div>
                            <p>{employee.jobTitle || '-'}</p>
                            <p className="text-sm text-gray-500">
                              {t(`masterdata.employmentType.${employee.employmentType.toLowerCase()}`)}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDate(employee.hireDate)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              STATUS_COLORS[employee.status] || STATUS_COLORS.ACTIVE
                            }`}
                          >
                            {t(`masterdata.employeeStatus.${employee.status.toLowerCase()}`)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <button className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Departments Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departmentsLoading ? (
            <div className="col-span-full py-8 text-center">{t('common.loading')}</div>
          ) : departmentsData?.departments?.nodes?.length === 0 ? (
            <div className="col-span-full py-8 text-center text-gray-500">
              {t('masterdata.noDepartments')}
            </div>
          ) : (
            departmentsData?.departments?.nodes?.map((dept: Department) => (
              <div key={dept.id} className="card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/30">
                      <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      <p className="text-sm text-gray-500">{dept.code}</p>
                    </div>
                  </div>
                  <button className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div>
                    <p className="text-2xl font-bold">{dept.employeeCount}</p>
                    <p className="text-sm text-gray-500">{t('masterdata.employees')}</p>
                  </div>
                  {dept.manager && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{t('masterdata.manager')}</p>
                      <p className="font-medium">
                        {dept.manager.firstName} {dept.manager.lastName}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
