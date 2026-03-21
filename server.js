const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const archiver = require('archiver');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4000;

// Tool Registry — available RE tools to bundle in output
const RE_TOOLS = '/root/.openclaw/workspace/re-tools';
const TOOL_REGISTRY = {
  // Decompilers & APK tools
  'jadx':             { name: 'JADX',              desc: 'Java decompiler',                     path: path.join(__dirname, 'tools/jadx'),                         size: '133 MB', category: 'decompiler' },
  'apktool':          { name: 'Apktool',           desc: 'Smali decompiler & resource decoder',  path: path.join(__dirname, 'tools/apktool.jar'),                  size: '18 MB',  category: 'decompiler' },
  'apkeditor':        { name: 'APKEditor',         desc: 'APK merge/split/protect tool',         path: path.join(__dirname, 'tools/APKEditor.jar'),                size: '8 MB',   category: 'decompiler' },
  'dex2jar':          { name: 'dex2jar',           desc: 'DEX to JAR converter',                 path: RE_TOOLS + '/dex-tools-v2.4',                               size: '19 MB',  category: 'decompiler' },
  // Signing & Signature
  'sigtool':          { name: 'SigTool',           desc: 'APK signature & certificate analyzer', path: RE_TOOLS + '/sigtool',                                      size: '1 MB',   category: 'signing' },
  'uber-apk-signer':  { name: 'uber-apk-signer',  desc: 'APK signing tool',                     path: RE_TOOLS + '/uber-apk-signer-1.3.0.jar',                   size: '3 MB',   category: 'signing' },
  // Disassemblers & RE suites
  'ghidra':           { name: 'Ghidra',            desc: 'NSA reverse engineering suite',        path: RE_TOOLS + '/ghidra_12.0.4_PUBLIC',                         size: '487 MB', category: 'disassembler', large: true },
  'ida-pro':          { name: 'IDA Pro Linux',     desc: 'Interactive disassembler',             path: '/opt/ida',                                                  size: '425 MB', category: 'disassembler', large: true },
  'ida-windows':      { name: 'IDA Pro Windows',   desc: 'IDA installer for Windows',           path: RE_TOOLS + '/ida_windows.exe',                               size: '506 MB', category: 'disassembler', large: true },
  'ida-keygen':       { name: 'IDA Keygen',        desc: 'IDA license key generator',           path: RE_TOOLS + '/ida_keygen.py',                                 size: '5 KB',   category: 'disassembler' },
  'radare2':          { name: 'radare2',           desc: 'RE framework & disassembler',         path: RE_TOOLS + '/radare2-6.1.0',                                 size: '62 MB',  category: 'disassembler' },
  'cutter':           { name: 'Cutter',            desc: 'GUI for radare2/rizin',               path: RE_TOOLS + '/Cutter-v2.4.1-Linux-x86_64.AppImage',           size: '152 MB', category: 'disassembler', large: true },
  // Static analysis
  'floss':            { name: 'FLARE-FLOSS',       desc: 'Obfuscated string solver',            path: RE_TOOLS + '/floss',                                         size: '39 MB',  category: 'analysis' },
  'capa':             { name: 'CAPA',              desc: 'Binary capability detector',          path: RE_TOOLS + '/capa',                                          size: '43 MB',  category: 'analysis' },
  'die':              { name: 'Detect It Easy',    desc: 'File type & packer detector',         path: RE_TOOLS + '/Detect_It_Easy-3.10-x86_64.AppImage',           size: '27 MB',  category: 'analysis' },
  'yara':             { name: 'YARA',              desc: 'Pattern matching for malware',        path: RE_TOOLS + '/yara-4.5.5',                                    size: '5 MB',   category: 'analysis' },
  'ssdeep':           { name: 'ssdeep',            desc: 'Fuzzy hashing tool',                  path: RE_TOOLS + '/ssdeep-2.14.1',                                 size: '2 MB',   category: 'analysis' },
  'exiftool':         { name: 'ExifTool',          desc: 'Metadata reader/writer',              path: RE_TOOLS + '/exiftool-13.53',                                size: '8 MB',   category: 'analysis' },
  'oletools':         { name: 'oletools',          desc: 'MS Office malware analysis',          path: RE_TOOLS + '/oletools-0.60.2',                               size: '4 MB',   category: 'analysis' },
  'binwalk':          { name: 'Binwalk',           desc: 'Firmware analysis & extraction',      path: RE_TOOLS + '/binwalk-3.1.0',                                 size: '3 MB',   category: 'analysis' },
  // Binary frameworks
  'lief':             { name: 'LIEF',              desc: 'Binary parsing library',              path: RE_TOOLS + '/LIEF-0.17.6-Linux-x86_64',                      size: '30 MB',  category: 'binary' },
  'keystone':         { name: 'Keystone',          desc: 'Assembler framework',                 path: RE_TOOLS + '/keystone-0.9.2',                                size: '2 MB',   category: 'binary' },
  'capstone':         { name: 'Capstone',          desc: 'Disassembly framework (.deb)',        path: RE_TOOLS + '/libcapstone-dev_6.0.0-Alpha7_amd64.deb',        size: '7 MB',   category: 'binary' },
  'unicorn':          { name: 'Unicorn',           desc: 'CPU emulator framework',              path: RE_TOOLS + '/unicorn-2.1.4-x64.7z',                          size: '24 MB',  category: 'binary' },
  'iced':             { name: 'Iced',              desc: 'x86/x64 disassembler (Rust)',         path: RE_TOOLS + '/iced-1.21.0',                                   size: '8 MB',   category: 'binary' },
  'triton':           { name: 'Triton',            desc: 'Dynamic binary analysis framework',   path: RE_TOOLS + '/Triton',                                        size: '25 MB',  category: 'binary' },
  // Fuzzing
  'aflplusplus':      { name: 'AFL++',             desc: 'Coverage-guided fuzzer',              path: RE_TOOLS + '/AFLplusplus-4.40c',                              size: '15 MB',  category: 'fuzzing' },
  'libafl':           { name: 'LibAFL',            desc: 'Fuzzing library (Rust)',              path: RE_TOOLS + '/LibAFL-0.15.4',                                  size: '20 MB',  category: 'fuzzing' },
  // Dynamic & instrumentation
  'dynamorio':        { name: 'DynamoRIO',         desc: 'Dynamic instrumentation tool',       path: RE_TOOLS + '/DynamoRIO-Linux-11.91.20531',                    size: '162 MB', category: 'dynamic', large: true },
  'objection':        { name: 'Objection',         desc: 'Runtime mobile exploration (Frida)',  path: null, size: 'pip',                                            category: 'dynamic', pip: true },
  'mitmproxy':        { name: 'mitmproxy',         desc: 'HTTPS proxy for traffic interception', path: RE_TOOLS + '/mitmproxy-12.2.1',                             size: '100 MB', category: 'dynamic' },
  'drozer':           { name: 'drozer',            desc: 'Android security testing framework',  path: RE_TOOLS + '/drozer',                                        size: '4 MB',   category: 'dynamic' },
  // Mobile-specific
  'mobsf':            { name: 'MobSF',             desc: 'Mobile Security Framework',          path: RE_TOOLS + '/Mobile-Security-Framework-MobSF-4.4.5',          size: '100 MB', category: 'mobile', large: true },
  'class-dump':       { name: 'class-dump',        desc: 'Objective-C class dumper (iOS)',      path: RE_TOOLS + '/class-dump-3.4',                                size: '2 MB',   category: 'mobile' },
  'bfdecrypt':        { name: 'bfdecrypt',         desc: 'iOS app decryptor',                  path: RE_TOOLS + '/bfdecrypt',                                      size: '1 MB',   category: 'mobile' },
  // Forensics & sandbox
  'volatility3':      { name: 'Volatility3',       desc: 'Memory forensics framework',         path: RE_TOOLS + '/volatility3-2.27.0.whl',                        size: '3 MB',   category: 'forensics' },
  'capev2':           { name: 'CAPEv2',            desc: 'Malware sandbox',                    path: RE_TOOLS + '/CAPEv2',                                        size: '95 MB',  category: 'forensics', large: true },
  // Debugger plugins
  'pwndbg':           { name: 'pwndbg',            desc: 'GDB plugin for exploit dev (.deb)',  path: RE_TOOLS + '/pwndbg_2026.02.18_amd64.deb',                   size: '29 MB',  category: 'debugger' },
  'gef':              { name: 'GEF',               desc: 'GDB Enhanced Features',              path: RE_TOOLS + '/gef-2026.01',                                    size: '2 MB',   category: 'debugger' },
  'sigmatcher':       { name: 'Sigmatcher',        desc: 'Cross-version class/method matcher', path: null, size: 'pip',                                                    category: 'analysis', pip: true },
};

