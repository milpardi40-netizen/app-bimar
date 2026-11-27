import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith('first launch')) await page.addInitScript(() => localStorage.setItem('hs-welcome-seen', 'true'));
});

test('RTL home, responsive navigation and disease tabs', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'مراقبت از خود را از اینجا شروع کنید' })).toBeVisible();
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('button', { name: 'آموزش' }).click();
  await page.getByRole('button', { name: /دیابت نوع ۲/ }).click();
  await page.getByRole('tab', { name: 'علائم' }).click();
  await expect(page.locator('.article-card')).toContainText('تشنگی');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
});

test('medicines are saved, toggled and marked as taken locally', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await page.getByRole('button', { name: 'داروها', exact: true }).click();
  await page.getByRole('button', { name: 'افزودن داروی جدید' }).click();
  await page.getByLabel('نام دارو').fill('داروی آزمایشی');
  await page.getByLabel('مقدار مصرف').fill('یک عدد');
  await page.getByLabel('ساعت مصرف روزانه').fill('08:30');
  await page.getByRole('button', { name: 'ثبت دارو' }).click();
  const card = page.locator('.med-card').filter({ hasText: 'داروی آزمایشی' });
  await card.getByRole('button', { name: 'ثبت مصرف' }).click();
  await card.getByRole('switch').click();
  await page.reload();
  await page.getByRole('button', { name: 'داروها', exact: true }).click();
  await expect(card.getByRole('button', { name: 'مصرف شد' })).toBeVisible();
  await expect(card.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
});

test('requests and patient profile remain local and accept Persian digits', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await page.getByRole('button', { name: 'خدمات', exact: true }).click();
  await page.getByRole('button', { name: 'درخواست خدمت' }).click();
  await page.getByLabel('نام بیمار').fill('بیمار آزمایشی');
  await page.getByLabel('شماره تماس').fill('۰۹۱۲۳۴۵۶۷۸۹');
  await page.getByLabel('آدرس').fill('نشانی آزمایشی');
  await page.getByRole('button', { name: 'ذخیره درخواست' }).click();
  await expect(page.locator('.request-card')).toContainText('ارسال نشده');
  await page.getByRole('button', { name: 'پروفایل', exact: true }).click();
  await page.getByLabel('نام و نام خانوادگی').fill('بیمار آزمایشی');
  await page.getByRole('button', { name: 'ذخیره اطلاعات' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'پروفایل', exact: true }).click();
  await expect(page.getByLabel('نام و نام خانوادگی')).toHaveValue('بیمار آزمایشی');
  await page.getByRole('button', { name: 'ورود / ثبت‌نام نمایشی' }).click();
  await page.getByLabel('شماره موبایل').fill('۰۹۱۲۳۴۵۶۷۸۹');
  await expect(page.getByLabel('شماره موبایل')).toHaveValue('09123456789');
});

test('sample video plays and locally uploaded content appears in disease details', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await page.getByRole('button', { name: 'آموزش', exact: true }).click();
  await page.getByRole('button', { name: /دیابت نوع ۲/ }).click();
  await page.getByRole('button', { name: 'مشاهده همه آموزش‌ها' }).click();
  const video = page.locator('video');
  await video.evaluate(v => v.play());
  await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(0);
  await page.getByRole('navigation', { name: 'ناوبری اصلی' }).getByRole('button', { name: 'خانه' }).click();
  await page.getByRole('button', { name: 'باز کردن منو' }).click();
  await page.getByRole('button', { name: 'مدیریت محتوا' }).click();
  await page.getByLabel('عنوان مطلب').fill('مطلب آزمایشی');
  await page.getByLabel('متن مطلب').fill('متن نمونه');
  await page.getByLabel('تصویر یا ویدیو (اختیاری، حداکثر ۱.۵ مگابایت)').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2ioAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'افزودن محتوا' }).click();
  await page.getByRole('button', { name: 'آموزش', exact: true }).click();
  await page.getByRole('button', { name: /دیابت نوع ۲/ }).click();
  await expect(page.getByRole('heading', { name: 'مطلب آزمایشی' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'مطلب آزمایشی' })).toBeVisible();
});

test('QR renders on web and deep link opens a disease', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /دریافت QR/ }).click();
  await expect(page.locator('.qr-code svg')).toBeVisible();
  await page.goto('/#disease/heart');
  await expect(page.getByRole('heading', { name: 'بیماری‌های قلبی', exact: true })).toBeVisible();
});

test('browser back follows the app navigation', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await page.getByRole('button', { name: 'آموزش', exact: true }).click();
  await page.getByRole('button', { name: /دیابت نوع ۲/ }).click();
  await page.getByRole('button', { name: 'مشاهده همه آموزش‌ها' }).click();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'دیابت نوع ۲', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'آموزش بیماری‌ها' }).first()).toBeVisible();
});

test('offline Android preview generates a clearly labelled text QR', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await page.getByRole('button', { name: /دریافت QR/ }).click();
  await expect(page.locator('.qr-code svg')).toBeVisible();
  await expect(page.getByText('کد آفلاین فقط نام بیماری و برنامه را به صورت متن نمایش می‌دهد.')).toBeVisible();
});


test('first launch shows onboarding and remembers the choice', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await expect(page.getByRole('heading', { name: 'آموزش به بیمار' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'شروع کنید' })).toBeVisible();
  await page.getByRole('button', { name: 'شروع کنید' }).click();
  await expect(page.getByRole('heading', { name: 'مراقبت از خود را از اینجا شروع کنید' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'شروع کنید' })).toHaveCount(0);
});

test('first launch login path stays explicitly demonstrative', async ({ page }) => {
  await page.goto('/?androidPreview=1');
  await page.getByRole('button', { name: 'ورود به حساب' }).click();
  await expect(page.getByText('ورود نمایشی است؛ پیامک یا تأیید شماره انجام نمی‌شود.')).toBeVisible();
  await page.getByLabel('شماره موبایل').fill('۰۹۱۲۳۴۵۶۷۸۹');
  await page.locator('form').getByRole('button', { name: 'ورود / ثبت‌نام' }).click();
  await expect(page.getByRole('heading', { name: 'اطلاعات بیمار' })).toBeVisible();
});

test('digestive category and tablet home are available', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/?androidPreview=1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'آموزش', exact: true }).click();
  await page.getByRole('button', { name: /بیماری‌های گوارشی/ }).click();
  await expect(page.getByRole('heading', { name: 'معرفی بیماری‌های گوارشی' })).toBeVisible();
});
