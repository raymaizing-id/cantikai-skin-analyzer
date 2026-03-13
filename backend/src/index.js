/**
 * Cantik AI Backend - Node.js + SQLite3 (Cross-platform compatible)
 * Using sqlite3 instead of better-sqlite3 for better cross-OS compatibility
 */

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fsPromises, constants as fsConstants } from 'fs';
import dotenv from 'dotenv';
import { saveImageToFile, readImageAsBase64, deleteImageFile } from './utils/imageStorage.js';
import { getProductRecommendations, formatRecommendations } from './utils/productRecommendation.js';
import { pool, dbGet, dbAll, dbRun, testConnection } from './config/database.js';
// import { scheduleAutoCleanup } from './utils/autoCleanup.js';
// import { exportToJSON, exportToCSV } from './utils/dataExport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'cantik-ai-dev-secret-change-me';

// CORS configuration
const allowedOrigins = [
  'https://skin-analyzer.cantik.ai',
  'https://api.cantik.ai',
  // Development origins
  'http://localhost:5173',
  'http://localhost:5174', 
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176'
];

app.use(cors({
  origin: function (origin, callback) {
    // izinkan request tanpa origin (seperti mobile apps atau curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true // Penting jika Anda menggunakan cookies/session
}));

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const KIOSK_PUBLIC_BASE_URL = String(process.env.KIOSK_PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const KIOSK_RESULT_TOKEN_EXPIRES_DAYS = Math.max(1, Math.min(365, Number.parseInt(process.env.KIOSK_RESULT_TOKEN_EXPIRES_DAYS || '30', 10) || 30));
const WHATSAPP_WEBHOOK_URL = String(process.env.WHATSAPP_WEBHOOK_URL || '').trim();
const WHATSAPP_WEBHOOK_SECRET = String(process.env.WHATSAPP_WEBHOOK_SECRET || '').trim();
const UPLOADS_ROOT_PATH = path.resolve(__dirname, '..', 'uploads');

// Test MySQL connection on startup
testConnection();

const safeParseJSON = (jsonString, fallback = {}) => {
    if (!jsonString) return fallback;
    if (typeof jsonString !== 'string') return jsonString;
    if (jsonString === '[object Object]') return fallback;
    
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return fallback;
    }
};

const sanitizeUser = (user) => {
    if (!user) return null;
    const { password, password_hash, ...safeUser } = user;
    return safeUser;
};

const sanitizeAdmin = (admin) => {
    if (!admin) return null;
    const { password, hashed_password, ...safeAdmin } = admin;
    return safeAdmin;
};

const createUserToken = (user) => {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            role: 'user',
            auth_provider: user.auth_provider || 'email'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const createAdminToken = (admin) => {
    const csrfToken = randomBytes(24).toString('hex');
    const token = jwt.sign(
        {
            sub: admin.id,
            username: admin.username,
            role: 'admin',
            csrf: csrfToken
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
    return { token, csrfToken };
};

const getBearerToken = (req) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    return auth.slice(7).trim();
};

const getAuthContextFromRequest = (req) => {
    const token = getBearerToken(req);
    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch {
        return null;
    }
};

const requireAuthenticatedUser = (req, res, next) => {
    const authContext = getAuthContextFromRequest(req);
    if (!authContext) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.auth = authContext;
    return next();
};

const canAccessUserResource = (authContext, userId) => {
    if (!authContext) return false;
    if (authContext.role === 'admin') return true;
    if (authContext.role !== 'user') return false;
    return Number(authContext.sub) === Number(userId);
};

const parseBooleanEnv = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseIntegerEnv = (value, fallback, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(parsed, max));
};

const ADMIN_REQUIRE_BEARER = parseBooleanEnv(process.env.ADMIN_REQUIRE_BEARER, false);
const ADMIN_REQUIRE_CSRF = parseBooleanEnv(process.env.ADMIN_REQUIRE_CSRF, true);
const ADMIN_ENFORCE_ORIGIN = parseBooleanEnv(process.env.ADMIN_ENFORCE_ORIGIN, true);
const ADMIN_ORIGIN_STRICT = parseBooleanEnv(process.env.ADMIN_ORIGIN_STRICT, false);
const ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS = parseIntegerEnv(process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000, 1000);
const ADMIN_LOGIN_RATE_LIMIT_MAX = parseIntegerEnv(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX, 20, 1);
const ADMIN_LOGIN_BRUTE_WINDOW_MS = parseIntegerEnv(process.env.ADMIN_LOGIN_BRUTE_WINDOW_MS, 15 * 60 * 1000, 1000);
const ADMIN_LOGIN_BRUTE_MAX_FAILURES = parseIntegerEnv(process.env.ADMIN_LOGIN_BRUTE_MAX_FAILURES, 5, 1);
const ADMIN_LOGIN_LOCK_MS = parseIntegerEnv(process.env.ADMIN_LOGIN_LOCK_MS, 15 * 60 * 1000, 1000);

const ADMIN_CSRF_HEADER = 'x-admin-csrf-token';
const UNSAFE_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const adminLoginRateTracker = new Map();
const adminLoginFailureTracker = new Map();

const getClientIp = (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '')
        .split(',')
        .map((part) => part.trim())
        .find(Boolean);
    const rawIp = forwarded || req.socket?.remoteAddress || req.ip || 'unknown';
    return String(rawIp).replace('::ffff:', '');
};

const getAdminLoginFailureKey = (username, ip) => `${String(username || '').toLowerCase()}|${ip}`;

const cleanupAdminSecurityTrackers = () => {
    const now = Date.now();

    for (const [ip, timestamps] of adminLoginRateTracker.entries()) {
        const recent = timestamps.filter((ts) => now - ts < ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS);
        if (recent.length === 0) {
            adminLoginRateTracker.delete(ip);
        } else {
            adminLoginRateTracker.set(ip, recent);
        }
    }

    for (const [key, state] of adminLoginFailureTracker.entries()) {
        const windowExpired = now - state.windowStartedAt >= ADMIN_LOGIN_BRUTE_WINDOW_MS;
        const lockExpired = !state.lockUntil || state.lockUntil <= now;
        if (windowExpired && lockExpired) {
            adminLoginFailureTracker.delete(key);
        }
    }
};

setInterval(cleanupAdminSecurityTrackers, 5 * 60 * 1000).unref();

const checkAdminLoginRateLimit = (ip) => {
    const now = Date.now();
    const existing = adminLoginRateTracker.get(ip) || [];
    const recent = existing.filter((ts) => now - ts < ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    adminLoginRateTracker.set(ip, recent);

    if (recent.length > ADMIN_LOGIN_RATE_LIMIT_MAX) {
        const retryAfterMs = Math.max(ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS - (now - recent[0]), 1000);
        return { allowed: false, retryAfterMs };
    }

    return {
        allowed: true,
        remaining: Math.max(ADMIN_LOGIN_RATE_LIMIT_MAX - recent.length, 0)
    };
};

const getAdminLoginLockState = (failureKey) => {
    const state = adminLoginFailureTracker.get(failureKey);
    if (!state || !state.lockUntil) {
        return { locked: false, retryAfterMs: 0 };
    }
    const retryAfterMs = state.lockUntil - Date.now();
    if (retryAfterMs <= 0) {
        adminLoginFailureTracker.delete(failureKey);
        return { locked: false, retryAfterMs: 0 };
    }
    return { locked: true, retryAfterMs };
};

const registerAdminLoginFailure = (failureKey) => {
    const now = Date.now();
    const existing = adminLoginFailureTracker.get(failureKey);

    let state = existing;
    if (!state || now - state.windowStartedAt >= ADMIN_LOGIN_BRUTE_WINDOW_MS) {
        state = {
            failures: 0,
            windowStartedAt: now,
            lockUntil: null
        };
    }

    state.failures += 1;

    if (state.failures >= ADMIN_LOGIN_BRUTE_MAX_FAILURES) {
        state.lockUntil = now + ADMIN_LOGIN_LOCK_MS;
        state.failures = 0;
        state.windowStartedAt = now;
    }

    adminLoginFailureTracker.set(failureKey, state);
    return state;
};

const clearAdminLoginFailure = (failureKey) => {
    adminLoginFailureTracker.delete(failureKey);
};

const parseSettingValue = (rawValue, valueType = 'string') => {
    if (rawValue === null || rawValue === undefined) return null;
    if (valueType === 'number') {
        const number = Number(rawValue);
        return Number.isFinite(number) ? number : null;
    }
    if (valueType === 'boolean') {
        if (typeof rawValue === 'boolean') return rawValue;
        return ['1', 'true', 'yes', 'on'].includes(String(rawValue).toLowerCase());
    }
    if (valueType === 'json') {
        try {
            return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        } catch {
            return null;
        }
    }
    return String(rawValue);
};

const normalizeSettingRow = (row) => ({
    ...row,
    parsed_value: parseSettingValue(row.value, row.value_type)
});

const toStorageJSON = (value) => {
    try {
        return JSON.stringify(value ?? null);
    } catch {
        return JSON.stringify(null);
    }
};

const parseStorageJSON = (value, fallback = null) => {
    if (!value || typeof value !== 'string') return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const toNumber = (value, fallback = 0, min = null, max = null) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const withMin = min === null ? parsed : Math.max(min, parsed);
    return max === null ? withMin : Math.min(max, withMin);
};

const normalizeKioskGender = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (['male', 'pria', 'laki-laki', 'laki', 'm'].includes(raw)) return 'male';
    if (['female', 'wanita', 'perempuan', 'f'].includes(raw)) return 'female';
    return 'other';
};

const normalizeWhatsappNumber = (value) => {
    const raw = String(value || '').replace(/[^\d+]/g, '').trim();
    if (!raw) return '';
    if (raw.startsWith('+')) {
        return raw;
    }
    if (raw.startsWith('62')) {
        return `+${raw}`;
    }
    if (raw.startsWith('0')) {
        return `+62${raw.slice(1)}`;
    }
    return `+${raw}`;
};

const maskWhatsappNumber = (value) => {
    const normalized = normalizeWhatsappNumber(value);
    if (!normalized) return '';
    if (normalized.length <= 6) return normalized;
    return `${normalized.slice(0, 4)}****${normalized.slice(-3)}`;
};

const createKioskSessionUuid = () => `kiosk_${Date.now()}_${randomBytes(5).toString('hex')}`;
const createKioskResultToken = () => randomBytes(24).toString('hex');

const buildKioskResultUrls = (token) => ({
    token,
    result_url: `/kiosk/result/${token}`,
    api_url: `/api/v2/kiosk/result/${token}`,
    pdf_url: `/api/v2/kiosk/result/${token}/pdf`,
    public_result_url: `${KIOSK_PUBLIC_BASE_URL}/kiosk/result/${token}`,
    public_pdf_url: `${KIOSK_PUBLIC_BASE_URL}/api/v2/kiosk/result/${token}/pdf`
});

const toKioskPublicAssetUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${KIOSK_PUBLIC_BASE_URL}/${raw.replace(/^\/+/, '')}`;
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const KIOSK_ANALYSIS_MODE_TEMPLATES = [
    { key: 'rgb_pores', title: 'RGB Pores', parameter: 'Pores', detail: 'Analisa pori pada pencahayaan normal RGB.' },
    { key: 'rgb_color_spot', title: 'RGB Color Spot', parameter: 'Pigmentasi', detail: 'Deteksi noda warna pada mode RGB.' },
    { key: 'rgb_texture', title: 'RGB Texture', parameter: 'Tekstur', detail: 'Evaluasi tekstur permukaan kulit wajah.' },
    { key: 'pl_roughness', title: 'PL Roughness', parameter: 'Roughness', detail: 'Estimasi kekasaran kulit dari pencahayaan terpolarisasi.' },
    { key: 'uv_acne', title: 'UV Acne', parameter: 'Acne', detail: 'Analisa indikasi jerawat pada mode UV.' },
    { key: 'uv_color_spot', title: 'UV Color Spot', parameter: 'UV Spot', detail: 'Identifikasi spot bawah permukaan di mode UV.' },
    { key: 'uv_roughness', title: 'UV Roughness', parameter: 'Roughness', detail: 'Deteksi roughness halus di area wajah.' },
    { key: 'skin_color_evenness', title: 'Skin Color Evenness', parameter: 'Evenness', detail: 'Kemerataan warna kulit wajah.' },
    { key: 'brown_area', title: 'Brown Area', parameter: 'Brown Area', detail: 'Area kecoklatan/hiperpigmentasi.' },
    { key: 'uv_spot', title: 'UV Spot', parameter: 'UV Spot', detail: 'Kepadatan UV spot pada area rentan.' },
    { key: 'skin_aging', title: 'Skin Aging', parameter: 'Aging', detail: 'Indikasi penuaan kulit dari pola garis/tekstur.' },
    { key: 'skin_whitening', title: 'Skin Whitening', parameter: 'Brightness', detail: 'Kecerahan kulit dan indikasi kusam.' },
    { key: 'wrinkle', title: 'Wrinkle', parameter: 'Wrinkle', detail: 'Tingkat kerutan dan fine lines.' },
    { key: 'pore', title: 'Pore', parameter: 'Pore', detail: 'Ringkasan kondisi pori secara umum.' },
    { key: 'overall_analysis', title: 'Overall Analysis', parameter: 'Overall', detail: 'Ringkasan menyeluruh dari seluruh mode.' }
];

const normalizeModeKey = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const scoreStatusFromValue = (score) => {
    const value = Math.round(toNumber(score, 60, 0, 100));
    if (value >= 86) return 'Excellent';
    if (value >= 71) return 'Good';
    if (value >= 56) return 'Moderate';
    if (value >= 41) return 'Needs Care';
    return 'High Concern';
};

const buildDefaultAnalysisModes = (scores = {}, concerns = [], overallScore = 70) => {
    const acne = Math.round(toNumber(scores.acne, 62, 0, 100));
    const wrinkles = Math.round(toNumber(scores.wrinkles, 64, 0, 100));
    const pigmentation = Math.round(toNumber(scores.pigmentation, 63, 0, 100));
    const pores = Math.round(toNumber(scores.pores, 61, 0, 100));
    const hydration = Math.round(toNumber(scores.hydration, 65, 0, 100));
    const oiliness = Math.round(toNumber(scores.oiliness, 60, 0, 100));
    const redness = Math.round(toNumber(scores.redness, 64, 0, 100));
    const overall = Math.round(toNumber(overallScore, 68, 0, 100));
    const concernAdvice = Array.isArray(concerns) && concerns.length > 0
        ? String(concerns[0]?.advice || '')
        : '';

    const fallbackScoreByKey = {
        rgb_pores: pores,
        rgb_color_spot: pigmentation,
        rgb_texture: Math.round((wrinkles + pores + hydration) / 3),
        pl_roughness: Math.round((wrinkles + hydration) / 2),
        uv_acne: acne,
        uv_color_spot: Math.round((pigmentation + redness) / 2),
        uv_roughness: Math.round((wrinkles + redness + hydration) / 3),
        skin_color_evenness: Math.round((pigmentation + redness + hydration) / 3),
        brown_area: pigmentation,
        uv_spot: Math.round((pigmentation + redness) / 2),
        skin_aging: Math.round((wrinkles + hydration) / 2),
        skin_whitening: Math.round((hydration + pigmentation) / 2),
        wrinkle: wrinkles,
        pore: pores,
        overall_analysis: overall
    };

    return KIOSK_ANALYSIS_MODE_TEMPLATES.map((template) => {
        const score = Math.round(toNumber(fallbackScoreByKey[template.key], 62, 0, 100));
        return {
            ...template,
            score,
            status: scoreStatusFromValue(score),
            insight: concernAdvice || 'Jaga rutinitas skincare konsisten untuk hasil optimal.'
        };
    });
};

const normalizeValidationReasons = (value) => {
    const arr = Array.isArray(value) ? value : [];
    const unique = [];
    for (const item of arr) {
        const text = String(item || '').trim();
        if (!text) continue;
        if (!unique.includes(text)) unique.push(text);
        if (unique.length >= 8) break;
    }
    return unique;
};

const normalizeKioskInputValidation = (raw = {}) => {
    const source = raw && typeof raw === 'object' ? raw : {};
    const occlusionRaw = source.occlusion && typeof source.occlusion === 'object' ? source.occlusion : {};

    const faceDetected = Boolean(source.face_detected ?? source.faceDetected ?? true);
    const subjectType = String(source.subject_type || source.subjectType || 'human_face').toLowerCase();
    const faceCount = Math.max(0, Math.round(toNumber(source.face_count ?? source.faceCount, faceDetected ? 1 : 0, 0, 10)));
    const lighting = String(source.lighting || 'good').toLowerCase();
    const sharpness = String(source.sharpness || source.clarity || 'clear').toLowerCase();
    const maskDetected = Boolean(occlusionRaw.mask ?? occlusionRaw.mask_detected ?? false);
    const glassesDetected = Boolean(occlusionRaw.glasses ?? occlusionRaw.eyewear ?? false);
    const foreheadCovered = Boolean(occlusionRaw.forehead_covered ?? false);
    const cheeksCovered = Boolean(occlusionRaw.cheeks_covered ?? false);
    const chinCovered = Boolean(occlusionRaw.chin_covered ?? false);
    const subjectInvalid = ['animal', 'object', 'animation', 'cartoon', 'non_face', 'unknown'].includes(subjectType);

    const reasons = normalizeValidationReasons(source.reasons || source.issues || source.flags);
    if (!faceDetected) reasons.push('Wajah tidak terdeteksi dengan jelas.');
    if (subjectInvalid) reasons.push('Input bukan wajah manusia yang valid.');
    if (faceCount > 1) reasons.push('Terdeteksi lebih dari satu wajah pada frame.');
    if (lighting === 'dark' || lighting === 'dim') reasons.push('Pencahayaan terlalu gelap untuk analisa akurat.');
    if (lighting === 'overexposed') reasons.push('Pencahayaan terlalu terang, detail kulit tidak stabil.');
    if (sharpness === 'blurry') reasons.push('Gambar buram, detail kulit tidak terbaca jelas.');
    if (maskDetected) reasons.push('Wajah tertutup masker.');
    if (glassesDetected) reasons.push('Kacamata terdeteksi, area mata tidak terbaca optimal.');
    if (foreheadCovered || cheeksCovered || chinCovered) reasons.push('Sebagian area wajah tertutup objek.');

    const blockedByCoverage = maskDetected || glassesDetected || foreheadCovered || cheeksCovered || chinCovered;
    const isValidFromPayload = source.is_valid_for_skin_analysis;
    const isValid = typeof isValidFromPayload === 'boolean'
        ? isValidFromPayload
        : faceDetected
            && !subjectInvalid
            && faceCount === 1
            && lighting !== 'dark'
            && lighting !== 'dim'
            && lighting !== 'overexposed'
            && sharpness !== 'blurry'
            && toNumber(source.confidence, 0.8, 0, 1) >= 0.5
            && !blockedByCoverage;

    const fallbackInstruction = isValid
        ? 'Foto valid untuk analisa.'
        : 'Silakan ulangi scan: lepas masker/kacamata gelap, pastikan satu wajah manusia, dan tambah pencahayaan.';

    return {
        is_valid_for_skin_analysis: Boolean(isValid),
        face_detected: faceDetected,
        subject_type: subjectType || 'unknown',
        face_count: faceCount,
        lighting: lighting || 'unknown',
        sharpness: sharpness || 'unknown',
        confidence: Number(toNumber(source.confidence, isValid ? 0.86 : 0.35, 0, 1).toFixed(2)),
        occlusion: {
            mask: maskDetected,
            glasses: glassesDetected,
            forehead_covered: foreheadCovered,
            cheeks_covered: cheeksCovered,
            chin_covered: chinCovered
        },
        reasons: normalizeValidationReasons(reasons),
        retake_instruction: String(source.retake_instruction || source.retakeInstruction || fallbackInstruction).trim()
    };
};

const normalizeKioskAnalysis = (raw = {}) => {
    const scoresRaw = raw.scores && typeof raw.scores === 'object' ? raw.scores : {};
    const scores = {
        acne: Math.round(toNumber(scoresRaw.acne, 70, 0, 100)),
        wrinkles: Math.round(toNumber(scoresRaw.wrinkles, 70, 0, 100)),
        pigmentation: Math.round(toNumber(scoresRaw.pigmentation, 70, 0, 100)),
        pores: Math.round(toNumber(scoresRaw.pores, 70, 0, 100)),
        hydration: Math.round(toNumber(scoresRaw.hydration, 70, 0, 100)),
        oiliness: Math.round(toNumber(scoresRaw.oiliness, 70, 0, 100)),
        redness: Math.round(toNumber(scoresRaw.redness, 70, 0, 100))
    };

    const concerns = Array.isArray(raw.priority_concerns)
        ? raw.priority_concerns
            .map((item, index) => ({
                concern: String(item?.concern || `Concern ${index + 1}`),
                severity: String(item?.severity || 'moderate'),
                advice: String(item?.advice || ''),
                priority: Number.isFinite(Number(item?.priority)) ? Number(item.priority) : index + 1
            }))
            .sort((a, b) => a.priority - b.priority)
            .slice(0, 5)
        : [];

    const recommendations = Array.isArray(raw.recommendations)
        ? raw.recommendations.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
        : [];

    const summary = String(raw.summary || '').trim()
        || 'Kondisi kulit terdeteksi dengan beberapa area yang perlu perhatian rutin.';

    const inputValidation = normalizeKioskInputValidation(
        raw.input_validation || raw.quality_check || raw.validation || {}
    );

    const fallbackModes = buildDefaultAnalysisModes(scores, concerns, raw.overall_score);
    const fallbackModeMap = new Map(fallbackModes.map((mode) => [mode.key, mode]));
    const incomingModes = Array.isArray(raw.analysis_modes) ? raw.analysis_modes : [];
    const incomingModeMap = new Map();
    incomingModes.forEach((mode) => {
        const key = normalizeModeKey(mode?.key || mode?.mode || mode?.title);
        if (key) incomingModeMap.set(key, mode);
    });

    const analysisModes = KIOSK_ANALYSIS_MODE_TEMPLATES.map((template) => {
        const candidate = incomingModeMap.get(template.key)
            || incomingModeMap.get(normalizeModeKey(template.title))
            || {};
        const fallback = fallbackModeMap.get(template.key) || {};
        const score = Math.round(toNumber(candidate.score ?? candidate.value, fallback.score ?? 62, 0, 100));
        const status = String(candidate.status || candidate.level || fallback.status || scoreStatusFromValue(score)).trim();
        const detail = String(candidate.detail || candidate.description || fallback.detail || template.detail).trim();
        const insight = String(candidate.insight || candidate.ai_insight || fallback.insight || '').trim()
            || 'Rawat kulit konsisten dan evaluasi rutin mingguan.';

        return {
            key: template.key,
            title: template.title,
            parameter: template.parameter,
            score,
            status,
            detail,
            insight
        };
    });

    return {
        overall_score: Math.round(toNumber(raw.overall_score, 70, 0, 100)),
        skin_type: String(raw.skin_type || 'Combination').trim() || 'Combination',
        fitzpatrick_type: String(raw.fitzpatrick_type || 'III').trim() || 'III',
        predicted_age: Math.round(toNumber(raw.predicted_age, 25, 10, 90)),
        summary,
        scores,
        priority_concerns: concerns,
        recommendations,
        analysis_modes: analysisModes,
        input_validation: inputValidation
    };
};

const applyCaptureQualityGuard = (validationRaw = {}, captureQualityRaw = {}) => {
    const validation = normalizeKioskInputValidation(validationRaw);
    const capture = captureQualityRaw && typeof captureQualityRaw === 'object' ? captureQualityRaw : {};
    const reasons = normalizeValidationReasons(validation.reasons);

    const hasGlasses = Boolean(capture.has_glasses ?? capture.hasGlasses ?? validation?.occlusion?.glasses);
    const hasFilter = Boolean(capture.has_filter ?? capture.hasFilter ?? false);
    const faceDetected = Boolean(capture.face_detected ?? capture.faceDetected ?? validation.face_detected);
    const distanceOk = Boolean(capture.distance_ok ?? capture.distanceOk ?? true);
    const lightingOk = Boolean(capture.lighting_ok ?? capture.lightingOk ?? true);
    const brightness = toNumber(capture.brightness, -1, -1, 255);
    const faceArea = toNumber(capture.face_area, 0, 0, 1);

    if (!faceDetected) reasons.push('Frontend mendeteksi wajah belum stabil.');
    if (!distanceOk) reasons.push('Jarak wajah belum ideal pada saat capture.');
    if (!lightingOk) reasons.push('Pencahayaan belum stabil pada saat capture.');
    if (hasGlasses) reasons.push('Kacamata terdeteksi pada saat capture.');
    if (hasFilter) reasons.push('Filter kamera terdeteksi, nonaktifkan filter.');
    if (brightness >= 0 && (brightness < 35 || brightness > 225)) reasons.push('Brightness kamera berada di luar rentang aman.');
    if (faceArea > 0 && (faceArea < 0.1 || faceArea > 0.72)) reasons.push('Ukuran wajah dalam frame belum ideal.');

    const hardInvalid = !faceDetected || !distanceOk || !lightingOk || hasGlasses || hasFilter;

    return {
        ...validation,
        is_valid_for_skin_analysis: hardInvalid ? false : Boolean(validation.is_valid_for_skin_analysis),
        reasons: normalizeValidationReasons(reasons),
        retake_instruction: hardInvalid
            ? 'Perbaiki posisi wajah: satu wajah, tanpa kacamata/filter, jarak pas, dan cahaya stabil lalu scan ulang.'
            : validation.retake_instruction
    };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractFirstJSONObject = (text) => {
    const input = String(text || '');
    let depth = 0;
    let start = -1;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i += 1) {
        const ch = input[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === '{') {
            if (depth === 0) start = i;
            depth += 1;
            continue;
        }

        if (ch === '}') {
            if (depth > 0) depth -= 1;
            if (depth === 0 && start >= 0) {
                return input.slice(start, i + 1);
            }
        }
    }

    if (start >= 0) {
        return input.slice(start);
    }
    return input.trim();
};

const normalizeNewlinesInQuotedStrings = (input) => {
    const source = String(input || '');
    let out = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < source.length; i += 1) {
        const ch = source[i];
        if (inString) {
            if (escaped) {
                out += ch;
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                out += ch;
                escaped = true;
                continue;
            }
            if (ch === '"') {
                out += ch;
                inString = false;
                continue;
            }
            if (ch === '\n' || ch === '\r') {
                out += '\\n';
                continue;
            }
            out += ch;
            continue;
        }

        if (ch === '"') {
            inString = true;
        }
        out += ch;
    }

    if (inString) out += '"';
    return out;
};

const closeUnbalancedJsonBrackets = (input) => {
    const source = String(input || '');
    const stack = [];
    let inString = false;
    let escaped = false;
    let out = '';

    for (let i = 0; i < source.length; i += 1) {
        const ch = source[i];
        out += ch;

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') stack.push('}');
        if (ch === '[') stack.push(']');
        if (ch === '}' || ch === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === ch) {
                stack.pop();
            }
        }
    }

    if (inString) out += '"';
    while (stack.length > 0) out += stack.pop();
    return out;
};

const sanitizeGeminiJsonText = (input) => {
    const text = String(input || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\u0000/g, '')
        .trim();

    const extracted = extractFirstJSONObject(text);
    const normalizedString = normalizeNewlinesInQuotedStrings(extracted);
    const closed = closeUnbalancedJsonBrackets(normalizedString);
    return closed
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
};

const parseGeminiJsonSafely = (rawText) => {
    const candidates = [];
    const raw = String(rawText || '').trim();
    if (raw) candidates.push(raw);
    const extracted = extractFirstJSONObject(raw);
    if (extracted && extracted !== raw) candidates.push(extracted);
    const sanitized = sanitizeGeminiJsonText(raw);
    if (sanitized && !candidates.includes(sanitized)) candidates.push(sanitized);

    let lastError = null;
    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error('Unknown JSON parse error');
};

const getKioskFallbackAnalysis = (reason = '') => normalizeKioskAnalysis({
    overall_score: 68,
    skin_type: 'Combination',
    fitzpatrick_type: 'III',
    predicted_age: 25,
    summary: 'Analisa awal telah tersedia. Untuk akurasi klinis maksimal, ulangi scan dengan pencahayaan lebih terang dan posisi wajah stabil.',
    scores: {
        acne: 70,
        wrinkles: 68,
        pigmentation: 66,
        pores: 67,
        hydration: 69,
        oiliness: 65,
        redness: 70
    },
    priority_concerns: [
        { concern: 'Tekstur Kulit', severity: 'moderate', advice: 'Gunakan cleanser lembut dan pelembab teratur.', priority: 1 },
        { concern: 'Hidrasi', severity: 'moderate', advice: 'Perbanyak hidrasi dan gunakan serum hyaluronic acid.', priority: 2 }
    ],
    recommendations: [
        'Gunakan sunscreen minimal SPF 30 setiap pagi.',
        'Pilih pembersih wajah lembut 2x sehari.',
        'Tambahkan pelembab dengan ceramide di malam hari.'
    ],
    input_validation: {
        is_valid_for_skin_analysis: true,
        face_detected: true,
        subject_type: 'human_face',
        face_count: 1,
        lighting: 'good',
        sharpness: 'soft',
        confidence: 0.62,
        occlusion: {
            mask: false,
            glasses: false,
            forehead_covered: false,
            cheeks_covered: false,
            chin_covered: false
        },
        reasons: reason ? [`Fallback: ${reason}`] : [],
        retake_instruction: 'Silakan ulangi scan dengan pencahayaan lebih baik untuk hasil yang lebih presisi.'
    }
});

const analyzeSkinWithGemini = async (imageBase64, mode = 'kiosk') => {
    const base64Data = String(imageBase64 || '').includes(',')
        ? String(imageBase64).split(',')[1]
        : String(imageBase64 || '');

    if (!base64Data) {
        throw new Error('image_base64 is required');
    }

    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured on backend');
    }

    const prompt = `
You are Cantik AI DermAssist, an evidence-based dermatology reasoning model for ${mode} kiosk scanner.
Task:
1) Validate whether this image is suitable for facial skin analysis.
2) If valid, produce clinically careful skin analysis.
3) If invalid (non-human face, mask, severe occlusion, dark/blurry, multiple faces), DO NOT hallucinate metrics.
Always return ONLY one valid JSON object in Bahasa Indonesia.