const RECOMMENDED_TOOLS = ['ghidra', 'ida-pro', 'jadx', 'apktool', 'sigtool', 'uber-apk-signer', 'radare2', 'objection'];

const TOOLS_DIR = path.join(__dirname, 'tools');
const JADX_BIN = path.join(TOOLS_DIR, 'jadx', 'bin', 'jadx');
const APKTOOL_JAR = path.join(TOOLS_DIR, 'apktool.jar');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'output');

[UPLOADS_DIR, OUTPUT_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, uuidv4().slice(0, 8) + '_' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/output', express.static(OUTPUT_DIR));

// Job state persistence
const JOB_STATE_DIR = path.join(__dirname, 'jobs');
fs.mkdirSync(JOB_STATE_DIR, { recursive: true });

function saveJobState(jobId, state) {
  const fp = path.join(JOB_STATE_DIR, jobId + '.json');
  fs.writeFileSync(fp, JSON.stringify(state));
}

function getJobState(jobId) {
  const fp = path.join(JOB_STATE_DIR, jobId + '.json');
  if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
  return null;
}

// SSE
const sseClients = new Map();
function sendSSE(jobId, data) {
  const clients = sseClients.get(jobId) || [];
  const msg = 'data: ' + JSON.stringify(data) + '\n\n';
  clients.forEach(res => { try { res.write(msg); } catch(e) {} });
  // Persist job state
  try {
    const existing = getJobState(jobId) || {};
    if (data.type === 'progress') {
      existing.step = data.step;
      existing.percent = data.percent;
      existing.status = 'processing';
      saveJobState(jobId, existing);
    } else if (data.type === 'complete') {
      existing.status = 'complete';
      existing.percent = 100;
      existing.step = 'Complete';
      existing.downloadUrl = data.downloadUrl;
      existing.zipSize = data.zipSize;
      existing.soCount = data.soCount;
      existing.completedAt = new Date().toISOString();
      saveJobState(jobId, existing);
    } else if (data.type === 'error') {
      existing.status = 'error';
      existing.error = data.message;
      saveJobState(jobId, existing);
    } else if (data.type === 'certInfo') {
      existing.certInfo = data;
      saveJobState(jobId, existing);
    } else if (data.type === 'fileOverview') {
      existing.fileOverview = data.overview;
      saveJobState(jobId, existing);
    }
  } catch(e) {}
}

app.get('/api/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  res.write('\n');
  if (!sseClients.has(jobId)) sseClients.set(jobId, []);
  sseClients.get(jobId).push(res);
  req.on('close', () => {
    const c = sseClients.get(jobId) || [];
    sseClients.set(jobId, c.filter(x => x !== res));
  });
});

