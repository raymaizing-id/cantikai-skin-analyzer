const GROQ_API_KEY = process.env.GROQ_API_KEY || 'your-groq-api-key-here';

console.log('🔍 Testing Groq Vision models...\n');

// Test different model names
const modelsToTest = [
    'llama-3.2-90b-vision-preview',
    'llama-3.2-11b-vision-preview',
    'llama-3.2-90b-text-preview',
    'llava-v1.5-7b-4096-preview',
    'llama-3.2-vision',
    'llama3-groq-70b-8192-tool-use-preview'
];

async function testModel(modelName) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    {
                        role: 'user',
                        content: 'Test'
                    }
                ],
                max_tokens: 10
            })
        });

        if (response.ok) {
            console.log(`✅ ${modelName} - WORKS`);
            return true;
        } else {
            console.log(`❌ ${modelName} - ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${modelName} - Error: ${error.message}`);
        return false;
    }
}

async function testAll() {
    for (const model of modelsToTest) {
        await testModel(model);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
    }
    
    console.log('\n🔍 Testing vision-specific endpoint...');
    
    // Test with image
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1 red pixel
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llava-v1.5-7b-4096-preview',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'What color is this?' },
                            { type: 'image_url', image_url: { url: `data:image/png;base64,${testImage}` } }
                        ]
                    }
                ],
                max_tokens: 50
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Vision model works!');
            console.log('Response:', data.choices[0].message.content);
        } else {
            console.log(`❌ Vision test failed: ${response.status}`);
            const error = await response.text();
            console.log('Error:', error);
        }
    } catch (error) {
        console.log('❌ Vision test error:', error.message);
    }
}

testAll();
