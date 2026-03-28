# Test Scripts

Folder ini berisi script-script testing untuk API Gemini dan Groq.

## File-file Test

### 1. `test-gemini-2.5-flash.js`
Test koneksi ke Gemini API dengan model `gemini-2.5-flash`.

**Cara Run:**
```bash
node tests/test-gemini-2.5-flash.js
```

**Expected Output:**
```
✅ Gemini API Status: 200
✅ Model gemini-2.5-flash is VALID and working!
```

### 2. `list-gemini-models.js`
List semua model Gemini yang tersedia.

**Cara Run:**
```bash
node tests/list-gemini-models.js
```

**Expected Output:**
```
✅ Available Gemini Models:
📦 models/gemini-2.5-flash
📦 models/gemini-2.5-pro
...
```

### 3. `test-groq-models.js`
Test model-model Groq (termasuk vision models).

**Cara Run:**
```bash
node tests/test-groq-models.js
```

**Expected Output:**
```
❌ All vision models decommissioned
```

**Note:** Groq Vision models sudah tidak tersedia lagi sejak 2024.

### 4. `test-gemini.js` & `test-gemini-model.js`
Test script lama untuk Gemini API (deprecated).

## Catatan Penting

- File-file ini HANYA untuk testing dan development
- JANGAN di-deploy ke production
- API keys di file ini harus di-rotate jika exposed
- Gunakan `.env` untuk API keys di production

## API Keys

API keys yang digunakan di test scripts:
- **Gemini**: `[REDACTED - set via GEMINI_API_KEY env var]`
- **Groq**: `[REDACTED - set via GROQ_API_KEY env var]`

⚠️ **PENTING**: Jangan commit API keys ke public repository!

## Hasil Testing Terakhir

### Gemini API ✅
- Model: `gemini-2.5-flash`
- Status: Working
- Vision Support: Yes
- MaxOutputTokens: 4096

### Groq API ⚠️
- Text Models: Working (`openai/gpt-oss-20b`)
- Vision Models: ❌ Decommissioned (all models)
- Fallback: Emergency basic analysis

## Troubleshooting

### Error: 404 Not Found
- Model name salah atau sudah deprecated
- Check `list-gemini-models.js` untuk model yang tersedia

### Error: 401 Unauthorized
- API key tidak valid atau expired
- Update API key di `.env` file

### Error: 429 Too Many Requests
- Rate limit exceeded
- Tunggu beberapa menit atau upgrade plan

## Maintenance

File-file test ini perlu di-update jika:
1. Model baru tersedia
2. API endpoint berubah
3. API keys di-rotate
4. Format response berubah
