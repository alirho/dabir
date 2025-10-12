# راهنمای توسعه پلاگین

سیستم پلاگین «دبیر» به شما اجازه می‌دهد تا عملکرد ویرایشگر را بدون نیاز به تغییر هسته اصلی، گسترش دهید. شما می‌توانید پارسرهای جدید، میانبرهای کیبورد، و رفتارهای سفارشی را از طریق پلاگین‌ها اضافه کنید.

## ساختار یک پلاگین

یک پلاگین در «دبیر» یک کلاس جاوا اسکریپت است که یک متد استاتیک به نام `install` را پیاده‌سازی می‌کند.

```javascript
// src/plugins/myCoolPlugin.js

// بهتر است از کلاس پایه Plugin ارث‌بری کنید، هرچند الزامی نیست.
import Plugin from './plugin.js';

export class MyCoolPlugin extends Plugin {
    /**
     * متد نصب پلاگین. این متد در زمان راه‌اندازی ویرایشگر فراخوانی می‌شود.
     * @param {DabirEditor} editor - نمونه‌ای از کلاس اصلی ویرایشگر.
     * @param {object} options - تنظیماتی که به این پلاگین پاس داده شده است.
     * @returns {object|void} - یک API اختیاری که پلاگین می‌تواند ارائه دهد.
     */
    static install(editor, options) {
        console.log('MyCoolPlugin نصب شد!', options);

        // در اینجا می‌توانید با API ویرایشگر تعامل کنید.
        // برای مثال، یک میانبر کیبورد جدید ثبت کنید.
        editor.keyboardHandler.register('b', ['ctrl'], (event) => {
            document.execCommand('bold');
            return true; // برای جلوگیری از رفتار پیش‌فرض مرورگر
        });

        // می‌توانید یک API برای پلاگین خود برگردانید.
        return {
            doSomethingCool: () => {
                alert('خیلی باحال!');
            }
        };
    }
}
```

### استفاده از پلاگین

```javascript
import DabirEditor from './src/index.js';
import { MyCoolPlugin } from './src/plugins/myCoolPlugin.js';

const editor = new DabirEditor('#editor', {
    plugins: [
        MyCoolPlugin, // کلاس پلاگین را پاس دهید
    ]
});

// دسترسی به API پلاگین (در صورت وجود)
const pluginApi = editor.plugins.get('MyCoolPlugin');
if (pluginApi && pluginApi.doSomethingCool) {
    pluginApi.doSomethingCool();
}
```

## Plugin API

در داخل متد `install`، شما به نمونه کامل ویرایشگر (`editor`) دسترسی دارید و می‌توانید از تمام ماژول‌ها و متدهای عمومی آن استفاده کنید:

-   **`editor.element`**: المان اصلی ویرایشگر.
-   **`editor.events`**: برای گوش دادن یا انتشار رویدادها.
-   **`editor.selection`**: برای کار با انتخاب متن کاربر.
-   **`editor.keyboardHandler`**: برای ثبت میانبرهای کیبورد.
-   **`editor.renderer`**: برای دستکاری DOM.
-   **`editor.getHTML()` / `editor.getMarkdown()` / `editor.setContent()`**: برای تعامل با محتوای ویرایشگر.

## گسترش پارسر مارک‌داون

یکی از قدرتمندترین قابلیت‌های پلاگین‌ها، افزودن قوانین جدید به پارسر مارک‌داون است. شما می‌توانید پارسرهای **بلوک (Block)** و **درون‌خطی (Inline)** را گسترش دهید.

### افزودن پارسر بلوک

برای افزودن یک سینتکس مارک‌داون جدید که یک بلوک HTML کامل ایجاد می‌کند (مانند جعبه‌های توضیحی)، باید یک متد به نام `markdownBlockParser` در API پلاگین خود برگردانید.

این متد در هر خط از محتوای ورودی فراخوانی می‌شود و اگر سینتکس مورد نظر را پیدا کند، باید یک آبجکت شامل HTML نهایی و ایندکس آخرین خط پردازش‌شده را برگرداند.

#### مثال: پلاگین Emoji

بیایید یک پلاگین ساده بسازیم که یک خط مانند `::emoji:: smile` را به یک پاراگراف با یک اموجی بزرگ تبدیل می‌کند.

```javascript
// src/plugins/emojiBlockPlugin.js
import Plugin from './plugin.js';

const EMOJIS = {
    smile: '😄',
    heart: '❤️',
    rocket: '🚀'
};

export class EmojiBlockPlugin extends Plugin {
    static install(editor) {
        // API پلاگین را برگردانید
        return {
            markdownBlockParser: this.parseMarkdownBlock.bind(this)
        };
    }

    /**
     * پارسر سفارشی برای بلوک اموجی.
     * @param {string[]} lines - تمام خطوط متن.
     * @param {number} currentIndex - ایندکس خط فعلی که باید پردازش شود.
     * @returns {{html: string, lastIndex: number}|null}
     */
    static parseMarkdownBlock(lines, currentIndex) {
        const line = lines[currentIndex].trim();
        const match = line.match(/^::emoji::\s+(\w+)/);

        if (!match) {
            return null; // اگر سینتکس مورد نظر پیدا نشد، null برگردانید
        }

        const emojiName = match[1];
        const emojiChar = EMOJIS[emojiName] || '❓';

        const html = `<div style="font-size: 3rem; text-align: center;">${emojiChar}</div>`;

        // این پارسر فقط یک خط را پردازش می‌کند
        return {
            html: html,
            lastIndex: currentIndex 
        };
    }
}
```

## Best Practices

-   **تمیز نگه داشتن کد:** منطق پلاگین خود را در کلاس مربوط به خودش نگه دارید.
-   **عملکرد:** از انجام عملیات سنگین در رویدادهایی که به طور مکرر فراخوانی می‌شوند (مانند `input`) خودداری کنید. در صورت نیاز از `debounce` استفاده کنید.
-   **عدم دستکاری مستقیم `innerHTML`**: تا حد امکان از `editor.renderer` برای دستکاری DOM استفاده کنید تا از سازگاری با آینده اطمینان حاصل شود.
-   **نام‌گذاری منحصر به فرد:** برای کلاس پلاگین خود یک نام منحصر به فرد انتخاب کنید تا با پلاگین‌های دیگر تداخل پیدا نکند.
