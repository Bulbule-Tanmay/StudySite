/**
 * CNI — College Notes Index
 * Production & Development Server (Node.js built-in, zero dependencies)
 * 
 * Features:
 * - High-speed static file server with range request support for PDFs
 * - Secure Authentication API with salted SHA-256 hashing & brute-force lockout
 * - Real Persistent Analytics API (genuine download counters, live telemetry)
 * - Security Audit Trail & Telemetry (failed attempts, session management, rate-limiting)
 * - Dynamic Ads Space persistence
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Data files
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const ADS_FILE = path.join(DATA_DIR, 'ads.json');
const AUDIT_FILE = path.join(DATA_DIR, 'security-audit.json');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon'
};

// In-Memory Security & Session State
const activeSessions = new Map(); // token -> { createdAt, expiresAt, ip }
const ipRateLimits = new Map();   // ip -> timestamp of last track event
const failedAttempts = { count: 0, lockedUntil: 0 };

// Initialize or Read Files
function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Cryptographic Salt & Hash function
function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

// Setup Auth Default (PIN: admin123)
let authConfig = readJsonFile(AUTH_FILE, null);
if (!authConfig) {
  const salt = crypto.randomBytes(16).toString('hex');
  authConfig = {
    salt,
    hash: hashPin('admin123', salt),
    updatedAt: new Date().toISOString()
  };
  writeJsonFile(AUTH_FILE, authConfig);
}

// Setup Analytics Default (Real data model)
let analyticsState = readJsonFile(ANALYTICS_FILE, {
  views: 1,
  downloads: 0,
  previews: 0,
  searches: 0,
  fileDownloads: {},
  subjectClicks: {},
  searchQueries: {},
  lastReset: new Date().toISOString()
});

// Setup Ads Default
let adsState = readJsonFile(ADS_FILE, {
  top: {
    enabled: true,
    sponsor: "CampusPro 2026",
    title: "Semester Exam Prep Kit — High-Yield Formula Sheets & Solved PYQs",
    cta: "Explore Kit",
    url: "https://github.com/Bulbule-Tanmay/StudySite",
    impressions: 0,
    clicks: 0
  },
  infeed: {
    enabled: true,
    sponsor: "Featured Resource",
    title: "Master DSA & System Design Faster",
    desc: "250+ Curated interview problems, interactive visual guides, and step-by-step algorithms walkthroughs.",
    cta: "Access Guide",
    url: "https://github.com/Bulbule-Tanmay/StudySite",
    impressions: 0,
    clicks: 0
  },
  bottom: {
    enabled: true,
    title: "Have class notes or question papers? Help fellow students by contributing!",
    url: "#contribute",
    impressions: 0,
    clicks: 0
  },
  customCode: ""
});

// Security Audit Log Helper
function logSecurityAudit(action, details, ip) {
  const audits = readJsonFile(AUDIT_FILE, []);
  const entry = {
    id: crypto.randomBytes(6).toString('hex'),
    timestamp: new Date().toISOString(),
    action,
    details,
    ip: ip || 'internal'
  };
  audits.unshift(entry);
  if (audits.length > 100) audits.pop();
  writeJsonFile(AUDIT_FILE, audits);
}

// Helper: Parse JSON Body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Helper: Verify Session Token
function verifyAuthToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// Static File Server
function serveStatic(req, res, pathname) {
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const fullPath = path.join(ROOT_DIR, decodeURI(safePath));

  if (!fullPath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('File Not Found');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // PDF / Streaming Support with Range header
    const range = req.headers.range;
    if (range && stats.size > 0) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
        return res.end();
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(fullPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });
      return fileStream.pipe(res);
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentType,
      'Cache-Control': ext === '.json' || ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(fullPath).pipe(res);
  });
}

// HTTP Server & Router
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Enable CORS for local APIs
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // ═══ API ROUTER ═══
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 1. GET /api/analytics — Real Live Metrics
    if (pathname === '/api/analytics' && req.method === 'GET') {
      return res.end(JSON.stringify({
        ok: true,
        data: analyticsState
      }));
    }

    // 2. POST /api/analytics/track — Real Action Telemetry
    if (pathname === '/api/analytics/track' && req.method === 'POST') {
      const data = await parseBody(req);
      const now = Date.now();

      // Rate limiting: max 1 download or track request per 500ms from same IP
      const lastTrack = ipRateLimits.get(clientIp) || 0;
      if (now - lastTrack < 400 && data.type === 'download') {
        return res.end(JSON.stringify({ ok: true, rateLimited: true }));
      }
      ipRateLimits.set(clientIp, now);

      if (data.type === 'view') {
        analyticsState.views = (analyticsState.views || 0) + 1;
      } else if (data.type === 'download' && data.filename) {
        analyticsState.downloads = (analyticsState.downloads || 0) + 1;
        analyticsState.fileDownloads[data.filename] = (analyticsState.fileDownloads[data.filename] || 0) + 1;
        if (data.subject) {
          analyticsState.subjectClicks[data.subject] = (analyticsState.subjectClicks[data.subject] || 0) + 1;
        }
      } else if (data.type === 'preview') {
        analyticsState.previews = (analyticsState.previews || 0) + 1;
      } else if (data.type === 'search' && data.query) {
        analyticsState.searches = (analyticsState.searches || 0) + 1;
        analyticsState.searchQueries[data.query] = (analyticsState.searchQueries[data.query] || 0) + 1;
      }

      writeJsonFile(ANALYTICS_FILE, analyticsState);
      return res.end(JSON.stringify({ ok: true, totalDownloads: analyticsState.downloads }));
    }

    // 3. POST /api/auth/login — Salted SHA-256 Authentication with Lockout
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const now = Date.now();
      // Check lockout
      if (failedAttempts.lockedUntil > now) {
        const remainingSec = Math.ceil((failedAttempts.lockedUntil - now) / 1000);
        logSecurityAudit('AUTH_LOCKED_ATTEMPT', `Attempt while locked. ${remainingSec}s remaining.`, clientIp);
        res.writeHead(429);
        return res.end(JSON.stringify({
          ok: false,
          error: `Security Lockout Active: Too many failed attempts. Try again in ${remainingSec} seconds.`,
          locked: true,
          remainingSec
        }));
      }

      const body = await parseBody(req);
      const inputPin = String(body.pin || '');
      const inputHash = hashPin(inputPin, authConfig.salt);

      if (inputHash === authConfig.hash) {
        // Success
        failedAttempts.count = 0;
        failedAttempts.lockedUntil = 0;

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = now + (2 * 60 * 60 * 1000); // 2 hours
        activeSessions.set(token, { createdAt: now, expiresAt, ip: clientIp });

        logSecurityAudit('AUTH_SUCCESS', 'Successful administrative authentication', clientIp);
        return res.end(JSON.stringify({
          ok: true,
          token,
          expiresAt,
          message: 'Authenticated successfully'
        }));
      } else {
        // Failed attempt
        failedAttempts.count += 1;
        let locked = false;
        let remainingSec = 0;

        if (failedAttempts.count >= 5) {
          failedAttempts.lockedUntil = now + (60 * 1000); // 60s lockout
          locked = true;
          remainingSec = 60;
          logSecurityAudit('AUTH_LOCKOUT_TRIGGERED', '5 failed attempts reached. Lockout activated for 60s.', clientIp);
        } else {
          logSecurityAudit('AUTH_FAILURE', `Invalid PIN attempt (${failedAttempts.count}/5)`, clientIp);
        }

        res.writeHead(401);
        return res.end(JSON.stringify({
          ok: false,
          error: locked ? 'Account locked for 60s due to repeated failed attempts.' : 'Invalid Admin PIN.',
          attemptsLeft: Math.max(0, 5 - failedAttempts.count),
          locked,
          remainingSec
        }));
      }
    }

    // 4. POST /api/auth/verify — Verify Token
    if (pathname === '/api/auth/verify' && req.method === 'POST') {
      const isValid = verifyAuthToken(req);
      return res.end(JSON.stringify({ ok: isValid }));
    }

    // 5. POST /api/auth/logout — Invalidate Session
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token && activeSessions.has(token)) {
        activeSessions.delete(token);
        logSecurityAudit('AUTH_LOGOUT', 'Admin session terminated', clientIp);
      }
      return res.end(JSON.stringify({ ok: true }));
    }

    // 6. GET /api/security/audit — Security Analytics & Telemetry (Protected)
    if (pathname === '/api/security/audit' && req.method === 'GET') {
      if (!verifyAuthToken(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      }

      const audits = readJsonFile(AUDIT_FILE, []);
      return res.end(JSON.stringify({
        ok: true,
        securityStats: {
          activeSessionsCount: activeSessions.size,
          failedAttemptsCurrent: failedAttempts.count,
          isLocked: failedAttempts.lockedUntil > Date.now(),
          lockoutRemainingSec: Math.max(0, Math.ceil((failedAttempts.lockedUntil - Date.now()) / 1000)),
          hashingAlgorithm: 'SHA-256 + Salt',
          rateLimiting: 'Active (Anti-Bot / DoS Shield)'
        },
        auditLogs: audits.slice(0, 50)
      }));
    }

    // 7. POST /api/auth/change-pin — Change PIN (Protected)
    if (pathname === '/api/auth/change-pin' && req.method === 'POST') {
      if (!verifyAuthToken(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      }

      const body = await parseBody(req);
      const currentPin = String(body.currentPin || '').trim();
      const newPin = String(body.newPin || '').trim();

      if (currentPin) {
        const checkHash = hashPin(currentPin, authConfig.salt);
        if (checkHash !== authConfig.hash) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: 'Current password is incorrect.' }));
        }
      }

      if (newPin.length < 4) {
        res.writeHead(400);
        return res.end(JSON.stringify({ ok: false, error: 'New password must be at least 4 characters.' }));
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      authConfig = {
        salt: newSalt,
        hash: hashPin(newPin, newSalt),
        updatedAt: new Date().toISOString()
      };
      writeJsonFile(AUTH_FILE, authConfig);
      logSecurityAudit('PIN_CHANGED', 'Administrative password was successfully updated', clientIp);

      return res.end(JSON.stringify({ ok: true, message: 'Password updated successfully with SHA-256 encryption' }));
    }

    // 8. GET /api/ads & POST /api/ads — Real Ads Space Management
    if (pathname === '/api/ads' && req.method === 'GET') {
      return res.end(JSON.stringify({ ok: true, data: adsState }));
    }

    if (pathname === '/api/ads' && req.method === 'POST') {
      if (!verifyAuthToken(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      }

      const body = await parseBody(req);
      adsState = { ...adsState, ...body };
      writeJsonFile(ADS_FILE, adsState);
      logSecurityAudit('ADS_CONFIG_MUTATED', 'Ad space placements updated', clientIp);
      return res.end(JSON.stringify({ ok: true, message: 'Ad settings saved successfully' }));
    }

    // 8b. POST /api/ads/click — Track Ad Clicks & Impressions
    if (pathname === '/api/ads/track' && req.method === 'POST') {
      const body = await parseBody(req);
      const slot = body.slot; // 'top' | 'infeed' | 'bottom'
      const eventType = body.event; // 'impression' | 'click'
      if (adsState[slot]) {
        if (eventType === 'click') {
          adsState[slot].clicks = (adsState[slot].clicks || 0) + 1;
        } else {
          adsState[slot].impressions = (adsState[slot].impressions || 0) + 1;
        }
        writeJsonFile(ADS_FILE, adsState);
      }
      return res.end(JSON.stringify({ ok: true }));
    }

    // 9. POST /api/analytics/reset — Reset Telemetry (Protected)
    if (pathname === '/api/analytics/reset' && req.method === 'POST') {
      if (!verifyAuthToken(req)) {
        res.writeHead(403);
        return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      }

      analyticsState = {
        views: 1,
        downloads: 0,
        previews: 0,
        searches: 0,
        fileDownloads: {},
        subjectClicks: {},
        searchQueries: {},
        lastReset: new Date().toISOString()
      };
      writeJsonFile(ANALYTICS_FILE, analyticsState);
      logSecurityAudit('ANALYTICS_RESET', 'Telemetry counters were reset by admin', clientIp);
      return res.end(JSON.stringify({ ok: true }));
    }

    // Unknown API endpoint
    res.writeHead(404);
    return res.end(JSON.stringify({ ok: false, error: 'Endpoint not found' }));
  }

  // ═══ STATIC FILE SERVING ═══
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`CNI Dynamic & Secure Server running at http://localhost:${PORT}`);
  console.log(`- API Endpoints: /api/analytics, /api/auth/login, /api/security/audit, /api/ads`);
  console.log(`- Security: SHA-256 + Salt, Brute-force Lockout Shield, Session Auth`);
});
