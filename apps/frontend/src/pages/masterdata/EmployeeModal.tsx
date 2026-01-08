import { useState, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../providers/I18nProvider';

const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee($input: CreateEmployeeInput!) {
    createEmployee(input: $input) {
      id
      employeeNumber
    }
  }
`;

const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployee($id: UUID!, $input: UpdateEmployeeInput!) {
    updateEmployee(id: $id, input: $input) {
      id
      employeeNumber
    }
  }
`;

const GET_DEPARTMENTS = gql`
  query GetDepartmentsForEmployee {
    departments(order: { name: ASC }) {
      nodes {
        id
        name
      }
    }
  }
`;

export interface Employee {
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

interface EmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EmployeeModal({ employee, onClose, onSuccess }: EmployeeModalProps) {
  const { t } = useI18n();
  const isEditing = !!employee;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    hireDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    notes: '',
  });

  const { data: departmentsData } = useQuery(GET_DEPARTMENTS, {
    errorPolicy: 'all',
  });

  const [createEmployee, { loading: createLoading }] = useMutation(CREATE_EMPLOYEE, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  const [updateEmployee, { loading: updateLoading }] = useMutation(UPDATE_EMPLOYEE, {
    errorPolicy: 'all',
    onCompleted: () => {
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email || '',
        phone: employee.phone || '',
        jobTitle: employee.jobTitle || '',
        employmentType: employee.employmentType,
        status: employee.status,
        hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
        departmentId: employee.department?.id || '',
        notes: '',
      });
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const input = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        jobTitle: formData.jobTitle || null,
        employmentType: formData.employmentType,
        hireDate: formData.hireDate || null,
        departmentId: formData.departmentId || null,
        notes: formData.notes || null,
      };

      if (isEditing) {
        await updateEmployee({
          variables: { id: employee.id, input: { ...input, status: formData.status } },
        });
      } else {
        await createEmployee({ variables: { input } });
      }
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const loading = createLoading || updateLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditing ? t('masterdata.editEmployee') : t('masterdata.addEmployee')}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name and Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('users.firstName')} *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('users.lastName')} *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Email and Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Job Title and Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.jobTitle')}
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.department')}
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="">{t('masterdata.unassigned')}</option>
                {departmentsData?.departments?.nodes?.map((dept: { id: string; name: string }) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Employment Type and Hire Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.employmentType') || 'Employment Type'}
              </label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="FULL_TIME">{t('masterdata.fullTime') || 'Full Time'}</option>
                <option value="PART_TIME">{t('masterdata.partTime') || 'Part Time'}</option>
                <option value="CONTRACT">{t('masterdata.contract') || 'Contract'}</option>
                <option value="INTERN">{t('masterdata.intern') || 'Intern'}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('masterdata.hireDate')}
              </label>
              <input
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className="input mt-1 w-full"
              />
            </div>
          </div>

          {/* Status (only for editing) */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('common.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input mt-1 w-full"
              >
                <option value="ACTIVE">{t('common.active')}</option>
                <option value="ON_LEAVE">{t('masterdata.onLeave')}</option>
                <option value="PROBATION">{t('masterdata.probation')}</option>
                <option value="TERMINATED">{t('masterdata.terminated')}</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('masterdata.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input mt-1 w-full"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
