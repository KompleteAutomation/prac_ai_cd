import { test, expect } from '@playwright/test';

test('Add employee', async ({ page }) => {
  await page.click('#login');
  await page.fill('#user', 'admin');
  await page.fill('#pass', 'admin123');
  await page.click('#submit');
  await page.waitForTimeout(5000);
  await page.click('#addEmp');
  await page.fill('#fname','John');
  await page.fill('#lname','Doe');
  await page.click('#save');
});
