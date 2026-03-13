/**
 * AI Service - Direct Integration with Gemini & Groq APIs
 * Provides AI-powered insights for skin analysis
 */

// API Keys from environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// API Endpoints
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Models
const GEMINI_VISION_MODEL = 'gemini-2.5-flash'; // Fast, multimodal
const GEMINI_TEXT_MODEL = 'gemini-2.5-pro'; // Advanced reasoning
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Fast text generation

/**
 * Analyze image with Gemini Vision
 * Returns visual analysis of skin conditions
 */
export const analyzeImageWithGemini = async (imageBase64) => {
    try {
        // Remove data:image/jpeg;base64, prefix if present
        const base64Data = imageBase64.includes(',') 
            ? imageBase64.split(',')[1] 
            : imageBase64;

        const prompt = `Anda adalah AI dermatologist expert. Analisis gambar wajah ini dan berikan output dalam format JSON yang VALID.

OUTPUT HARUS JSON dengan struktur ini:
{
  "visual_conditions": {
    "acne_locations": ["lokasi 1", "lokasi 2"],
    "wrinkle_areas": ["area 1", "area 2"],
    "pigmentation_zones": ["zona 1", "zona 2"],
    "redness_areas": ["area 1", "area 2"],
    "texture_issues": ["issue 1", "issue 2"]
  },
  "skin_tone": {
    "evenness_score": "Merata/Tidak Merata",
    "problem_areas": ["area 1", "area 2"],
    "undertone": "Warm/Cool/Neutral",
    "pigmentation_notes": "catatan detail"
  },
  "facial_zones": {
    "t_zone": "deskripsi kondisi T-zone",
    "cheeks_right": "deskripsi pipi kanan",
    "cheeks_left": "deskripsi pipi kiri",
    "under_eyes": "deskripsi area bawah mata",
    "jawline": "deskripsi rahang",
    "forehead": "deskripsi dahi",
    "nose": "deskripsi hidung",
    "chin": "deskripsi dagu"
  },
  "priority_zones": [
    {"zone": "nama zona", "reason": "alasan prioritas", "severity": "Low/Medium/High"}
  ],
  "visual_summary": "ringkasan lengkap dalam Bahasa Indonesia (3-4 kalimat)"
}

Berikan analisis detail untuk setiap zona wajah. Output HARUS valid JSON tanpa markdown atau text tambahan.`;

        const response = await fetch(
            `${GEMINI_API_URL}/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: 'image/jpeg',
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 32,
                        topP: 0.95,
                        maxOutputTokens: 4096,
                        responseMimeType: 'application/json',
                        stopSequences: []
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini Vision API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        let textContent = data.candidates[0].content.parts[0].text;
        
        // Remove markdown code blocks if present
        textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON response with better error handling
        try {
            const parsed = JSON.parse(textContent);
            console.log('✅ Gemini Vision JSON parsed successfully');
            return parsed;
        } catch (parseError) {
            console.warn('⚠️ JSON parse failed, attempting fixes...');
            
            // Try to fix common JSON issues
            let fixedText = textContent
                .replace(/,\s*}/g, '}')      // Remove trailing commas in objects
                .replace(/,\s*]/g, ']')      // Remove trailing commas in arrays
                .replace(/\n/g, ' ')          // Remove newlines
                .replace(/\r/g, '')           // Remove carriage returns
                .trim();
            
            // Try parsing fixed version
            try {
                const parsed = JSON.parse(fixedText);
                console.log('✅ Fixed and parsed JSON successfully');
                return parsed;
            } catch (secondError) {
                // Try to find last complete JSON object
                const lastBrace = fixedText.lastIndexOf('}');
                if (lastBrace > 0) {
                    const truncated = fixedText.substring(0, lastBrace + 1);
                    try {
                        const parsed = JSON.parse(truncated);
                        console.log('✅ Parsed truncated JSON successfully');
                        return parsed;
                    } catch (truncError) {
                        console.error('❌ All JSON parsing attempts failed');
                    }
                }
            }
            
            // Return fallback response
            console.warn('⚠️ Using fallback response for Gemini Vision');
            return {
                visual_conditions: {
                    acne_locations: [],
                    wrinkle_areas: [],
                    pigmentation_zones: [],
                    redness_areas: [],
                    texture_issues: []
                },
                skin_tone: {
                    evenness_score: "Tidak dapat dianalisis",
                    problem_areas: [],
                    undertone: "Neutral",
                    pigmentation_notes: "Analisis tidak tersedia"
                },
                facial_zones: {},
                priority_zones: [],
                visual_summary: "Analisis visual tidak dapat diselesaikan. Menggunakan data Computer Vision."
            };
        }
    } catch (error) {
        console.error('Gemini Vision Analysis Error:', error);
        throw error;
    }
};

/**
 * Generate AI insights with Gemini Text (Advanced Reasoning)
 * Combines CV data + Vision analysis for comprehensive recommendations
 * OPTIMIZED: Reduced token usage by summarizing CV data
 */
export const generateInsightsWithGemini = async (cvData, visionData) => {
    try {
        // OPTIMIZE: Only send essential CV metrics (not full data)
        const essentialCVData = {
            overall_score: cvData.overall_score,
            skin_type: cvData.skin_type,
            acne_score: cvData.acne_score,
            wrinkle_severity: cvData.wrinkle_severity,
            pigmentation: cvData.melanin_index,
            hydration: cvData.hydration_level,
            redness: cvData.redness_score,
            oiliness: cvData.oiliness_score,
            predicted_age: cvData.predicted_age
        };

        // OPTIMIZE: Only send essential vision data
        const essentialVisionData = {
            visual_summary: visionData.visual_summary || "",
            priority_zones: visionData.priority_zones?.slice(0, 3) || [] // Only top 3
        };

        const prompt = `Analisis kulit user:
Skor: ${essentialCVData.overall_score}/100
Jenis: ${essentialCVData.skin_type}
Acne: ${essentialCVData.acne_score}
Wrinkles: ${essentialCVData.wrinkle_severity}
Hidrasi: ${essentialCVData.hydration}%

Berikan JSON:
{
  "summary": "Ringkasan 2 kalimat",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "lifestyle_tips": ["tip 1", "tip 2"],
  "product_suggestions": [
    {"type": "Cleanser", "reason": "...", "ingredients_to_look": "Niacinamide", "avoid": "SLS"},
    {"type": "Serum", "reason": "...", "ingredients_to_look": "Vitamin C", "avoid": "Alcohol"},
    {"type": "Moisturizer", "reason": "...", "ingredients_to_look": "Ceramides", "avoid": "Fragrance"},
    {"type": "Sunscreen", "reason": "...", "ingredients_to_look": "SPF 50+", "avoid": "Oxybenzone"}
  ],
  "skincare_routine": {
    "morning": ["Cleanser", "Serum", "Moisturizer", "Sunscreen"],
    "evening": ["Cleanser", "Treatment", "Moisturizer"]
  },
  "timeline": {
    "week_1_2": "...",
    "week_4_6": "...",
    "month_3_plus": "..."
  },
  "overall_assessment": "Penilaian 2 kalimat"
}

Output HARUS valid JSON.`;

        const response = await fetch(
            `${GEMINI_API_URL}/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048, // Reduced from 4096 to save tokens
                        responseMimeType: 'application/json'
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini Text API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Check if response has candidates
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('❌ Gemini response missing candidates');
            throw new Error('Invalid Gemini response structure');
        }
        
        let textContent = data.candidates[0].content.parts[0].text;
        console.log('📄 Raw Gemini response:', textContent.substring(0, 200) + '...');
        
        // Remove markdown code blocks if present
        textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON response with better error handling
        try {
            const parsed = JSON.parse(textContent);
            console.log('✅ Gemini Text JSON parsed successfully');
            
            // Validate required fields
            if (!parsed.summary) parsed.summary = "Analisis kulit Anda menunjukkan kondisi yang perlu perhatian.";
            if (!parsed.key_insights) parsed.key_insights = [];
            if (!parsed.recommendations) parsed.recommendations = [];
            if (!parsed.product_suggestions) parsed.product_suggestions = [];
            
            return parsed;
        } catch (parseError) {
            console.warn('⚠️ JSON parse failed, attempting fixes...', parseError.message);
            
            // Try to fix common JSON issues
            let fixedText = textContent
                .replace(/,\s*}/g, '}')      // Remove trailing commas in objects
                .replace(/,\s*]/g, ']')      // Remove trailing commas in arrays
                .replace(/\n/g, ' ')          // Remove newlines
                .replace(/\r/g, '')           // Remove carriage returns
                .replace(/\t/g, ' ')          // Remove tabs
                .replace(/\s+/g, ' ')         // Normalize whitespace
                .trim();
            
            try {
                const parsed = JSON.parse(fixedText);
                console.log('✅ Fixed and parsed JSON successfully');
                
                // Validate required fields
                if (!parsed.summary) parsed.summary = "Analisis kulit Anda menunjukkan kondisi yang perlu perhatian.";
                if (!parsed.key_insights) parsed.key_insights = [];
                if (!parsed.recommendations) parsed.recommendations = [];
                if (!parsed.product_suggestions) parsed.product_suggestions = [];
                
                return parsed;
            } catch (secondError) {
                console.warn('⚠️ Second parse failed, trying truncation...');
                
                // Try to find last complete JSON object
                const lastBrace = fixedText.lastIndexOf('}');
                if (lastBrace > 0) {
                    const truncated = fixedText.substring(0, lastBrace + 1);
                    try {
                        const parsed = JSON.parse(truncated);
                        console.log('✅ Parsed truncated JSON successfully');
                        
                        // Validate required fields
                        if (!parsed.summary) parsed.summary = "Analisis kulit Anda menunjukkan kondisi yang perlu perhatian.";
                        if (!parsed.key_insights) parsed.key_insights = [];
                        if (!parsed.recommendations) parsed.recommendations = [];
                        if (!parsed.product_suggestions) parsed.product_suggestions = [];
                        
                        return parsed;
                    } catch (truncError) {
                        console.error('❌ All JSON parsing attempts failed');
                        console.error('Original text:', textContent.substring(0, 500));
                    }
                }
            }
            
            // Return fallback with valid structure
            console.warn('⚠️ Using fallback AI response');
            return {
                summary: "Kulit Anda dalam kondisi baik dengan beberapa area yang perlu perhatian khusus.",
                key_insights: [
                    "Kondisi kulit secara keseluruhan menunjukkan hasil yang positif",
                    "Beberapa area memerlukan perawatan tambahan",
                    "Rutinitas skincare yang konsisten akan membantu"
                ],
                recommendations: [
                    "Gunakan cleanser yang lembut 2x sehari",
                    "Aplikasikan sunscreen SPF 30+ setiap pagi",
                    "Jaga hidrasi dengan minum air yang cukup"
                ],
                lifestyle_tips: [
                    "Tidur cukup 7-8 jam per malam",
                    "Konsumsi makanan bergizi seimbang"
                ],
                product_suggestions: [
                    {
                        type: "Cleanser",
                        reason: "Membersihkan kulit tanpa menghilangkan kelembaban alami",
                        ingredients_to_look: "Glycerin, Ceramides",
                        avoid: "SLS, Alcohol"
                    },
                    {
                        type: "Serum",
                        reason: "Memberikan nutrisi intensif untuk kulit",
                        ingredients_to_look: "Niacinamide, Hyaluronic Acid",
                        avoid: "Fragrance"
                    },
                    {
                        type: "Moisturizer",
                        reason: "Menjaga kelembaban dan barrier kulit",
                        ingredients_to_look: "Ceramides, Peptides",
                        avoid: "Heavy oils"
                    },
                    {
                        type: "Sunscreen",
                        reason: "Melindungi dari kerusakan UV",
                        ingredients_to_look: "SPF 50+, Broad Spectrum",
                        avoid: "Oxybenzone"
                    }
                ],
                skincare_routine: {
                    morning: ["Cleanser", "Serum", "Moisturizer", "Sunscreen"],
                    evening: ["Cleanser", "Treatment", "Moisturizer"]
                },
                timeline: {
                    week_1_2: "Kulit mulai beradaptasi dengan rutinitas baru",
                    week_4_6: "Perbaikan tekstur dan tone kulit mulai terlihat",
                    month_3_plus: "Hasil optimal dengan kulit yang lebih sehat"
                },
                overall_assessment: "Dengan perawatan yang tepat dan konsisten, kondisi kulit Anda akan terus membaik."
            };
        }
    } catch (error) {
        console.error('Gemini Text Analysis Error:', error);
        throw error;
    }
};

