# Contributing to Quran App

شكراً لاهتمامك بالمساهمة في مشروع Quran App! 🎉

## 📋 جدول المحتويات

- [مدونة السلوك](#مدونة-السلوك)
- [كيف أساهم؟](#كيف-أساهم)
- [عملية التطوير](#عملية-التطوير)
- [معايير الكود](#معايير-الكود)
- [رسائل الـ Commit](#رسائل-ال-commit)
- [الـ Pull Requests](#ال-pull-requests)

---

## مدونة السلوك

هذا المشروع يلتزم بمدونة سلوك المصدر المفتوح. بالمشاركة في هذا المشروع، أنت توافق على الحفاظ على بيئة محترمة وشاملة للجميع.

---

## كيف أساهم؟

### الإبلاغ عن Bugs

1. تأكد من أن الـ bug لم يتم الإبلاغ عنه مسبقاً
2. استخدم قالب الـ Issue
3. قدم وصفاً واضحاً مع خطوات إعادة الإنتاج

### اقتراح ميزات جديدة

1. افتح Issue جديد
2. استخدم label `feature`
3. اشرح الميزة وفوائدها

### المساهمة بالكود

1. Fork المشروع
2. أنشئ فرع جديد (`git checkout -b feature/amazing-feature`)
3. قم بالتغييرات
4. أرسل Pull Request

---

## عملية التطوير

### المتطلبات الأساسية

```bash
# تثبيت Bun
curl -fsSL https://bun.sh/install | bash

# استنساخ المشروع
git clone https://github.com/wweziz0001/Quran_app.git
cd Quran_app

# تثبيت الحزم
bun install

# توليد Prisma Client
bun run db:generate

# تشغيل خادم التطوير
bun run dev
```

### سير العمل

```
1. أنشئ Issue (إن لم يكن موجوداً)
        ↓
2. أنشئ فرع من main
        ↓
3. قم بالتطوير والاختبار
        ↓
4. افتح Pull Request
        ↓
5. Code Review
        ↓
6. Merge بعد الموافقة
```

---

## معايير الكود

### TypeScript

- استخدم TypeScript بشكل صارم
- عرف الأنواع (types) لجميع المعاملات
- تجنب استخدام `any` قدر الإمكان

### ESLint

```bash
# تشغيل ESLint
bun run lint

# إصلاح الأخطاء تلقائياً
bun run lint --fix
```

### تنسيق الكود

- استخدم Prettier لتنسيق الكود
- استخدم 2 مسافات للمسافات البادئة
- استخدم علامات اقتباس مفردة للسلاسل النصية

---

## رسائل الـ Commit

نستخدم [Conventional Commits](https://www.conventionalcommits.org/):

### التنسيق

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### الأنواع (Types)

| النوع | الوصف |
|-------|-------|
| `feat` | ميزة جديدة |
| `fix` | إصلاح bug |
| `docs` | تغييرات في التوثيق |
| `style` | تنسيق الكود |
| `refactor` | إعادة هيكلة الكود |
| `perf` | تحسين الأداء |
| `test` | إضافة/تعديل اختبارات |
| `chore` | مهام صيانة |
| `ci` | تغييرات CI/CD |

### أمثلة

```bash
feat(ai): إضافة خدمة التوصيات الذكية
fix(api): إصلاح خطأ في endpoint البحث
docs(readme): تحديث تعليمات التثبيت
chore(deps): تحديث الحزم الأمنية
```

---

## الـ Pull Requests

### قائمة التحقق قبل الإرسال

- [ ] الكود يعمل محلياً
- [ ] تم تشغيل ESLint بدون أخطاء
- [ ] تم تحديث التوثيق (إن لزم)
- [ ] تم إضافة اختبارات (إن لزم)
- [ ] الـ Commit messages واضحة

### قالب الـ Pull Request

```markdown
## الوصف
وصف واضح للتغييرات

## نوع التغيير
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## الاختبار
خطوات اختبار التغييرات

## Screenshots (إن وجدت)

## ملاحظات إضافية
```

### عملية المراجعة

1. **CI Checks**: يجب أن تنجح جميع الفحوصات
2. **Code Review**: مراجعة من مالك الكود
3. **Approval**: موافقة واحدة مطلوبة
4. **Merge**: يتم الدمج بعد الموافقة

---

## 📊 CI/CD Pipeline

يتضمن المشروع GitHub Actions workflow شامل:

| المرحلة | الوصف |
|---------|-------|
| Code Quality | ESLint + TypeScript |
| Build | بناء Multi-platform |
| Unit Tests | اختبارات الوحدات |
| Security Scan | فحص الثغرات الأمنية |
| API Validation | التحقق من API routes |

---

## 🆘 المساعدة

إذا احتجت مساعدة:

1. راجع [الوثائق](./docs/)
2. افتح Issue مع label `status/help wanted`
3. تواصل مع المشرفين

---

## 📜 الرخصة

بالمساهمة في هذا المشروع، أنت توافق على أن مساهماتك ستكون تحت نفس رخصة المشروع.

---

شكراً لمساهمتك! 🙏
