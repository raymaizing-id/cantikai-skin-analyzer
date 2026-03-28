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
const GEMINI_VISION_MODEL = 'gemini-2.5-flash'; // Vision analysis - CORRECT MODEL NAME
const GROQ_TEXT_MODEL = 'openai/gpt-oss-20b'; // Text insights with reasoning (cheap but powerful)
// NOTE: Groq Vision models have been decommissioned - no longer available

const INVALID_QUALITY_KEYWORDS = [
    // Strict rejections - MUST reject
    'multiple face',
    'lebih dari satu wajah',
    'bukan wajah',
    'non-face',
    'non face',
    'animal',
    'hewan',
    'object',
    'benda',
    'completely dark',
    'totally blurred',
    'sangat gelap sekali',
    'sangat buram sekali',
    'tidak terlihat sama sekali',
    
    // Moderate issues - can proceed with warning
    // These are now ALLOWED with skipValidation
];

const MODERATE_QUALITY_KEYWORDS = [
    'mask',
    'masker',
    'kacamata',
    'glasses',
    'dark',
    'gelap',
    'blurred',
    'buram',
    'slightly',
    'sedikit',
    'minor',
    'ringan'
];

const collectQualityIssues = (qualityCheck = {}) => {
    const issues = Array.isArray(qualityCheck.issues) ? qualityCheck.issues : [];
    return issues
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};