// Job page — serves the same UI but with jobId embedded
app.get('/job/:jobId', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

// Job state API
app.get('/api/job/:jobId', (req, res) => {
  const state = getJobState(req.params.jobId);
  if (!state) return res.status(404).json({ ok: false, error: 'Job not found' });
  res.json({ ok: true, ...state });
});

// Tool registry API
app.get('/api/tools', (req, res) => {
  const tools = {};
  for (const [id, t] of Object.entries(TOOL_REGISTRY)) {
    tools[id] = { name: t.name, desc: t.desc, size: t.size, category: t.category, large: !!t.large, available: t.pip || (t.path && fs.existsSync(t.path)) };
  }
  res.json({ tools, recommended: RECOMMENDED_TOOLS });
});

// Play Store search
app.get('/api/playstore/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ ok: false, error: 'Missing query parameter ?q=' });
  try {
    const result = execSync(`python3 "${path.join(__dirname, 'playstore.py')}" search "${query.replace(/"/g, '')}" 2>/dev/null`, { timeout: 30000, maxBuffer: 10*1024*1024 });
    res.json(JSON.parse(result.toString()));
  } catch(e) {
    res.json({ ok: false, error: 'Search failed' });
  }
});

// Play Store download + process
app.post('/api/playstore/download', express.json(), async (req, res) => {
  const { packageName, tools, versionCode, customName } = req.body;
  if (!packageName) return res.status(400).json({ ok: false, error: 'Missing packageName' });
  const jobId = uuidv4().slice(0, 12);
  const jobDir = path.join(OUTPUT_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  saveJobState(jobId, { status: 'processing', filename: packageName, startedAt: new Date().toISOString(), percent: 0, step: 'Downloading from Play Store...' });
  res.json({ jobId, packageName });

  setTimeout(async () => {
    try {
      sendSSE(jobId, { type: 'progress', step: 'Downloading from Play Store...', percent: 2 });
      const vcArg = versionCode ? ` ${parseInt(versionCode)}` : '';
      const { stdout: dlResult } = await execAsync(`python3 "${path.join(__dirname, 'playstore.py')}" download "${packageName.replace(/"/g, '')}" "${UPLOADS_DIR}"${vcArg}`, { timeout: 600000, maxBuffer: 10*1024*1024 });
      const dl = JSON.parse(dlResult);
      if (!dl.ok) {
        sendSSE(jobId, { type: 'error', message: 'Play Store download failed: ' + (dl.error || 'unknown') });
        return;
      }
      sendSSE(jobId, { type: 'progress', step: `Downloaded ${dl.title} v${dl.version} (${(dl.size / 1024 / 1024).toFixed(1)} MB)${dl.splits && dl.splits.length ? ' + ' + dl.splits.length + ' splits' : ''}`, percent: 8 });
      const safeName = customName ? customName.replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim() : '';
      const ext = dl.ext || path.extname(dl.filename).toLowerCase() || '.apk';
      const originalName = safeName ? safeName + ext : dl.filename;
      const selectedTools = tools || [];
      await processFile(jobId, dl.filepath, originalName, ext, jobDir, selectedTools);
    } catch(err) {
      console.error('PlayStore process error:', err.message || err);
      const errMsg = err.stderr ? err.stderr.toString().trim() : (err.message || 'Unknown error');
      sendSSE(jobId, { type: 'error', message: 'Play Store download failed: ' + errMsg.slice(0, 200) });
    }
  }, 1000);
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!['.apk', '.apks'].includes(ext)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Only .apk and .apks files supported' });
  }
  const jobId = uuidv4().slice(0, 12);
  const jobDir = path.join(OUTPUT_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  let selectedTools = [];
  try { if (req.body && req.body.tools) selectedTools = JSON.parse(req.body.tools); } catch(e) {}
  const customName = req.body && req.body.customName ? req.body.customName.replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim() : '';
  const displayName = customName || req.file.originalname;
  const outputName = (customName ? customName + path.extname(req.file.originalname) : req.file.originalname);
  saveJobState(jobId, { status: 'processing', filename: displayName, startedAt: new Date().toISOString(), percent: 0, step: 'Uploading...' });
  res.json({ jobId, filename: displayName });
  // Delay processing to give the client time to connect to SSE
  setTimeout(() => {
    processFile(jobId, req.file.path, outputName, ext, jobDir, selectedTools).catch(err => {
      console.error('Process error:', err);
      sendSSE(jobId, { type: 'error', message: String(err.message || err) });
    });
  }, 1000);
});

async function processFile(jobId, filePath, originalName, ext, jobDir, selectedTools = []) {
  const baseName = path.basename(originalName, ext);
  let apkPath = filePath;
  let apksPath = null;

  // 1. Handle APKS — merge split APKs into a single unified APK using APKEditor
  let sigApkPath = null; // The APK to use for signature extraction (base.apk for APKS)
  if (ext === '.apks') {
    sendSSE(jobId, { type: 'progress', step: 'Merging split APKs into single APK (APKEditor)...', percent: 5 });
    apksPath = filePath;

    // Extract base.apk for signature analysis (merged APK loses original signatures)
    const extractDir = path.join(jobDir, '_apks_tmp');
    fs.mkdirSync(extractDir, { recursive: true });
    try {
      await execAsync(`unzip -qo "${filePath}" -d "${extractDir}"`, { timeout: 60000 });
    } catch(e) {}
    const baseApk = findApk(extractDir);
    if (baseApk) sigApkPath = baseApk;

    // Merge split APKs into a single unified APK
    const mergedApkPath = path.join(jobDir, baseName + '_merged.apk');
    try {
      await execAsync(`java -jar "${path.join(__dirname, 'tools', 'APKEditor.jar')}" m -i "${filePath}" -o "${mergedApkPath}" -f 2>&1`, { timeout: 120000, maxBuffer: 50*1024*1024 });
    } catch(e) {
      sendSSE(jobId, { type: 'error', message: 'APKEditor merge failed: ' + (e.stderr ? e.stderr.toString() : e.message) });
      return;
    }
    if (!fs.existsSync(mergedApkPath)) {
      sendSSE(jobId, { type: 'error', message: 'Merged APK not created' });
      return;
    }
    apkPath = mergedApkPath;
    sendSSE(jobId, { type: 'progress', step: 'Split APKs merged successfully', percent: 10 });
  }

  // 2. File hashes
  sendSSE(jobId, { type: 'progress', step: 'Computing hashes...', percent: 15 });
  const fileData = fs.readFileSync(apkPath);
  const fileHashes = {
    md5: crypto.createHash('md5').update(fileData).digest('hex'),
    sha1: crypto.createHash('sha1').update(fileData).digest('hex'),
    sha256: crypto.createHash('sha256').update(fileData).digest('hex'),
    size: fileData.length
  };
  let apksHashes = null;
  if (apksPath) {
    const ad = fs.readFileSync(apksPath);
    apksHashes = {
      md5: crypto.createHash('md5').update(ad).digest('hex'),
      sha1: crypto.createHash('sha1').update(ad).digest('hex'),
      sha256: crypto.createHash('sha256').update(ad).digest('hex'),
      size: ad.length
    };
  }

  // 3. SigTool + keytool — use base.apk for APKS (merged APK loses original signatures)
  sendSSE(jobId, { type: 'progress', step: 'Extracting signature info...', percent: 20 });
  const sigInfo = await getSigInfo(sigApkPath || apkPath);

  // For APKS: also try sig info of the original .apks file
  let apksSigInfo = null;
  if (apksPath) {
    sendSSE(jobId, { type: 'progress', step: 'Extracting APKS bundle signature info...', percent: 22 });
    apksSigInfo = await getSigInfo(apksPath);
  }

  // Send cert data
  sendSSE(jobId, { type: 'certInfo', fileHashes, apksHashes, sigInfo, apksSigInfo, filename: originalName });

  // Write sig report files
  if (apksPath) {
    // Two separate files for APKS
    fs.writeFileSync(path.join(jobDir, baseName + '_extracted_apk_signature.txt'), sigInfo.report);
    fs.writeFileSync(path.join(jobDir, baseName + '_original_apks_signature.txt'), apksSigInfo.report);
    if (sigInfo.json) fs.writeFileSync(path.join(jobDir, baseName + '_extracted_apk_signature.json'), JSON.stringify(sigInfo.json, null, 2));
    if (apksSigInfo.json) fs.writeFileSync(path.join(jobDir, baseName + '_original_apks_signature.json'), JSON.stringify(apksSigInfo.json, null, 2));
  } else {
    fs.writeFileSync(path.join(jobDir, baseName + '_signature_info.txt'), sigInfo.report);
    if (sigInfo.json) fs.writeFileSync(path.join(jobDir, baseName + '_signature_info.json'), JSON.stringify(sigInfo.json, null, 2));
  }

  // 4+5. JADX + Apktool in parallel
  sendSSE(jobId, { type: 'progress', step: 'Decompiling with JADX + Apktool (parallel)...', percent: 30 });
  const javaDir = path.join(jobDir, baseName + '_java');
  const smaliDir = path.join(jobDir, baseName + '_smali');
  const cpuCount = require('os').cpus().length || 2;

  const jadxPromise = execAsync(`"${JADX_BIN}" -d "${javaDir}" -j ${cpuCount} "${apkPath}" 2>&1`, { timeout: 600000, maxBuffer: 50*1024*1024 })
    .then(() => sendSSE(jobId, { type: 'progress', step: 'JADX complete', percent: 50 }))
    .catch(() => sendSSE(jobId, { type: 'progress', step: 'JADX finished with errors', percent: 50 }));

  const apktoolPromise = execAsync(`java -jar "${APKTOOL_JAR}" d -f -j 0 -o "${smaliDir}" "${apkPath}" 2>&1`, { timeout: 600000, maxBuffer: 50*1024*1024 })
    .then(() => sendSSE(jobId, { type: 'progress', step: 'Apktool complete', percent: 65 }))
    .catch(() => sendSSE(jobId, { type: 'progress', step: 'Apktool finished with errors', percent: 65 }));

  await Promise.all([jadxPromise, apktoolPromise]);
  sendSSE(jobId, { type: 'progress', step: 'Decompilation complete', percent: 70 });

  // 6. Extract .so — from the (merged) APK which now contains all native libs
  sendSSE(jobId, { type: 'progress', step: 'Extracting native libs...', percent: 75 });
  const libsDir = path.join(jobDir, 'libs');
  fs.mkdirSync(libsDir, { recursive: true });
  try {
    const { stdout: soList } = await execAsync(`unzip -Z1 "${apkPath}" 2>/dev/null | grep "\\.so$" || true`, { timeout: 30000, maxBuffer: 10*1024*1024 });
    if (soList.trim()) {
      for (const so of soList.trim().split('\n').filter(Boolean)) {
        const dest = path.join(libsDir, path.dirname(so));
        fs.mkdirSync(dest, { recursive: true });
        try { await execAsync(`unzip -jo "${apkPath}" "${so}" -d "${dest}" 2>/dev/null`, { timeout: 15000 }); } catch(e) {}
      }
    }
  } catch(e) {}
  const soCount = countFiles(libsDir);
  sendSSE(jobId, { type: 'progress', step: 'Extracted ' + soCount + ' native libs', percent: 80 });

  // 7. Bundle selected tools (before overview so Tools/ shows in file tree)
  // (was 7.5, moved before overview)
  if (selectedTools.length > 0) {
    const toolsDir = path.join(jobDir, 'Tools');
    fs.mkdirSync(toolsDir, { recursive: true });
    let toolIdx = 0;
    for (const toolId of selectedTools) {
      const tool = TOOL_REGISTRY[toolId];
      if (!tool || !tool.path || tool.pip) continue;
      if (!fs.existsSync(tool.path)) continue;
      toolIdx++;
      const pct = 82 + Math.round((toolIdx / selectedTools.length) * 5);
      sendSSE(jobId, { type: 'progress', step: 'Bundling Tools/' + tool.name + '...', percent: pct });
      const dest = path.join(toolsDir, path.basename(tool.path));
      try {
        const stat = fs.statSync(tool.path);
        if (stat.isDirectory()) {
          await execAsync(`cp -r "${tool.path}" "${dest}"`, { timeout: 120000 });
        } else {
          fs.copyFileSync(tool.path, dest);
        }
      } catch(e) {
        console.error('Tool copy error (' + toolId + '):', e.message);
      }
    }
    sendSSE(jobId, { type: 'progress', step: 'Tools bundled: ' + toolIdx + ' tools', percent: 87 });
  }

  // 7.5. Create empty workspace folders
  fs.mkdirSync(path.join(jobDir, 'frida_scripts'), { recursive: true });
  fs.mkdirSync(path.join(jobDir, 'Analyzed_docs'), { recursive: true });
  // Add .gitkeep so they appear in the zip
  fs.writeFileSync(path.join(jobDir, 'frida_scripts', '.gitkeep'), '');
  fs.writeFileSync(path.join(jobDir, 'Analyzed_docs', '.gitkeep'), '');

  // 7.6. Copy originals + cleanup before overview
  sendSSE(jobId, { type: 'progress', step: 'Packaging...', percent: 88 });
  if (apksPath) {
    const cleanApkDest = path.join(jobDir, baseName + '.apk');
    if (apkPath !== cleanApkDest) {
      fs.copyFileSync(apkPath, cleanApkDest);
      if (apkPath.includes('_merged.apk') && fs.existsSync(apkPath)) fs.unlinkSync(apkPath);
    }
    fs.copyFileSync(apksPath, path.join(jobDir, originalName));
  } else {
    const dest = path.join(jobDir, baseName + '.apk');
    if (apkPath !== dest) fs.copyFileSync(apkPath, dest);
  }
  // Remove empty libs dir
  if (fs.existsSync(libsDir) && countFiles(libsDir) === 0) {
    fs.rmSync(libsDir, { recursive: true, force: true });
  }

  // 7.6. Output zip structure overview (after cleanup)
  sendSSE(jobId, { type: 'progress', step: 'Mapping output structure...', percent: 89 });
  const overview = getOutputOverview(jobDir);
  sendSSE(jobId, { type: 'fileOverview', overview });

  // 9. Zip
  sendSSE(jobId, { type: 'progress', step: 'Creating archive...', percent: 90 });
  const zipName = baseName + '_decompiled.zip';
  const zipPath = path.join(OUTPUT_DIR, jobId + '_' + zipName);
  await createZip(jobDir, zipPath);
  const zipSize = fs.statSync(zipPath).size;

  sendSSE(jobId, { type: 'complete', downloadUrl: '/output/' + jobId + '_' + zipName, zipSize, soCount, filename: originalName });

  // Cleanup
  fs.rmSync(jobDir, { recursive: true, force: true });
  try { fs.unlinkSync(filePath); } catch(e) {}
}

// Get signature info using sigtool JSON + keytool
async function getSigInfo(apkPath) {
  const strip = s => s.replace(/\x1b\[[0-9;]*m/g, '');
  let json = null;
  let report = '';

  // sigtool JSON
  const tmpJson = path.join(UPLOADS_DIR, 'sig_' + Date.now() + '.json');
  try {
    await execAsync(`sigtool "${apkPath}" -fuc -o "${tmpJson}" 2>/dev/null`, { timeout: 30000, maxBuffer: 10*1024*1024 });
    if (fs.existsSync(tmpJson)) {
      json = JSON.parse(fs.readFileSync(tmpJson, 'utf8'));
      fs.unlinkSync(tmpJson);
    }
  } catch(e) { try { fs.unlinkSync(tmpJson); } catch(_) {} }

  // keytool
  let keytool = '';
  try {
    const { stdout } = await execAsync(`unzip -p "${apkPath}" META-INF/*.RSA META-INF/*.DSA META-INF/*.EC 2>/dev/null | keytool -printcert 2>/dev/null || true`, { timeout: 15000, maxBuffer: 10*1024*1024 });
    keytool = stdout.trim();
  } catch(e) {}

  // Build flat data for frontend
  const flat = {};
  if (json) {
    if (json['Calculated Hashes']) Object.assign(flat, json['Calculated Hashes']);
    if (json['CRC32 and hashCode Results']) Object.assign(flat, json['CRC32 and hashCode Results']);
    if (json['Base64 Encoded Hashes']) flat.b64 = json['Base64 Encoded Hashes'];
    if (json['Certificate Bytes']) flat.certBytes = json['Certificate Bytes'];
    if (json['APK Information']) {
      if (json['APK Information']['App Name']) flat.appName = json['APK Information']['App Name'];
      if (json['APK Information']['Package Name']) flat.packageName = json['APK Information']['Package Name'];
      if (json['APK Information']['Version']) flat.version = json['APK Information']['Version'];
      if (json['APK Information']['Build']) flat.build = json['APK Information']['Build'];
    }
  }
  flat.keytool = keytool;

  // Build clean DEXFORGE report
  report = buildReport(flat, keytool);

  return { flat, report, json };
}

// Output zip structure: top-level folders + files in the job dir
function getOutputOverview(jobDir) {
  try {
    const items = [];
    const entries = fs.readdirSync(jobDir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(jobDir, entry.name);
      if (entry.name.startsWith('_')) continue; // skip temp dirs like _apks_tmp

      if (entry.isDirectory()) {
        const { count, size } = dirStats(full);
        items.push({ name: entry.name, size, count, isDir: true });
      } else {
        items.push({ name: entry.name, size: fs.statSync(full).size, isDir: false });
      }
    }

    // Sort: dirs first, then files
    items.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return items;
  } catch(e) {
    console.error('Output overview error:', e.message);
    return [];
  }
}

function dirStats(dir) {
  let count = 0, size = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      const s = dirStats(f);
      count += s.count;
      size += s.size;
    } else {
      count++;
      size += fs.statSync(f).size;
    }
  }
  return { count, size };
}