STRICT JSON SCHEMA:
{
  "input_validation": {
    "is_valid_for_skin_analysis": true,
    "face_detected": true,
    "subject_type": "human_face|animal|object|animation|unknown",
    "face_count": 1,
    "lighting": "good|dim|dark|overexposed",
    "sharpness": "clear|soft|blurry",
    "confidence": 0.0,
    "occlusion": {
      "mask": false,
      "glasses": false,
      "forehead_covered": false,
      "cheeks_covered": false,
      "chin_covered": false
    },
    "reasons": ["string"],
    "retake_instruction": "string"
  },
  "overall_score": 0,
  "skin_type": "Oily|Dry|Combination|Normal|Sensitive",
  "fitzpatrick_type": "I|II|III|IV|V|VI",
  "predicted_age": 0,
  "summary": "string",
  "scores": {
    "acne": 0,
    "wrinkles": 0,
    "pigmentation": 0,
    "pores": 0,
    "hydration": 0,
    "oiliness": 0,
    "redness": 0
  },
  "analysis_modes": [
    { "key": "rgb_pores", "title": "RGB Pores", "parameter": "Pores", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "rgb_color_spot", "title": "RGB Color Spot", "parameter": "Pigmentasi", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "rgb_texture", "title": "RGB Texture", "parameter": "Tekstur", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "pl_roughness", "title": "PL Roughness", "parameter": "Roughness", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "uv_acne", "title": "UV Acne", "parameter": "Acne", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "uv_color_spot", "title": "UV Color Spot", "parameter": "UV Spot", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "uv_roughness", "title": "UV Roughness", "parameter": "Roughness", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "skin_color_evenness", "title": "Skin Color Evenness", "parameter": "Evenness", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "brown_area", "title": "Brown Area", "parameter": "Brown Area", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "uv_spot", "title": "UV Spot", "parameter": "UV Spot", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "skin_aging", "title": "Skin Aging", "parameter": "Aging", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "skin_whitening", "title": "Skin Whitening", "parameter": "Brightness", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "wrinkle", "title": "Wrinkle", "parameter": "Wrinkle", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "pore", "title": "Pore", "parameter": "Pore", "score": 0, "status": "string", "detail": "string", "insight": "string" },
    { "key": "overall_analysis", "title": "Overall Analysis", "parameter": "Overall", "score": 0, "status": "string", "detail": "string", "insight": "string" }
  ],
  "priority_concerns": [
    { "concern": "string", "severity": "mild|moderate|high", "advice": "string", "priority": 1 }
  ],
  "recommendations": ["string"]
}

Rules:
- Never output markdown, code block, or text outside JSON.
- Use short strings, no nested quotes in sentence.
- Mark is_valid_for_skin_analysis=false if any of these happen:
  - non-human face/object/animation,
  - face not detected or multiple faces,
  - mask or glasses blocking eye/skin regions,
  - forehead/cheek/chin covered,
  - lighting dim/dark/overexposed,
  - image blurry or confidence < 0.50.
- If input_validation.is_valid_for_skin_analysis is false:
  - Fill reasons + retake_instruction clearly.
  - Set summary as refusal explanation.
  - Keep scores and analysis_modes conservative/neutral (avoid fake precision).
- If valid:
  - Use realistic evidence-based dermatology judgement.
  - Be strict if image quality is poor (masker, gelap, blur, non-face, multiple faces).
  - Max priority_concerns: 5, max recommendations: 8.
