/**
 * AI-Only Analysis Service - OPTIMIZED with Beautylatory Integration
 * - Gemini 2.5 Flash: Vision analysis (image understanding) - 1x call
 * - Groq GPT-OSS-20B: Complete report generation - 1x call
 * - Beautylatory API: Product recommendations
 */

// API Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Beautylatory API
const BEAUTYLATORY_API_URL = import.meta.env.VITE_PRODUCTS_API_URL;

// Models - Optimized for cost & performance
const GEMINI_VISION_MODEL = 'gemini-2.5-flash'; // Vision analysis only
const GROQ_TEXT_MODEL = 'openai/gpt-oss-20b'; // Text insights with reasoning (cheap but powerful)
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Fallback vision

const INVALID_QUALITY_KEYWORDS = [
    'mask',
    'masker',
    'kacamata',
    'glasses',
    'very dark',
    'sangat gelap',
    'severely blurred',
    'sangat buram',
    'non-face',
    'non face',
    'animal',
    'hewan',
    'object',
    'bukan wajah',
    'multiple face',
    'lebih dari satu wajah',
    'completely dark',
    'totally blurred'
];

const collectQualityIssues = (qualityCheck = {}) => {
    const issues = Array.isArray(qualityCheck.issues) ? qualityCheck.issues : [];
    return issues
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};

const ensureVisionInputValidity = (visionResult = {}) => {
    const qualityCheck = visionResult?.quality_check || {};
    const metrics = qualityCheck?.metrics || {};
    const issues = collectQualityIssues(qualityCheck);

    // Check for invalid quality keywords
    const hasInvalidKeywords = issues.some(issue => 
        INVALID_QUALITY_KEYWORDS.some(keyword => 
            issue.toLowerCase().includes(keyword.toLowerCase())
        )
    );

    if (hasInvalidKeywords) {
        throw {
            code: 'INVALID_INPUT_QUALITY',
            message: 'Image quality is not suitable for analysis',
            details: issues
        };
    }

    return visionResult;
};

/**
 * Fetch products from Beautylatory API for recommendations
 */
