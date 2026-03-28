const fs = require('fs');
const envPath = require('path').join(__dirname, '../backend/.env');
const envVars = Object.fromEntries(
    fs.readFileSync(envPath, 'utf8').split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => l.split('=').map(s => s.trim()))
);
const GEMINI_API_KEY = envVars.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_VISION_MODEL = 'gemini-2.0-flash';

console.log('🧪 Testing Gemini API with model:', GEMINI_VISION_MODEL);

fetch(`${GEMINI_API_URL}/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{
            parts: [{ text: 'Hello, test connection' }]
        }]
    })
})
.then(res => {
    console.log('✅ Gemini API Status:', res.status);
    if (res.ok) {
        console.log('✅ Model gemini-1.5-flash is VALID and working!');
    } else {
        console.log('❌ Model error:', res.status);
    }
    return res.json();
})
.then(data => {
    console.log('📄 Response:', JSON.stringify(data, null, 2));
})
.catch(err => {
    console.error('❌ Error:', err);
});
