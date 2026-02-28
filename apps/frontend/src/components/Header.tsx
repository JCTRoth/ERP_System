import {
  Bars3Icon,
  MoonIcon,
  SunIcon,
  GlobeAltIcon,
  ArrowRightOnRectangleIcon,
  BuildingOffice2Icon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { useI18n, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '../providers/I18nProvider';

export default function Header() {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const logout = useAuthStore((state) => state.logout);
  const currentCompanyId = useAuthStore((state) => state.currentCompanyId);
  const companyAssignments = useAuthStore((state) => state.companyAssignments);
  const setCurrentCompany = useAuthStore((state) => state.setCurrentCompany);
  const { language, setLanguage, t } = useI18n();

  const currentCompany = companyAssignments.find(a => a.companyId === currentCompanyId);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex w-full border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-sm md:px-6 2xl:px-11">
        {/* Left side */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {/* Company Selector - only show when user has multiple companies */}
          {companyAssignments.length > 1 && (
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700">
                <BuildingOffice2Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <span className="max-w-[160px] truncate text-sm font-medium">
                  {currentCompany?.companyName || t('companies.selectCompany', { default: 'Select Company' })}
                </span>
                <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                  <div className="py-1">
                    {companyAssignments.map((assignment) => (
                      <Menu.Item key={assignment.id}>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={() => setCurrentCompany(assignment.companyId)}
                            className={`${
                              active ? 'bg-gray-100 dark:bg-gray-700' : ''
                            } ${
                              currentCompanyId === assignment.companyId
                                ? 'font-medium text-primary-600'
                                : ''
                            } flex w-full items-center gap-2 px-4 py-2 text-left text-sm`}
                          >
                            <BuildingOffice2Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{assignment.companyName}</span>
                            <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                              {assignment.role}
                            </span>
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}

          {/* Language Selector */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              <GlobeAltIcon className="h-5 w-5" />
              <span className="text-sm uppercase">{language}</span>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                <div className="py-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <Menu.Item key={lang}>
                      {({ active }: { active: boolean }) => (
                        <button
                          onClick={() => setLanguage(lang)}
                          className={`${
                            active ? 'bg-gray-100 dark:bg-gray-700' : ''
                          } ${
                            language === lang ? 'font-medium text-primary-600' : ''
                          } block w-full px-4 py-2 text-left text-sm`}
                        >
                          {LANGUAGE_NAMES[lang]}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={`Current: ${theme}`}
          >
            {theme === 'dark' ? (
              <MoonIcon className="h-5 w-5" />
            ) : theme === 'light' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center text-xs">A</div>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="hidden sm:inline">{t('common.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
