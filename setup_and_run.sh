#!/bin/bash

# =============================================
# Quran Enterprise Platform - Setup & Run Script
# =============================================
# هذا السكربت يقوم بتثبيت وتشغيل جميع الخدمات
# =============================================

set -e  # إيقاف السكربت عند أي خطأ

# حفظ المسار الأساسي للمشروع
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICES_DIR="$PROJECT_ROOT/services"
LOGS_DIR="$PROJECT_ROOT/logs"

# إنشاء مجلد السجلات
mkdir -p "$LOGS_DIR"

echo "================================="
echo "🚀 Quran Enterprise Platform"
echo "================================="
echo "Project Root: $PROJECT_ROOT"
echo "Services Dir: $SERVICES_DIR"
echo ""

# =============================================
# تثبيت Bun
# =============================================
echo "================================="
echo "📦 Installing Bun..."
echo "================================="

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

source ~/.bashrc 2>/dev/null || true

echo "Bun version:"
bun --version
echo ""

# =============================================
# إعداد ملف .env
# =============================================
echo "================================="
echo "⚙️ Checking .env file..."
echo "================================="

ENV_LINE="DATABASE_URL=file:db/custom.db"
ENV_CHECK="DATABASE_URL=file:"

# إنشاء الملف إذا غير موجود
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "$ENV_LINE" > "$PROJECT_ROOT/.env"
    echo ".env file created with DATABASE_URL"
else
    # التحقق هل السطر موجود
    if grep -q "^$ENV_CHECK" "$PROJECT_ROOT/.env"
    then
        echo "DATABASE_URL already exists in .env"
    else
        # إضافة سطر فارغ إذا آخر سطر ليس فارغ (تنسيق فقط)
        tail -n 1 "$PROJECT_ROOT/.env" | grep -q '^$' || echo "" >> "$PROJECT_ROOT/.env"
        # إضافة المتغير في سطر جديد
        echo "$ENV_LINE" >> "$PROJECT_ROOT/.env"
        echo "DATABASE_URL added to existing .env"
    fi
fi

echo "Current .env content:"
cat "$PROJECT_ROOT/.env"
echo ""
echo ""

# =============================================
# تثبيت الاعتماديات الرئيسية
# =============================================
echo "================================="
echo "📚 Installing project dependencies..."
echo "================================="

cd "$PROJECT_ROOT"
bun install

echo "================================="
echo "🔧 Generating Prisma client..."
echo "================================="

bunx prisma generate

echo "================================="
echo "🗄️ Pushing database schema..."
echo "================================="

bun run db:push

# =============================================
# تثبيت الاعتماديات المشتركة للخدمات
# =============================================
echo ""
echo "================================="
echo "📦 Installing shared dependencies..."
echo "================================="

cd "$SERVICES_DIR/shared"
bun install
echo "✅ shared dependencies installed"

# =============================================
# دالة لتشغيل خدمة
# =============================================
start_service() {
    local service_name=$1
    local service_dir="$SERVICES_DIR/$service_name"
    local log_file="$LOGS_DIR/${service_name}.log"
    
    echo "================================="
    echo "🚀 Starting $service_name..."
    echo "================================="
    
    if [ -d "$service_dir" ]; then
        cd "$service_dir"
        bun install
        
        # تشغيل الخدمة في الخلفية
        nohup bun run dev > "$log_file" 2>&1 &
        local pid=$!
        
        echo "✅ $service_name started (PID: $pid)"
        echo "   Log file: $log_file"
        
        # العودة للمجلد الرئيسي
        cd "$PROJECT_ROOT"
    else
        echo "❌ Service directory not found: $service_dir"
    fi
}

# =============================================
# تشغيل جميع الخدمات
# =============================================
echo ""
echo "================================="
echo "🔧 Starting Microservices..."
echo "================================="
echo ""

# 1. Quran Service (Port 3001)
start_service "quran-service"
sleep 1

# 2. Audio Service (Port 3002)
start_service "audio-service"
sleep 1

# 3. Search Service (Port 3003)
start_service "search-service"
sleep 1

# 4. Tafsir Service (Port 3004)
start_service "tafsir-service"
sleep 1

# 5. Users Service (Port 3005)
start_service "users-service"
sleep 1

# 6. Reciter Service (Port 3006)
start_service "reciter-service"
sleep 1

# 7. AI Service (Port 3007)
start_service "ai-service"
sleep 1

# 8. Admin Service (Port 3008)
start_service "admin-service"
sleep 1

# =============================================
# تشغيل الخادم الرئيسي
# =============================================
echo ""
echo "================================="
echo "🌐 Starting Main Application..."
echo "================================="

cd "$PROJECT_ROOT"
nohup bun run dev > "$LOGS_DIR/main-app.log" 2>&1 &
MAIN_PID=$!

echo "✅ Main application started (PID: $MAIN_PID)"
echo "   Log file: $LOGS_DIR/main-app.log"

# =============================================
# انتظار تشغيل الخدمات
# =============================================
echo ""
echo "================================="
echo "⏳ Waiting for services to start..."
echo "================================="

sleep 5

# =============================================
# فحص صحة الخدمات
# =============================================
echo ""
echo "================================="
echo "🏥 Health Check..."
echo "================================="
echo ""

check_health() {
    local service_name=$1
    local port=$2
    
    local response=$(curl -s "http://localhost:$port/health" 2>/dev/null || echo '{"status":"error"}')
    
    if echo "$response" | grep -q '"status":"healthy"'; then
        echo "✅ $service_name (port $port): healthy"
    else
        echo "❌ $service_name (port $port): not responding"
    fi
}

check_health "quran-service" 3001
check_health "audio-service" 3002
check_health "search-service" 3003
check_health "tafsir-service" 3004
check_health "users-service" 3005
check_health "reciter-service" 3006
check_health "ai-service" 3007
check_health "admin-service" 3008

# =============================================
# ملخص
# =============================================
echo ""
echo "================================="
echo "✨ Setup Complete!"
echo "================================="
echo ""
echo "📊 Services Status:"
echo "   - Main App:      http://localhost:3000"
echo "   - Quran Service: http://localhost:3001"
echo "   - Audio Service: http://localhost:3002"
echo "   - Search Service: http://localhost:3003"
echo "   - Tafsir Service: http://localhost:3004"
echo "   - Users Service: http://localhost:3005"
echo "   - Reciter Service: http://localhost:3006"
echo "   - AI Service: http://localhost:3007"
echo "   - Admin Service: http://localhost:3008"
echo ""
echo "📁 Log Files Location: $LOGS_DIR"
echo ""
echo "🛑 To stop all services, run: ./stop_all.sh"
echo ""