function buildReport(f, keytool) {
  const s = '═'.repeat(64);
  const t = '─'.repeat(64);
  const hk = ['MD5','SHA-1','SHA-224','SHA-256','SHA-384','SHA-512'];
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';

  let r = '';
  r += s + '\n';
  r += '  DEXFORGE — Signature & Certificate Report\n';
  r += '  ' + ts + '\n';
  r += s + '\n\n';

  // App info
  if (f.appName || f.packageName) {
    r += '[ APK INFORMATION ]\n' + t + '\n';
    if (f.appName)     r += '  App Name       :  ' + f.appName + '\n';
    if (f.packageName) r += '  Package Name   :  ' + f.packageName + '\n';
    if (f.version)     r += '  Version        :  ' + f.version + '\n';
    if (f.build)       r += '  Build          :  ' + f.build + '\n';
    r += t + '\n\n';
  }

  // Certificate hashes
  r += '[ CERTIFICATE HASHES ]\n' + t + '\n';
  for (const k of hk) {
    if (f[k]) r += '  ' + k.padEnd(12) + ':  ' + f[k] + '\n';
  }
  if (f.CRC32)    r += '  CRC32       :  ' + f.CRC32 + '\n';
  if (f.hashCode) r += '  hashCode    :  ' + f.hashCode + '\n';
  r += t + '\n\n';

  // Base64 hashes
  if (f.b64) {
    r += '[ BASE64 ENCODED HASHES ]\n' + t + '\n';
    for (const k of hk) {
      if (f.b64[k]) r += '  ' + k.padEnd(12) + ':  ' + f.b64[k] + '\n';
    }
    r += t + '\n\n';
  }

  // Keytool certificate
  if (keytool && keytool.length > 5) {
    r += '[ CERTIFICATE DETAILS ]\n' + t + '\n';
    for (const line of keytool.split('\n')) {
      r += '  ' + line + '\n';
    }
    r += t + '\n\n';
  }

  // Certificate bytes
  if (f.certBytes) {
    r += '[ CERTIFICATE BYTES (HEX) ]\n' + t + '\n';
    for (let i = 0; i < f.certBytes.length; i += 64) {
      r += '  ' + f.certBytes.slice(i, i + 64) + '\n';
    }
    r += t + '\n\n';
  }

  r += s + '\n';
  r += '  End of Report — DEXFORGE\n';
  r += s + '\n';

  return r;
}

