import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';
import EmployeeModal, { type Employee } from './EmployeeModal';
import Tooltip, { IconButtonWithTooltip } from '../../components/Tooltip';
import ConfirmDialog from '../../components/ConfirmDialog';

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

const DELETE_EMPLOYEE = gql`
  mutation DeleteEmployee($id: UUID!) {
    deleteEmployee(id: $id)
  }
`;

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
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Employee | null>(null);

  const { data: employeesData, loading: employeesLoading, error: employeesError, refetch } = useQuery(GET_EMPLOYEES, {
    variables: {
      first: 100,
      where: {
        ...(departmentFilter !== 'all' && { departmentId: { eq: departmentFilter } }),
        ...(statusFilter !== 'all' && { status: { eq: statusFilter } }),
      },
    },
    errorPolicy: 'all',
  });

  const { data: departmentsData, loading: departmentsLoading, error: departmentsError } = useQuery(GET_DEPARTMENTS, {
    errorPolicy: 'all',
  });

  const [deleteEmployee, { loading: deleteLoading }] = useMutation(DELETE_EMPLOYEE, {
    errorPolicy: 'all',
    onCompleted: () => {
      setDeleteConfirm(null);
      refetch();
    },
  });

  const handleAddClick = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEditClick = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleDeleteClick = (employee: Employee) => {
    setDeleteConfirm(employee);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm) {
      await deleteEmployee({ variables: { id: deleteConfirm.id } });
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingEmployee(null);
  };

  // Handle unavailable service
  if (employeesError || departmentsError) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-400">
          {t('common.serviceUnavailable') || 'Service Unavailable'}
        </h3>
        <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-500">
          The Employees & Departments data could not be loaded. This feature will be available when the masterdata service is deployed.
        </p>
      </div>
    );
  }

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
        <button onClick={handleAddClick} className="btn-primary flex items-center gap-2">
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
                          <div className="flex items-center justify-end gap-2">
                            <IconButtonWithTooltip
                              icon={<PencilIcon className="h-5 w-5" />}
                              tooltip={t('common.edit')}
                              onClick={() => handleEditClick(employee)}
                              position="top"
                            />
                            <IconButtonWithTooltip
                              icon={<TrashIcon className="h-5 w-5" />}
                              tooltip={t('common.delete')}
                              onClick={() => handleDeleteClick(employee)}
                              position="top"
                              className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            />
                          </div>
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

      {/* Employee Modal */}
      {showModal && view === 'employees' && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={handleModalClose}
          onSuccess={() => refetch()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title={t('masterdata.deleteEmployee') || 'Delete Employee'}
          message={t('masterdata.deleteEmployeeConfirm', { name: `${deleteConfirm.firstName} ${deleteConfirm.lastName}` }) || `Are you sure you want to delete "${deleteConfirm.firstName} ${deleteConfirm.lastName}"? This action cannot be undone.`}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleteLoading}
          variant="danger"
        />
      )}
    </div>
  );
}