/**
 * Generate quick insights with Groq (Ultra-fast alternative)
 * Fallback option if Gemini is slow or unavailable
 * OPTIMIZED: Reduced token usage
 */
export const generateInsightsWithGroq = async (cvData, visionData) => {
    try {
        const systemPrompt = `Anda adalah AI Skincare Expert. Berikan rekomendasi singkat dan actionable dalam Bahasa Indonesia.`;

        // OPTIMIZE: Only essential data
        const userPrompt = `Analisis kulit:
- Skor: ${cvData.overall_score}/100
- Jenis: ${cvData.skin_type}
- Acne: ${cvData.acne_score}
- Wrinkles: ${cvData.wrinkle_severity}
- Hidrasi: ${cvData.hydration_level}%

Berikan JSON:
{
  "summary": "Ringkasan 2 kalimat",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3"],
  "lifestyle_tips": ["tip 1", "tip 2"],
  "product_suggestions": [{"type": "Cleanser", "reason": "...", "ingredients_to_look": "...", "avoid": "..."}],
  "skincare_routine": {"morning": ["step 1", "step 2"], "evening": ["step 1", "step 2"]},
  "overall_assessment": "Penilaian 1 kalimat"
}`;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 2048, // Reduced from 4096
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const textContent = data.choices[0].message.content;
        
        return JSON.parse(textContent);
    } catch (error) {
        console.error('Groq Analysis Error:', error);
        throw error;
    }
};

