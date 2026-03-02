#!/bin/bash

set -e  # إيقاف السكربت عند أي خطأ

echo "================================="
echo "Installing Bun..."
echo "================================="

# تثبيت Bun إذا لم يكن مثبت
if ! command -v bun &> /dev/null
then
    curl -fsSL https://bun.sh/install | bash
fi

# تحميل متغيرات البيئة
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# جعلها دائمة إن لم تكن موجودة
grep -q 'BUN_INSTALL' ~/.bashrc || echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
grep -q 'BUN_INSTALL/bin' ~/.bashrc || echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc

source ~/.bashrc

echo "Bun version:"
bun --version

echo "================================="
echo "Checking .env file..."
echo "================================="

ENV_LINE="DATABASE_URL=file:db/custom.db"
ENV_CHECK="DATABASE_URL=file:"

# إنشاء الملف إذا غير موجود
if [ ! -f .env ]; then
    echo "$ENV_LINE" > .env
    echo ".env file created with DATABASE_URL"
else
    # التحقق هل السطر موجود
    if grep -q "^$ENV_CHECK" .env
    then
        echo "DATABASE_URL already exists in .env"
    else
        # إضافة سطر فارغ إذا آخر سطر ليس فارغ (تنسيق فقط)
        tail -n 1 .env | grep -q '^$' || echo "" >> .env
        # إضافة المتغير في سطر جديد
        echo "$ENV_LINE" >> .env
        echo "DATABASE_URL added to existing .env"
    fi
fi

echo "================================="
echo "Current .env content:"
echo "================================="
cat .env
echo ""
echo ""

echo "================================="
echo "Installing project dependencies..."
echo "================================="

bun install

echo "================================="
echo "Generating Prisma client..."
echo "================================="

bunx prisma generate

echo "================================="
echo "Pushing database schema..."
echo "================================="

bun run db:push

echo "================================="
echo "Starting development server..."
echo "================================="

bun run dev
