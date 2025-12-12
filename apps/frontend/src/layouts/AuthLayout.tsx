import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-600">ERP System</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enterprise Resource Planning
          </p>
        </div>
        <div className="card p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
