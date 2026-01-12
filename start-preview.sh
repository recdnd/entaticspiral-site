#!/bin/bash

# 啟動本地預覽服務器
echo "🚀 啟動 Entatic Spiral 預覽服務器..."
echo ""
echo "📍 訪問地址："
echo "   首頁預覽: http://localhost:8000/preview.html"
echo "   詞條預覽: http://localhost:8000/preview-term.html"
echo ""
echo "按 Ctrl+C 停止服務器"
echo ""

# 檢查 Python 版本並啟動服務器
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo "❌ 錯誤：未找到 Python，請安裝 Python 3"
    exit 1
fi