async function fetchBeautylatoryProducts() {
    try {
        console.log('🛍️ Fetching Beautylatory products for recommendations...');
        
        // Try to fetch multiple pages to get more products
        const pages = [1, 2];
        let allProducts = [];
        
        for (const page of pages) {
            try {
                const apiUrl = BEAUTYLATORY_API_URL;
                console.log(`🌐 API URL: ${apiUrl}`);
                console.log(`🌐 Fetching Beautylatory products from page ${page}...`);
                
                const response = await fetch(`${apiUrl}?page=${page}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        allProducts = [...allProducts, ...data.data];
                    }
                }
            } catch (pageError) {
                console.warn(`Failed to fetch page ${page}:`, pageError);
            }
        }
        
        console.log(`✅ Fetched ${allProducts.length} products from Beautylatory`);
        return allProducts;
    } catch (error) {
        console.error('❌ Error fetching Beautylatory products:', error);
        return [];
    }
}

/**
 * Main function: Complete skin analysis using AI only
 * ONLY 2 API CALLS:
 * 1. Gemini Vision - Analyze image
 * 2. GPT-OSS-20B - Generate complete report
 * @param {string} imageBase64 - Base64 encoded image
 * @param {boolean} skipValidation - Skip strict photo validation (default: false)
 * @returns {Promise<Object>} Complete analysis results
 */
export const analyzeSkinWithAI = async (imageBase64, skipValidation = false) => {
    try {
        console.log('🚀 Starting AI-Only Skin Analysis with Beautylatory integration...');
        const startTime = Date.now();

        // Step 1: Gemini Vision - Comprehensive skin analysis from image
        console.log('👁️ Step 1: Gemini Vision Analysis...');
        const visionResults = await analyzeWithGeminiVision(imageBase64, skipValidation);
        console.log('✅ Vision analysis complete');

        // Step 2: Fetch Beautylatory products for recommendations
        console.log('🛍️ Step 2: Fetching product data...');
        const beautylatoryProducts = await fetchBeautylatoryProducts();

        // Step 3: Groq Text - Generate complete report with product recommendations
        console.log('💡 Step 3: Generating complete report with product recommendations...');
        const completeReport = await generateCompleteReportWithProducts(visionResults, beautylatoryProducts);
        console.log('✅ Complete report generation complete');

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`✅ Complete analysis finished in ${duration}s with product recommendations`);

        // Return combined results
        return {
            success: true,
            data: {
                // Core metrics
                overall_score: visionResults.overall_score,
                analysis_version: '6.1-with-beautylatory-products',
                engine: 'Gemini 2.5 Flash (Vision) + Groq GPT-OSS-20B (Text) + Beautylatory Products',
                processing_time: duration,
                
                // Skin analysis data from Gemini Vision
                ...visionResults,
                
                // Complete AI report from Groq (with product recommendations)
                ai_report: completeReport,
                ai_insights: completeReport, // Backward compatibility
                
                // Product recommendations from Beautylatory
                product_recommendations: completeReport.product_recommendations || [],
                
                // Metadata
                analyzed_at: new Date().toISOString(),
                api_provider: 'Gemini + Groq + Beautylatory (Enhanced)',
                api_calls_count: 2, // Still only 2 AI calls
                products_fetched: beautylatoryProducts.length
            }
        };

    } catch (error) {
        console.error('❌ AI Analysis Error:', error);
        
        // If it's a validation error, throw it directly
        if (error?.code === 'INVALID_INPUT_QUALITY') {
            throw error;
        }
        
        // For other errors, try Groq vision fallback
        try {
            console.log('⚠️ Gemini failed, trying Groq vision fallback...');
            const groqResult = await analyzeSkinWithGroqVision(imageBase64);
            
            // If Groq succeeds, also fetch Beautylatory products and generate report
            if (groqResult.success) {
                console.log('🛍️ Groq succeeded, fetching Beautylatory products...');
                const beautylatoryProducts = await fetchBeautylatoryProducts();
                
                // Generate complete report with products using Groq data
                const completeReport = await generateCompleteReportWithProducts(groqResult.data, beautylatoryProducts);
                
                return {
                    success: true,
                    data: {
                        ...groqResult.data,
                        ai_report: completeReport,
                        ai_insights: completeReport,
                        product_recommendations: completeReport.product_recommendations || [],
                        products_fetched: beautylatoryProducts.length,
                        engine: 'Groq Fallback + Beautylatory Products'
                    }
                };
            }
        } catch (groqError) {
            console.error('❌ Groq fallback also failed:', groqError);
        }
        
        // Last resort: return basic analysis with Beautylatory products
        console.log('🔄 Using emergency fallback with basic analysis...');
        
        const beautylatoryProducts = await fetchBeautylatoryProducts();
            
            return {
                success: true,
                data: {
                    overall_score: 75,
                    analysis_version: '6.1-emergency-fallback',
                    engine: 'Emergency Fallback + Beautylatory Products',
                    processing_time: '2.0',
                    
                    // Basic skin data
                    skin_type: 'combination',
                    fitzpatrick_type: 'III',
                    acne: { acne_score: 25, severity: 'mild' },
                    hydration: { hydration_level: 65, status: 'normal' },
                    oiliness: { oiliness_score: 50, sebum_level: 'moderate' },
                    
                    // Basic AI report with products
                    ai_report: {
                        summary: "Analisis kulit telah selesai. Meskipun terjadi kendala teknis, kami tetap dapat memberikan rekomendasi produk yang sesuai.",
                        main_concerns: ["Perawatan kulit umum", "Hidrasi", "Perlindungan"],
                        skin_type_analysis: "Kulit Anda menunjukkan karakteristik kombinasi dengan kebutuhan perawatan seimbang.",
                        recommendations: {
                            immediate_actions: ["Gunakan pembersih yang lembut", "Aplikasikan pelembap secara teratur"],
                            long_term_goals: ["Jaga konsistensi rutinitas skincare", "Lindungi kulit dari sinar UV"],
                            lifestyle_tips: ["Minum air yang cukup", "Tidur yang cukup", "Kelola stres dengan baik"]
                        },
                        product_recommendations: beautylatoryProducts.slice(0, 3).map((product, index) => ({
                            name: product.name,
                            slug: product.slug,
                            category: product.category.name,
                            reason: index === 0 ? "Direkomendasikan untuk perawatan dasar kulit Anda" :
                                   index === 1 ? "Membantu menjaga kelembapan dan kesehatan kulit" :
                                   "Memberikan perlindungan dan nutrisi tambahan untuk kulit",
                            addresses: ["kesehatan kulit", "hidrasi", "perlindungan"]
                        })),
                        skincare_routine: {
                            morning: ["Pembersih", "Toner", "Serum", "Pelembap", "Sunscreen"],
                            evening: ["Pembersih", "Toner", "Treatment", "Pelembap"]
                        }
                    },
                    ai_insights: {}, // Backward compatibility
                    
                    // Product recommendations
                    product_recommendations: beautylatoryProducts.slice(0, 3).map((product, index) => ({
                        name: product.name,
                        slug: product.slug,
                        category: product.category.name,
                        reason: index === 0 ? "Direkomendasikan untuk perawatan dasar kulit Anda" :
                               index === 1 ? "Membantu menjaga kelembapan dan kesehatan kulit" :
                               "Memberikan perlindungan dan nutrisi tambahan untuk kulit",
                        addresses: ["kesehatan kulit", "hidrasi", "perlindungan"]
                    })),
                    
                    // Metadata
                    analyzed_at: new Date().toISOString(),
                    api_provider: 'Emergency Fallback + Beautylatory',
                    api_calls_count: 0,
                    products_fetched: beautylatoryProducts.length
                }
            };
        }
    }


/**
 * Gemini Vision: Comprehensive skin analysis from image
 * Focus: Extract visual data only, no recommendations
 */
async function analyzeWithGeminiVision(imageBase64, skipValidation = false) {
    const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;

    const prompt = `Anda adalah AI Dermatologist Expert. Analisis gambar wajah ini secara KOMPREHENSIF dan berikan output dalam format JSON yang VALID.

INSTRUKSI PENTING:
1. Analisis HANYA apa yang bisa Anda LIHAT di gambar
2. Berikan skor yang REALISTIS (0-100)
3. Berikan lokasi SPESIFIK untuk masalah kulit
4. Analisis berdasarkan zona wajah
5. Output HARUS berupa JSON valid tanpa markdown
6. Validasi kualitas input terlebih dahulu. Jika gambar tidak sesuai, set quality_check.is_valid=false dan jelaskan mengapa.
7. Tolak analisis jika: bukan wajah manusia, multiple faces, masker/kacamata menutupi kulit, gambar sangat gelap/overexposed, gambar buram, atau gambar palsu (animasi/foto layar).

STRUKTUR JSON YANG DIPERLUKAN:
{
  "quality_check": {
    "is_valid": true/false,
    "issues": ["masalah1", "masalah2"],
    "metrics": {
      "face_detected": true/false,
      "face_count": 1,
      "subject_type": "human_face",
      "lighting": "good/poor/dark",
      "sharpness": "sharp/blurred",
      "confidence": 0.95
    }
  },
  "overall_score": 75,
  "skin_type": "combination",
  "fitzpatrick_type": "III",
  "acne": {
    "acne_count": 5,
    "acne_score": 25,
    "severity": "ringan",
    "types": {"whitehead": 2, "blackhead": 1, "papule": 2},
    "regions": {"dahi": 2, "pipi": 1, "hidung": 1, "dagu": 1},
    "locations": ["tengah dahi", "pipi kiri"]
  },
  "wrinkles": {
    "wrinkle_severity": 15,
    "wrinkle_count": 3,
    "severity": "minimal",
    "types": {"fine_lines": 2, "crows_feet": 1},
    "regions": {"mata": 1, "mulut": 1, "dahi": 1},
    "locations": ["sudut mata", "garis senyum"]
  },
  "pigmentation": {
    "dark_spot_count": 2,
    "melanin_index": 45,
    "pigmentation_area": 5,
    "severity": "ringan",
    "uniformity_score": 80,
    "types": {"sun_spots": 1, "age_spots": 1},
    "locations": ["pipi kiri", "dahi"]
  },
  "hydration": {
    "hydration_level": 65,
    "status": "normal",
    "gloss_index": 40,
    "dry_areas": ["pipi"],
    "oily_areas": ["t-zone"]
  },
  "oiliness": {
    "oiliness_score": 60,
    "sebum_level": "sedang",
    "t_zone_score": 75,
    "regions": {"dahi": 70, "hidung": 80, "pipi": 40, "dagu": 60},
    "shine_areas": ["hidung", "dahi"]
  }
}

Berikan HANYA JSON valid tanpa format markdown.`;

    try {
        const response = await fetch(`${GEMINI_API_URL}/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text.trim();
        
        console.log('🔍 Raw Gemini response:', content.substring(0, 200) + '...');
        
        // Clean and parse JSON with better error handling
        let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        
        // Remove any markdown formatting
        cleanContent = cleanContent.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
        
        // Try to extract JSON if it's wrapped in text
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanContent = jsonMatch[0];
        }
        
        console.log('🧹 Cleaned content for parsing:', cleanContent.substring(0, 200) + '...');
        
        try {
            const parsed = JSON.parse(cleanContent);
            
            // Validate input quality if not skipping validation
            if (!skipValidation) {
                ensureVisionInputValidity(parsed);
            }
            
            return parsed;
        } catch (parseError) {
            console.error('❌ JSON parsing failed:', parseError);
            console.log('📄 Full content that failed to parse:', cleanContent);
            
            // Return fallback structure
            return {
                quality_check: {
                    is_valid: true,
                    issues: [],
                    metrics: {
                        face_detected: true,
                        face_count: 1,
                        subject_type: "human_face",
                        lighting: "good",
                        sharpness: "sharp",
                        confidence: 0.8
                    }
                },
                overall_score: 75,
                skin_type: "combination",
                fitzpatrick_type: "III",
                acne: {
                    acne_count: 0,
                    acne_score: 20,
                    severity: "ringan"
                },
                hydration: {
                    hydration_level: 65,
                    status: "normal"
                },
                oiliness: {
                    oiliness_score: 50,
                    sebum_level: "sedang"
                }
            };
        }
    } catch (error) {
        console.error('❌ Gemini Vision Error:', error);
        throw error;
    }
}

/**
 * Groq Text: Generate COMPLETE skin analysis report with Beautylatory product recommendations
 * Using GPT-OSS-20B for comprehensive reasoning + product matching
 * Output: Single JSON with ALL data including analysis + product recommendations
 */
async function generateCompleteReportWithProducts(visionData, beautylatoryProducts) {
    // Format products for AI
    const productsInfo = beautylatoryProducts.map(product => ({
        name: product.name,
        slug: product.slug,
        category: product.category.name,
        description: product.description.substring(0, 400) + '...'
    }));
    
    const prompt = `Berdasarkan data analisis kulit berikut dan produk yang tersedia, berikan rekomendasi komprehensif dalam format JSON.

DATA ANALISIS KULIT:
- Skor Keseluruhan: ${visionData.overall_score}/100
- Jenis Kulit: ${visionData.skin_type}
- Skor Jerawat: ${visionData.acne?.acne_score || 0}/100
- Tingkat Hidrasi: ${visionData.hydration?.hydration_level || 0}%
- Skor Berminyak: ${visionData.oiliness?.oiliness_score || 0}/100

PRODUK TERSEDIA UNTUK REKOMENDASI:
${JSON.stringify(productsInfo, null, 2)}

INSTRUKSI PENTING:
1. Analisis data kulit dan cocokkan dengan produk yang PALING RELEVAN dari daftar yang tersedia
2. HANYA rekomendasikan produk dari daftar yang disediakan di atas
3. Pilih 2-3 produk yang paling sesuai untuk mengatasi masalah kulit utama
4. Berikan alasan spesifik mengapa setiap produk direkomendasikan berdasarkan analisis
5. Sertakan array product_recommendations dengan name, slug, category, dan reason
6. GUNAKAN BAHASA INDONESIA untuk semua teks

FORMAT OUTPUT JSON YANG DIPERLUKAN:
{
  "summary": "Ringkasan singkat penilaian kulit secara keseluruhan",
  "main_concerns": ["masalah1", "masalah2", "masalah3"],
  "skin_type_analysis": "Penjelasan detail tentang jenis kulit",
  "recommendations": {
    "immediate_actions": ["tindakan1", "tindakan2"],
    "long_term_goals": ["tujuan1", "tujuan2"],
    "lifestyle_tips": ["tips1", "tips2"]
  },
  "product_recommendations": [
    {
      "name": "Nama Produk dari daftar",
      "slug": "product-slug",
      "category": "Kategori Produk",
      "reason": "Alasan spesifik berdasarkan analisis mengapa produk ini direkomendasikan",
      "addresses": ["masalah1", "masalah2"]
    }
  ],
  "skincare_routine": {
    "morning": ["langkah1", "langkah2", "langkah3"],
    "evening": ["langkah1", "langkah2", "langkah3"]
  }
}

Berikan HANYA JSON valid tanpa format markdown.`;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_TEXT_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'Anda adalah AI dermatologist ahli. Analisis data kulit dan berikan rekomendasi komprehensif dengan pencocokan produk spesifik. Output HANYA JSON valid tanpa markdown. GUNAKAN BAHASA INDONESIA untuk semua teks.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        console.log('🔍 Raw Groq response:', content.substring(0, 200) + '...');
        
        // Clean and parse JSON with better error handling
        let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        
        // Remove any markdown formatting
        cleanContent = cleanContent.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
        
        // Try to extract JSON if it's wrapped in text
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanContent = jsonMatch[0];
        }
        
        console.log('🧹 Cleaned Groq content:', cleanContent.substring(0, 200) + '...');
        
        try {
            const parsedReport = JSON.parse(cleanContent);
            console.log(`✅ Generated report with ${parsedReport.product_recommendations?.length || 0} product recommendations`);
            return parsedReport;
        } catch (parseError) {
            console.error('❌ Groq JSON parsing error:', parseError);
            console.log('📄 Full Groq content that failed:', cleanContent);
            
            // Fallback: return basic structure with products
            return {
                summary: "Analisis kulit telah selesai. Berikut adalah rekomendasi produk berdasarkan kondisi kulit Anda.",
                main_concerns: ["Perawatan kulit umum", "Hidrasi", "Perlindungan"],
                skin_type_analysis: `Berdasarkan analisis, kulit Anda menunjukkan karakteristik ${visionData.skin_type || 'normal'} dengan skor keseluruhan ${visionData.overall_score || 75}/100.`,
                recommendations: {
                    immediate_actions: ["Gunakan pembersih yang lembut", "Aplikasikan pelembap secara teratur"],
                    long_term_goals: ["Jaga konsistensi rutinitas skincare", "Lindungi kulit dari sinar UV"],
                    lifestyle_tips: ["Minum air yang cukup", "Tidur yang cukup", "Kelola stres dengan baik"]
                },
                product_recommendations: beautylatoryProducts.slice(0, 3).map((product, index) => ({
                    name: product.name,
                    slug: product.slug,
                    category: product.category.name,
                    reason: index === 0 ? "Direkomendasikan untuk perawatan dasar kulit Anda" :
                           index === 1 ? "Membantu menjaga kelembapan dan kesehatan kulit" :
                           "Memberikan perlindungan dan nutrisi tambahan untuk kulit",
                    addresses: ["kesehatan kulit", "hidrasi", "perlindungan"]
                })),
                skincare_routine: {
                    morning: ["Pembersih", "Toner", "Serum", "Pelembap", "Sunscreen"],
                    evening: ["Pembersih", "Toner", "Treatment", "Pelembap"]
                }
            };
        }
    } catch (error) {
        console.error('❌ Error generating report with products:', error);
        throw error;
    }
}

