#!/bin/bash

# ========================================
# سكربت التحقق من تشغيل النظام
# ========================================

echo "========================================"
echo "   التحقق من تشغيل النظام"
echo "========================================"
echo ""

ERRORS=0

# 1️⃣ فحص حالة الخادم
echo "1️⃣ فحص حالة الخادم:"
if pgrep -f "next-server" > /dev/null; then
    echo "   ✅ خادم Next.js يعمل"
else
    echo "   ❌ خادم Next.js لا يعمل"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2️⃣ فحص الـ Gateway
echo "2️⃣ فحص الـ Gateway (Caddy):"
if pgrep -f "caddy" > /dev/null; then
    echo "   ✅ Caddy Gateway يعمل"
else
    echo "   ❌ Caddy Gateway لا يعمل"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3️⃣ فحص الواجهات الثلاث
echo "3️⃣ فحص الواجهات الرئيسية:"

# الصفحة الرئيسية
HOMEPAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$HOMEPAGE" = "200" ]; then
    echo "   ✅ / (الصفحة الرئيسية): 200 OK"
else
    echo "   ❌ / (الصفحة الرئيسية): $HOMEPAGE"
    ERRORS=$((ERRORS + 1))
fi

# لوحة الإدارة
ADMIN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin)
if [ "$ADMIN" = "200" ]; then
    echo "   ✅ /admin (لوحة الإدارة): 200 OK"
else
    echo "   ❌ /admin (لوحة الإدارة): $ADMIN"
    ERRORS=$((ERRORS + 1))
fi

# صفحة القرآن
QURAN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/quran)
if [ "$QURAN" = "200" ]; then
    echo "   ✅ /quran (صفحة القرآن): 200 OK"
else
    echo "   ❌ /quran (صفحة القرآن): $QURAN"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4️⃣ فحص المحتوى
echo "4️⃣ فحص المحتوى:"

# فحص وجود Quran App في الصفحة الرئيسية
HOMEPAGE_CONTENT=$(curl -s http://localhost:3000/)
if echo "$HOMEPAGE_CONTENT" | grep -q "Quran App"; then
    echo "   ✅ المحتوى يظهر في الصفحة الرئيسية"
else
    echo "   ❌ المحتوى لا يظهر في الصفحة الرئيسية"
    ERRORS=$((ERRORS + 1))
fi

# فحص وجود Quran Admin في لوحة الإدارة
ADMIN_CONTENT=$(curl -s http://localhost:3000/admin)
if echo "$ADMIN_CONTENT" | grep -q "Quran Admin"; then
    echo "   ✅ المحتوى يظهر في لوحة الإدارة"
else
    echo "   ❌ المحتوى لا يظهر في لوحة الإدارة"
    ERRORS=$((ERRORS + 1))
fi

# فحص وجود القرآن في صفحة القرآن
QURAN_CONTENT=$(curl -s http://localhost:3000/quran)
if echo "$QURAN_CONTENT" | grep -q "القرآن\|Quran"; then
    echo "   ✅ المحتوى يظهر في صفحة القرآن"
else
    echo "   ❌ المحتوى لا يظهر في صفحة القرآن"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 5️⃣ فحص الأخطاء في السجل
echo "5️⃣ فحص الأخطاء في السجل:"
RECENT_ERRORS=$(tail -50 /home/z/my-project/dev.log 2>/dev/null | grep -c "Error\|error\|500\|Failed")
if [ "$RECENT_ERRORS" -gt 0 ]; then
    echo "   ⚠️  يوجد $RECENT_ERRORS خطأ/أخطاء في السجل"
    echo "   آخر الأخطاء:"
    tail -50 /home/z/my-project/dev.log | grep -i "error\|500\|failed" | tail -3
else
    echo "   ✅ لا توجد أخطاء في السجل"
fi
echo ""

# 6️⃣ فحص JavaScript
echo "6️⃣ فحص JavaScript Chunks:"
JS_CHUNKS=$(curl -s http://localhost:3000/ | grep -o 'src="/_next/static/chunks' | wc -l)
if [ "$JS_CHUNKS" -gt 5 ]; then
    echo "   ✅ يوجد $JS_CHUNKS JavaScript chunks"
else
    echo "   ⚠️  يوجد فقط $JS_CHUNKS JavaScript chunks"
fi
echo ""

# ========================================
# النتيجة النهائية
# ========================================
echo "========================================"
echo "   النتيجة النهائية"
echo "========================================"

if [ "$ERRORS" -eq 0 ]; then
    echo "✅ النظام يعمل بشكل صحيح!"
    echo ""
    echo "📋 ملخص التحقق:"
    echo "   - خادم Next.js: يعمل ✅"
    echo "   - Gateway: يعمل ✅"
    echo "   - /: 200 OK ✅"
    echo "   - /admin: 200 OK ✅"
    echo "   - /quran: 200 OK ✅"
    echo ""
    echo "🌐 يمكنك الوصول للنظام عبر:"
    echo "   - Preview Panel (على اليمين)"
    echo "   - أو اضغط 'Open in New Tab'"
    exit 0
else
    echo "❌ يوجد $ERRORS خطأ/أخطاء!"
    echo ""
    echo "🔧 حاول تنفيذ:"
    echo "   1. تحديث الصفحة في المتصفح"
    echo "   2. مسح الـ cache"
    echo "   3. إعادة تشغيل الخادم"
    exit 1
fi
