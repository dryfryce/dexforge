FROM ubuntu:24.04

LABEL maintainer="dryfryce" \
      description="DexForge — APK Decompilation & Reverse Engineering Platform" \
      version="1.0"

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PORT=4000

# ── System deps ───────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    python3 python3-pip \
    wget curl git unzip \
    zipalign apksigner \
    ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 20 ────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Python deps ───────────────────────────────────────────────
RUN pip install playstoreapi sigtool google-play-scraper --break-system-packages

# ── App ───────────────────────────────────────────────────────
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# ── Download tools (not in LFS) ───────────────────────────────
RUN mkdir -p tools/jadx/lib tools/jadx/bin \
    && APKEDITOR_URL=$(curl -s "https://api.github.com/repos/REAndroid/APKEditor/releases/latest" \
        | grep browser_download_url | grep -o 'https://[^"]*\.jar' | head -1) \
    && wget -q -O tools/APKEditor.jar "$APKEDITOR_URL" \
    && APKTOOL_VER=$(curl -s https://api.github.com/repos/iBotPeaches/Apktool/releases/latest | grep tag_name | cut -d'"' -f4) \
    && wget -q -O tools/apktool.jar "https://github.com/iBotPeaches/Apktool/releases/download/${APKTOOL_VER}/apktool_${APKTOOL_VER#v}.jar" \
    && wget -q -O /tmp/jadx.zip "https://github.com/skylot/jadx/releases/download/v1.5.1/jadx-1.5.1.zip" \
    && unzip -q /tmp/jadx.zip -d /tmp/jadx_unzip \
    && cp /tmp/jadx_unzip/lib/jadx-*.jar tools/jadx/lib/ \
    && cp /tmp/jadx_unzip/bin/jadx tools/jadx/bin/jadx \
    && chmod +x tools/jadx/bin/jadx \
    && rm -rf /tmp/jadx.zip /tmp/jadx_unzip

# ── Dirs ──────────────────────────────────────────────────────
RUN mkdir -p uploads output jobs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:4000/ || exit 1

CMD ["node", "server.js"]
