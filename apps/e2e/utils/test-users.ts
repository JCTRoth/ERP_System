/**
 * Test users for the Playwright E2E suite.
 *
 * These mirror the demo users seeded by the UserService (SeedDataService).
 * Credentials can be overridden via environment variables so CI and other
 * environments can use different users without code changes. Never commit
 * real credentials here.
 */
export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Seeded super admin user (UserDbContext seed). Role `admin` grants access to
 * every page and it is assigned to the MediVita demo company, which makes the
 * session deterministic for E2E tests.
 */
export const adminUser: TestUser = {
  email: process.env.E2E_USER_EMAIL || 'admin@erp-system.local',
  password: process.env.E2E_USER_PASSWORD || 'Admin123!',
  firstName: 'Super',
  lastName: 'Admin',
};

/** Invalid credentials used to assert login error handling. */
export const invalidUser: Pick<TestUser, 'email' | 'password'> = {
  email: 'nobody@example.com',
  password: 'WrongPassword123!',
};