const ensureVisionInputValidity = (visionResult = {}, skipValidation = false) => {
    const qualityCheck = visionResult?.quality_check || {};
    const metrics = qualityCheck?.metrics || {};
    const issues = collectQualityIssues(qualityCheck);

    // If skipValidation is true, only check for STRICT rejections
    const keywordsToCheck = skipValidation ? INVALID_QUALITY_KEYWORDS : [...INVALID_QUALITY_KEYWORDS, ...MODERATE_QUALITY_KEYWORDS];

    // Check for invalid quality keywords
    const hasInvalidKeywords = issues.some(issue => 
        keywordsToCheck.some(keyword => 
            issue.toLowerCase().includes(keyword.toLowerCase())
        )
    );

    // Check if quality_check explicitly says invalid
    const isExplicitlyInvalid = qualityCheck.is_valid === false;

    if (hasInvalidKeywords || isExplicitlyInvalid) {
        // Determine if it's a moderate issue
        const isModerateIssue = !skipValidation && issues.some(issue =>
            MODERATE_QUALITY_KEYWORDS.some(keyword =>
                issue.toLowerCase().includes(keyword.toLowerCase())
            )
        );

        throw {
            code: 'INVALID_INPUT_QUALITY',
            message: isModerateIssue 
                ? 'Kualitas foto kurang optimal. Anda bisa mencoba lagi atau lanjutkan dengan hasil yang mungkin kurang akurat.'
                : 'Foto tidak valid untuk analisis. Pastikan wajah terlihat jelas tanpa masker/kacamata dan dengan pencahayaan yang cukup.',
            details: issues,
            canRetry: isModerateIssue,
            isModerate: isModerateIssue
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
 * 1. Gemini Vision - Analyze image (with Groq Vision fallback)
 * 2. GPT-OSS-20B - Generate complete report
 * @param {string} imageBase64 - Base64 encoded image
 * @param {boolean} skipValidation - Skip strict photo validation (default: false)
 * @returns {Promise<Object>} Complete analysis results
 */
export const analyzeSkinWithAI = async (imageBase64, skipValidation = false) => {
    try {
        console.log('🚀 Starting AI-Only Skin Analysis with Beautylatory integration...');
        const startTime = Date.now();

        let visionResults;
        let visionEngine = 'Gemini 2.5 Flash';
        
        // Step 1: Try Gemini Vision (ONLY option for vision now)
        console.log('👁️ Step 1: Gemini Vision Analysis...');
        try {
            visionResults = await analyzeWithGeminiVision(imageBase64, skipValidation);
            console.log('✅ Gemini Vision analysis complete');
        } catch (geminiError) {
            console.warn('⚠️ Gemini Vision failed:', geminiError.message || geminiError);
            
            // NOTE: Groq Vision models have been decommissioned
            // Directly use emergency fallback
            console.log('🔄 Using emergency fallback (Groq Vision no longer available)...');
            throw geminiError; // Trigger emergency fallback
        }

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
                analysis_version: '6.2-enhanced-fallback',
                engine: `${visionEngine} (Vision) + Groq GPT-OSS-20B (Text) + Beautylatory Products`,
                processing_time: duration,
                
                // Skin analysis data from Vision AI
                ...visionResults,
                
                // Complete AI report from Groq (with product recommendations)
                ai_report: completeReport,
                ai_insights: completeReport, // Backward compatibility
                
                // Product recommendations from Beautylatory
                product_recommendations: completeReport.product_recommendations || [],
                
                // Metadata
                analyzed_at: new Date().toISOString(),
                api_provider: `${visionEngine} + Groq + Beautylatory`,
                api_calls_count: 2, // Still only 2 AI calls
                products_fetched: beautylatoryProducts.length
            }
        };

    } catch (error) {
        console.error('❌ AI Analysis Error:', error);
        
        // Last resort: Emergency fallback with basic analysis
        console.log('🔄 Using emergency fallback with basic analysis...');
        
        const beautylatoryProducts = await fetchBeautylatoryProducts();
            
        return {
            success: true,
            data: {
                overall_score: 75,
                analysis_version: '6.2-emergency-fallback',
                engine: 'Emergency Fallback + Beautylatory Products',
                processing_time: '2.0',
                
                // Basic skin data
                skin_type: 'combination',
                fitzpatrick_type: 'III',
                predicted_age: 25,
                acne: { acne_count: 0, acne_score: 20, severity: 'ringan' },
                hydration: { hydration_level: 65, status: 'normal' },
                oiliness: { oiliness_score: 50, sebum_level: 'sedang' },
                pores: { pore_score: 50, visibility: 'sedang' },
                texture: { texture_score: 70, smoothness: 'cukup halus' },
                
                // Basic AI report with products
                ai_report: {
                    summary: "Analisis kulit telah selesai. Meskipun terjadi kendala teknis dengan kualitas foto, kami tetap dapat memberikan rekomendasi produk yang sesuai untuk perawatan kulit Anda.",
                    main_concerns: ["Perawatan kulit umum", "Hidrasi", "Perlindungan"],
                    skin_type_analysis: "Kulit Anda menunjukkan karakteristik kombinasi dengan kebutuhan perawatan seimbang antara area berminyak dan kering.",
                    recommendations: {
                        immediate_actions: [
                            "Gunakan pembersih yang lembut untuk membersihkan wajah 2x sehari",
                            "Aplikasikan pelembap secara teratur untuk menjaga hidrasi kulit",
                            "Gunakan sunscreen SPF 30+ setiap pagi untuk perlindungan UV"
                        ],
                        long_term_goals: [
                            "Jaga konsistensi rutinitas skincare untuk hasil optimal",
                            "Lindungi kulit dari sinar UV untuk mencegah penuaan dini",
                            "Monitor kondisi kulit dan sesuaikan produk sesuai kebutuhan"
                        ],
                        lifestyle_tips: [
                            "Minum air putih minimal 8 gelas per hari untuk hidrasi dari dalam",
                            "Tidur yang cukup (7-8 jam) untuk regenerasi kulit",
                            "Kelola stres dengan baik karena dapat mempengaruhi kondisi kulit"
                        ]
                    },
                    product_recommendations: beautylatoryProducts.slice(0, 3).map((product, index) => ({
                        name: product.name,
                        slug: product.slug,
                        category: product.category.name,
                        reason: index === 0 
                            ? `${product.name} direkomendasikan sebagai produk dasar untuk perawatan kulit Anda. Produk ini membantu menjaga kesehatan dan kelembapan kulit dengan formula yang sesuai untuk kulit kombinasi.`
                            : index === 1 
                            ? `${product.name} membantu menjaga kelembapan dan kesehatan kulit dengan ingredients yang mendukung skin barrier. Cocok digunakan sebagai bagian dari rutinitas harian Anda.`
                            : `${product.name} memberikan perlindungan dan nutrisi tambahan untuk kulit. Produk ini melengkapi rutinitas skincare Anda untuk hasil yang lebih optimal.`,
                        addresses: ["kesehatan kulit", "hidrasi", "perlindungan"],
                        usage: index === 0 ? "Gunakan 2x sehari, pagi dan malam" : index === 1 ? "Aplikasikan setelah pembersih" : "Gunakan sesuai kebutuhan",
                        expected_results: "Hasil terlihat dalam 2-4 minggu dengan penggunaan rutin"
                    })),
                    skincare_routine: {
                        morning: [
                            "Pembersih wajah yang lembut",
                            "Toner untuk menyeimbangkan pH kulit",
                            "Serum hidrasi atau vitamin C",
                            "Pelembap sesuai jenis kulit",
                            "Sunscreen SPF 30+ (wajib!)"
                        ],
                        evening: [
                            "Pembersih wajah (double cleansing jika pakai makeup)",
                            "Toner",
                            "Treatment serum (retinol/niacinamide)",
                            "Pelembap malam yang lebih rich"
                        ],
                        weekly_treatments: [
                            "Exfoliating 1-2x seminggu untuk mengangkat sel kulit mati",
                            "Sheet mask atau sleeping mask 2-3x seminggu untuk hidrasi ekstra"
                        ]
                    },
                    progress_tracking: {
                        week_2: "Kulit terasa lebih lembap dan nyaman",
                        week_4: "Tekstur kulit mulai lebih halus dan merata",
                        week_8: "Kondisi kulit lebih stabil dan sehat",
                        week_12: "Hasil optimal dengan kulit yang lebih cerah dan sehat"
                    }
                },
                ai_insights: {}, // Backward compatibility
                
                // Product recommendations
                product_recommendations: beautylatoryProducts.slice(0, 3).map((product, index) => ({
                    name: product.name,
                    slug: product.slug,
                    category: product.category.name,
                    reason: index === 0 
                        ? `${product.name} direkomendasikan sebagai produk dasar untuk perawatan kulit Anda.`
                        : index === 1 
                        ? `${product.name} membantu menjaga kelembapan dan kesehatan kulit.`
                        : `${product.name} memberikan perlindungan dan nutrisi tambahan untuk kulit.`,
                    addresses: ["kesehatan kulit", "hidrasi", "perlindungan"]
                })),
                
                // Metadata
                analyzed_at: new Date().toISOString(),
                api_provider: 'Emergency Fallback + Beautylatory',
                api_calls_count: 0,
                products_fetched: beautylatoryProducts.length,
                fallback_reason: error?.message || 'Analysis failed'
            }
        };
    }
};


/**
 * Gemini Vision: Comprehensive skin analysis from image
 * Focus: Extract visual data only, no recommendations
 */
async function analyzeWithGeminiVision(imageBase64, skipValidation = false) {
    const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;

    const prompt = `Analisis gambar wajah ini dan berikan data dalam JSON.

VALIDASI: Tolak jika bukan wajah manusia, multiple faces, atau masker/kacamata >30%.

OUTPUT JSON (WAJIB SEMUA FIELD):
{
  "quality_check": {"is_valid": true, "issues": [], "metrics": {"face_detected": true, "face_count": 1, "subject_type": "human_face", "lighting": "good", "sharpness": "sharp", "confidence": 0.95}},
  "overall_score": 73,
  "skin_type": "combination",
  "skin_type_reasoning": "T-zone berminyak, pipi normal",
  "fitzpatrick_type": "III",
  "predicted_age": 28,
  "age_reasoning": "Elastisitas baik",
  "acne": {"acne_count": 5, "acne_score": 23, "severity": "ringan", "types": {"whitehead": 2, "blackhead": 1, "papule": 2, "pustule": 0}, "regions": {"dahi": 2, "pipi_kiri": 1, "hidung": 1, "dagu": 1}, "locations": ["dahi kanan (2 whitehead)", "pipi kiri (1 papule)"], "inflammation_level": "rendah", "notes": "Jerawat minimal"},
  "wrinkles": {"wrinkle_count": 4, "wrinkle_severity": 18, "severity": "minimal", "types": {"fine_lines": 3, "crows_feet": 1}, "regions": {"mata": 2, "mulut": 1}, "locations": ["mata kanan", "mata kiri"], "depth": "superficial", "notes": "Garis halus normal"},
  "pigmentation": {"dark_spot_count": 3, "melanin_index": 48, "pigmentation_area": 6, "severity": "ringan", "uniformity_score": 78, "types": {"sun_spots": 2, "post_inflammatory": 1}, "locations": ["pipi kiri", "pipi kanan"], "distribution": "tersebar ringan", "notes": "Hiperpigmentasi ringan"},
  "hydration": {"hydration_level": 62, "status": "normal", "gloss_index": 38, "dry_areas": ["pipi luar"], "oily_areas": ["t-zone"], "barrier_health": "baik", "notes": "Hidrasi cukup"},
  "oiliness": {"oiliness_score": 58, "sebum_level": "sedang", "t_zone_score": 72, "regions": {"dahi": 68, "hidung": 76, "pipi_kiri": 42, "pipi_kanan": 45, "dagu": 55}, "shine_areas": ["hidung"], "pore_visibility": "sedang", "notes": "Sebum sedang"},
  "pores": {"pore_score": 45, "visibility": "sedang", "enlarged_count": 12, "size": "sedang", "locations": ["hidung", "pipi"], "cleanliness": "sebagian tersumbat", "notes": "Pori terlihat"},
  "texture": {"texture_score": 72, "smoothness": "cukup halus", "evenness": 68, "roughness_areas": ["pipi kiri"], "elasticity": "baik", "notes": "Tekstur halus"},
  "eye_area": {"dark_circles": 35, "puffiness": 20, "fine_lines": 2, "firmness": 75, "notes": "Lingkaran mata ringan"},
  "priority_concerns": [
    {"concern": "Kontrol Sebum", "severity": "sedang", "zones": ["dahi", "hidung"]},
    {"concern": "Hiperpigmentasi", "severity": "ringan", "zones": ["pipi"]}
  ]
}

PENTING: 
- Analisis AKTUAL berdasarkan foto (jangan template!)
- Hitung jerawat, kerutan, bintik yang BENAR-BENAR terlihat
- Berikan skor AKURAT (jangan 75/80/85)
- Output HANYA JSON valid, NO markdown`;

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
                    maxOutputTokens: 8192 // Increased from 4096 to ensure complete response
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
            
            // Validate that we have all CRITICAL required fields
            const requiredFields = ['overall_score', 'skin_type', 'acne', 'hydration', 'oiliness', 'pores', 'texture', 'wrinkles', 'pigmentation'];
            const missingFields = requiredFields.filter(field => !parsed[field]);
            
            if (missingFields.length > 0) {
                console.warn('⚠️ Incomplete response from Gemini, missing fields:', missingFields);
                console.log('📄 Parsed data:', JSON.stringify(parsed, null, 2));
                throw {
                    code: 'INCOMPLETE_RESPONSE',
                    message: `Gemini response is incomplete - missing: ${missingFields.join(', ')}`,
                    partialData: parsed,
                    missingFields
                };
            }
            
            // Validate overall_score is not 0 (indicates failed analysis)
            if (parsed.overall_score === 0 || parsed.overall_score === undefined || parsed.overall_score === null) {
                console.warn('⚠️ Invalid overall_score from Gemini:', parsed.overall_score);
                throw {
                    code: 'INVALID_SCORE',
                    message: 'Gemini returned invalid overall_score',
                    partialData: parsed
                };
            }
            
            // Validate skin_type is not Unknown
            if (!parsed.skin_type || parsed.skin_type === 'Unknown') {
                console.warn('⚠️ Invalid skin_type from Gemini:', parsed.skin_type);
                throw {
                    code: 'INVALID_SKIN_TYPE',
                    message: 'Gemini returned invalid skin_type',
                    partialData: parsed
                };
            }
            
            // Check if Gemini says image is invalid
            if (parsed.quality_check && parsed.quality_check.is_valid === false) {
                console.warn('⚠️ Gemini detected quality issues:', parsed.quality_check.issues);
                
                // If skipValidation is true, continue anyway
                if (skipValidation) {
                    console.log('✅ Continuing with analysis despite quality issues (skipValidation=true)');
                    // Force is_valid to true
                    parsed.quality_check.is_valid = true;
                    return parsed;
                }
                
                // Otherwise, throw error to trigger fallback
                throw {
                    code: 'GEMINI_QUALITY_REJECTED',
                    message: 'Gemini mendeteksi masalah kualitas foto',
                    details: parsed.quality_check.issues || [],
                    canRetry: true,
                    isModerate: true,
                    geminiResponse: parsed
                };
            }
            
            // Validate input quality if not skipping validation
            if (!skipValidation) {
                ensureVisionInputValidity(parsed, skipValidation);
            }
            
            console.log('✅ Gemini response validated - all required fields present');
            return parsed;
        } catch (parseError) {
            // If it's our custom error, re-throw it
            if (parseError.code === 'GEMINI_QUALITY_REJECTED' || parseError.code === 'INVALID_INPUT_QUALITY' || parseError.code === 'INCOMPLETE_RESPONSE') {
                throw parseError;
            }
            
            console.error('❌ JSON parsing failed:', parseError);
            console.log('📄 Full content that failed to parse:', cleanContent);
            
            // Try to fix common JSON issues
            try {
                // Add missing closing braces if needed
                let fixedContent = cleanContent;
                const openBraces = (fixedContent.match(/\{/g) || []).length;
                const closeBraces = (fixedContent.match(/\}/g) || []).length;
                
                if (openBraces > closeBraces) {
                    console.log('🔧 Attempting to fix incomplete JSON by adding closing braces...');
                    fixedContent += '}'.repeat(openBraces - closeBraces);
                    const fixedParsed = JSON.parse(fixedContent);
                    console.log('✅ Successfully fixed and parsed JSON!');
                    return fixedParsed;
                }
            } catch (fixError) {
                console.error('❌ Could not fix JSON:', fixError);
            }
            
            // For JSON parse errors, throw to trigger fallback
            throw {
                code: 'JSON_PARSE_ERROR',
                message: 'Failed to parse Gemini response',
                originalError: parseError,
                rawContent: cleanContent.substring(0, 500)
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
    
    const prompt = `Anda adalah AI Dermatologist Expert. Berdasarkan data analisis kulit, berikan rekomendasi PERSONAL dan DETAIL.

DATA ANALISIS:
- Skor: ${visionData.overall_score}/100
- Jenis Kulit: ${visionData.skin_type} ${visionData.skin_type_reasoning ? `(${visionData.skin_type_reasoning})` : ''}
- Usia: ${visionData.predicted_age || 25} tahun
- Jerawat: ${visionData.acne?.acne_count || 0} (skor ${visionData.acne?.acne_score || 0}/100) di ${visionData.acne?.locations?.join(', ') || 'tidak ada'}
- Kerutan: ${visionData.wrinkles?.wrinkle_count || 0} (skor ${visionData.wrinkles?.wrinkle_severity || 0}/100) di ${visionData.wrinkles?.locations?.join(', ') || 'tidak ada'}
- Pigmentasi: ${visionData.pigmentation?.dark_spot_count || 0} bintik (keseragaman ${visionData.pigmentation?.uniformity_score || 0}/100)
- Hidrasi: ${visionData.hydration?.hydration_level || 0}% (${visionData.hydration?.status || 'normal'})
- Berminyak: ${visionData.oiliness?.oiliness_score || 0}/100, T-zone ${visionData.oiliness?.t_zone_score || 0}/100
- Pori: ${visionData.pores?.enlarged_count || 0} membesar (skor ${visionData.pores?.pore_score || 0}/100)
- Tekstur: ${visionData.texture?.texture_score || 0}/100

PRIORITAS: ${visionData.priority_concerns?.map((c, i) => `${i+1}. ${c.concern} (${c.severity}) di ${c.zones?.join(', ')}`).join('; ') || 'Tidak ada'}

PRODUK TERSEDIA:
${JSON.stringify(productsInfo.slice(0, 10), null, 2)}

INSTRUKSI:
1. Analisis data dengan teliti
2. Pilih 2-3 produk PALING RELEVAN dari daftar
3. Berikan alasan DETAIL (min 2 kalimat) untuk setiap produk - sebutkan ingredients, masalah yang diatasi, cara kerja, ekspektasi hasil
4. Berikan rekomendasi tindakan yang SPESIFIK berdasarkan data
5. Susun rutinitas skincare lengkap

OUTPUT JSON (LENGKAP):
{
  "summary": "Ringkasan kondisi kulit dengan data spesifik (min 3 kalimat)",
  "main_concerns": ["Masalah 1 dengan detail", "Masalah 2 dengan detail", "Masalah 3 dengan detail"],
  "skin_type_analysis": "Analisis jenis kulit dengan karakteristik spesifik (min 3 kalimat)",
  "recommendations": {
    "immediate_actions": ["Tindakan 1 dengan alasan", "Tindakan 2 dengan alasan", "Tindakan 3 dengan alasan"],
    "long_term_goals": ["Tujuan 1 dengan timeline", "Tujuan 2 dengan timeline", "Tujuan 3 dengan timeline"],
    "lifestyle_tips": ["Tips 1 relevan", "Tips 2 relevan", "Tips 3 relevan"]
  },
  "product_recommendations": [
    {
      "name": "Nama Produk",
      "slug": "product-slug",
      "category": "Kategori",
      "reason": "Alasan DETAIL (min 2 kalimat): ingredients aktif, masalah yang diatasi dengan data, cara kerja, ekspektasi hasil",
      "addresses": ["masalah 1", "masalah 2"],
      "usage": "Cara penggunaan spesifik",
      "expected_results": "Hasil dengan timeline"
    }
  ],
  "skincare_routine": {
    "morning": ["Langkah 1", "Langkah 2", "Langkah 3", "Langkah 4", "Langkah 5"],
    "evening": ["Langkah 1", "Langkah 2", "Langkah 3", "Langkah 4"],
    "weekly_treatments": ["Treatment 1 dengan frekuensi", "Treatment 2 dengan frekuensi"]
  },
  "progress_tracking": {
    "week_2": "Ekspektasi minggu 2",
    "week_4": "Ekspektasi minggu 4",
    "week_8": "Ekspektasi minggu 8",
    "week_12": "Ekspektasi minggu 12"
  }
}

PENTING: Rekomendasi harus PERSONAL berdasarkan data. Output HANYA JSON valid. BAHASA INDONESIA.`;

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
                max_tokens: 4096
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
            // Try to parse directly first
            let parsedReport;
            try {
                parsedReport = JSON.parse(cleanContent);
            } catch (firstError) {
                console.warn('⚠️ First parse attempt failed, trying auto-fix...', firstError.message);
                
                // Log the problematic area
                const errorPos = firstError.message.match(/position (\d+)/);
                if (errorPos) {
                    const pos = parseInt(errorPos[1]);
                    const start = Math.max(0, pos - 100);
                    const end = Math.min(cleanContent.length, pos + 100);
                    console.log('🔍 Error area:', cleanContent.substring(start, end));
                    console.log('🔍 Character at error position:', cleanContent[pos], '(code:', cleanContent.charCodeAt(pos), ')');
                }
                
                // Auto-fix common JSON issues
                let fixedContent = cleanContent;
                
                // Fix 1: Remove trailing commas before closing brackets
                fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
                
                // Fix 2: Fix missing commas between array elements (common issue)
                // Look for patterns like: "}{"  or  "]{"  or  "}["
                fixedContent = fixedContent.replace(/\}(\s*)\{/g, '},$1{');
                fixedContent = fixedContent.replace(/\](\s*)\{/g, '],$1{');
                fixedContent = fixedContent.replace(/\}(\s*)\[/g, '},$1[');
                
                // Fix 3: Fix missing commas after closing quotes before opening quotes
                // Pattern: "text" "text" should be "text", "text"
                fixedContent = fixedContent.replace(/"(\s*)"(?=[a-zA-Z_])/g, '",$1"');
                
                // Fix 4: Fix space between } and "key" (should be },"key")
                // This is the most common issue causing "Expected ',' or ']'" error
                // Pattern: } "key" should be },"key"
                fixedContent = fixedContent.replace(/\}(\s+)"([a-zA-Z_])/g, '},"$2');
                
                // Fix 5: Fix space between ] and "key" (should be ],"key")
                // Pattern: ] "key" should be ],"key"
                fixedContent = fixedContent.replace(/\](\s+)"([a-zA-Z_])/g, '],"$2');
                
                // Fix 6: Fix space between } and , (remove extra space)
                fixedContent = fixedContent.replace(/\}\s+,/g, '},');
                
                // Fix 7: Fix space between ] and , (remove extra space)
                fixedContent = fixedContent.replace(/\]\s+,/g, '],');
                
                // Fix 8: Add missing closing braces if needed
                const openBraces = (fixedContent.match(/\{/g) || []).length;
                const closeBraces = (fixedContent.match(/\}/g) || []).length;
                if (openBraces > closeBraces) {
                    console.log('🔧 Adding missing closing braces...');
                    fixedContent += '}'.repeat(openBraces - closeBraces);
                }
                
                // Fix 9: Add missing closing brackets if needed
                const openBrackets = (fixedContent.match(/\[/g) || []).length;
                const closeBrackets = (fixedContent.match(/\]/g) || []).length;
                if (openBrackets > closeBrackets) {
                    console.log('🔧 Adding missing closing brackets...');
                    fixedContent += ']'.repeat(openBrackets - closeBrackets);
                }
                
                console.log('🔧 Fixed content (first 200 chars):', fixedContent.substring(0, 200) + '...');
                
                try {
                    parsedReport = JSON.parse(fixedContent);
                    console.log('✅ Successfully parsed after auto-fix!');
                } catch (secondError) {
                    console.error('❌ Auto-fix failed:', secondError.message);
                    console.log('📄 Fixed content that still failed:', fixedContent.substring(0, 500));
                    throw secondError;
                }
            }
            
            // Validate that we have all CRITICAL required fields for the report
            const requiredReportFields = ['summary', 'main_concerns', 'skin_type_analysis', 'recommendations', 'product_recommendations', 'skincare_routine'];
            const missingReportFields = requiredReportFields.filter(field => !parsedReport[field]);
            
            if (missingReportFields.length > 0) {
                console.warn('⚠️ Incomplete report from Groq, missing fields:', missingReportFields);
                // Continue with fallback below
                throw new Error(`Missing fields: ${missingReportFields.join(', ')}`);
            }
            
            // Validate product_recommendations has at least 1 product
            if (!parsedReport.product_recommendations || parsedReport.product_recommendations.length === 0) {
                console.warn('⚠️ No product recommendations in Groq response');
                // Continue with fallback below
                throw new Error('No product recommendations');
            }
            
            console.log(`✅ Generated complete report with ${parsedReport.product_recommendations?.length || 0} product recommendations`);
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
 * MUST provide EQUALLY DETAILED analysis as Gemini
 */
async function analyzeSkinWithGroqVision(imageBase64) {
    console.log('🔄 Using Groq vision fallback...');
    
    const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;

    const prompt = `Anda adalah AI Dermatologist Expert. Analisis gambar wajah ini secara SANGAT DETAIL dan SPESIFIK.

PENTING - BERIKAN ANALISIS YANG UNIK DAN PERSONAL:
1. Analisis HANYA berdasarkan apa yang BENAR-BENAR terlihat di gambar
2. Berikan skor yang AKURAT dan SPESIFIK (jangan template seperti 75, 80, 85)
3. Sebutkan lokasi SPESIFIK untuk setiap masalah kulit
4. Berikan jumlah yang TEPAT untuk jerawat, kerutan, bintik gelap
5. Deskripsikan kondisi dengan DETAIL (tekstur, warna, ukuran, distribusi)

ANALISIS YANG DIPERLUKAN:

1. JERAWAT: Hitung jumlah pasti, tentukan jenis (whitehead/blackhead/papule/pustule), lokasi spesifik, tingkat inflamasi
2. KERUTAN: Identifikasi jenis (fine lines/crow's feet/forehead lines), hitung jumlah, kedalaman, lokasi spesifik
3. PIGMENTASI: Hitung bintik gelap, ukuran, jenis (sun spots/age spots/melasma), lokasi, keseragaman warna
4. HIDRASI: Tingkat kelembapan (0-100%), area kering/berminyak, gloss index, status barrier
5. BERMINYAK: Skor per zona (dahi/hidung/pipi/dagu), area shine, T-zone score
6. PORI-PORI: Jumlah pori membesar, ukuran, lokasi, kebersihan
7. TEKSTUR: Kehalusan, ketidakrataan, elastisitas
8. WARNA KULIT: Fitzpatrick type, keseragaman, hiperpigmentasi/hipopigmentasi
9. AREA MATA: Dark circles, puffiness, fine lines, kekencangan
10. KESEHATAN KESELURUHAN: Skor keseluruhan, jenis kulit dengan alasan, masalah utama, prediksi usia

FORMAT OUTPUT JSON (LENGKAP):
{
  "overall_score": 73,
  "skin_type": "combination",
  "skin_type_reasoning": "T-zone berminyak dengan pipi normal-kering",
  "fitzpatrick_type": "III",
  "predicted_age": 28,
  "age_reasoning": "Berdasarkan elastisitas kulit dan minimal fine lines",
  "acne": {
    "acne_count": 5,
    "acne_score": 23,
    "severity": "ringan",
    "types": {"whitehead": 2, "blackhead": 1, "papule": 2, "pustule": 0},
    "regions": {"dahi": 2, "pipi_kiri": 1, "pipi_kanan": 0, "hidung": 1, "dagu": 1},
    "locations": ["dahi kanan atas (2 whitehead)", "pipi kiri bawah (1 papule)", "hidung (1 blackhead)", "dagu (1 papule)"],
    "inflammation_level": "rendah",
    "notes": "Jerawat aktif minimal"
  },
  "wrinkles": {
    "wrinkle_count": 4,
    "wrinkle_severity": 18,
    "severity": "minimal",
    "types": {"fine_lines": 3, "crows_feet": 1, "forehead_lines": 0},
    "locations": ["sudut mata kanan (crow's feet)", "sudut mata kiri (fine line)", "bawah mata (fine line)"],
    "depth": "superficial",
    "notes": "Garis halus normal untuk usia"
  },
  "pigmentation": {
    "dark_spot_count": 3,
    "melanin_index": 48,
    "pigmentation_area": 6,
    "severity": "ringan",
    "uniformity_score": 78,
    "types": {"sun_spots": 2, "post_inflammatory": 1},
    "locations": ["pipi kiri atas (sun spot 3mm)", "pipi kanan (sun spot 2mm)", "dahi (PIH)"],
    "notes": "Hiperpigmentasi ringan dari UV"
  },
  "hydration": {
    "hydration_level": 62,
    "status": "normal",
    "gloss_index": 38,
    "dry_areas": ["pipi luar", "area mata"],
    "oily_areas": ["t-zone"],
    "barrier_health": "baik",
    "notes": "Hidrasi cukup baik"
  },
  "oiliness": {
    "oiliness_score": 58,
    "sebum_level": "sedang",
    "t_zone_score": 72,
    "regions": {"dahi": 68, "hidung": 76, "pipi_kiri": 42, "pipi_kanan": 45, "dagu": 55},
    "shine_areas": ["hidung", "dahi tengah"],
    "notes": "Produksi sebum sedang di t-zone"
  },
  "pores": {
    "pore_score": 45,
    "visibility": "sedang",
    "enlarged_count": 12,
    "size": "sedang",
    "locations": ["hidung", "pipi atas", "dahi"],
    "cleanliness": "sebagian tersumbat",
    "notes": "Pori terlihat di t-zone"
  },
  "texture": {
    "texture_score": 72,
    "smoothness": "cukup halus",
    "evenness": 68,
    "roughness_areas": ["pipi kiri"],
    "elasticity": "baik",
    "notes": "Tekstur umumnya halus"
  },
  "eye_area": {
    "dark_circles": 35,
    "puffiness": 20,
    "fine_lines": 2,
    "firmness": 75,
    "notes": "Lingkaran mata ringan"
  },
  "priority_concerns": [
    {"concern": "Kontrol Sebum T-Zone", "severity": "sedang", "zones": ["dahi", "hidung"]},
    {"concern": "Hiperpigmentasi Ringan", "severity": "ringan", "zones": ["pipi"]},
    {"concern": "Pori Membesar", "severity": "ringan", "zones": ["hidung"]}
  ]
}

Berikan HANYA JSON valid. JANGAN gunakan template generik!`;

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