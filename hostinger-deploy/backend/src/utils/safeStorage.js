const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Detects if currently executing inside a serverless / ephemeral lambda container
 */
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NOW_REGION ||
  process.env.LAMBDA_TASK_ROOT
);

// Ephemeral but write-permitted directory guaranteed across all cloud serverless platforms
const SERVERLESS_STORAGE_DIR = path.join(os.tmpdir(), 'aps_enterprise_storage');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

/**
 * Resolves the active filepath.
 * If running in serverless and a mutated copy exists in SERVERLESS_STORAGE_DIR, favors that.
 */
function resolveReadPath(filePath) {
  const filename = path.basename(filePath);
  const serverlessPath = path.join(SERVERLESS_STORAGE_DIR, filename);
  if (fs.existsSync(serverlessPath)) {
    return serverlessPath;
  }
  return filePath;
}

/**
 * Safely reads a JSON file from disk with serverless tiering. Returns defaultValue if file is missing or corrupted.
 */
function safeReadJson(filePath, defaultValue = []) {
  try {
    const targetPath = resolveReadPath(filePath);
    if (fs.existsSync(targetPath)) {
      const raw = fs.readFileSync(targetPath, 'utf8');
      if (raw && raw.trim().length > 0) {
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.warn(`[safeStorage:read warn] Could not read ${path.basename(filePath)}:`, err.message);
  }
  return defaultValue;
}

/**
 * Safely and atomically writes a JSON file.
 * 1. Writes to a temporary `.tmp` file and atomically renames to prevent partial write corruption.
 * 2. If the primary location is read-only (EROFS in serverless), automatically diverts to SERVERLESS_STORAGE_DIR.
 */
function safeWriteJson(filePath, data) {
  const filename = path.basename(filePath);
  const serialized = JSON.stringify(data, null, 2);

  // Strategy A: Try writing directly to requested file location atomically
  let tempFile = null;
  try {
    const dir = path.dirname(filePath);
    ensureDir(dir);

    tempFile = path.join(dir, `.${filename}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`);
    fs.writeFileSync(tempFile, serialized, 'utf8');
    fs.renameSync(tempFile, filePath);
    return true;
  } catch (err) {
    if (tempFile && fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch {}
    }
    // If filesystem is read-only (EROFS) or write is blocked by serverless environment
    if (err.code === 'EROFS' || isServerless) {
      try {
        ensureDir(SERVERLESS_STORAGE_DIR);
        const serverlessTarget = path.join(SERVERLESS_STORAGE_DIR, filename);
        const serverlessTemp = path.join(SERVERLESS_STORAGE_DIR, `.${filename}.${Date.now()}.tmp`);
        fs.writeFileSync(serverlessTemp, serialized, 'utf8');
        fs.renameSync(serverlessTemp, serverlessTarget);
        console.info(`[safeStorage:serverless] Persisted ${filename} to durable lambda store (${serverlessTarget})`);
        return true;
      } catch (subErr) {
        console.warn(`[safeStorage:serverless error] Failed writing to serverless storage for ${filename}:`, subErr.message);
        return false;
      }
    }
    console.warn(`[safeStorage:write warn] Skipping disk write for ${filename}:`, err.message);
    return false;
  }
}

module.exports = {
  isServerless,
  SERVERLESS_STORAGE_DIR,
  safeReadJson,
  safeWriteJson
};

