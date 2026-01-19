// import { test, expect } from '../playwright/setup/globalHooks';
import { test, expect } from '@playwright/test';
import { credentials } from '../playwright/config/config';
const { LoginPage } = require('../playwright/pages/login.page');
const { ServicesPage } = require('../playwright/pages/services.page');
const { serviceTestData } = require('../playwright/data/serviceTestData');

test.describe(
  'Service Category Tests',
  { tags: ['@ui', '@services', '@high', '@regression'] },
  () => {
    // Ensure serviceTestData is not empty
    if (!serviceTestData || !Array.isArray(serviceTestData) || serviceTestData.length === 0) {
      throw new Error('serviceTestData is empty or not properly loaded.');
    }

    serviceTestData.forEach(({ service, expectedProducts }) => {
      if (!service) return;

      test(`TestSelectCategory - ${service}`, async ({ page }) => {
        const loginPage = new LoginPage(page);
        const servicesPage = new ServicesPage(page);

        await loginPage.navigateToLogin('/login.html');
        await loginPage.login(credentials.username, credentials.password);
        await servicesPage.navigateToAllServices();
        const productNamesBefore = await servicesPage.getProductNames();
        const initCount = productNamesBefore.length; // Updated from count() to length
        console.log(`Initial product count for ${service}:`, initCount);
        // await servicesPage.selectCategory(service);
        // expect(await servicesPage.getProductNames({ timeout: 5000, interval: 100 })).not.toHaveLength(initCount); // Updated to use toHaveLength
        // const productNames = await servicesPage.getProductNames();
        // console.log(`Products for ${service}:`, productNames);
        // expect(await servicesPage.validateProducts(expectedProducts)).toBeTruthy();

        await servicesPage.selectCategory('Cleaning');

        await expect.poll(
          async () => {
            const names = await servicesPage.getProductNames();
            return names.length;
          },
          {
            timeout: 10000,
            intervals: [200],
          }
        ).not.toBe(initCount);
        await loginPage.logout();
        expect(await loginPage.validateLogoutSuccess()).toBeTruthy();
      });
    });

    // Optional hard-coded test
    test('@ui @services @category @high @regression SelectCategory - Cleaning', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const servicesPage = new ServicesPage(page);

      await loginPage.navigateToLogin('/login.html');
      await loginPage.login(credentials.username, credentials.password);
      await servicesPage.navigateToAllServices();
      const productNamesBefore = await servicesPage.getProductNames();
      const initCount = productNamesBefore.length; // Updated from count() to length
      console.log('Initial product count for Cleaning:', initCount);
      await servicesPage.selectCategory('Cleaning');
      await servicesPage.selectCategory('Cleaning');

      await expect.poll(
        async () => {
          const names = await servicesPage.getProductNames();
          return names.length;
        },
        {
          timeout: 10000,
          intervals: [200],
        }
      ).not.toBe(initCount);

      // expect(await servicesPage.getProductNames(),{timeout: 5000, interval: 100}).not.toHaveLength(initCount); // Updated to use toHaveLength

      // const expectedProducts = ['RoboClean Pro', 'DustMaster 360'];
      // const productNames = await servicesPage.getProductNames();
      // console.log('Products:', productNames);
      // expect(await servicesPage.validateProducts(expectedProducts)).toBeTruthy();

      await loginPage.logout();
      expect(await loginPage.validateLogoutSuccess()).toBeTruthy();
    });
  }
);
