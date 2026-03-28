// Test Gemini API
require('dotenv').config({ path: '../backend/.env' });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models';

async function listModels() {
    console.log('📋 Listing available Gemini models...');
    
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`);
        
        if (!response.ok) {
            console.error('❌ Error:', response.status);
            return;
        }
        
        const data = await response.json();
        console.log('✅ Available models:');
        data.models.forEach(model => {
            if (model.name.includes('gemini') && model.supportedGenerationMethods.includes('generateContent')) {
                console.log(`  - ${model.name.replace('models/', '')}`);
            }
        });
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function testGemini(modelName) {
    console.log(`\n🧪 Testing Gemini with model: ${modelName}`);
    
    try {
        const response = await fetch(`${GEMINI_API_URL}/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: 'Say "Hello, Gemini is working!" in JSON format: {"message": "your response"}' }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 100
                }
            })
        });

        console.log(`📡 Response Status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error:', errorText);
            return false;
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            const content = data.candidates[0].content.parts[0].text;
            console.log('✅ Generated Text:', content);
            console.log(`✅ Model ${modelName} is working!`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Test Error:', error);
        return false;
    }
}

async function main() {
    await listModels();
    
    // Test common models
    const modelsToTest = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro-vision'
    ];
    
    for (const model of modelsToTest) {
        const success = await testGemini(model);
        if (success) {
            console.log(`\n✅ RECOMMENDED MODEL: ${model}`);
            break;
        }
    }
}

main();

