# راهنمای استایل‌دهی و شخصی‌سازی ظاهر

شما می‌توانید ظاهر ویرایشگر «دبیر» را به راحتی با استفاده از CSS شخصی‌سازی کنید تا با طراحی وب‌سایت یا اپلیکیشن شما هماهنگ شود.

## ساختار CSS

تمام استایل‌های ویرایشگر در فایل `styles.css` تعریف شده‌اند. برای شخصی‌سازی، توصیه می‌شود که یک فایل CSS جداگانه ایجاد کرده و قوانین پیش‌فرض را در آن بازنویسی (override) کنید. این کار به‌روزرسانی‌های آینده «دبیر» را آسان‌تر می‌کند.

```html
<head>
    <!-- استایل پیش‌فرض دبیر -->
    <link rel="stylesheet" href="path/to/styles.css">
    <!-- استایل‌های سفارشی شما -->
    <link rel="stylesheet" href="path/to/my-custom-styles.css">
</head>
```

## کلاس‌های CSS اصلی

در زیر لیستی از مهم‌ترین کلاس‌های CSS که می‌توانید برای شخصی‌سازی استفاده کنید، آمده است:

| سلکتور CSS                           | توضیحات                                                |
| :----------------------------------- | :------------------------------------------------------ |
| `.dabir-editor`                      | کلاس اصلی که به المان ویرایشگر اعمال می‌شود.             |
| `.dabir-editor h1, h2, h3, h4`       | عناوین                                                 |
| `.dabir-editor blockquote`           | بلوک‌های نقل‌قول                                       |
| `.dabir-editor a`                    | پیوندها                                                |
| `.dabir-editor code`                 | کدهای درون‌خطی                                         |
| `.dabir-editor pre`                  | بلوک‌های کد                                            |
| `.dabir-editor table, th, td`        | جداول، سربرگ‌ها و سلول‌ها                               |
| `.dabir-editor li.checklist-item`    | هر آیتم در یک بازبینه (Checklist)                        |
| `.dabir-editor li.checklist-item.checked` | یک آیتم تیک‌خورده در بازبینه                          |
| `.dabir-editor .dabir-admonition`    | کلاس پایه برای تمام جعبه‌های توضیحی                    |
| `.dabir-admonition--note`            | جعبه توضیحی از نوع `توجه`                                |
| `.dabir-admonition--tip`             | جعبه توضیحی از نوع `نکته`                                 |
| `.dabir-admonition--important`       | جعبه توضیحی از نوع `مهم`                                  |
| `.dabir-admonition--warning`         | جعبه توضیحی از نوع `هشدار`                                 |
| `.dabir-admonition--caution`         | جعبه توضیحی از نوع `احتیاط`                                |

## مثال: ساخت تم تیره (Dark Mode)

شما می‌توانید با استفاده از متغیرهای CSS و بازنویسی قوانین، یک تم تیره برای ویرایشگر ایجاد کنید.

**مرحله ۱: تعریف متغیرهای CSS**

در فایل CSS سفارشی خود، متغیرهایی برای رنگ‌ها تعریف کنید.

```css
/* my-custom-styles.css */
body.dark-mode {
    --dabir-bg-color: #1e1e1e;
    --dabir-text-color: #d4d4d4;
    --dabir-border-color: #444;
    --dabir-quote-bg: #2a2a2a;
    --dabir-code-bg: #252526;
    --dabir-link-color: #58a6ff;
    --dabir-pre-bg: #1e1e1e;
    --dabir-pre-text: #d4d4d4;
}
```

**مرحله ۲: بازنویسی استایل‌ها**

حالا از این متغیرها برای بازنویسی استایل‌های پیش‌فرض استفاده کنید.

```css
/* my-custom-styles.css */
body.dark-mode .dabir-editor {
    background-color: var(--dabir-bg-color);
    color: var(--dabir-text-color);
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
}

body.dark-mode .dabir-editor h1,
body.dark-mode .dabir-editor h2,
body.dark-mode .dabir-editor h3,
body.dark-mode .dabir-editor h4 {
    color: #cecece;
}

body.dark-mode .dabir-editor blockquote {
    border-color: var(--dabir-border-color);
    background-color: var(--dabir-quote-bg);
    color: #a9a9a9;
}

body.dark-mode .dabir-editor a {
    color: var(--dabir-link-color);
}

body.dark-mode .dabir-editor code {
    background-color: var(--dabir-code-bg);
}

body.dark-mode .dabir-editor pre {
    background-color: var(--dabir-pre-bg);
    color: var(--dabir-pre-text);
}
```

**مرحله ۳: فعال‌سازی تم**

با استفاده از جاوا اسکریپت، کلاس `dark-mode` را به تگ `<body>` اضافه کنید تا تم فعال شود.

```javascript
document.body.classList.add('dark-mode');
```

## طراحی واکنش‌گرا (Responsive Design)

ویرایشگر «دبیر» به طور پیش‌فرض واکنش‌گرا است و عرض آن با استفاده از `max-width` محدود شده است. برای تنظیمات بیشتر در صفحه‌های کوچک، می‌توانید از Media Queries در CSS استفاده کنید.

```css
/* my-custom-styles.css */
@media (max-width: 768px) {
    .dabir-editor {
        padding: 20px;
        font-size: 16px;
        min-height: 80vh;
    }
}
```