function findApk(dir) {
  const base = path.join(dir, 'base.apk');
  if (fs.existsSync(base)) return base;
  const all = getAllFiles(dir).filter(f => f.endsWith('.apk'));
  const b = all.find(f => path.basename(f) === 'base.apk');
  if (b) return b;
  if (all.length) { all.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size); return all[0]; }
  return null;
}

function getAllFiles(dir) {
  let r = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) r = r.concat(getAllFiles(f)); else r.push(f);
  }
  return r;
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let c = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    c += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  }
  return c;
}

function createZip(src, dest) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    const ar = archiver('zip', { zlib: { level: 6 } });
    out.on('close', resolve);
    ar.on('error', reject);
    ar.pipe(out);
    // Add all entries except temp dirs (starting with _)
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (entry.name.startsWith('_')) continue; // skip _apks_tmp etc
      const full = path.join(src, entry.name);
      if (entry.isDirectory()) {
        ar.directory(full, entry.name);
      } else {
        ar.file(full, { name: entry.name });
      }
    }
    ar.finalize();
  });
}

// Cleanup old files hourly
setInterval(() => {
  const now = Date.now();
  try {
    for (const f of fs.readdirSync(OUTPUT_DIR)) {
      const fp = path.join(OUTPUT_DIR, f);
      if (fs.statSync(fp).isFile() && now - fs.statSync(fp).mtimeMs > 3600000) fs.unlinkSync(fp);
    }
    for (const f of fs.readdirSync(UPLOADS_DIR)) {
      const fp = path.join(UPLOADS_DIR, f);
      if (now - fs.statSync(fp).mtimeMs > 3600000) fs.unlinkSync(fp);
    }
    // Clean job states older than 24h
    for (const f of fs.readdirSync(JOB_STATE_DIR)) {
      const fp = path.join(JOB_STATE_DIR, f);
      if (now - fs.statSync(fp).mtimeMs > 86400000) fs.unlinkSync(fp);
    }
  } catch(e) {}
}, 600000);

app.listen(PORT, '0.0.0.0', () => console.log('APK Decompiler on port ' + PORT));
