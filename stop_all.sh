#!/bin/bash

# =============================================
# Quran Enterprise Platform - Stop All Services
# =============================================
# هذا السكربت يقوم بإيقاف جميع الخدمات
# =============================================

echo "================================="
echo "🛑 Stopping All Services..."
echo "================================="
echo ""

# إيقاف العمليات التي تعمل على منافذ الخدمات
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008)

for port in "${PORTS[@]}"; do
    # البحث عن العملية التي تستخدم المنفذ
    pid=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$pid" ]; then
        echo "⏹️ Stopping service on port $port (PID: $pid)..."
        kill $pid 2>/dev/null || true
    else
        echo "⏭️ No service running on port $port"
    fi
done

echo ""
echo "================================="
echo "✅ All services stopped!"
echo "================================="
