# راهنمای شروع سریع

این راهنما به شما کمک می‌کند تا ویرایشگر «دبیر» را در سریع‌ترین زمان ممکن راه‌اندازی و استفاده کنید.

## ۱. نصب

در حال حاضر، ساده‌ترین راه برای استفاده از «دبیر» کپی کردن فایل‌های آن در پروژه شماست.

### دانلود مستقیم

1.  کل پروژه را از ریپازیتوری گیت‌هاب دانلود کنید.
2.  پوشه `src` و فایل `dabir.css` را در پروژه خود کپی کنید.

### استفاده از CDN (در آینده)

در آینده، امکان استفاده از ویرایشگر از طریق CDN نیز فراهم خواهد شد:

```html
<!-- هنوز آماده نیست -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/alirho/dabir/dabir.css">
<script type="module" src="https://cdn.jsdelivr.net/gh/alirho/dabir/src/index.js"></script>
```

### استفاده از npm (در آینده)

پس از انتشار به عنوان یک پکیج npm، می‌توانید آن را به این صورت نصب کنید:

```bash
# هنوز آماده نیست
npm install dabir-editor
```

## ۲. راه‌اندازی اولین ویرایشگر

برای راه‌اندازی ویرایشگر، مراحل زیر را دنبال کنید:

### مرحله ۱: ساختار فایل HTML

یک فایل HTML ساده ایجاد کنید و فایل CSS ویرایشگر را به آن اضافه کنید. همچنین یک المان `<div>` برای ویرایشگر در نظر بگیرید.

```html
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>اولین ویرایشگر دبیر</title>
    
    <!-- ۱. فایل CSS را اضافه کنید -->
    <link rel="stylesheet" href="path/to/your/dabir.css">
    
    <style>
        body { background-color: #f0f2f5; padding: 2rem; }
    </style>
</head>
<body>
    <!-- ۲. یک المان برای ویرایشگر ایجاد کنید -->
    <div id="editor"></div>

    <!-- ۳. اسکریپت راه‌اندازی را اضافه کنید -->
    <script type="module">
        // کدهای جاوا اسکریپت در اینجا قرار می‌گیرد
    </script>
</body>
</html>
```

### مرحله ۲: راه‌اندازی با جاوا اسکریپت

داخل تگ `<script type="module">`، کلاس اصلی ویرایشگر را وارد (import) کرده و یک نمونه جدید از آن بسازید.

```javascript
// داخل تگ <script type="module">

import DabirEditor from './path/to/your/src/index.js';

// منتظر بمانید تا صفحه کاملاً بارگذاری شود
document.addEventListener('DOMContentLoaded', () => {
    // ویرایشگر را روی المان مورد نظر راه‌اندازی کنید
    new DabirEditor('#editor');
});
```

اکنون ویرایشگر شما آماده استفاده است!

## ۳. تنظیمات پایه

شما می‌توانید ویرایشگر را با ارسال یک آبجکت تنظیمات در هنگام ساخت، شخصی‌سازی کنید.

```javascript
new DabirEditor('#editor', {
    // متنی که در هنگام خالی بودن ویرایشگر نمایش داده می‌شود
    placeholder: 'داستان خود را اینجا بنویسید...',
    
    // تنظیمات ذخیره‌سازی خودکار
    storage: {
        enabled: true, // فعال بودن ذخیره‌سازی
        key: 'my-unique-note-key' // کلید منحصر به فرد برای این ویرایشگر
    }
});
```

## ۴. افزودن پلاگین‌ها

«دبیر» از یک سیستم پلاگین قدرتمند برای گسترش عملکرد خود استفاده می‌کند. برای افزودن پلاگین‌ها، آن‌ها را وارد کرده و به آرایه `plugins` در تنظیمات اضافه کنید.

```javascript
import DabirEditor from './src/index.js';
// پلاگین‌های مورد نیاز را وارد کنید
import { AdmonitionPlugin } from './src/plugins/admonitionPlugin.js';
import { DirectionPlugin } from './src/plugins/directionPlugin.js';
import { ListPlugin } from './src/plugins/listPlugin.js';
import { TablePlugin } from './src/plugins/tablePlugin.js';

document.addEventListener('DOMContentLoaded', () => {
    new DabirEditor('#editor', {
        placeholder: 'یادداشت خود را با پلاگین‌ها بنویسید...',
        plugins: [
            AdmonitionPlugin,
            DirectionPlugin,
            ListPlugin,
            TablePlugin
        ]
    });
});
```

## ۵. رفع مشکلات رایج

-   **ویرایشگر نمایش داده نمی‌شود:**
    -   مطمئن شوید که سلکتور CSS (`#editor`) صحیح است و چنین المانی در صفحه وجود دارد.
    -   بررسی کنید که مسیر فایل جاوا اسکریپت در دستور `import` درست باشد.
    -   خطاهای کنسول مرورگر را بررسی کنید.

-   **استایل‌ها به درستی اعمال نمی‌شوند:**
    -   مطمئن شوید که فایل `dabir.css` به درستی در `<head>` صفحه لینک شده است و مسیر آن صحیح است.
    -   بررسی کنید که آیا استایل‌های دیگری در پروژه شما، استایل‌های «دبیر» را بازنویسی (override) می‌کنند یا خیر.

-   **پلاگین‌ها کار نمی‌کنند:**
    -   مطمئن شوید که پلاگین‌ها را به درستی `import` کرده و در آرایه `plugins` در تنظیمات قرار داده‌اید.
