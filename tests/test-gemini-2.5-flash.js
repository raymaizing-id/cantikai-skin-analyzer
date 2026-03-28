require('dotenv').config({ path: '../backend/.env' });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_VISION_MODEL = 'gemini-2.5-flash';

console.log('🧪 Testing Gemini API with model:', GEMINI_VISION_MODEL);

fetch(`${GEMINI_API_URL}/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{
            parts: [{ text: 'Hello, this is a test. Please respond with "OK".' }]
        }]
    })
})
.then(res => {
    console.log('✅ Gemini API Status:', res.status);
    if (res.ok) {
        console.log('✅ Model gemini-2.5-flash is VALID and working!');
    } else {
        console.log('❌ Model error:', res.status);
    }
    return res.json();
})
.then(data => {
    if (data.candidates && data.candidates[0]) {
        console.log('📄 Response text:', data.candidates[0].content.parts[0].text);
        console.log('\n✅ SUCCESS! Gemini 2.5 Flash is working perfectly!');
    } else {
        console.log('📄 Full Response:', JSON.stringify(data, null, 2));
    }
})
.catch(err => {
    console.error('❌ Error:', err);
});
