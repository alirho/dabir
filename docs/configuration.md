# راهنمای تنظیمات

ویرایشگر «دبیر» از طریق یک آبجکت تنظیمات که به عنوان آرگومان دوم به سازنده (`constructor`) پاس داده می‌شود، قابل پیکربندی است.

```javascript
const options = {
    placeholder: 'متن دلخواه...',
    storage: {
        enabled: true,
        key: 'my-app-content'
    },
    plugins: [
        // ... لیست پلاگین‌ها
    ]
};

const editor = new DabirEditor('#editor', options);
```

در ادامه، تمام گزینه‌های موجود به تفصیل توضیح داده شده‌اند.

---

## `placeholder`

-   **نوع:** `string`
-   **پیش‌فرض:** `'اینجا بنویسید...'`

این گزینه، متنی را مشخص می‌کند که در هنگام خالی بودن ویرایشگر به عنوان راهنما نمایش داده می‌شود.

#### مثال

```javascript
new DabirEditor('#editor', {
    placeholder: 'هر چه در دل تنگت داری، بنویس...'
});
```

---

## `storage`

-   **نوع:** `object`
-   **پیش‌فرض:** `{ enabled: true, key: 'dabir-content' }`

این آبجکت، تنظیمات مربوط به ذخیره‌سازی خودکار محتوا در `localStorage` مرورگر را کنترل می‌کند.

### `storage.enabled`

-   **نوع:** `boolean`
-   **پیش‌فرض:** `true`

اگر `true` باشد، هر تغییری در محتوای ویرایشگر به صورت خودکار در حافظه محلی ذخیره می‌شود. برای غیرفعال کردن این ویژگی، مقدار آن را `false` قرار دهید.

### `storage.key`

-   **نوع:** `string`
-   **پیش‌فرض:** `'dabir-content'`

این گزینه، کلید منحصر به فردی را مشخص می‌کند که برای ذخیره و بازیابی محتوا در `localStorage` استفاده می‌شود. اگر چندین ویرایشگر «دبیر» در یک وب‌سایت دارید، حتماً برای هر کدام یک `key` منحصر به فرد تعریف کنید تا محتوای آن‌ها با یکدیگر تداخل پیدا نکند.

#### مثال

```javascript
new DabirEditor('#notes-editor', {
    storage: {
        enabled: true,
        key: 'daily-notes-storage'
    }
});

new DabirEditor('#blog-editor', {
    storage: {
        enabled: false // ذخیره‌سازی برای این ویرایشگر غیرفعال است
    }
});
```

---

## `plugins`

-   **نوع:** `Array<Plugin>`
-   **پیش‌فرض:** `[]`

این گزینه یک آرایه از کلاس‌های پلاگین است که می‌خواهید در ویرایشگر فعال شوند. «دبیر» با یک معماری مبتنی بر پلاگین طراحی شده است و بسیاری از ویژگی‌های اصلی آن از طریق پلاگین‌ها پیاده‌سازی می‌شوند.

شما باید ابتدا کلاس پلاگین مورد نظر را `import` کرده و سپس آن را به این آرایه اضافه کنید.

#### مثال

```javascript
// 1. پلاگین‌ها را وارد کنید
import { AdmonitionPlugin } from './src/plugins/admonitionPlugin.js';
import { ListPlugin } from './src/plugins/listPlugin.js';
import { TablePlugin } from './src/plugins/tablePlugin.js';
import { DirectionPlugin } from './src/plugins/directionPlugin.js';

// 2. ویرایشگر را با پلاگین‌های مورد نظر راه‌اندازی کنید
new DabirEditor('#editor', {
    plugins: [
        AdmonitionPlugin,
        ListPlugin,
        TablePlugin,
        DirectionPlugin
    ]
});
```

برای اطلاعات بیشتر در مورد توسعه و استفاده از پلاگین‌ها، به **[راهنمای توسعه پلاگین](./04-plugin-development.md)** مراجعه کنید.
