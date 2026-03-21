<p align="center">
  <img src="https://img.shields.io/badge/DEXFORGE-APK%20Decompiler-00ff41?style=for-the-badge&logo=android&logoColor=white" alt="DEXFORGE"/>
</p>

<h1 align="center">
  <br>
  <img src="https://raw.githubusercontent.com/dryfryce/dexforge/main/.github/banner.svg" alt="DEXFORGE" width="600">
  <br>
</h1>

<p align="center">
  <b>APK Decompilation & Reverse Engineering Toolkit Platform</b>
</p>

<p align="center">
  <a href="#features"><img src="https://img.shields.io/badge/Tools-40+-00ff41?style=flat-square" alt="Tools"/></a>
  <a href="#play-store-integration"><img src="https://img.shields.io/badge/Play%20Store-Direct%20Download-00d4ff?style=flat-square&logo=googleplay&logoColor=white" alt="Play Store"/></a>
  <a href="https://github.com/dryfryce/dexforge/releases"><img src="https://img.shields.io/badge/IDA%20Pro-9.3-ff3e3e?style=flat-square" alt="IDA Pro"/></a>
  <a href="#"><img src="https://img.shields.io/badge/Ghidra-12.0.4-ffb700?style=flat-square" alt="Ghidra"/></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License"/></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#tools">Tools</a> •
  <a href="#play-store-integration">Play Store</a> •
  <a href="#api">API</a> •
  <a href="#screenshots">Screenshots</a>
</p>

---

## What is DEXFORGE?

**DEXFORGE** is a self-hosted web platform for Android APK decompilation and reverse engineering. Upload an APK (or pull directly from Play Store), and get a complete analysis package — decompiled Java source, smali code, native libraries, signing certificates, and your choice of 40+ bundled RE tools — all in one downloadable archive.

```
┌─────────────────────────────────────────────────────────┐
│                     DEXFORGE                             │
│                                                         │
│   APK/APKS Upload ─┐                                   │
│                     ├──▶ APKEditor Merge (splits)       │
│   Play Store Pull ──┘    │                              │
│                          ├──▶ JADX (Java + Resources)   │
│                          ├──▶ Apktool (Smali + XML)     │
│                          ├──▶ Native Lib Extraction     │
│                          ├──▶ Signature Analysis        │
│                          ├──▶ Tool Bundling (40+ tools) │
│                          │                              │
│                          ▼                              │
│                   📦 output.zip                         │
│                   ├── app_java/                          │
│                   ├── app_smali/                         │
│                   ├── libs/                              │
│                   ├── Tools/                             │
│                   ├── frida_scripts/                     │
│                   ├── Analyzed_docs/                     │
│                   └── signature_info.txt                 │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js** 18+ 
- **Java** 17+ (for JADX, Apktool, APKEditor)
- **Python** 3.10+ (for Play Store integration & sigtool)

### Installation

```bash
# Clone the repo
git clone https://github.com/dryfryce/dexforge.git
cd dexforge

# Install dependencies
npm install

# Install Python dependencies (for Play Store & sigtool)
pip install playstoreapi sigtool

# Start the server
node server.js
```

Server starts at `http://localhost:4000`

### Docker (Coming Soon)

```bash
docker run -p 4000:4000 dryfryce/dexforge
```

## Features

### 🔬 Decompilation Engine

| Feature | Details |
|---|---|
| **JADX** | Full Java source + resources decompilation with max thread parallelism |
| **Apktool** | Smali disassembly, resource decoding, AndroidManifest extraction |
| **Parallel Processing** | JADX + Apktool run simultaneously via `Promise.all` |
| **APKS/Split APK Support** | Auto-merges split APKs using APKEditor before decompilation |
| **Native Library Extraction** | Recursively extracts all `.so` files from APK and split APKs |

### 🔐 Signature Analysis

- **SigTool** integration — SHA-1, SHA-256, MD5, SHA-384, SHA-512, CRC32, hashCode
- **Base64 encoded** certificate hashes
- **keytool** certificate details (issuer, validity, algorithm)
- **DEXFORGE formatted** clean report in every output
- For APKS: extracts signature from **original base.apk** (not the merged APK)

### 🏪 Play Store Integration

```
Package Name: com.whatsapp
Version Code: 261101209 (optional — for specific versions)
         ↓
   [Fetch from Play Store]
         ↓
   Base APK + Split APKs downloaded
         ↓
   Bundled into .apks → APKEditor merge → Full decompilation
```

- **Anonymous download** — no Google account needed
- **Version targeting** — specify exact `versionCode` to download older versions
- **Split APK support** — automatically downloads and merges all splits (arm64, xxhdpi, etc.)

### 🛠 40+ RE Tools

Select which tools to bundle in your output archive:

<table>
<tr>
<td>

**Decompilers**
- JADX 1.5.5
- Apktool 3.0.1
- APKEditor 1.4.7
- dex2jar 2.4

</td>
<td>

**Disassemblers**
- Ghidra 12.0.4
- IDA Pro 9.3
- radare2 6.1.0
- Cutter 2.4.1