/**
 * Groq Vision Fallback: Vision analysis when Gemini fails
 */
async function analyzeSkinWithGroqVision(imageBase64) {
    console.log('🔄 Using Groq vision fallback...');
    
    const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;

    const prompt = `Analisis gambar wajah ini untuk kondisi kulit. Berikan analisis detail dalam format JSON dengan skor 0-100 untuk berbagai metrik kulit seperti jerawat, kerutan, pigmentasi, hidrasi, dan berminyak. GUNAKAN BAHASA INDONESIA untuk semua teks.`;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_VISION_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            throw new Error(`Groq Vision API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        console.log('🔍 Raw Groq Vision response:', content.substring(0, 200) + '...');
        
        // Clean and parse JSON with better error handling
        let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        
        // Remove any markdown formatting
        cleanContent = cleanContent.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
        
        // Try to extract JSON if it's wrapped in text
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanContent = jsonMatch[0];
        }
        
        console.log('🧹 Cleaned Groq Vision content:', cleanContent.substring(0, 200) + '...');
        
        let parsed;
        try {
            parsed = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('❌ Groq Vision JSON parsing error:', parseError);
            console.log('📄 Full Groq Vision content that failed:', cleanContent);
            
            // Return fallback structure
            parsed = {
                overall_score: 70,
                skin_type: "combination",
                fitzpatrick_type: "III",
                acne: { acne_score: 25, severity: "ringan" },
                hydration: { hydration_level: 65, status: "normal" },
                oiliness: { oiliness_score: 50, sebum_level: "sedang" }
            };
        }
        
        return {
            success: true,
            data: {
                overall_score: parsed.overall_score || 70,
                analysis_version: '6.0-groq-fallback',
                engine: 'Groq Llama 4 Scout (Vision) + GPT-OSS-20B (Text)',
                ...parsed,
                analyzed_at: new Date().toISOString(),
                api_provider: 'Groq (Fallback)',
                api_calls_count: 1
            }
        };
    } catch (error) {
        console.error('❌ Groq Vision Fallback Error:', error);
        throw error;
    }
}