/**
 * Complete AI Analysis Pipeline
 * 1. Gemini Vision: Analyze image
 * 2. Gemini Text: Generate insights
 * Fallback to Groq if Gemini fails
 */
export const getCompleteAIAnalysis = async (imageBase64, cvData) => {
    try {
        console.log(' Starting AI Analysis Pipeline...');
        
        // Step 1: Gemini Vision Analysis
        console.log('👁️ Analyzing image with Gemini Vision...');
        const visionAnalysis = await analyzeImageWithGemini(imageBase64);
        console.log('✅ Gemini Vision complete');
        
        // Step 2: Gemini Text Insights
        console.log('💡 Generating insights with Gemini Pro...');
        let aiInsights;
        try {
            aiInsights = await generateInsightsWithGemini(cvData, visionAnalysis);
            console.log('✅ Gemini Pro complete');
        } catch (geminiError) {
            console.warn('⚠️ Gemini Pro failed, trying Groq...');
            aiInsights = await generateInsightsWithGroq(cvData, visionAnalysis);
            console.log('✅ Groq complete');
        }
        
        return {
            vision_analysis: visionAnalysis,
            ai_insights: aiInsights,
            engine: 'Gemini Vision + Gemini Pro'
        };
    } catch (error) {
        console.error('❌ Complete AI Analysis failed:', error);
        throw error;
    }
};

export default {
    analyzeImageWithGemini,
    generateInsightsWithGemini,
    generateInsightsWithGroq,
    getCompleteAIAnalysis
};
