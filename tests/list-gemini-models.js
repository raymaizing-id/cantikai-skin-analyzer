require('dotenv').config({ path: '../backend/.env' });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('🔍 Fetching available Gemini models...\n');

fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`)
.then(res => res.json())
.then(data => {
    console.log('✅ Available Gemini Models:\n');
    if (data.models) {
        data.models.forEach(model => {
            console.log(`📦 ${model.name}`);
            console.log(`   Display Name: ${model.displayName}`);
            console.log(`   Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
            console.log(`   Vision: ${model.supportedGenerationMethods.includes('generateContent') ? 'Yes' : 'No'}`);
            console.log('');
        });
        
        // Find vision models
        console.log('\n🎯 Vision-capable models (with generateContent):');
        const visionModels = data.models.filter(m => 
            m.supportedGenerationMethods.includes('generateContent')
        );
        visionModels.forEach(m => console.log(`   - ${m.name}`));
    } else {
        console.log('❌ No models found or error:', data);
    }
})
.catch(err => console.error('❌ Error:', err));
