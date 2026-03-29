#!/bin/bash
# ============================================================
# DexForge — 1-Click Install Script
# Usage: bash install.sh
# Tested on: Ubuntu 22.04 / 24.04
# ============================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[*]${NC} $1"; }
ok()      { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
err()     { echo -e "${RED}[✗]${NC} $1"; exit 1; }

INSTALL_DIR="/root/dexforge"
PORT=4000

echo ""
echo "  ██████╗ ███████╗██╗  ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗"
echo "  ██╔══██╗██╔════╝╚██╗██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝"
echo "  ██║  ██║█████╗   ╚███╔╝ █████╗  ██║   ██║██████╔╝██║  ███╗█████╗  "
echo "  ██║  ██║██╔══╝   ██╔██╗ ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  "
echo "  ██████╔╝███████╗██╔╝ ██╗██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗"
echo "  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝"
echo ""
echo "  APK Decompilation & Reverse Engineering Platform"
echo "  ─────────────────────────────────────────────────"
echo ""

# ── 1. System deps ──────────────────────────────────────────
info "Checking system dependencies..."

apt-get update -qq

# Java
if ! command -v java &>/dev/null; then
    info "Installing Java 17..."
    apt-get install -y -qq openjdk-17-jdk 2>/dev/null || apt-get install -y -qq default-jdk
    ok "Java installed: $(java -version 2>&1 | head -1)"
else
    ok "Java: $(java -version 2>&1 | head -1)"
fi

# Node.js
if ! command -v node &>/dev/null || [[ $(node -e "process.exit(parseInt(process.version.slice(1)) >= 18 ? 0 : 1)" 2>/dev/null; echo $?) != "0" ]]; then
    info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -qq
    apt-get install -y -qq nodejs
    ok "Node.js: $(node --version)"
else
    ok "Node.js: $(node --version)"
fi

# Python3 + pip
if ! command -v python3 &>/dev/null; then
    apt-get install -y -qq python3 python3-pip
fi
ok "Python: $(python3 --version)"

# zipalign, apksigner
if ! command -v zipalign &>/dev/null; then
    info "Installing Android build tools (zipalign, apksigner)..."
    apt-get install -y -qq zipalign apksigner 2>/dev/null || warn "zipalign/apksigner not available in apt — APK signing will be skipped"
fi

# ── 2. Clone / update ───────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
    info "Updating existing DexForge..."
    cd "$INSTALL_DIR"
    # Backup re-tools and tools before pull
    [ -d re-tools ] && mv re-tools /tmp/dexforge_re_tools_bak
    [ -d tools ] && cp -r tools /tmp/dexforge_tools_bak
    git pull --ff-only 2>/dev/null || warn "git pull failed — continuing with existing code"
    [ -d /tmp/dexforge_re_tools_bak ] && mv /tmp/dexforge_re_tools_bak re-tools
    [ -d /tmp/dexforge_tools_bak ] && cp -r /tmp/dexforge_tools_bak/. tools/ 2>/dev/null; rm -rf /tmp/dexforge_tools_bak
else
    info "Cloning DexForge..."
    git clone https://github.com/dryfryce/dexforge.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

ok "DexForge source ready at $INSTALL_DIR"

# ── 3. npm install ──────────────────────────────────────────
info "Installing Node.js dependencies..."
npm install --silent
ok "Node modules installed"

# ── 4. Python deps ──────────────────────────────────────────
info "Installing Python dependencies..."
pip install playstoreapi sigtool google-play-scraper --break-system-packages -q 2>/dev/null || \
pip install playstoreapi sigtool google-play-scraper -q
ok "Python deps installed"

# ── 5. Fix Git LFS tool stubs ───────────────────────────────
info "Checking tools..."

TOOLS_DIR="$INSTALL_DIR/tools"

# APKEditor
if [ ! -f "$TOOLS_DIR/APKEditor.jar" ] || [ $(stat -c%s "$TOOLS_DIR/APKEditor.jar") -lt 1000000 ]; then
    info "Downloading APKEditor..."
    wget -q -O "$TOOLS_DIR/APKEditor.jar" \
        "https://github.com/REAndroid/APKEditor/releases/latest/download/APKEditor.jar" || \
    warn "APKEditor download failed — merge may not work"
fi
[ -f "$TOOLS_DIR/APKEditor.jar" ] && ok "APKEditor: $(stat -c%s "$TOOLS_DIR/APKEditor.jar") bytes"

# Apktool
if [ ! -f "$TOOLS_DIR/apktool.jar" ] || [ $(stat -c%s "$TOOLS_DIR/apktool.jar") -lt 1000000 ]; then
    info "Downloading Apktool..."
    APKTOOL_VER=$(curl -s https://api.github.com/repos/iBotPeaches/Apktool/releases/latest | grep tag_name | cut -d'"' -f4)
    wget -q -O "$TOOLS_DIR/apktool.jar" \
        "https://github.com/iBotPeaches/Apktool/releases/download/${APKTOOL_VER}/apktool_${APKTOOL_VER#v}.jar" || \
    warn "Apktool download failed"
fi
[ -f "$TOOLS_DIR/apktool.jar" ] && ok "Apktool: $(stat -c%s "$TOOLS_DIR/apktool.jar") bytes"

# JADX
JADX_JAR="$TOOLS_DIR/jadx/lib/jadx-1.5.5-all.jar"
if [ ! -f "$JADX_JAR" ] || [ $(stat -c%s "$JADX_JAR") -lt 1000000 ]; then
    info "Downloading JADX..."
    mkdir -p "$TOOLS_DIR/jadx/lib" "$TOOLS_DIR/jadx/bin"
    wget -q -O /tmp/jadx.zip \
        "https://github.com/skylot/jadx/releases/download/v1.5.1/jadx-1.5.1.zip" && \
    unzip -q /tmp/jadx.zip -d /tmp/jadx_unzip && \
    cp /tmp/jadx_unzip/lib/jadx-*.jar "$JADX_JAR" && \
    cp /tmp/jadx_unzip/bin/jadx "$TOOLS_DIR/jadx/bin/jadx" && \
    chmod +x "$TOOLS_DIR/jadx/bin/jadx" && \
    rm -rf /tmp/jadx.zip /tmp/jadx_unzip || warn "JADX download failed"
fi
[ -f "$JADX_JAR" ] && ok "JADX: $(stat -c%s "$JADX_JAR") bytes"

# ── 6. Systemd service ──────────────────────────────────────
info "Installing systemd service..."

NODE_BIN=$(which node)
cat > /etc/systemd/system/dexforge.service << EOF
[Unit]
Description=DexForge APK Decompiler
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$PORT

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable dexforge --quiet
systemctl restart dexforge
sleep 3

if systemctl is-active --quiet dexforge; then
    ok "DexForge service started"
else
    warn "Service failed to start — check: journalctl -u dexforge -n 20"
fi

# ── 7. Done ─────────────────────────────────────────────────
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
echo "  ════════════════════════════════════════════"
echo -e "  ${GREEN}DexForge is live!${NC}"
echo "  ════════════════════════════════════════════"
echo ""
echo -e "  🌐 URL:     ${CYAN}http://$SERVER_IP:$PORT${NC}"
echo -e "  📁 Install: ${CYAN}$INSTALL_DIR${NC}"
echo -e "  🔧 Service: systemctl status dexforge"
echo -e "  📋 Logs:    journalctl -u dexforge -f"
echo ""
echo "  Commands:"
echo "    systemctl stop dexforge"
echo "    systemctl restart dexforge"
echo ""