`.trim();

    const GEMINI_MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];

    const callGemini = async (
        customPrompt,
        maxOutputTokens = 2560,
        { model = GEMINI_MODEL_CANDIDATES[0], includeImage = true } = {}
    ) => {
        const parts = [{ text: customPrompt }];
        if (includeImage) {
            parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data
                }
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: includeImage ? 0.12 : 0.06,
                        topK: 24,
                        topP: 0.9,
                        maxOutputTokens,
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gemini API failed (${response.status}) [${model}]: ${errorBody.slice(0, 500)}`);
        }

        const data = await response.json();
        const partsText = Array.isArray(data?.candidates?.[0]?.content?.parts)
            ? data.candidates[0].content.parts.map((part) => String(part?.text || '')).join('\n')
            : '';
        return partsText.trim();
    };

    const callGeminiWithModelFallback = async (
        customPrompt,
        maxOutputTokens = 2560,
        { includeImage = true } = {}
    ) => {
        let lastError = null;
        for (const model of GEMINI_MODEL_CANDIDATES) {
            try {
                const text = await callGemini(customPrompt, maxOutputTokens, { model, includeImage });
                if (text) return text;
                lastError = new Error(`Gemini empty response on model ${model}`);
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Gemini model ${model} failed:`, error.message);
            }
        }
        throw lastError || new Error('All Gemini models failed');
    };

    const parseOrRepairGeminiJson = async (rawText, stageLabel = 'gemini') => {
        try {
            return parseGeminiJsonSafely(rawText);
        } catch (parseError) {
            const rawSnippet = String(rawText || '').slice(0, 14000);
            const repairPrompt = `
Perbaiki JSON berikut agar menjadi 1 objek JSON valid tanpa markdown.
Aturan:
- Jangan ubah meaning data.
- Tutup string/kurung yang rusak.
- Output hanya JSON object.

JSON:
${rawSnippet}
`.trim();
            console.warn(`⚠️ ${stageLabel} parse failed, trying JSON repair...`, parseError.message);
            const repairedText = await callGeminiWithModelFallback(repairPrompt, 2200, { includeImage: false });
            return parseGeminiJsonSafely(repairedText);
        }
    };

    const normalizeAndValidateAnalysis = (parsedPayload) => {
        const normalized = normalizeKioskAnalysis(parsedPayload);
        const validation = normalizeKioskInputValidation(normalized?.input_validation || {});
        const enforcedReasons = normalizeValidationReasons(validation.reasons);
        const isNonHuman = ['animal', 'object', 'animation', 'cartoon', 'non_face', 'unknown'].includes(
            String(validation.subject_type || '').toLowerCase()
        );
        const occlusion = validation.occlusion || {};
        const hasCoverage = Boolean(
            occlusion.mask
            || occlusion.glasses
            || occlusion.forehead_covered
            || occlusion.cheeks_covered
            || occlusion.chin_covered
        );
        const confidence = toNumber(validation.confidence, 0.8, 0, 1);
        const hardInvalid = Boolean(
            validation.is_valid_for_skin_analysis === false
            || !validation.face_detected
            || isNonHuman
            || Number(validation.face_count || 0) !== 1
            || ['dark', 'dim', 'overexposed'].includes(String(validation.lighting || '').toLowerCase())
            || String(validation.sharpness || '').toLowerCase() === 'blurry'
            || hasCoverage
            || confidence < 0.5
        );

        if (!validation.face_detected) enforcedReasons.push('Wajah tidak terdeteksi dengan jelas.');
        if (isNonHuman) enforcedReasons.push('Input bukan wajah manusia yang valid.');
        if (Number(validation.face_count || 0) !== 1) enforcedReasons.push('Pastikan hanya satu wajah berada dalam frame.');
        if (['dark', 'dim', 'overexposed'].includes(String(validation.lighting || '').toLowerCase())) {
            enforcedReasons.push('Perbaiki pencahayaan agar detail kulit terbaca.');
        }
        if (String(validation.sharpness || '').toLowerCase() === 'blurry') {
            enforcedReasons.push('Gambar buram, silakan stabilkan kamera lalu ulangi scan.');
        }
        if (occlusion.mask) enforcedReasons.push('Lepas masker sebelum analisa.');
        if (occlusion.glasses) enforcedReasons.push('Lepas kacamata agar area mata dapat dianalisa.');
        if (hasCoverage && !occlusion.mask && !occlusion.glasses) {
            enforcedReasons.push('Pastikan seluruh area wajah terlihat tanpa tertutup.');
        }
        if (confidence < 0.5) enforcedReasons.push('Deteksi wajah belum cukup yakin, silakan ulangi scan.');

        normalized.input_validation = {
            ...validation,
            is_valid_for_skin_analysis: !hardInvalid,
            reasons: normalizeValidationReasons(enforcedReasons),
            retake_instruction: hardInvalid
                ? (
                    validation.retake_instruction
                    || 'Silakan ulangi scan dengan wajah manusia tunggal, tanpa masker/kacamata, pencahayaan cukup, dan fokus tajam.'
                )
                : (validation.retake_instruction || 'Foto valid untuk analisa.')
        };

        if (
            mode === 'kiosk'
            && normalized?.input_validation
            && normalized.input_validation.is_valid_for_skin_analysis === false
        ) {
            const invalidInputError = new Error(
                normalized.input_validation.retake_instruction
                || 'Foto belum valid untuk analisa kulit. Silakan ulangi scan.'
            );
            invalidInputError.code = 'INVALID_INPUT_QUALITY';
            invalidInputError.statusCode = 422;
            invalidInputError.details = normalized.input_validation;
            throw invalidInputError;
        }
        return normalized;
    };

    try {
        const primaryText = await callGeminiWithModelFallback(prompt, 2500, { includeImage: true });
        if (!primaryText) {
            throw new Error('Gemini returned empty analysis');
        }
        const parsed = await parseOrRepairGeminiJson(primaryText, 'Gemini primary');
        return normalizeAndValidateAnalysis(parsed);
    } catch (primaryError) {
        if (primaryError?.code === 'INVALID_INPUT_QUALITY') {
            throw primaryError;
        }
        console.warn('⚠️ Primary Gemini analysis parse failed, retrying...', primaryError.message);
    }

    try {
        const retryPrompt = `${prompt}

IMPORTANT RETRY RULE:
- Keluarkan satu objek JSON VALID TANPA markdown.
- Pastikan semua string ditutup sempurna.
- Jangan tambahkan teks sebelum/sesudah JSON.
- Ringkas isi: maksimal 1 kalimat per field detail/insight.
`.trim();
        const retryText = await callGeminiWithModelFallback(retryPrompt, 2500, { includeImage: true });
        if (!retryText) {
            throw new Error('Gemini retry returned empty analysis');
        }
        const parsedRetry = await parseOrRepairGeminiJson(retryText, 'Gemini retry');
        return normalizeAndValidateAnalysis(parsedRetry);
    } catch (retryError) {
        if (retryError?.code === 'INVALID_INPUT_QUALITY') {
            throw retryError;
        }
        console.error('❌ Gemini retry failed, using fallback analysis:', retryError.message);
        return getKioskFallbackAnalysis('fallback');
    }
};

const sendKioskWhatsappDelivery = async ({ whatsapp, visitorName, resultUrl, pdfUrl, score, summary }) => {
    const normalized = normalizeWhatsappNumber(whatsapp);
    if (!normalized) {
        return { status: 'skipped', reason: 'no_whatsapp_number' };
    }

    if (!WHATSAPP_WEBHOOK_URL) {
        return { status: 'pending', reason: 'whatsapp_provider_not_configured', target: normalized };
    }

    const payload = {
        phone: normalized,
        name: visitorName || 'Pengguna',
        message: `Halo ${visitorName || 'pengguna'}, hasil analisa kulit Anda sudah siap.\nSkor: ${score}/100\nRingkasan: ${summary}\nLihat hasil: ${resultUrl}\nUnduh PDF: ${pdfUrl}`
    };

    try {
        const response = await fetch(WHATSAPP_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(WHATSAPP_WEBHOOK_SECRET ? { 'x-webhook-secret': WHATSAPP_WEBHOOK_SECRET } : {})
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const body = await response.text();
            return {
                status: 'failed',
                reason: `provider_http_${response.status}`,
                detail: body.slice(0, 300),
                target: normalized
            };
        }

        return { status: 'sent', target: normalized };
    } catch (error) {
        return { status: 'failed', reason: error.message, target: normalized };
    }
};

const getKioskResultByToken = async (token) => {
    const row = await dbGet(`
        SELECT
            ka.*,
            ks.session_uuid,
            ks.device_id,
            ks.visitor_name,
            ks.gender,
            ks.whatsapp,
            ks.created_at AS session_created_at,
            ks.completed_at AS session_completed_at
        FROM kiosk_analyses ka
        INNER JOIN kiosk_sessions ks ON ks.id = ka.session_id
        WHERE ka.result_token = ?
          AND (ka.expires_at IS NULL OR datetime(ka.expires_at) > datetime('now'))
    `, [token]);

    if (!row) return null;

    const parsed = {
        ...row,
        cv_metrics: parseStorageJSON(row.cv_metrics, {}),
        vision_analysis: parseStorageJSON(row.vision_analysis, {}),
        ai_insights: parseStorageJSON(row.ai_insights, {}),
        product_recommendations: parseStorageJSON(row.product_recommendations, []),
        skincare_routine: parseStorageJSON(row.skincare_routine, [])
    };

    return parsed;
};

const buildKioskResultHtml = (result, urls) => {
    const concerns = Array.isArray(result?.ai_insights?.priority_concerns)
        ? result.ai_insights.priority_concerns
        : [];
    const concernList = concerns.length > 0
        ? concerns.map((item) => `<li><strong>${escapeHtml(item.concern)}:</strong> ${escapeHtml(item.advice || '')}</li>`).join('')
        : '<li>Tidak ada concern prioritas tinggi terdeteksi.</li>';

    return `
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hasil Analisa Kulit</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f8f3f6; color: #3d2631; }
    .card { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 12px 40px rgba(61,38,49,.08); }
    h1 { margin: 0 0 10px; color: #7a3f59; }
    .meta { color: #7b6570; margin-bottom: 20px; }
    .score { font-size: 48px; font-weight: 700; color: #9d5a76; margin: 10px 0 16px; }
    .btn { display: inline-block; margin-top: 14px; padding: 10px 16px; border-radius: 10px; background: #9d5a76; color: #fff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hasil Analisa Kulit</h1>
    <div class="meta">Kode: ${escapeHtml(result.result_token)} | Nama: ${escapeHtml(result.visitor_name)} | Gender: ${escapeHtml(result.gender)}</div>
    <div class="score">${Math.round(toNumber(result.overall_score, 0))}/100</div>
    <p><strong>Skin Type:</strong> ${escapeHtml(result.skin_type || 'Unknown')} | <strong>Fitzpatrick:</strong> ${escapeHtml(result.fitzpatrick_type || '-')}</p>
    <p>${escapeHtml(result.result_summary || result.ai_insights?.summary || '-')}</p>
    <h3>Prioritas Perawatan</h3>
    <ul>${concernList}</ul>
    <a class="btn" href="${escapeHtml(urls.public_pdf_url)}">Unduh PDF Hasil</a>
  </div>
</body>
</html>
`.trim();
};

const requireAdminAuth = (req, res, next) => {
    const token = getBearerToken(req);

    if (!token) {
        if (ADMIN_REQUIRE_BEARER) {
            return res.status(401).json({ error: 'Admin bearer token required' });
        }
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: admin token required' });
        }

        const isAdminWriteRoute = req.originalUrl?.startsWith('/api/v2/admin');
        const method = String(req.method || '').toUpperCase();
        const isUnsafeMethod = UNSAFE_HTTP_METHODS.has(method);
        if (ADMIN_REQUIRE_CSRF && isAdminWriteRoute && isUnsafeMethod) {
            if (!decoded.csrf) {
                return res.status(401).json({ error: 'Admin token missing CSRF claim. Please login again.' });
            }
            const csrfHeader = String(req.headers[ADMIN_CSRF_HEADER] || '').trim();
            if (!csrfHeader || csrfHeader !== decoded.csrf) {
                return res.status(403).json({ error: 'Invalid CSRF token' });
            }
        }

        req.admin = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired admin token' });
    }
};

const addColumnIfMissing = async (tableName, columnName, definition) => {
    try {
        // Check if column exists in MySQL
        const columns = await dbAll(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = ?
        `, [tableName, columnName]);
        
        if (columns.length === 0) {
            await dbRun(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
            console.log(`✅ Added column ${tableName}.${columnName}`);
        }
    } catch (error) {
        console.warn(`⚠️  Could not add column ${columnName} to ${tableName}:`, error.message);
    }
};

const addIndexIfMissing = async (tableName, indexName, columns, unique = false) => {
    try {
        // Check if index exists in MySQL
        const indexes = await dbAll(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ? 
            AND INDEX_NAME = ?
        `, [tableName, indexName]);
        
        if (indexes.length === 0) {
            const uniqueKeyword = unique ? 'UNIQUE' : '';
            await dbRun(`CREATE ${uniqueKeyword} INDEX ${indexName} ON ${tableName}(${columns})`);
            console.log(`✅ Added index ${indexName} on ${tableName}`);
        }
    } catch (error) {
        console.warn(`⚠️  Could not add index ${indexName} to ${tableName}:`, error.message);
    }
};

const ensureAuthSchema = async () => {
    await addColumnIfMissing('users', 'password_hash', 'TEXT');
    await addColumnIfMissing('users', 'auth_provider', "TEXT DEFAULT 'email'");
    await addColumnIfMissing('users', 'google_id', 'TEXT');
    await addColumnIfMissing('users', 'avatar_url', 'TEXT');
    await addColumnIfMissing('users', 'email_verified', 'INTEGER DEFAULT 0');
    await addColumnIfMissing('users', 'last_login', 'TIMESTAMP');

    await addColumnIfMissing('admins', 'hashed_password', 'TEXT');
    await addColumnIfMissing('admins', 'last_login', 'TIMESTAMP');

    await addColumnIfMissing('products', 'is_featured', 'INTEGER DEFAULT 0');
    await addColumnIfMissing('products', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    await addColumnIfMissing('articles', 'slug', 'TEXT');
    await addColumnIfMissing('articles', 'status', "TEXT DEFAULT 'published'");
    await addColumnIfMissing('articles', 'featured_image', 'TEXT');
    await addColumnIfMissing('articles', 'published_at', 'TIMESTAMP');
    await addColumnIfMissing('articles', 'is_featured', 'INTEGER DEFAULT 0');
    await addColumnIfMissing('articles', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

    await addColumnIfMissing('banners', 'link_text', 'TEXT');
    await addColumnIfMissing('banners', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('analyses', 'client_session_id', 'TEXT');

    await addIndexIfMissing('users', 'idx_users_google_id', 'google_id', true);
    await addIndexIfMissing('articles', 'idx_articles_slug', 'slug');
    // Note: MySQL doesn't support partial indexes like SQLite's WHERE clause
    // await addIndexIfMissing('analyses', 'idx_analyses_user_session_unique', 'user_id, client_session_id', true);

    // Cleanup legacy duplicate analyses (same user + same created_at second, keep newest)
    const duplicateAnalyses = await dbAll(`
        SELECT a.id, a.image_url, a.visualization_url
        FROM analyses a
        INNER JOIN (
            SELECT user_id, created_at, MAX(id) AS keep_id
            FROM analyses
            WHERE client_session_id IS NULL AND IFNULL(is_deleted, 0) = 0
            GROUP BY user_id, created_at
            HAVING COUNT(*) > 1
        ) d ON d.user_id = a.user_id AND d.created_at = a.created_at
        WHERE a.id <> d.keep_id
    `);
    for (const row of duplicateAnalyses) {
        if (row.image_url) deleteImageFile(row.image_url);
        if (row.visualization_url) deleteImageFile(row.visualization_url);
    }
    if (duplicateAnalyses.length > 0) {
        const placeholders = duplicateAnalyses.map(() => '?').join(', ');
        await dbRun(`DELETE FROM analyses WHERE id IN (${placeholders})`, duplicateAnalyses.map((row) => row.id));
    }

    // Tables are now created by init-database.js script
    console.log('✅ Database schema validation complete');

    await addColumnIfMissing('kiosk_sessions', 'device_id', 'TEXT');
    await addColumnIfMissing('kiosk_sessions', 'visitor_name', "TEXT NOT NULL DEFAULT 'Guest'");
    await addColumnIfMissing('kiosk_sessions', 'gender', "TEXT NOT NULL DEFAULT 'other'");
    await addColumnIfMissing('kiosk_sessions', 'whatsapp', 'TEXT');
    await addColumnIfMissing('kiosk_sessions', 'status', "TEXT DEFAULT 'started'");
    await addColumnIfMissing('kiosk_sessions', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addColumnIfMissing('kiosk_sessions', 'completed_at', 'TIMESTAMP');

    await addColumnIfMissing('kiosk_analyses', 'result_token', 'TEXT');
    await addColumnIfMissing('kiosk_analyses', 'result_summary', 'TEXT');
    await addColumnIfMissing('kiosk_analyses', 'delivery_status', "TEXT DEFAULT 'pending'");
    await addColumnIfMissing('kiosk_analyses', 'delivery_channel', 'TEXT');
    await addColumnIfMissing('kiosk_analyses', 'delivered_at', 'TIMESTAMP');
    await addColumnIfMissing('kiosk_analyses', 'expires_at', 'TIMESTAMP');

    // Cleanup historical duplicate analyses per session (keep newest)
    const duplicateRows = await dbAll(`
        SELECT ka.id, ka.image_url, ka.visualization_url
        FROM kiosk_analyses ka
        INNER JOIN (
            SELECT session_id, MAX(id) AS keep_id
            FROM kiosk_analyses
            GROUP BY session_id
            HAVING COUNT(*) > 1
        ) d ON d.session_id = ka.session_id
        WHERE ka.id <> d.keep_id
    `);
    for (const row of duplicateRows) {
        if (row.image_url) deleteImageFile(row.image_url);
        if (row.visualization_url) deleteImageFile(row.visualization_url);
    }
    if (duplicateRows.length > 0) {
        const placeholders = duplicateRows.map(() => '?').join(', ');
        await dbRun(`DELETE FROM kiosk_analyses WHERE id IN (${placeholders})`, duplicateRows.map((row) => row.id));
    }

    await addIndexIfMissing('kiosk_sessions', 'idx_kiosk_sessions_uuid', 'session_uuid', true);
    await addIndexIfMissing('kiosk_analyses', 'idx_kiosk_analyses_token', 'result_token', true);
    await addIndexIfMissing('kiosk_analyses', 'idx_kiosk_analyses_session_unique', 'session_id', true);
    await addIndexIfMissing('kiosk_analyses', 'idx_kiosk_analyses_session_id', 'session_id');
    await addIndexIfMissing('kiosk_analyses', 'idx_kiosk_analyses_created_at', 'created_at');

    const defaultSettings = [
        {
            key: 'app.name',
            value: 'Cantik AI Skin Analyzer',
            value_type: 'string',
            category: 'general',
            description: 'Nama aplikasi',
            is_public: 1
        },
        {
            key: 'app.tagline',
            value: 'cantik.ai asisten kulit sehatmu',
            value_type: 'string',
            category: 'general',
            description: 'Tagline di beranda',
            is_public: 1
        },
        {
            key: 'feature.allow_guest',
            value: 'true',
            value_type: 'boolean',
            category: 'feature',
            description: 'Izinkan mode guest',
            is_public: 1
        },
        {
            key: 'feature.enable_google_login',
            value: 'true',
            value_type: 'boolean',
            category: 'feature',
            description: 'Aktifkan tombol Google login',
            is_public: 1
        },
        {
            key: 'theme.primary_color',
            value: '#9d5a76',
            value_type: 'string',
            category: 'design',
            description: 'Warna utama UI',
            is_public: 1
        },
        {
            key: 'theme.primary_hover',
            value: '#8c4f69',
            value_type: 'string',
            category: 'design',
            description: 'Warna hover tombol utama',
            is_public: 1
        },
        {
            key: 'theme.primary_light',
            value: '#c084a0',
            value_type: 'string',
            category: 'design',
            description: 'Warna gradient kedua',
            is_public: 1
        },
        {
            key: 'kiosk.auto_reset_seconds',
            value: '90',
            value_type: 'number',
            category: 'kiosk',
            description: 'Auto reset halaman hasil kiosk (detik)',
            is_public: 0
        },
        {
            key: 'kiosk.idle_timeout_seconds',
            value: '180',
            value_type: 'number',
            category: 'kiosk',
            description: 'Timeout idle kiosk untuk reset sesi (detik)',
            is_public: 0
        }
    ];

    const insertSettingStmt = `
        INSERT INTO app_settings (\`key\`, \`value\`, value_type, category, description, is_public)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE \`key\` = \`key\`
    `;

    for (const setting of defaultSettings) {
        await dbRun(insertSettingStmt, [
            setting.key,
            setting.value,
            setting.value_type,
            setting.category,
            setting.description,
            setting.is_public
        ]);
    }

    const usersNeedingHash = await dbAll(`
        SELECT id, password
        FROM users
        WHERE (password_hash IS NULL OR password_hash = '')
        AND password IS NOT NULL
        AND password != ''
    `);
    for (const user of usersNeedingHash) {
        const hash = bcrypt.hashSync(user.password, 10);
        await dbRun(
            "UPDATE users SET password_hash = ?, auth_provider = COALESCE(auth_provider, 'email') WHERE id = ?",
            [hash, user.id]
        );
    }
    if (usersNeedingHash.length > 0) {
        console.log(`✅ Backfilled password hash for ${usersNeedingHash.length} users`);
    }

    const adminsNeedingHash = await dbAll(`
        SELECT id, password
        FROM admins
        WHERE (hashed_password IS NULL OR hashed_password = '')
        AND password IS NOT NULL
        AND password != ''
    `);
    for (const admin of adminsNeedingHash) {
        const hash = bcrypt.hashSync(admin.password, 10);
        await dbRun('UPDATE admins SET hashed_password = ? WHERE id = ?', [hash, admin.id]);
    }
    if (adminsNeedingHash.length > 0) {
        console.log(`✅ Backfilled password hash for ${adminsNeedingHash.length} admins`);
    }

    const adminCount = await dbGet('SELECT COUNT(*) as count FROM admins');
    if (!adminCount || adminCount.count === 0) {
        const defaultPassword = 'admin123';
        const defaultHash = bcrypt.hashSync(defaultPassword, 10);
        await dbRun(
            'INSERT INTO admins (username, password, hashed_password, email, role) VALUES (?, ?, ?, ?, ?)',
            ['admin', defaultPassword, defaultHash, 'admin@cantikai.com', 'super_admin']
        );
        console.log('✅ Default admin created (username: admin, password: admin123)');
    }
};

// Middleware sudah dikonfigurasi di atas, tidak perlu duplikat

app.use('/api/v2/admin', (req, res, next) => {
    if (!ADMIN_ENFORCE_ORIGIN || req.method === 'OPTIONS') {
        return next();
    }

    const method = String(req.method || '').toUpperCase();
    if (!UNSAFE_HTTP_METHODS.has(method)) {
        return next();
    }

    const origin = String(req.headers.origin || '').trim();
    if (!origin) {
        if (ADMIN_ORIGIN_STRICT) {
            return res.status(403).json({ error: 'Missing Origin header for admin write request' });
        }
        return next();
    }

    if (!isAllowedOrigin(origin)) {
        return res.status(403).json({ error: `Origin ${origin} is not allowed for admin route` });
    }

    return next();
});

app.use((error, req, res, next) => {
    if (error?.message && error.message.includes('not allowed by CORS')) {
        return res.status(403).json({ error: error.message });
    }
    return next(error);
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images from backend/uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Backend is running',
        version: '1.0.0',
        database: 'connected'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Cantik AI Backend',
        version: '1.0.0',
        status: 'operational',
        endpoints: {
            health: '/health',
            auth: '/api/v2/auth/*',
            users: '/api/v2/users',
            analyses: '/api/v2/analysis',
            kiosk: '/api/v2/kiosk/*',
            products: '/api/v2/products',
            articles: '/api/v2/articles',
            banners: '/api/v2/banners',
            chat: '/api/v2/chat',
            admin: '/api/v2/admin/*'
        }
    });
});

// Public app settings (safe keys only)
app.get('/api/v2/settings/public', async (req, res) => {
    try {
        const rows = await dbAll(
            'SELECT `key`, `value`, value_type, category, description, is_public, updated_at FROM app_settings WHERE is_public = 1 ORDER BY category, `key`'
        );

        const settings = rows.map(normalizeSettingRow);
        const map = {};
        settings.forEach((setting) => {
            map[setting.key] = setting.parsed_value;
        });

        res.json({
            settings,
            map
        });
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== AUTH ENDPOINTS ====================

const isValidEmail = (email) => {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Register with email + password
app.post('/api/v2/auth/register', async (req, res) => {
    try {
        const { email, password, name, age, gender, skin_type } = req.body;

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Email tidak valid' });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password minimal 8 karakter' });
        }

        const existing = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing) {
            // Legacy upgrade path: accounts auto-created with temp123 can be claimed via register
            let canClaimLegacy = false;
            if (existing.password_hash) {
                canClaimLegacy = bcrypt.compareSync('temp123', existing.password_hash);
            } else if (existing.password) {
                canClaimLegacy = existing.password === 'temp123';
            }

            if (!canClaimLegacy) {
                return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
            }

            const claimedHash = bcrypt.hashSync(password, 10);
            await dbRun(`
                UPDATE users
                SET name = ?,
                    password = '',
                    password_hash = ?,
                    auth_provider = 'email',
                    email_verified = 1,
                    last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [name?.trim() || existing.name || email.split('@')[0], claimedHash, existing.id]);

            const claimedUser = await dbGet('SELECT * FROM users WHERE id = ?', [existing.id]);
            return res.json({
                message: 'Akun lama berhasil diaktivasi',
                user: sanitizeUser(claimedUser),
                token: createUserToken(claimedUser)
            });
        }

        const safeName = (name || email.split('@')[0] || 'User').trim();
        const passwordHash = bcrypt.hashSync(password, 10);

        const result = await dbRun(`
            INSERT INTO users (
                email, name, password, password_hash, age, gender, skin_type,
                auth_provider, email_verified, last_login
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'email', 1, CURRENT_TIMESTAMP)
        `, [
            email.toLowerCase(),
            safeName,
            '',
            passwordHash,
            age || null,
            gender || null,
            skin_type || null
        ]);

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
        const token = createUserToken(user);

        res.json({
            message: 'Akun berhasil dibuat',
            user: sanitizeUser(user),
            token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login with email + password
app.post('/api/v2/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!isValidEmail(email) || !password) {
            return res.status(400).json({ error: 'Email dan password wajib diisi' });
        }

        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
        if (!user) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        if ((!user.password_hash && (!user.password || user.password === '')) && user.auth_provider === 'google') {
            return res.status(400).json({ error: 'Akun ini terdaftar via Google. Silakan login dengan Google.' });
        }

        let isValid = false;
        let nextHash = user.password_hash;

        if (user.password_hash) {
            isValid = bcrypt.compareSync(password, user.password_hash);
        } else if (user.password) {
            // Legacy fallback: migrate plaintext password on successful login
            isValid = password === user.password;
            if (isValid) {
                nextHash = bcrypt.hashSync(password, 10);
            }
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        await dbRun(`
            UPDATE users
            SET password_hash = COALESCE(?, password_hash),
                auth_provider = COALESCE(auth_provider, 'email'),
                last_login = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [nextHash, user.id]);

        const updatedUser = await dbGet('SELECT * FROM users WHERE id = ?', [user.id]);
        const token = createUserToken(updatedUser);

        res.json({
            message: 'Login berhasil',
            user: sanitizeUser(updatedUser),
            token
        });
    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Sign-In (ID token verification)
app.post('/api/v2/auth/google', async (req, res) => {
    try {
        const credential = req.body?.credential || req.body?.idToken;

        if (!credential) {
            return res.status(400).json({ error: 'Google credential tidak ditemukan' });
        }

        if (!googleClient || !GOOGLE_CLIENT_ID) {
            return res.status(400).json({
                error: 'Google login belum dikonfigurasi di backend (GOOGLE_CLIENT_ID)'
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if (!payload?.email || payload.email_verified !== true) {
            return res.status(400).json({ error: 'Akun Google tidak valid atau email belum terverifikasi' });
        }

        const normalizedEmail = payload.email.toLowerCase();
        let user = await dbGet('SELECT * FROM users WHERE google_id = ? OR email = ?', [payload.sub, normalizedEmail]);

        if (!user) {
            const result = await dbRun(`
                INSERT INTO users (
                    email, name, password, password_hash, auth_provider,
                    google_id, avatar_url, email_verified, last_login
                )
                VALUES (?, ?, '', '', 'google', ?, ?, 1, CURRENT_TIMESTAMP)
            `, [
                normalizedEmail,
                payload.name || normalizedEmail.split('@')[0],
                payload.sub,
                payload.picture || null
            ]);

            user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
        } else {
            await dbRun(`
                UPDATE users
                SET name = COALESCE(?, name),
                    auth_provider = 'google',
                    google_id = ?,
                    avatar_url = COALESCE(?, avatar_url),
                    email_verified = 1,
                    last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [payload.name || null, payload.sub, payload.picture || null, user.id]);

            user = await dbGet('SELECT * FROM users WHERE id = ?', [user.id]);
        }

        const token = createUserToken(user);
        res.json({
            message: 'Login Google berhasil',
            user: sanitizeUser(user),
            token
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ error: 'Verifikasi Google gagal. Coba lagi.' });
    }
});

// Get profile from JWT
app.get('/api/v2/auth/me', async (req, res) => {
    try {
        const token = getBearerToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'admin') {
            const admin = await dbGet('SELECT * FROM admins WHERE id = ?', [decoded.sub]);
            if (!admin) return res.status(404).json({ error: 'Admin not found' });
            return res.json({ admin: sanitizeAdmin(admin) });
        }

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.sub]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        return res.json({ user: sanitizeUser(user) });
    } catch (error) {
        return res.status(401).json({ error: 'Token tidak valid atau sudah expired' });
    }
});

// ==================== USER ENDPOINTS ====================

// Create user
app.post('/api/v2/users/create', async (req, res) => {
    try {
        const { email, name, password, age, gender, skin_type } = req.body;
        const normalizedEmail = (email || '').toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Email tidak valid' });
        }

        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
        if (existing) {
            return res.status(409).json({ error: 'Email sudah digunakan' });
        }

        const safeName = (name || normalizedEmail.split('@')[0] || 'User').trim();
        const safePassword = password || `temp_${Date.now()}`;
        const passwordHash = bcrypt.hashSync(safePassword, 10);

        const result = await dbRun(`
            INSERT INTO users (
                email, name, password, password_hash, age, gender, skin_type,
                auth_provider, email_verified, last_login
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'email', 1, CURRENT_TIMESTAMP)
        `, [
            normalizedEmail,
            safeName,
            '',
            passwordHash,
            age || 25,
            gender || 'female',
            skin_type || 'normal'
        ]);

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
app.get('/api/v2/users/:id', async (req, res) => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user by email
app.get('/api/v2/users/email/:email', async (req, res) => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [req.params.email]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Get user by email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user
app.put('/api/v2/users/:id', requireAuthenticatedUser, async (req, res) => {
    try {
        const targetUserId = Number.parseInt(req.params.id, 10);
        if (!Number.isFinite(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        if (!canAccessUserResource(req.auth, targetUserId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { name, age, gender, skin_type, password } = req.body;
        
        const updates = [];
        const values = [];
        
        if (name !== undefined && name !== '') { 
            updates.push('name = ?'); 
            values.push(name); 
        }
        if (age !== undefined) { 
            // Handle empty string or invalid age values
            let ageValue = null;
            if (age !== '' && age !== null && !isNaN(Number(age))) {
                ageValue = Number(age);
            }
            updates.push('age = ?'); 
            values.push(ageValue); 
        }
        if (gender !== undefined) { 
            // Handle empty string for gender
            const genderValue = (gender === '' || gender === null) ? null : gender;
            updates.push('gender = ?'); 
            values.push(genderValue); 
        }
        if (skin_type !== undefined && skin_type !== '') { 
            updates.push('skin_type = ?'); 
            values.push(skin_type); 
        }
        if (password !== undefined) {
            updates.push('password = ?');
            values.push('');
            updates.push('password_hash = ?');
            values.push(bcrypt.hashSync(password, 10));
            updates.push('auth_provider = IFNULL(auth_provider, ?)');
            values.push('email');
        }

        if (updates.length === 0) {
            const current = await dbGet('SELECT * FROM users WHERE id = ?', [targetUserId]);
            return res.json(sanitizeUser(current));
        }
        
        values.push(targetUserId);
        
        await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [targetUserId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(sanitizeUser(user));
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete user
app.delete('/api/v2/users/:id', requireAuthenticatedUser, async (req, res) => {
    try {
        const targetUserId = Number.parseInt(req.params.id, 10);
        if (!Number.isFinite(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        if (!canAccessUserResource(req.auth, targetUserId)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const existing = await dbGet('SELECT id FROM users WHERE id = ?', [targetUserId]);
        if (!existing) {
            return res.status(404).json({ error: 'User not found' });
        }

        await dbRun('DELETE FROM users WHERE id = ?', [targetUserId]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ANALYSIS ENDPOINTS ====================

// Save analysis
app.post('/api/v2/analysis/save', async (req, res) => {
    let imagePath = null;
    let visualizationPath = null;
    let savedAnalysisId = null;
    try {
        console.log('📥 Saving analysis...');
        const { 
            user_id, 
            image_base64, 
            visualization_base64,
            overall_score, 
            skin_type, 
            fitzpatrick_type,
            predicted_age,
            analysis_version,
            engine,
            processing_time_ms,
            client_session_id,
            analysis_data, 
            ai_insights 
        } = req.body;
        
        // Validate required fields
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        // Idempotency guard: if this client session already saved, return existing row
        const normalizedSessionId = String(client_session_id || '').trim() || null;
        if (normalizedSessionId) {
            const existing = await dbGet(
                `SELECT *
                 FROM analyses
                 WHERE user_id = ? AND client_session_id = ? AND IFNULL(is_deleted, 0) = 0
                 ORDER BY id DESC
                 LIMIT 1`,
                [user_id, normalizedSessionId]
            );
            if (existing) {
                if (existing.cv_metrics) existing.cv_metrics = safeParseJSON(existing.cv_metrics, {});
                if (existing.vision_analysis) existing.vision_analysis = safeParseJSON(existing.vision_analysis, {});
                if (existing.ai_insights) existing.ai_insights = safeParseJSON(existing.ai_insights, {});
                return res.json(existing);
            }
        }
        
        // Save images to file system (not database!)
        if (image_base64) {
            imagePath = saveImageToFile(image_base64, user_id, 'original');
            console.log('✅ Original image saved to:', imagePath);
        }
        
        if (visualization_base64) {
            visualizationPath = saveImageToFile(visualization_base64, user_id, 'visualization');
            console.log('✅ Visualization image saved to:', visualizationPath);
        }
        
        // Extract data from analysis_data (handle if already stringified)
        let analysisDataObj = analysis_data;
        if (typeof analysis_data === 'string') {
            try {
                analysisDataObj = JSON.parse(analysis_data);
            } catch {
                analysisDataObj = {};
            }
        }
        
        const cvMetrics = analysisDataObj?.cv_metrics || analysisDataObj?.metrics || {};
        const visionAnalysis = analysisDataObj?.vision_analysis || analysisDataObj?.vision || analysisDataObj || {};
        
        // Extract additional fields from analysis_data if not provided directly
        const finalFitzpatrickType = fitzpatrick_type || analysisDataObj?.fitzpatrick_type || visionAnalysis?.fitzpatrick_type || 'III';
        const finalPredictedAge = predicted_age || 
                                  analysisDataObj?.predicted_age || 
                                  visionAnalysis?.age_prediction?.predicted_age || 
                                  analysisDataObj?.age_prediction?.predicted_age || 
                                  25;
        const finalAnalysisVersion = analysis_version || analysisDataObj?.analysis_version || '6.0';
        const finalEngine = engine || analysisDataObj?.engine || 'AI Analysis';
        const finalProcessingTime = processing_time_ms || analysisDataObj?.processing_time_ms || analysisDataObj?.processing_time || 0;
        
        // Safe JSON stringify function - handle already stringified data
        const safeStringify = (obj) => {
            try {
                if (typeof obj === 'string') {
                    // Check if it's already a valid JSON string
                    if (obj === '[object Object]') {
                        return JSON.stringify({});
                    }
                    try {
                        // If it's already valid JSON, return as is
                        JSON.parse(obj);
                        return obj;
                    } catch {
                        // If parsing fails, it's a plain string, wrap in quotes
                        return JSON.stringify(obj);
                    }
                }
                if (obj === null || obj === undefined) {
                    return JSON.stringify({});
                }
                return JSON.stringify(obj);
            } catch (error) {
                console.warn('JSON stringify error:', error);
                return JSON.stringify({});
            }
        };

        // Handle analysis_data and ai_insights that might already be stringified
        const processAnalysisField = (field) => {
            if (typeof field === 'string') {
                // Already stringified from frontend
                return field === '[object Object]' ? JSON.stringify({}) : field;
            }
            return safeStringify(field);
        };

        const result = await dbRun(`
            INSERT INTO analyses (
                user_id, image_url, visualization_url, overall_score, skin_type,
                fitzpatrick_type, predicted_age, analysis_version, engine, processing_time_ms,
                cv_metrics, vision_analysis, ai_insights, client_session_id, product_recommendations
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user_id,
            imagePath || '',
            visualizationPath || '',
            overall_score || 0,
            skin_type || 'Unknown',
            finalFitzpatrickType,
            finalPredictedAge,
            finalAnalysisVersion,
            finalEngine,
            finalProcessingTime,
            safeStringify(cvMetrics),
            safeStringify(visionAnalysis),
            processAnalysisField(ai_insights),
            normalizedSessionId,
            '[]' // placeholder untuk product_recommendations
        ]);
        savedAnalysisId = result.lastID;
        
        console.log('✅ Analysis saved with ID:', result.lastID);
        
        const analysis = await dbGet('SELECT * FROM analyses WHERE id = ?', [result.lastID]);
        
        // Parse JSON fields with better error handling
        if (analysis.cv_metrics) {
            analysis.cv_metrics = safeParseJSON(analysis.cv_metrics, {});
        }
        if (analysis.vision_analysis) {
            analysis.vision_analysis = safeParseJSON(analysis.vision_analysis, {});
        }
        if (analysis.ai_insights) {
            analysis.ai_insights = safeParseJSON(analysis.ai_insights, {});
        }
        
        // Handle product recommendations - preserve Beautylatory products if provided
        try {
            let finalProductRecommendations = [];
            
            // Check if frontend already provided Beautylatory product recommendations
            const frontendRecommendations = analysisDataObj?.product_recommendations || 
                                          visionAnalysis?.product_recommendations ||
                                          analysisDataObj?.ai_report?.product_recommendations;
            
            if (frontendRecommendations && Array.isArray(frontendRecommendations) && frontendRecommendations.length > 0) {
                // Use Beautylatory products from frontend
                finalProductRecommendations = frontendRecommendations;
                console.log('✅ Using Beautylatory product recommendations from frontend:', finalProductRecommendations.length);
            } else {
                // Fallback to local database products
                const analysisForRec = {
                    skin_type: analysis.skin_type,
                    scores: analysis.vision_analysis?.scores || {},
                    priority_concerns: analysis.vision_analysis?.priority_concerns || []
                };
                const localProducts = await getProductRecommendations(dbAll, analysisForRec);
                if (localProducts.length > 0) {
                    finalProductRecommendations = localProducts;
                    console.log('✅ Using local database product recommendations:', finalProductRecommendations.length);
                }
            }
            
            if (finalProductRecommendations.length > 0) {
                analysis.product_recommendations = finalProductRecommendations;
                // Update database with recommendations
                await dbRun(
                    'UPDATE analyses SET product_recommendations = ? WHERE id = ?',
                    [JSON.stringify(finalProductRecommendations), result.lastID]
                );
            }
        } catch (recError) {
            console.warn('⚠️ Error handling product recommendations:', recError.message);
        }
        
        res.json(analysis);
    } catch (error) {
        if (!savedAnalysisId) {
            if (imagePath) deleteImageFile(imagePath);
            if (visualizationPath) deleteImageFile(visualizationPath);
        }
        if (String(error?.message || '').includes('UNIQUE constraint failed: analyses.user_id, analyses.client_session_id')) {
            try {
                const { user_id, client_session_id } = req.body || {};
                const normalizedSessionId = String(client_session_id || '').trim();
                if (user_id && normalizedSessionId) {
                    const existing = await dbGet(
                        `SELECT *
                         FROM analyses
                         WHERE user_id = ? AND client_session_id = ? AND IFNULL(is_deleted, 0) = 0
                         ORDER BY id DESC
                         LIMIT 1`,
                        [user_id, normalizedSessionId]
                    );
                    if (existing) {
                        if (existing.cv_metrics) existing.cv_metrics = safeParseJSON(existing.cv_metrics, {});
                        if (existing.vision_analysis) existing.vision_analysis = safeParseJSON(existing.vision_analysis, {});
                        if (existing.ai_insights) existing.ai_insights = safeParseJSON(existing.ai_insights, {});
                        return res.json(existing);
                    }
                }
            } catch (dedupeError) {
                console.error('❌ Save analysis dedupe recovery error:', dedupeError);
            }
        }
        console.error('❌ Save analysis error:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Get analyses by user ID
app.get('/api/v2/analysis/history/:userId', async (req, res) => {
    try {
        const analyses = await dbAll('SELECT * FROM analyses WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC', [req.params.userId]);
        
        // Parse JSON fields and convert image paths to base64
        analyses.forEach(analysis => {
            if (analysis.cv_metrics) analysis.cv_metrics = safeParseJSON(analysis.cv_metrics, {});
            if (analysis.vision_analysis) analysis.vision_analysis = safeParseJSON(analysis.vision_analysis, {});
            if (analysis.ai_insights) analysis.ai_insights = safeParseJSON(analysis.ai_insights, {});
            if (analysis.product_recommendations) analysis.product_recommendations = safeParseJSON(analysis.product_recommendations, []);
            if (analysis.skincare_routine) analysis.skincare_routine = safeParseJSON(analysis.skincare_routine, {});
            
            // Convert image paths to base64 for frontend
            if (analysis.image_url && !analysis.image_url.startsWith('data:')) {
                try {
                    analysis.image_url = readImageAsBase64(analysis.image_url);
                } catch (err) {
                    console.warn('⚠️ Could not read image:', analysis.image_url);
                }
            }
            
            if (analysis.visualization_url && !analysis.visualization_url.startsWith('data:')) {
                try {
                    analysis.visualization_url = readImageAsBase64(analysis.visualization_url);
                } catch (err) {
                    console.warn('⚠️ Could not read visualization:', analysis.visualization_url);
                }
            }
        });
        
        res.json(analyses);
    } catch (error) {
        console.error('Get analyses error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get analysis by ID
app.get('/api/v2/analysis/:id', async (req, res) => {
    try {
        const analysis = await dbGet('SELECT * FROM analyses WHERE id = ? AND is_deleted = 0', [req.params.id]);
        
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        // Parse JSON fields
        if (analysis.cv_metrics) analysis.cv_metrics = safeParseJSON(analysis.cv_metrics, {});
        if (analysis.vision_analysis) analysis.vision_analysis = safeParseJSON(analysis.vision_analysis, {});
        if (analysis.ai_insights) analysis.ai_insights = safeParseJSON(analysis.ai_insights, {});
        if (analysis.product_recommendations) analysis.product_recommendations = safeParseJSON(analysis.product_recommendations, []);
        if (analysis.skincare_routine) analysis.skincare_routine = safeParseJSON(analysis.skincare_routine, {});
        
        // Convert image paths to base64 for frontend
        if (analysis.image_url && !analysis.image_url.startsWith('data:')) {
            try {
                analysis.image_url = readImageAsBase64(analysis.image_url);
            } catch (err) {
                console.warn('⚠️ Could not read image:', analysis.image_url);
            }
        }
        
        if (analysis.visualization_url && !analysis.visualization_url.startsWith('data:')) {
            try {
                analysis.visualization_url = readImageAsBase64(analysis.visualization_url);
            } catch (err) {
                console.warn('⚠️ Could not read visualization:', analysis.visualization_url);
            }
        }
        
        res.json(analysis);
    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete analysis
app.delete('/api/v2/analysis/:id', async (req, res) => {
    try {
        // Get analysis to find image paths
        const analysis = await dbGet('SELECT image_url, visualization_url FROM analyses WHERE id = ?', [req.params.id]);
        
        if (analysis) {
            // Delete image files
            if (analysis.image_url && !analysis.image_url.startsWith('data:')) {
                deleteImageFile(analysis.image_url);
            }
            if (analysis.visualization_url && !analysis.visualization_url.startsWith('data:')) {
                deleteImageFile(analysis.visualization_url);
            }
        }
        
        // Delete from database
        await dbRun('DELETE FROM analyses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
        console.error('Delete analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete all analyses by user ID
app.delete('/api/v2/analysis/user/:userId', async (req, res) => {
    try {
        const result = await dbRun('DELETE FROM analyses WHERE user_id = ?', [req.params.userId]);
        res.json({ message: `Deleted ${result.changes} analyses` });
    } catch (error) {
        console.error('Delete user analyses error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PRODUCT ENDPOINTS ====================

// Get all products
app.get('/api/v2/products', async (req, res) => {
    try {
        const products = await dbAll('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get product by ID
app.get('/api/v2/products/:id', async (req, res) => {
    try {
        const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ARTICLE ENDPOINTS ====================

// Get all articles
app.get('/api/v2/articles', async (req, res) => {
    try {
        const articles = await dbAll('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(articles);
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get article by ID
app.get('/api/v2/articles/:id', async (req, res) => {
    try {
        const article = await dbGet('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        res.json(article);
    } catch (error) {
        console.error('Get article error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== BANNER ENDPOINTS ====================

// Get all banners
app.get('/api/v2/banners', async (req, res) => {
    try {
        const banners = await dbAll('SELECT * FROM banners WHERE is_active = 1 ORDER BY display_order ASC, id ASC');
        res.json(banners);
    } catch (error) {
        console.error('Get banners error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== CHAT ENDPOINTS ====================

// Create chat session
app.post('/api/v2/chat/sessions', async (req, res) => {
    try {
        const { user_id, title } = req.body;
        const session_uuid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const result = await dbRun('INSERT INTO chat_sessions (user_id, title, session_uuid) VALUES (?, ?, ?)', [user_id, title || 'New Chat', session_uuid]);
        
        const session = await dbGet('SELECT * FROM chat_sessions WHERE id = ?', [result.lastID]);
        res.json(session);
    } catch (error) {
        console.error('Create chat session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get chat sessions by user ID with messages
app.get('/api/v2/chat/sessions/:userId', async (req, res) => {
    try {
        const sessions = await dbAll('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
        
        // Add messages to each session
        for (const session of sessions) {
            const messages = await dbAll('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [session.id]);
            session.messages = messages;
        }
        
        res.json(sessions);
    } catch (error) {
        console.error('Get chat sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get chat messages by session ID
app.get('/api/v2/chat/messages/:sessionId', async (req, res) => {
    try {
        const messages = await dbAll('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [req.params.sessionId]);
        res.json(messages);
    } catch (error) {
        console.error('Get chat messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send chat message (legacy endpoint)
app.post('/api/v2/chat/message', async (req, res) => {
    try {
        const { session_id, role, content } = req.body;
        
        const result = await dbRun('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)', [session_id, role, content]);
        
        const message = await dbGet('SELECT * FROM chat_messages WHERE id = ?', [result.lastID]);
        res.json(message);
    } catch (error) {
        console.error('Send chat message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send chat message to specific session
app.post('/api/v2/chat/sessions/:sessionId/messages', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { role, content } = req.body;
        
        // Check if session exists
        const session = await dbGet('SELECT * FROM chat_sessions WHERE id = ?', [sessionId]);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const result = await dbRun('INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)', [sessionId, role, content]);
        
        const message = await dbGet('SELECT * FROM chat_messages WHERE id = ?', [result.lastID]);
        res.json(message);
    } catch (error) {
        console.error('Send chat message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update session title
app.put('/api/v2/chat/sessions/:sessionId/title', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title } = req.query;
        
        await dbRun('UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title || 'New Chat', sessionId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Update session title error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get session detail with messages
app.get('/api/v2/chat/sessions/detail/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await dbGet('SELECT * FROM chat_sessions WHERE id = ?', [sessionId]);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        // Get messages for this session
        const messages = await dbAll('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId]);
        session.messages = messages;
        
        res.json(session);
    } catch (error) {
        console.error('Get session detail error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete chat session
app.delete('/api/v2/chat/sessions/:id', async (req, res) => {
    try {
        await dbRun('DELETE FROM chat_sessions WHERE id = ?', [req.params.id]);
        res.json({ message: 'Chat session deleted successfully' });
    } catch (error) {
        console.error('Delete chat session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PUBLIC ANALYSIS (DESKTOP/KIOSK) ====================

app.post('/api/v2/public/analyze', async (req, res) => {
    try {
        const { image_base64, mode = 'public' } = req.body || {};
        if (!String(image_base64 || '').trim()) {
            return res.status(400).json({ error: 'image_base64 is required' });
        }

        const analysis = await analyzeSkinWithGemini(image_base64, mode);
        const recommendedProducts = await dbAll(
            `SELECT id, name, brand, category, image_url, price
             FROM products
             WHERE is_active = 1
             ORDER BY is_featured DESC, rating DESC, id DESC
             LIMIT 6`
        );

        res.json({
            success: true,
            analysis,
            recommended_products: recommendedProducts
        });
    } catch (error) {
        console.error('Public analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== KIOSK ENDPOINTS ====================

const checkUploadsWritable = async () => {
    try {
        await fsPromises.mkdir(UPLOADS_ROOT_PATH, { recursive: true });
        await fsPromises.access(UPLOADS_ROOT_PATH, fsConstants.W_OK);
        return true;
    } catch {
        return false;
    }
};

app.get('/api/v2/kiosk/system/health', async (req, res) => {
    try {
        const dbPing = await dbGet('SELECT 1 as ok');
        const kioskTables = await dbAll(
            `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('kiosk_sessions', 'kiosk_analyses')`
        );
        const uploadsWritable = await checkUploadsWritable();

        return res.json({
            success: true,
            checks: {
                backend_ok: true,
                database_ok: Boolean(dbPing?.ok),
                kiosk_tables_ok: kioskTables.length === 2,
                uploads_writable: uploadsWritable
            },
            services: {
                gemini_configured: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
                groq_configured: Boolean(String(process.env.GROQ_API_KEY || '').trim()),
                whatsapp_configured: Boolean(WHATSAPP_WEBHOOK_URL)
            },
            metadata: {
                node_version: process.version,
                timestamp: new Date().toISOString(),
                device_hint: String(req.query.device_id || '').trim() || null,
                kiosk_public_base_url: KIOSK_PUBLIC_BASE_URL,
                uploads_path: UPLOADS_ROOT_PATH
            }
        });
    } catch (error) {
        console.error('Kiosk system health error:', error);
        return res.status(500).json({
            success: false,
            error: 'Gagal memuat status sistem kiosk.',
            detail: error.message
        });
    }
});

const getFallbackKioskProducts = async () => dbAll(
    `SELECT id, name, brand, category, image_url, price
     FROM products
     WHERE is_active = 1
     ORDER BY is_featured DESC, rating DESC, id DESC
     LIMIT 6`
);

const getLatestKioskAnalysisBySessionId = async (sessionId) => {
    return dbGet('SELECT * FROM kiosk_analyses WHERE session_id = ? ORDER BY id DESC LIMIT 1', [sessionId]);
};

const buildKioskAnalyzeResponsePayload = async (sessionRow, analysisRow, deliveryOverride = null) => {
    const recommendedProductsRaw = parseStorageJSON(analysisRow.product_recommendations, []);
    const recommendedProducts = Array.isArray(recommendedProductsRaw) && recommendedProductsRaw.length > 0
        ? recommendedProductsRaw
        : await getFallbackKioskProducts();
    const urls = buildKioskResultUrls(analysisRow.result_token);
    const insights = parseStorageJSON(analysisRow.ai_insights, {});
    const visionAnalysis = parseStorageJSON(analysisRow.vision_analysis, {});
    const scores = parseStorageJSON(analysisRow.cv_metrics, {});
    const analysisModes = Array.isArray(visionAnalysis.analysis_modes)
        ? visionAnalysis.analysis_modes
        : Array.isArray(insights.analysis_modes)
            ? insights.analysis_modes
            : buildDefaultAnalysisModes(scores, insights.priority_concerns, analysisRow.overall_score);
    const inputValidation = normalizeKioskInputValidation(
        visionAnalysis.input_validation || insights.input_validation || {}
    );
    const captureQuality = (visionAnalysis.capture_quality && typeof visionAnalysis.capture_quality === 'object')
        ? visionAnalysis.capture_quality
        : ((insights.capture_quality && typeof insights.capture_quality === 'object') ? insights.capture_quality : {});
    const deliveryStatus = deliveryOverride?.status || analysisRow.delivery_status || 'pending';

    return {
        success: true,
        session: {
            session_uuid: sessionRow.session_uuid,
            visitor_name: sessionRow.visitor_name,
            gender: sessionRow.gender,
            whatsapp_masked: maskWhatsappNumber(sessionRow.whatsapp),
            device_id: sessionRow.device_id
        },
        analysis: {
            id: analysisRow.id,
            overall_score: analysisRow.overall_score,
            skin_type: analysisRow.skin_type,
            fitzpatrick_type: analysisRow.fitzpatrick_type,
            predicted_age: analysisRow.predicted_age,
            summary: analysisRow.result_summary,
            scores,
            analysis_modes: analysisModes,
            input_validation: inputValidation,
            capture_quality: captureQuality,
            image_url: analysisRow.image_url || '',
            visualization_url: analysisRow.visualization_url || '',
            image_url_full: toKioskPublicAssetUrl(analysisRow.image_url),
            visualization_url_full: toKioskPublicAssetUrl(analysisRow.visualization_url),
            insights,
            recommended_products: recommendedProducts
        },
        delivery: {
            status: deliveryStatus,
            channel: analysisRow.delivery_channel || (sessionRow.whatsapp ? 'whatsapp' : 'none')
        },
        urls,
        expires_at: analysisRow.expires_at
    };
};

app.post('/api/v2/kiosk/sessions/start', async (req, res) => {
    try {
        const payload = req.body || {};
        const visitorName = String(payload.name || payload.visitor_name || '').trim();
        const gender = normalizeKioskGender(payload.gender);
        const whatsapp = normalizeWhatsappNumber(payload.whatsapp);
        const deviceId = String(payload.device_id || payload.deviceId || 'kiosk-default').trim();

        if (!visitorName || visitorName.length < 2) {
            return res.status(400).json({ error: 'Nama minimal 2 karakter' });
        }

        const sessionUuid = createKioskSessionUuid();
        const result = await dbRun(
            `INSERT INTO kiosk_sessions (session_uuid, device_id, visitor_name, gender, whatsapp, status)
             VALUES (?, ?, ?, ?, ?, 'started')`,
            [sessionUuid, deviceId || 'kiosk-default', visitorName, gender, whatsapp || null]
        );

        const session = await dbGet('SELECT * FROM kiosk_sessions WHERE id = ?', [result.lastID]);
        res.json({
            success: true,
            session: {
                ...session,
                whatsapp_masked: maskWhatsappNumber(session.whatsapp)
            }
        });
    } catch (error) {
        console.error('Kiosk session start error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v2/kiosk/sessions/:sessionUuid/analyze', async (req, res) => {
    let uploadedImagePath = '';
    let uploadedVisualizationPath = '';
    try {
        const sessionUuid = String(req.params.sessionUuid || '').trim();
        const payload = req.body || {};
        const imageBase64 = String(payload.image_base64 || '').trim();
        const waitForExistingAnalysis = async (sessionId, timeoutMs = 12000, intervalMs = 700) => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < timeoutMs) {
                const existing = await getLatestKioskAnalysisBySessionId(sessionId);
                if (existing) return existing;
                await sleep(intervalMs);
            }
            return null;
        };

        if (!sessionUuid) {
            return res.status(400).json({ error: 'sessionUuid is required' });
        }
        if (!imageBase64) {
            return res.status(400).json({ error: 'image_base64 is required' });
        }

        const session = await dbGet('SELECT * FROM kiosk_sessions WHERE session_uuid = ?', [sessionUuid]);
        if (!session) {
            return res.status(404).json({ error: 'Kiosk session not found' });
        }
        if (session.status === 'completed') {
            return res.status(409).json({ error: 'Session already completed' });
        }

        const lockResult = await dbRun(
            `UPDATE kiosk_sessions
             SET status = 'processing', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'started'`,
            [session.id]
        );
        if (lockResult.changes === 0) {
            const latestSession = await dbGet('SELECT * FROM kiosk_sessions WHERE id = ?', [session.id]);
            const existingAnalysis = await getLatestKioskAnalysisBySessionId(session.id);
            if (existingAnalysis) {
                const responsePayload = await buildKioskAnalyzeResponsePayload(latestSession || session, existingAnalysis, {
                    status: existingAnalysis.delivery_status || 'already_saved'
                });
                return res.json(responsePayload);
            }
            if ((latestSession?.status || '').toLowerCase() === 'processing') {
                const waitedAnalysis = await waitForExistingAnalysis(session.id);
                if (waitedAnalysis) {
                    const refreshedSession = await dbGet('SELECT * FROM kiosk_sessions WHERE id = ?', [session.id]);
                    const responsePayload = await buildKioskAnalyzeResponsePayload(refreshedSession || latestSession || session, waitedAnalysis, {
                        status: waitedAnalysis.delivery_status || 'already_saved'
                    });
                    return res.json(responsePayload);
                }
                return res.status(409).json({
                    error: 'Session is being processed, please wait',
                    code: 'SESSION_PROCESSING',
                    retry_after_ms: 1200
                });
            }
            return res.status(409).json({ error: `Session cannot be processed in status: ${latestSession?.status || 'unknown'}` });
        }

        const analysis = await analyzeSkinWithGemini(imageBase64, 'kiosk');
        analysis.input_validation = applyCaptureQualityGuard(
            analysis.input_validation,
            payload.capture_quality || {}
        );
        if (analysis.input_validation.is_valid_for_skin_analysis === false) {
            const invalidInputError = new Error(
                analysis.input_validation.retake_instruction
                || 'Foto belum valid untuk analisa kulit. Silakan ulangi scan.'
            );
            invalidInputError.code = 'INVALID_INPUT_QUALITY';
            invalidInputError.statusCode = 422;
            invalidInputError.details = analysis.input_validation;
            throw invalidInputError;
        }

        uploadedImagePath = saveImageToFile(imageBase64, `kiosk_${session.id}`, 'kiosk/original');
        if (String(payload.visualization_base64 || '').trim()) {
            uploadedVisualizationPath = saveImageToFile(payload.visualization_base64, `kiosk_${session.id}`, 'kiosk/visualization');
        }

        const resultToken = createKioskResultToken();
        const expiresAt = new Date(Date.now() + KIOSK_RESULT_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const resultUrls = buildKioskResultUrls(resultToken);

        const recommendedProducts = await getFallbackKioskProducts();

        const insertResult = await dbRun(`
            INSERT INTO kiosk_analyses (
                session_id, result_token, image_url, visualization_url, overall_score, skin_type,
                fitzpatrick_type, predicted_age, analysis_version, engine, processing_time_ms,
                cv_metrics, vision_analysis, ai_insights, product_recommendations, skincare_routine,
                result_summary, delivery_status, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            session.id,
            resultToken,
            uploadedImagePath || '',
            uploadedVisualizationPath || '',
            analysis.overall_score,
            analysis.skin_type,
            analysis.fitzpatrick_type,
            analysis.predicted_age,
            'kiosk-1.0',
            'gemini-2.5-flash',
            Number(payload.processing_time_ms || 0),
            toStorageJSON(analysis.scores),
            toStorageJSON({
                scores: analysis.scores,
                analysis_modes: analysis.analysis_modes,
                input_validation: analysis.input_validation,
                capture_quality: payload.capture_quality || {},
                concerns: analysis.priority_concerns,
                recommendations: analysis.recommendations
            }),
            toStorageJSON({
                summary: analysis.summary,
                analysis_modes: analysis.analysis_modes,
                input_validation: analysis.input_validation,
                capture_quality: payload.capture_quality || {},
                priority_concerns: analysis.priority_concerns,
                recommendations: analysis.recommendations
            }),
            toStorageJSON(recommendedProducts),
            toStorageJSON(analysis.recommendations),
            analysis.summary,
            'pending',
            expiresAt
        ]);

        await dbRun(
            `UPDATE kiosk_sessions
             SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [session.id]
        );

        const delivery = await sendKioskWhatsappDelivery({
            whatsapp: session.whatsapp,
            visitorName: session.visitor_name,
            resultUrl: resultUrls.public_result_url,
            pdfUrl: resultUrls.public_pdf_url,
            score: analysis.overall_score,
            summary: analysis.summary
        });

        await dbRun(
            `UPDATE kiosk_analyses
             SET delivery_status = ?, delivery_channel = ?, delivered_at = ?
             WHERE id = ?`,
            [
                delivery.status || 'pending',
                session.whatsapp ? 'whatsapp' : 'none',
                delivery.status === 'sent' ? new Date().toISOString() : null,
                insertResult.lastID
            ]
        );

        const saved = await dbGet('SELECT * FROM kiosk_analyses WHERE id = ?', [insertResult.lastID]);

        const responsePayload = await buildKioskAnalyzeResponsePayload(session, saved, delivery);
        responsePayload.urls = resultUrls;
        return res.json(responsePayload);
    } catch (error) {
        if (String(error?.message || '').includes('UNIQUE constraint failed: kiosk_analyses.session_id')) {
            const sessionUuid = String(req.params.sessionUuid || '').trim();
            try {
                const session = await dbGet('SELECT * FROM kiosk_sessions WHERE session_uuid = ?', [sessionUuid]);
                if (session) {
                    const existingAnalysis = await getLatestKioskAnalysisBySessionId(session.id);
                    if (existingAnalysis) {
                        if (uploadedImagePath) deleteImageFile(uploadedImagePath);
                        if (uploadedVisualizationPath) deleteImageFile(uploadedVisualizationPath);
                        const responsePayload = await buildKioskAnalyzeResponsePayload(session, existingAnalysis, {
                            status: existingAnalysis.delivery_status || 'already_saved'
                        });
                        return res.json(responsePayload);
                    }
                }
            } catch (constraintRecoveryError) {
                console.error('Kiosk analyze recovery error:', constraintRecoveryError);
            }
        }
        if (uploadedImagePath) deleteImageFile(uploadedImagePath);
        if (uploadedVisualizationPath) deleteImageFile(uploadedVisualizationPath);
        try {
            const sessionUuid = String(req.params.sessionUuid || '').trim();
            if (sessionUuid) {
                const session = await dbGet('SELECT * FROM kiosk_sessions WHERE session_uuid = ?', [sessionUuid]);
                if (session && session.status === 'processing') {
                    const existingAnalysis = await dbGet(
                        'SELECT id FROM kiosk_analyses WHERE session_id = ? ORDER BY id DESC LIMIT 1',
                        [session.id]
                    );
                    if (!existingAnalysis) {
                        await dbRun(
                            `UPDATE kiosk_sessions
                             SET status = 'started', updated_at = CURRENT_TIMESTAMP
                             WHERE id = ? AND status = 'processing'`,
                            [session.id]
                        );
                    }
                }
            }
        } catch (unlockError) {
            console.error('Kiosk analyze unlock error:', unlockError);
        }
        if (error?.code === 'INVALID_INPUT_QUALITY' || Number(error?.statusCode) === 422) {
            return res.status(422).json({
                error: error.message || 'Input gambar tidak valid untuk analisa kulit.',
                code: 'INVALID_INPUT_QUALITY',
                validation: error?.details || null
            });
        }
        console.error('Kiosk analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v2/kiosk/sessions/:sessionUuid/close', async (req, res) => {
    try {
        const sessionUuid = String(req.params.sessionUuid || '').trim();
        if (!sessionUuid) {
            return res.status(400).json({ error: 'sessionUuid is required' });
        }

        const session = await dbGet('SELECT * FROM kiosk_sessions WHERE session_uuid = ?', [sessionUuid]);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await dbRun(
            `UPDATE kiosk_sessions
             SET status = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            ['closed', session.id]
        );

        res.json({ success: true, session_uuid: sessionUuid, status: 'closed' });
    } catch (error) {
        console.error('Kiosk close session error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v2/kiosk/sessions/:sessionUuid/result', async (req, res) => {
    try {
        const sessionUuid = String(req.params.sessionUuid || '').trim();
        if (!sessionUuid) {
            return res.status(400).json({ error: 'sessionUuid is required' });
        }

        const session = await dbGet('SELECT * FROM kiosk_sessions WHERE session_uuid = ?', [sessionUuid]);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const analysis = await getLatestKioskAnalysisBySessionId(session.id);
        if (!analysis) {
            return res.json({
                success: true,
                status: String(session.status || 'started'),
                session: {
                    session_uuid: session.session_uuid,
                    visitor_name: session.visitor_name,
                    gender: session.gender,
                    whatsapp_masked: maskWhatsappNumber(session.whatsapp),
                    device_id: session.device_id
                },
                analysis: null
            });
        }

        const payload = await buildKioskAnalyzeResponsePayload(session, analysis, {
            status: analysis.delivery_status || session.status || 'completed'
        });
        return res.json({
            ...payload,
            status: 'completed'
        });
    } catch (error) {
        console.error('Kiosk session result lookup error:', error);
        return res.status(500).json({ error: error.message });
    }
});

app.get('/api/v2/kiosk/result/:token', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!token) {
            return res.status(400).json({ error: 'Result token is required' });
        }

        const result = await getKioskResultByToken(token);
        if (!result) {
            return res.status(404).json({ error: 'Result not found or token expired' });
        }

        const urls = buildKioskResultUrls(token);

        res.json({
            success: true,
            result: {
                token,
                session_uuid: result.session_uuid,
                visitor_name: result.visitor_name,
                gender: result.gender,
                whatsapp_masked: maskWhatsappNumber(result.whatsapp),
                overall_score: result.overall_score,
                skin_type: result.skin_type,
                fitzpatrick_type: result.fitzpatrick_type,
                predicted_age: result.predicted_age,
                summary: result.result_summary,
                scores: result.cv_metrics,
                vision_analysis: result.vision_analysis,
                analysis_modes: Array.isArray(result?.vision_analysis?.analysis_modes)
                    ? result.vision_analysis.analysis_modes
                    : Array.isArray(result?.ai_insights?.analysis_modes)
                        ? result.ai_insights.analysis_modes
                        : buildDefaultAnalysisModes(result.cv_metrics, result?.ai_insights?.priority_concerns, result.overall_score),
                input_validation: normalizeKioskInputValidation(
                    result?.vision_analysis?.input_validation || result?.ai_insights?.input_validation || {}
                ),
                capture_quality: (result?.vision_analysis?.capture_quality && typeof result.vision_analysis.capture_quality === 'object')
                    ? result.vision_analysis.capture_quality
                    : ((result?.ai_insights?.capture_quality && typeof result.ai_insights.capture_quality === 'object')
                        ? result.ai_insights.capture_quality
                        : {}),
                image_url: result.image_url || '',
                visualization_url: result.visualization_url || '',
                image_url_full: toKioskPublicAssetUrl(result.image_url),
                visualization_url_full: toKioskPublicAssetUrl(result.visualization_url),
                insights: result.ai_insights,
                product_recommendations: result.product_recommendations,
                skincare_routine: result.skincare_routine,
                delivery_status: result.delivery_status,
                created_at: result.created_at,
                expires_at: result.expires_at
            },
            urls
        });
    } catch (error) {
        console.error('Kiosk get result error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/kiosk/result/:token', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        const result = await getKioskResultByToken(token);
        if (!result) {
            return res.status(404).send('<h1>Hasil tidak ditemukan atau token sudah kadaluarsa.</h1>');
        }

        const urls = buildKioskResultUrls(token);
        const html = buildKioskResultHtml(result, urls);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        console.error('Kiosk result page error:', error);
        res.status(500).send('<h1>Terjadi kesalahan saat memuat hasil.</h1>');
    }
});

app.get('/api/v2/kiosk/result/:token/pdf', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!token) {
            return res.status(400).json({ error: 'Result token is required' });
        }

        const result = await getKioskResultByToken(token);
        if (!result) {
            return res.status(404).json({ error: 'Result not found or token expired' });
        }

        const filename = `cantik-kiosk-result-${token.slice(0, 8)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ size: 'A4', margin: 48 });
        doc.pipe(res);

        doc.fontSize(20).fillColor('#7a3f59').text('Cantik AI - Hasil Analisa Kiosk');
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#333333');
        doc.text(`Kode Hasil: ${result.result_token}`);
        doc.text(`Nama: ${result.visitor_name}`);
        doc.text(`Gender: ${result.gender}`);
        doc.text(`Waktu Analisa: ${result.created_at}`);
        doc.moveDown(0.8);

        doc.fontSize(16).fillColor('#9d5a76').text(`Skor Kulit: ${Math.round(toNumber(result.overall_score, 0))}/100`);
        doc.fontSize(11).fillColor('#333333');
        doc.text(`Skin Type: ${result.skin_type || '-'}`);
        doc.text(`Fitzpatrick Type: ${result.fitzpatrick_type || '-'}`);
        doc.text(`Prediksi Usia Kulit: ${result.predicted_age || '-'}`);
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#7a3f59').text('Ringkasan');
        doc.fontSize(11).fillColor('#333333').text(result.result_summary || '-');
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#7a3f59').text('Skor Detail');
        const scores = result.cv_metrics || {};
        Object.entries(scores).forEach(([key, value]) => {
            doc.fontSize(11).fillColor('#333333').text(`- ${key}: ${Math.round(toNumber(value, 0))}/100`);
        });
        doc.moveDown(0.8);

        const concerns = Array.isArray(result?.ai_insights?.priority_concerns)
            ? result.ai_insights.priority_concerns
            : [];
        doc.fontSize(12).fillColor('#7a3f59').text('Prioritas Perawatan');
        if (concerns.length === 0) {
            doc.fontSize(11).fillColor('#333333').text('- Tidak ada concern prioritas tinggi terdeteksi.');
        } else {
            concerns.slice(0, 5).forEach((item) => {
                doc.fontSize(11).fillColor('#333333').text(`- ${item.concern || 'Concern'} (${item.severity || 'moderate'})`);
                if (item.advice) {
                    doc.fontSize(10).fillColor('#555555').text(`  Saran: ${item.advice}`);
                }
            });
        }
        doc.moveDown(0.8);

        doc.fontSize(9).fillColor('#666666').text('Dokumen ini dihasilkan otomatis oleh Cantik AI Kiosk.', { align: 'left' });
        doc.end();
    } catch (error) {
        console.error('Kiosk PDF error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

// ==================== ADMIN ENDPOINTS ====================

// Admin login
app.post('/api/v2/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const clientIp = getClientIp(req);
        const normalizedUsername = String(username || '').trim().toLowerCase();

        const rateLimitResult = checkAdminLoginRateLimit(clientIp);
        if (!rateLimitResult.allowed) {
            return res.status(429).json({
                error: 'Terlalu banyak percobaan login admin. Coba beberapa saat lagi.',
                retry_after_seconds: Math.ceil(rateLimitResult.retryAfterMs / 1000)
            });
        }

        const failureKey = getAdminLoginFailureKey(normalizedUsername, clientIp);
        const lockState = getAdminLoginLockState(failureKey);
        if (lockState.locked) {
            return res.status(429).json({
                error: 'Akses login admin dikunci sementara karena percobaan gagal berulang.',
                retry_after_seconds: Math.ceil(lockState.retryAfterMs / 1000)
            });
        }

        if (!username || !password) {
            return res.status(400).json({ error: 'Username dan password wajib diisi' });
        }

        const admin = await dbGet('SELECT * FROM admins WHERE username = ?', [username]);
        if (!admin) {
            registerAdminLoginFailure(failureKey);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        let isValid = false;
        let nextHash = admin.hashed_password;

        if (admin.hashed_password) {
            isValid = bcrypt.compareSync(password, admin.hashed_password);
        } else if (admin.password) {
            // Legacy fallback for plaintext password
            isValid = password === admin.password;
            if (isValid) {
                nextHash = bcrypt.hashSync(password, 10);
            }
        }

        if (!isValid) {
            registerAdminLoginFailure(failureKey);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        clearAdminLoginFailure(failureKey);

        await dbRun(
            'UPDATE admins SET hashed_password = COALESCE(?, hashed_password), last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [nextHash, admin.id]
        );

        const updatedAdmin = await dbGet('SELECT * FROM admins WHERE id = ?', [admin.id]);
        const authPayload = createAdminToken(updatedAdmin);
        res.json({
            ...sanitizeAdmin(updatedAdmin),
            token: authPayload.token,
            csrf_token: authPayload.csrfToken
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin profile
app.get('/api/v2/admin/me', requireAdminAuth, async (req, res) => {
    try {
        if (!req.admin?.sub) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const admin = await dbGet('SELECT * FROM admins WHERE id = ?', [req.admin.sub]);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.json({ admin: sanitizeAdmin(admin) });
    } catch (error) {
        console.error('Admin me error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - USERS ====================

// Get all users (admin)
app.get('/api/v2/admin/users', requireAdminAuth, async (req, res) => {
    try {
        const users = await dbAll('SELECT * FROM users ORDER BY created_at DESC');
        res.json(users.map((user) => ({
            ...sanitizeUser(user),
            username: user.name || user.email?.split('@')[0] || 'User'
        })));
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create user (admin)
app.post('/api/v2/admin/users', requireAdminAuth, async (req, res) => {
    try {
        const payload = req.body || {};
        const email = (payload.email || '').trim().toLowerCase();
        const name = (payload.name || email.split('@')[0] || 'User').trim();
        const password = payload.password || '';
        const authProvider = payload.auth_provider || 'email';

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Email tidak valid' });
        }

        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'Email sudah terdaftar' });
        }

        let passwordHash = '';
        if (authProvider === 'email') {
            if (!password || password.length < 8) {
                return res.status(400).json({ error: 'Password minimal 8 karakter untuk akun email' });
            }
            passwordHash = bcrypt.hashSync(password, 10);
        }

        const result = await dbRun(`
            INSERT INTO users (
                email, name, password, password_hash, age, gender, skin_type,
                auth_provider, google_id, avatar_url, email_verified, last_login
            )
            VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            email,
            name,
            passwordHash,
            payload.age || null,
            payload.gender || null,
            payload.skin_type || null,
            authProvider,
            payload.google_id || null,
            payload.avatar_url || null,
            payload.email_verified === undefined ? 1 : Number(Boolean(payload.email_verified))
        ]);

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Create admin user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user (admin)
app.put('/api/v2/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const payload = req.body || {};
        const existingUser = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates = [];
        const values = [];

        if (payload.email !== undefined) {
            const normalizedEmail = String(payload.email).trim().toLowerCase();
            if (!isValidEmail(normalizedEmail)) {
                return res.status(400).json({ error: 'Email tidak valid' });
            }
            const conflict = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [normalizedEmail, userId]);
            if (conflict) {
                return res.status(409).json({ error: 'Email sudah digunakan user lain' });
            }
            updates.push('email = ?');
            values.push(normalizedEmail);
        }

        if (payload.name !== undefined) {
            updates.push('name = ?');
            values.push(String(payload.name).trim());
        }
        if (payload.age !== undefined) {
            updates.push('age = ?');
            values.push(payload.age === null || payload.age === '' ? null : Number(payload.age));
        }
        if (payload.gender !== undefined) {
            updates.push('gender = ?');
            values.push(payload.gender || null);
        }
        if (payload.skin_type !== undefined) {
            updates.push('skin_type = ?');
            values.push(payload.skin_type || null);
        }
        if (payload.auth_provider !== undefined) {
            updates.push('auth_provider = ?');
            values.push(payload.auth_provider || 'email');
        }
        if (payload.google_id !== undefined) {
            updates.push('google_id = ?');
            values.push(payload.google_id || null);
        }
        if (payload.avatar_url !== undefined) {
            updates.push('avatar_url = ?');
            values.push(payload.avatar_url || null);
        }
        if (payload.email_verified !== undefined) {
            updates.push('email_verified = ?');
            values.push(Number(Boolean(payload.email_verified)));
        }
        if (payload.password !== undefined && payload.password !== '') {
            if (String(payload.password).length < 8) {
                return res.status(400).json({ error: 'Password minimal 8 karakter' });
            }
            updates.push('password = ?');
            values.push('');
            updates.push('password_hash = ?');
            values.push(bcrypt.hashSync(payload.password, 10));
            updates.push("auth_provider = 'email'");
        }

        if (updates.length === 0) {
            return res.json({ success: true, user: sanitizeUser(existingUser) });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(userId);
        await dbRun(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

        const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
        res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
        console.error('Update admin user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete user (admin)
app.delete('/api/v2/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
        const user = await dbGet('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User deleted successfully', deletedUserId: Number(req.params.id) });
    } catch (error) {
        console.error('Delete user (admin) error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - ANALYSES ====================

const parseAnalysisJSONFields = (analysis) => {
    if (!analysis) return analysis;
    const fields = ['cv_metrics', 'vision_analysis', 'ai_insights', 'product_recommendations', 'skincare_routine'];
    fields.forEach((field) => {
        if (analysis[field] && typeof analysis[field] === 'string') {
            const fallback = ['product_recommendations'].includes(field) ? [] : {};
            analysis[field] = safeParseJSON(analysis[field], fallback);
        }
    });
    return analysis;
};

// Get all analyses (admin)
app.get('/api/v2/admin/analyses', requireAdminAuth, async (req, res) => {
    try {
        const analyses = await dbAll(`
            SELECT a.*, u.name AS username, u.email AS user_email
            FROM analyses a
            LEFT JOIN users u ON u.id = a.user_id
            ORDER BY a.created_at DESC
        `);

        analyses.forEach(parseAnalysisJSONFields);
        res.json(analyses);
    } catch (error) {
        console.error('Get all analyses error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get analysis detail (admin)
app.get('/api/v2/admin/analyses/:id', requireAdminAuth, async (req, res) => {
    try {
        const analysis = await dbGet(`
            SELECT a.*, u.name AS username, u.email AS user_email
            FROM analyses a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.id = ?
        `, [req.params.id]);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        parseAnalysisJSONFields(analysis);

        if (analysis.image_url && !analysis.image_url.startsWith('data:')) {
            try {
                analysis.image_url = readImageAsBase64(analysis.image_url);
            } catch {
                // Ignore image conversion failure
            }
        }

        if (analysis.visualization_url && !analysis.visualization_url.startsWith('data:')) {
            try {
                analysis.visualization_url = readImageAsBase64(analysis.visualization_url);
            } catch {
                // Ignore visualization conversion failure
            }
        }

        res.json(analysis);
    } catch (error) {
        console.error('Get admin analysis detail error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete analysis (admin)
app.delete('/api/v2/admin/analyses/:id', requireAdminAuth, async (req, res) => {
    try {
        const analysis = await dbGet('SELECT image_url, visualization_url FROM analyses WHERE id = ?', [req.params.id]);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        if (analysis.image_url && !analysis.image_url.startsWith('data:')) {
            deleteImageFile(analysis.image_url);
        }
        if (analysis.visualization_url && !analysis.visualization_url.startsWith('data:')) {
            deleteImageFile(analysis.visualization_url);
        }

        await dbRun('DELETE FROM analyses WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Analysis deleted successfully' });
    } catch (error) {
        console.error('Delete admin analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - PRODUCTS ====================

const normalizeUploadPath = (value) => String(value || '').trim().replace(/^\/+/, '').replace(/\\/g, '/');
const isLocalUploadPath = (value) => normalizeUploadPath(value).startsWith('uploads/');
const getAdminStorageOwner = (req) => `admin_${req?.admin?.id || 'system'}`;

const resolveAdminImageInput = (payload, req, type, fallbackFields = ['image_url']) => {
    const imageBase64 = String(payload?.image_base64 || '').trim();
    if (imageBase64) {
        return saveImageToFile(imageBase64, getAdminStorageOwner(req), type);
    }

    for (const field of fallbackFields) {
        const value = String(payload?.[field] || '').trim();
        if (value) return value;
    }

    return '';
};

// Get all products (admin)
app.get('/api/v2/admin/products', requireAdminAuth, async (req, res) => {
    try {
        const products = await dbAll('SELECT * FROM products ORDER BY created_at DESC');
        res.json(products);
    } catch (error) {
        console.error('Get admin products error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create product (admin)
app.post('/api/v2/admin/products', requireAdminAuth, async (req, res) => {
    let uploadedImagePath = '';
    try {
        const {
            name, brand, category, description, price, ingredients,
            skin_type, concerns, rating, is_active, is_featured
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Product name is required' });
        }

        const image_url = resolveAdminImageInput(req.body, req, 'products', ['image_url']);
        if (String(req.body?.image_base64 || '').trim() && isLocalUploadPath(image_url)) {
            uploadedImagePath = image_url;
        }

        const result = await dbRun(`
            INSERT INTO products (
                name, brand, category, description, price, image_url, ingredients,
                skin_type, concerns, rating, is_active, is_featured
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            brand || '',
            category || '',
            description || '',
            Number(price || 0),
            image_url || '',
            ingredients || '',
            skin_type || '',
            concerns || '',
            Number(rating || 0),
            is_active === undefined ? 1 : Number(Boolean(is_active)),
            is_featured === undefined ? 0 : Number(Boolean(is_featured))
        ]);

        const product = await dbGet('SELECT * FROM products WHERE id = ?', [result.lastID]);
        res.json({ success: true, product });
    } catch (error) {
        if (uploadedImagePath && isLocalUploadPath(uploadedImagePath)) {
            deleteImageFile(normalizeUploadPath(uploadedImagePath));
        }
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update product (admin)
app.put('/api/v2/admin/products/:id', requireAdminAuth, async (req, res) => {
    try {
        const payload = req.body || {};
        const existingProduct = await dbGet('SELECT id, image_url FROM products WHERE id = ?', [req.params.id]);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (String(payload.image_base64 || '').trim()) {
            payload.image_url = saveImageToFile(payload.image_base64, getAdminStorageOwner(req), 'products');
        }

        const allowedFields = [
            'name', 'brand', 'category', 'description', 'price', 'image_url',
            'ingredients', 'skin_type', 'concerns', 'rating', 'is_active', 'is_featured'
        ];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (payload[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (field === 'is_active' || field === 'is_featured') {
                    values.push(Number(Boolean(payload[field])));
                } else if (field === 'price' || field === 'rating') {
                    values.push(Number(payload[field] || 0));
                } else {
                    values.push(payload[field]);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        await dbRun(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);

        if (
            payload.image_url !== undefined &&
            payload.image_url !== existingProduct.image_url &&
            isLocalUploadPath(existingProduct.image_url)
        ) {
            deleteImageFile(normalizeUploadPath(existingProduct.image_url));
        }

        const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true, product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete product (admin)
app.delete('/api/v2/admin/products/:id', requireAdminAuth, async (req, res) => {
    try {
        const product = await dbGet('SELECT image_url FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);

        if (isLocalUploadPath(product.image_url)) {
            deleteImageFile(normalizeUploadPath(product.image_url));
        }

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - ARTICLES ====================

const buildSlug = (title) => String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const resolveArticleImageInput = (payload, req) => {
    return resolveAdminImageInput(payload, req, 'articles', ['image_url', 'featured_image']);
};

// Get all articles (admin)
app.get('/api/v2/admin/articles', requireAdminAuth, async (req, res) => {
    try {
        const articles = await dbAll('SELECT * FROM articles ORDER BY created_at DESC');
        res.json(articles);
    } catch (error) {
        console.error('Get admin articles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create article (admin)
app.post('/api/v2/admin/articles', requireAdminAuth, async (req, res) => {
    let uploadedImagePath = '';
    try {
        const title = req.body?.title;
        const content = req.body?.content || '';
        const excerpt = req.body?.excerpt || '';
        const author = req.body?.author || req.body?.author_name || 'Admin';
        const category = req.body?.category || '';
        const tags = Array.isArray(req.body?.tags) ? req.body.tags.join(',') : (req.body?.tags || '');
        const status = req.body?.status || 'published';
        const slug = req.body?.slug || buildSlug(title);
        const isFeatured = Number(Boolean(req.body?.is_featured));
        const publishedAt = status === 'published' ? (req.body?.published_at || new Date().toISOString()) : null;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (!slug) {
            return res.status(400).json({ error: 'Slug tidak valid' });
        }

        const slugConflict = await dbGet('SELECT id FROM articles WHERE slug = ?', [slug]);
        if (slugConflict) {
            return res.status(409).json({ error: 'Slug sudah digunakan artikel lain' });
        }

        const image_url = resolveArticleImageInput(req.body, req);
        if (String(req.body?.image_base64 || '').trim() && isLocalUploadPath(image_url)) {
            uploadedImagePath = image_url;
        }

        const result = await dbRun(`
            INSERT INTO articles (
                title, slug, content, excerpt, image_url, featured_image, author, category, tags,
                status, is_featured, published_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title,
            slug,
            content,
            excerpt,
            image_url,
            image_url,
            author,
            category,
            tags,
            status,
            isFeatured,
            publishedAt
        ]);

        const article = await dbGet('SELECT * FROM articles WHERE id = ?', [result.lastID]);
        res.json({ success: true, article });
    } catch (error) {
        if (uploadedImagePath && isLocalUploadPath(uploadedImagePath)) {
            deleteImageFile(normalizeUploadPath(uploadedImagePath));
        }
        console.error('Create article error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update article (admin)
app.put('/api/v2/admin/articles/:id', requireAdminAuth, async (req, res) => {
    try {
        const existingArticle = await dbGet('SELECT id, image_url, featured_image FROM articles WHERE id = ?', [req.params.id]);
        if (!existingArticle) {
            return res.status(404).json({ error: 'Article not found' });
        }

        const payload = { ...req.body };
        if (String(payload.image_base64 || '').trim()) {
            const uploadedImagePath = saveImageToFile(payload.image_base64, getAdminStorageOwner(req), 'articles');
            payload.image_url = uploadedImagePath;
            payload.featured_image = uploadedImagePath;
        }
        if (payload.featured_image !== undefined && payload.image_url === undefined) {
            payload.image_url = payload.featured_image;
        }
        if (payload.author_name !== undefined && payload.author === undefined) {
            payload.author = payload.author_name;
        }
        if (Array.isArray(payload.tags)) {
            payload.tags = payload.tags.join(',');
        }
        if (payload.slug === undefined && payload.title !== undefined) {
            payload.slug = buildSlug(payload.title);
        }

        if (payload.slug !== undefined && payload.slug !== '') {
            const slugConflict = await dbGet(
                'SELECT id FROM articles WHERE slug = ? AND id != ?',
                [payload.slug, req.params.id]
            );
            if (slugConflict) {
                return res.status(409).json({ error: 'Slug sudah digunakan artikel lain' });
            }
        }

        const allowedFields = [
            'title', 'slug', 'content', 'excerpt', 'image_url', 'author', 'category', 'tags',
            'status', 'is_featured', 'published_at'
        ];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (payload[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (field === 'is_featured') {
                    values.push(Number(Boolean(payload[field])));
                } else {
                    values.push(payload[field]);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        if (payload.image_url !== undefined) {
            updates.push('featured_image = ?');
            values.push(payload.image_url);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        await dbRun(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`, values);

        if (
            payload.image_url !== undefined &&
            payload.image_url !== existingArticle.image_url &&
            isLocalUploadPath(existingArticle.image_url)
        ) {
            deleteImageFile(normalizeUploadPath(existingArticle.image_url));
        }

        const article = await dbGet('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        res.json({ success: true, article });
    } catch (error) {
        console.error('Update article error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete article (admin)
app.delete('/api/v2/admin/articles/:id', requireAdminAuth, async (req, res) => {
    try {
        const article = await dbGet('SELECT image_url, featured_image FROM articles WHERE id = ?', [req.params.id]);
        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        await dbRun('DELETE FROM articles WHERE id = ?', [req.params.id]);

        const imageCandidates = [article.image_url, article.featured_image]
            .map((value) => String(value || '').trim())
            .filter(Boolean);

        for (const imagePath of new Set(imageCandidates)) {
            if (isLocalUploadPath(imagePath)) {
                deleteImageFile(normalizeUploadPath(imagePath));
            }
        }

        res.json({ success: true, message: 'Article deleted successfully' });
    } catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - BANNERS ====================

// Get all banners (admin)
app.get('/api/v2/admin/banners', requireAdminAuth, async (req, res) => {
    try {
        const banners = await dbAll('SELECT * FROM banners ORDER BY display_order ASC, id ASC');
        res.json(banners);
    } catch (error) {
        console.error('Get admin banners error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create banner (admin)
app.post('/api/v2/admin/banners', requireAdminAuth, async (req, res) => {
    let uploadedImagePath = '';
    try {
        const { title, link_url, description } = req.body;
        const displayOrder = req.body?.display_order ?? req.body?.order ?? 0;
        const linkText = req.body?.link_text || '';
        const isActive = req.body?.is_active === undefined ? 1 : Number(Boolean(req.body.is_active));

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const image_url = resolveAdminImageInput(req.body, req, 'banners', ['image_url']);
        if (String(req.body?.image_base64 || '').trim() && isLocalUploadPath(image_url)) {
            uploadedImagePath = image_url;
        }

        if (!image_url) {
            return res.status(400).json({ error: 'Title and image_url are required' });
        }

        const result = await dbRun(`
            INSERT INTO banners (title, image_url, link_url, link_text, description, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [title, image_url, link_url || '', linkText, description || '', Number(displayOrder), isActive]);

        const banner = await dbGet('SELECT * FROM banners WHERE id = ?', [result.lastID]);
        res.json({ success: true, banner });
    } catch (error) {
        if (uploadedImagePath && isLocalUploadPath(uploadedImagePath)) {
            deleteImageFile(normalizeUploadPath(uploadedImagePath));
        }
        console.error('Create banner error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update banner (admin)
app.put('/api/v2/admin/banners/:id', requireAdminAuth, async (req, res) => {
    try {
        const payload = { ...req.body };
        const existingBanner = await dbGet('SELECT id, image_url FROM banners WHERE id = ?', [req.params.id]);
        if (!existingBanner) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        if (String(payload.image_base64 || '').trim()) {
            payload.image_url = saveImageToFile(payload.image_base64, getAdminStorageOwner(req), 'banners');
        }

        if (payload.order !== undefined && payload.display_order === undefined) {
            payload.display_order = payload.order;
        }

        const allowedFields = ['title', 'image_url', 'link_url', 'link_text', 'description', 'display_order', 'is_active'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (payload[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (field === 'is_active') {
                    values.push(Number(Boolean(payload[field])));
                } else if (field === 'display_order') {
                    values.push(Number(payload[field] || 0));
                } else {
                    values.push(payload[field]);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        await dbRun(`UPDATE banners SET ${updates.join(', ')} WHERE id = ?`, values);

        if (
            payload.image_url !== undefined &&
            payload.image_url !== existingBanner.image_url &&
            isLocalUploadPath(existingBanner.image_url)
        ) {
            deleteImageFile(normalizeUploadPath(existingBanner.image_url));
        }

        const banner = await dbGet('SELECT * FROM banners WHERE id = ?', [req.params.id]);
        res.json({ success: true, banner });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete banner (admin)
app.delete('/api/v2/admin/banners/:id', requireAdminAuth, async (req, res) => {
    try {
        const banner = await dbGet('SELECT image_url FROM banners WHERE id = ?', [req.params.id]);
        if (!banner) {
            return res.status(404).json({ error: 'Banner not found' });
        }

        await dbRun('DELETE FROM banners WHERE id = ?', [req.params.id]);

        if (isLocalUploadPath(banner.image_url)) {
            deleteImageFile(normalizeUploadPath(banner.image_url));
        }

        res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - CHAT SESSIONS ====================

// Get all chat sessions with summary (admin)
app.get('/api/v2/admin/chat-sessions', requireAdminAuth, async (req, res) => {
    try {
        const search = (req.query.search || '').trim().toLowerCase();
        const userId = req.query.user_id ? Number(req.query.user_id) : null;

        const sessions = await dbAll(`
            SELECT
                cs.*,
                u.name AS username,
                u.email AS user_email,
                COUNT(cm.id) AS message_count,
                MAX(cm.created_at) AS last_message_at
            FROM chat_sessions cs
            LEFT JOIN users u ON u.id = cs.user_id
            LEFT JOIN chat_messages cm ON cm.session_id = cs.id
            GROUP BY cs.id
            ORDER BY cs.updated_at DESC, cs.created_at DESC
        `);

        const filtered = sessions.filter((session) => {
            if (userId && Number(session.user_id) !== userId) return false;
            if (!search) return true;
            const target = [
                session.title,
                session.username,
                session.user_email,
                session.session_uuid
            ].join(' ').toLowerCase();
            return target.includes(search);
        });

        res.json(filtered);
    } catch (error) {
        console.error('Get admin chat sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get chat session detail (admin)
app.get('/api/v2/admin/chat-sessions/:id', requireAdminAuth, async (req, res) => {
    try {
        const session = await dbGet(`
            SELECT cs.*, u.name AS username, u.email AS user_email
            FROM chat_sessions cs
            LEFT JOIN users u ON u.id = cs.user_id
            WHERE cs.id = ?
        `, [req.params.id]);

        if (!session) {
            return res.status(404).json({ error: 'Chat session not found' });
        }

        const messages = await dbAll(
            'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
            [req.params.id]
        );

        res.json({
            ...session,
            messages
        });
    } catch (error) {
        console.error('Get admin chat session detail error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update chat session title (admin)
app.put('/api/v2/admin/chat-sessions/:id', requireAdminAuth, async (req, res) => {
    try {
        const title = (req.body?.title || 'New Chat').trim();
        await dbRun(
            'UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title || 'New Chat', req.params.id]
        );
        const session = await dbGet('SELECT * FROM chat_sessions WHERE id = ?', [req.params.id]);
        if (!session) {
            return res.status(404).json({ error: 'Chat session not found' });
        }
        res.json({ success: true, session });
    } catch (error) {
        console.error('Update admin chat session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete chat session (admin)
app.delete('/api/v2/admin/chat-sessions/:id', requireAdminAuth, async (req, res) => {
    try {
        const existing = await dbGet('SELECT id FROM chat_sessions WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Chat session not found' });
        }
        await dbRun('DELETE FROM chat_sessions WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Chat session deleted successfully' });
    } catch (error) {
        console.error('Delete admin chat session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - KIOSK ====================

app.get('/api/v2/admin/kiosk/sessions', requireAdminAuth, async (req, res) => {
    try {
        const status = String(req.query.status || '').trim().toLowerCase();
        const search = String(req.query.search || '').trim().toLowerCase();

        const rows = await dbAll(`
            SELECT
                ks.*,
                ka.id AS analysis_id,
                ka.overall_score,
                ka.skin_type,
                ka.result_token,
                ka.delivery_status,
                ka.created_at AS analysis_created_at
            FROM kiosk_sessions ks
            LEFT JOIN kiosk_analyses ka ON ka.id = (
                SELECT i.id
                FROM kiosk_analyses i
                WHERE i.session_id = ks.id
                ORDER BY i.id DESC
                LIMIT 1
            )
            ORDER BY ks.created_at DESC
            LIMIT 500
        `);

        const filtered = rows.filter((row) => {
            if (status && String(row.status || '').toLowerCase() !== status) return false;
            if (!search) return true;
            const haystack = `${row.visitor_name || ''} ${row.gender || ''} ${row.whatsapp || ''} ${row.session_uuid || ''}`.toLowerCase();
            return haystack.includes(search);
        });

        res.json(filtered.map((row) => ({
            ...row,
            whatsapp_masked: maskWhatsappNumber(row.whatsapp)
        })));
    } catch (error) {
        console.error('Get admin kiosk sessions error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v2/admin/kiosk/sessions/:id', requireAdminAuth, async (req, res) => {
    try {
        const session = await dbGet('SELECT * FROM kiosk_sessions WHERE id = ?', [req.params.id]);
        if (!session) {
            return res.status(404).json({ error: 'Kiosk session not found' });
        }

        const analysis = await dbGet('SELECT * FROM kiosk_analyses WHERE session_id = ?', [req.params.id]);
        if (!analysis) {
            return res.json({
                ...session,
                whatsapp_masked: maskWhatsappNumber(session.whatsapp),
                analysis: null
            });
        }

        res.json({
            ...session,
            whatsapp_masked: maskWhatsappNumber(session.whatsapp),
            analysis: {
                ...analysis,
                cv_metrics: parseStorageJSON(analysis.cv_metrics, {}),
                vision_analysis: parseStorageJSON(analysis.vision_analysis, {}),
                ai_insights: parseStorageJSON(analysis.ai_insights, {}),
                product_recommendations: parseStorageJSON(analysis.product_recommendations, []),
                skincare_routine: parseStorageJSON(analysis.skincare_routine, [])
            }
        });
    } catch (error) {
        console.error('Get admin kiosk session detail error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/v2/admin/kiosk/sessions/:id', requireAdminAuth, async (req, res) => {
    try {
        const session = await dbGet('SELECT * FROM kiosk_sessions WHERE id = ?', [req.params.id]);
        if (!session) {
            return res.status(404).json({ error: 'Kiosk session not found' });
        }

        const analyses = await dbAll('SELECT image_url, visualization_url FROM kiosk_analyses WHERE session_id = ?', [req.params.id]);
        for (const analysis of analyses) {
            if (analysis.image_url) deleteImageFile(analysis.image_url);
            if (analysis.visualization_url) deleteImageFile(analysis.visualization_url);
        }

        await dbRun('DELETE FROM kiosk_analyses WHERE session_id = ?', [req.params.id]);
        await dbRun('DELETE FROM kiosk_sessions WHERE id = ?', [req.params.id]);

        res.json({ success: true, deletedSessionId: Number(req.params.id) });
    } catch (error) {
        console.error('Delete admin kiosk session error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN CRUD - SETTINGS ====================

// Get all settings (admin)
app.get('/api/v2/admin/settings', requireAdminAuth, async (req, res) => {
    try {
        const category = req.query.category ? String(req.query.category).trim() : null;
        const rows = category
            ? await dbAll(
                'SELECT `key`, `value`, value_type, category, description, is_public, updated_at FROM app_settings WHERE category = ? ORDER BY `key`',
                [category]
            )
            : await dbAll(
                'SELECT `key`, `value`, value_type, category, description, is_public, updated_at FROM app_settings ORDER BY category, `key`'
            );

        const settings = rows.map(normalizeSettingRow);
        const map = {};
        settings.forEach((setting) => {
            map[setting.key] = setting.parsed_value;
        });

        res.json({ settings, map });
    } catch (error) {
        console.error('Get admin settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upsert single setting (admin)
app.put('/api/v2/admin/settings/:key', requireAdminAuth, async (req, res) => {
    try {
        const key = req.params.key;
        const payload = req.body || {};
        const valueType = payload.value_type || 'string';
        const rawValue = payload.value;

        if (rawValue === undefined) {
            return res.status(400).json({ error: 'value is required' });
        }

        const persistedValue = valueType === 'json' ? JSON.stringify(rawValue) : String(rawValue);

        await dbRun(`
            INSERT INTO app_settings (\`key\`, \`value\`, value_type, category, description, is_public, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                \`value\` = VALUES(\`value\`),
                value_type = VALUES(value_type),
                category = VALUES(category),
                description = VALUES(description),
                is_public = VALUES(is_public),
                updated_at = NOW()
        `, [
            key,
            persistedValue,
            valueType,
            payload.category || 'general',
            payload.description || '',
            payload.is_public === undefined ? 0 : Number(Boolean(payload.is_public))
        ]);

        const row = await dbGet(
            'SELECT `key`, `value`, value_type, category, description, is_public, updated_at FROM app_settings WHERE `key` = ?',
            [key]
        );
        res.json({ success: true, setting: normalizeSettingRow(row) });
    } catch (error) {
        console.error('Upsert admin setting error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bulk upsert settings (admin)
app.post('/api/v2/admin/settings/bulk', requireAdminAuth, async (req, res) => {
    try {
        const settings = Array.isArray(req.body?.settings) ? req.body.settings : null;
        if (!settings || settings.length === 0) {
            return res.status(400).json({ error: 'settings array is required' });
        }

        for (const item of settings) {
            if (!item?.key || item.value === undefined) continue;
            const valueType = item.value_type || 'string';
            const persistedValue = valueType === 'json' ? JSON.stringify(item.value) : String(item.value);

            await dbRun(`
                INSERT INTO app_settings (\`key\`, \`value\`, value_type, category, description, is_public, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    \`value\` = VALUES(\`value\`),
                    value_type = VALUES(value_type),
                    category = VALUES(category),
                    description = VALUES(description),
                    is_public = VALUES(is_public),
                    updated_at = NOW()
            `, [
                item.key,
                persistedValue,
                valueType,
                item.category || 'general',
                item.description || '',
                item.is_public === undefined ? 0 : Number(Boolean(item.is_public))
            ]);
        }

        res.json({ success: true, updated: settings.length });
    } catch (error) {
        console.error('Bulk upsert admin settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete setting (admin)
app.delete('/api/v2/admin/settings/:key', requireAdminAuth, async (req, res) => {
    try {
        await dbRun('DELETE FROM app_settings WHERE `key` = ?', [req.params.key]);
        res.json({ success: true, deletedKey: req.params.key });
    } catch (error) {
        console.error('Delete admin setting error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN - DATABASE SUMMARY ====================

const ADMIN_QUERYABLE_TABLES = [
    'users',
    'analyses',
    'kiosk_sessions',
    'kiosk_analyses',
    'products',
    'articles',
    'banners',
    'chat_sessions',
    'chat_messages',
    'admins',
    'app_settings'
];

// Database summary (admin)
app.get('/api/v2/admin/database/summary', requireAdminAuth, async (req, res) => {
    try {
        const tableCounts = {};
        for (const table of ADMIN_QUERYABLE_TABLES) {
            const row = await dbGet(`SELECT COUNT(*) as count FROM ${table}`);
            tableCounts[table] = row?.count || 0;
        }

        let dbSizeBytes = 0;
        // MySQL doesn't have a single file size, skip this for now
        dbSizeBytes = 0;

        res.json({
            path: `MySQL - ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`,
            size_bytes: dbSizeBytes,
            table_counts: tableCounts,
            admin_require_bearer: ADMIN_REQUIRE_BEARER,
            admin_require_csrf: ADMIN_REQUIRE_CSRF,
            admin_enforce_origin: ADMIN_ENFORCE_ORIGIN,
            admin_origin_strict: ADMIN_ORIGIN_STRICT
        });
    } catch (error) {
        console.error('Get admin database summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Peek table rows (admin)
app.get('/api/v2/admin/database/tables/:table', requireAdminAuth, async (req, res) => {
    try {
        const table = req.params.table;
        if (!ADMIN_QUERYABLE_TABLES.includes(table)) {
            return res.status(400).json({ error: `Table ${table} is not allowed` });
        }

        const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const rows = await dbAll(`SELECT * FROM ${table} LIMIT ? OFFSET ?`, [limit, offset]);
        res.json({
            table,
            limit,
            offset,
            rows
        });
    } catch (error) {
        console.error('Get admin table rows error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Table schema details (admin)
app.get('/api/v2/admin/database/schema/:table', requireAdminAuth, async (req, res) => {
    try {
        const table = req.params.table;
        if (!ADMIN_QUERYABLE_TABLES.includes(table)) {
            return res.status(400).json({ error: `Table ${table} is not allowed` });
        }
        const schema = await dbAll(`
            SELECT 
                COLUMN_NAME as name,
                DATA_TYPE as type,
                IS_NULLABLE as notnull,
                COLUMN_DEFAULT as dflt_value,
                CASE WHEN COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END as pk
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `, [table]);
        res.json({ table, schema });
    } catch (error) {
        console.error('Get admin table schema error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== EXPORT ENDPOINTS ====================

// Export analyses to JSON
app.get('/api/v2/export/json/:userId?', (req, res) => {
    try {
        const userId = req.params.userId ? parseInt(req.params.userId) : null;
        const result = exportToJSON(userId);
        
        // Send file for download
        res.download(result.filepath, result.filename, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
        });
    } catch (error) {
        console.error('Export JSON error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export analyses to CSV
app.get('/api/v2/export/csv/:userId?', (req, res) => {
    try {
        const userId = req.params.userId ? parseInt(req.params.userId) : null;
        const result = exportToCSV(userId);
        
        // Send file for download
        res.download(result.filepath, result.filename, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
        });
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ error: error.message });
    }
});

const isExistingCantikBackendRunning = async (port) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) return false;
        const payload = await response.json().catch(() => null);
        return payload?.status === 'healthy' && typeof payload?.message === 'string';
    } catch {
        return false;
    }
};

const closeDatabaseSilently = async () => {
    try {
        if (pool) {
            await pool.end();
        }
    } catch (error) {
        // Silent close
    }
};

const handleListenError = async (error) => {
    if (error?.code !== 'EADDRINUSE') {
        throw error;
    }

    const existingBackendDetected = await isExistingCantikBackendRunning(PORT);
    if (existingBackendDetected) {
        console.warn(`⚠️ Port ${PORT} sudah dipakai oleh instance backend Cantik AI lain.`);
        console.warn('ℹ️ Menjalankan instance backend ganda tidak diperlukan, proses ini akan berhenti aman.');
        await closeDatabaseSilently();
        process.exit(0);
    }

    console.error(`❌ Port ${PORT} sudah dipakai proses lain.`);
    console.error(`👉 Ubah PORT di backend/.env atau hentikan proses yang memakai port ${PORT}.`);
    process.exit(1);
};

const startServer = async () => {
    try {
        await ensureAuthSchema();

        const server = app.listen(PORT);

        server.on('listening', () => {
            console.log('🚀 Cantik AI Backend Started! (MySQL version)');
            console.log(`📍 Server: http://localhost:${PORT}`);
            console.log(`🏥 Health: http://localhost:${PORT}/health`);
            console.log(`📊 Database: MySQL - ${process.env.DB_NAME}@${process.env.DB_HOST}`);
            console.log('✅ Ready to accept requests');

            // Schedule auto-cleanup (delete analyses older than 30 days, run every 24 hours)
            // scheduleAutoCleanup(30, 24);
        });

        server.on('error', (error) => {
            handleListenError(error).catch((listenError) => {
                console.error('❌ Failed to start server:', listenError);
                process.exit(1);
            });
        });
    } catch (error) {
        console.error('❌ Failed to initialize auth schema:', error);
        process.exit(1);
    }
};

// Start server
startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    try {
        if (pool) {
            await pool.end();
            console.log('✅ Database connection closed');
        }
    } catch (error) {
        console.error('Error closing database:', error);
    }
    process.exit(0);
});
