# مثال‌های کاربردی

در این بخش، چندین مثال عملی برای استفاده از ویرایشگر «دبیر» در سناریوهای مختلف ارائه می‌شود.

## ۱. ویرایشگر ساده

این ساده‌ترین حالت استفاده از «دبیر» است که فقط ویرایشگر را با تنظیمات پیش‌فرض راه‌اندازی می‌کند.

```html
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <link rel="stylesheet" href="dabir.css">
</head>
<body>
    <div id="editor"></div>
    <script type="module">
        import DabirEditor from './src/index.js';
        new DabirEditor('#editor');
    </script>
</body>
</html>
```

## ۲. ویرایشگر با نوار ابزار (Toolbar)

شما می‌توانید یک نوار ابزار سفارشی ایجاد کنید که با API ویرایشگر تعامل داشته باشد.

```html
<div class="toolbar">
    <button id="bold-btn"><b>B</b></button>
    <button id="italic-btn"><i>I</i></button>
    <button id="h2-btn">H2</button>
</div>
<div id="editor-with-toolbar"></div>

<script type="module">
    import DabirEditor from './src/index.js';
    const editor = new DabirEditor('#editor-with-toolbar');

    document.getElementById('bold-btn').addEventListener('click', () => {
        document.execCommand('bold');
    });

    document.getElementById('italic-btn').addEventListener('click', () => {
        document.execCommand('italic');
    });
    
    document.getElementById('h2-btn').addEventListener('click', () => {
        document.execCommand('formatBlock', false, 'h2');
    });
</script>
```
*توجه: `document.execCommand` یک API قدیمی است اما برای عملیات ساده قالب‌ بندی همچنان به خوبی کار می‌کند.*

## ۳. ویرایشگر با پیش‌نمایش زنده

می‌توانید یک پنل پیش‌نمایش ایجاد کنید که با استفاده از رویداد `change` ویرایشگر، محتوای مارک‌داون را به صورت زنده نمایش دهد. برای این کار به یک کتابخانه خارجی برای تبدیل مارک‌داون به HTML در سمت کلاینت نیاز دارید (مانند `marked`).

```html
<div style="display: flex; gap: 20px;">
    <div id="editor-live" style="flex: 1;"></div>
    <div id="preview" style="flex: 1; border: 1px solid #ccc; padding: 10px;"></div>
</div>

<!-- کتابخانه Marked.js را اضافه کنید -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<script type="module">
    import DabirEditor from './src/index.js';
    const editor = new DabirEditor('#editor-live');
    const previewPanel = document.getElementById('preview');

    editor.on('change', (data) => {
        const markdown = data.markdown;
        previewPanel.innerHTML = marked.parse(markdown);
    });
    
    // برای بار اول هم پیش‌نمایش را مقداردهی کنید
    previewPanel.innerHTML = marked.parse(editor.getMarkdown());
</script>
```

## ۴. استفاده در React

برای استفاده از «دبیر» در یک کامپوننت React، از `useEffect` برای راه‌اندازی ویرایشگر و از `useRef` برای دسترسی به المان DOM استفاده کنید.

```jsx
import React, { useEffect, useRef } from 'react';
import DabirEditor from 'path/to/src/index.js';
import 'path/to/dabir.css';

function DabirEditorComponent() {
    const editorRef = useRef(null);
    const editorInstance = useRef(null);

    useEffect(() => {
        // برای جلوگیری از راه‌اندازی مجدد در حین hot-reloading
        if (editorRef.current && !editorInstance.current) {
            editorInstance.current = new DabirEditor(editorRef.current, {
                placeholder: 'نوشتن در React...'
            });
        }
        
        // در زمان unmount کامپوننت، باید ویرایشگر را تخریب کرد
        // (این قابلیت در آینده به دبیر اضافه خواهد شد)
        return () => {
            // editorInstance.current?.destroy();
        };
    }, []);

    return <div ref={editorRef} />;
}

export default DabirEditorComponent;
```

## ۵. استفاده در Vue.js

الگوی مشابهی برای استفاده در Vue.js وجود دارد. از `onMounted` برای راه‌اندازی و از `ref` برای دسترسی به المان استفاده کنید.

```vue
<template>
  <div ref="editorRef"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import DabirEditor from 'path/to/src/index.js';
import 'path/to/dabir.css';

const editorRef = ref(null);
let editorInstance = null;

onMounted(() => {
  if (editorRef.value) {
    editorInstance = new DabirEditor(editorRef.value, {
      placeholder: 'نوشتن در Vue...'
    });
  }
});

onBeforeUnmount(() => {
    // editorInstance?.destroy();
});
</script>
```

## ۶. ویرایشگر چندزبانه

با استفاده از `DirectionPlugin`، ویرایشگر به صورت خودکار جهت متن (راست-به-چپ یا چپ-به-راست) را برای هر پاراگراف بر اساس محتوای آن تنظیم می‌کند. این کار نوشتن به دو زبان فارسی و انگلیسی را بسیار روان می‌کند.

```javascript
import DabirEditor from './src/index.js';
import { DirectionPlugin } from './src/plugins/directionPlugin.js';

new DabirEditor('#multilingual-editor', {
    plugins: [
        DirectionPlugin // فقط کافیست پلاگین را اضافه کنید
    ]
});
```