</td>
<td>

**Analysis**
- FLARE-FLOSS 3.1.1
- CAPA 9.3.1
- Detect It Easy 3.10
- YARA 4.5.5
- Sigmatcher 1.8.1

</td>
</tr>
<tr>
<td>

**Binary Frameworks**
- LIEF 0.17.6
- Keystone 0.9.2
- Capstone 6.0.0
- Unicorn 2.1.4
- Triton

</td>
<td>

**Dynamic Analysis**
- DynamoRIO 11.91
- Objection / Frida
- mitmproxy 12.2.1
- drozer

</td>
<td>

**Forensics & More**
- Volatility3 2.27.0
- CAPEv2
- Binwalk 3.1.0
- ExifTool 13.53
- pwndbg / GEF

</td>
</tr>
</table>

### 📋 Tool Presets

| Preset | Tools Included |
|---|---|
| **⚡ Recommended** | Ghidra, IDA Pro, JADX, Apktool, SigTool, uber-apk-signer, radare2, Objection |
| **🔥 All Tools** | All 40 tools |
| **🛠 Custom** | Pick individually |
| **✕ None** | No tools bundled |

### 💾 Persistent Jobs

Every analysis gets a unique URL:
```
http://your-server:4000/job/a1b2c3d4e5f6
```
- Close your browser — come back later
- Job in progress → reconnects to live progress
- Job complete → shows full results + download
- Jobs persist for 24 hours

### 📱 Mobile Responsive

Full mobile support — upload, configure tools, and download results from your phone.

### ✏️ Custom Naming

Rename the output before starting analysis:
```
slice_UPI_credit_card__bank_18.12.0  →  slice
```
Output becomes `slice_decompiled.zip` with clean folder names.

## Output Structure

```
app_decompiled.zip
├── app_java/              # JADX decompiled Java source + resources
│   ├── sources/
│   └── resources/
├── app_smali/             # Apktool smali + decoded resources
│   ├── smali/
│   ├── smali_classes2/
│   ├── res/
│   └── AndroidManifest.xml
├── libs/                  # Extracted native libraries
│   └── lib/
│       └── arm64-v8a/
│           ├── libapp.so
│           └── ...
├── Tools/                 # Selected RE tools
│   ├── ghidra_12.0.4_PUBLIC/
│   ├── ida/
│   ├── jadx/
│   └── ...
├── frida_scripts/         # Empty workspace for Frida scripts
├── Analyzed_docs/         # Empty workspace for analysis notes
├── app.apk                # Original/merged APK
├── app.apks               # Original APKS bundle (if applicable)
├── app_signature_info.txt # DEXFORGE signature report
└── app_signature_info.json # Raw sigtool JSON data
```

## API

### Search Play Store
```
GET /api/playstore/search?q=com.whatsapp
```

### Download from Play Store
```json
POST /api/playstore/download
{
  "packageName": "com.whatsapp",
  "versionCode": 261101209,
  "tools": ["ghidra", "ida-pro", "jadx"],
  "customName": "whatsapp"
}
```

### Upload APK
```
POST /api/upload
Content-Type: multipart/form-data

file: <apk/apks file>
tools: ["ghidra", "jadx", "apktool"]
customName: "my-app"
```

### Get Tool Registry
```
GET /api/tools
```

### Job Status
```
GET /api/job/:jobId
```

### SSE Progress Stream
```
GET /api/progress/:jobId
```

## Tech Stack

| Component | Technology |
|---|---|
| **Backend** | Node.js + Express |
| **Frontend** | Vanilla HTML/CSS/JS |
| **Decompilation** | JADX, Apktool, APKEditor |
| **Signatures** | SigTool, keytool |
| **Play Store** | playstoreapi (Python) |
| **Process Management** | PM2 |
| **Design** | Dark cyberpunk theme (Orbitron + JetBrains Mono + Space Grotesk) |

## Self-Hosting

### PM2 (Recommended)

```bash
cd dexforge
pm2 start server.js --name dexforge
pm2 save
pm2 startup
```

### RE Tools Setup

Download the full RE toolkit from [Releases](https://github.com/dryfryce/dexforge/releases/tag/v1.0):

```bash
# Download and extract tools
cd /opt
wget https://github.com/dryfryce/dexforge/releases/download/v1.0/ghidra-12.0.4.tar.gz
wget https://github.com/dryfryce/dexforge/releases/download/v1.0/ida-pro-9.3-linux-patched.tar.gz
wget https://github.com/dryfryce/dexforge/releases/download/v1.0/radare2-6.1.0.tar.gz
# ... extract each
```

Update tool paths in `server.js` `TOOL_REGISTRY` to match your installation.

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>DEXFORGE</b> — Built for reverse engineers, by reverse engineers.
  <br><br>
  <a href="https://github.com/dryfryce/dexforge/issues">Report Bug</a> •
  <a href="https://github.com/dryfryce/dexforge/issues">Request Feature</a>
</p>
