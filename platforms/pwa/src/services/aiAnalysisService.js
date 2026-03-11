/**
 * AI-Only Analysis Service - OPTIMIZED
 * - Gemini 2.5 Flash: Vision analysis (image understanding) - 1x call
 * - Groq GPT-OSS-20B: Complete report generation - 1x call
 * Total: 2 API calls only (no image generation, save tokens!)
 */

// API Configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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
    const issuesText = issues.join(' ').toLowerCase();

    console.log('🔍 Photo validation check:', {
        issues,
        qualityValid: qualityCheck?.is_valid,
        faceDetected: metrics?.face_detected,
        confidence: metrics?.confidence
    });

    const qualityValid = qualityCheck?.is_valid !== false;
    const faceDetected = metrics?.face_detected !== false;
    const subjectType = String(metrics?.subject_type || 'human_face').toLowerCase();
    const faceCount = Number(metrics?.face_count ?? 1);
    const lighting = String(metrics?.lighting || '').toLowerCase();
    const sharpness = String(metrics?.sharpness || '').toLowerCase();
    const confidence = Number(metrics?.confidence ?? 0.85);
    
    // More tolerant validation - only block severe issues
    const hasInvalidKeyword = INVALID_QUALITY_KEYWORDS.some((keyword) => issuesText.includes(keyword));
    const blockedByHardRule = ['animal', 'object', 'animation', 'unknown', 'non_face', 'non-face'].includes(subjectType)
        || faceCount !== 1
        || lighting === 'completely_dark' // Only block completely dark, not slightly underexposed
        || sharpness === 'severely_blurred' // Only block severe blur, not minor blur
        || confidence < 0.3 // Lower threshold, more tolerant
        || hasInvalidKeyword;

    // Only throw error for truly invalid photos
    if (!qualityValid || !faceDetected || blockedByHardRule) {
        // Filter out minor issues from error message
        const majorIssues = issues.filter(issue => {
            const lowerIssue = issue.toLowerCase();
            return !lowerIssue.includes('slightly') && 
                   !lowerIssue.includes('minor') && 
                   !lowerIssue.includes('sedikit') &&
                   !lowerIssue.includes('ringan');
        });
        
        console.log('⚠️ Photo validation - Major issues found:', majorIssues);
        
        const reasonText = majorIssues.length > 0
            ? majorIssues.slice(0, 3).join(' | ')
            : 'Foto tidak valid untuk analisa kulit akurat.';
            
        // Only throw if there are major issues
        if (majorIssues.length > 0) {
            const error = new Error(`Foto belum layak dianalisa. ${reasonText}`);
            error.code = 'INVALID_INPUT_QUALITY';
            error.details = {
                quality_check: qualityCheck,
                issues: majorIssues
            };
            throw error;
        }
    }
    
    console.log('✅ Photo validation passed - proceeding with analysis');
};

/**
 * Main function: Complete skin analysis using AI only
 * ONLY 2 API CALLS:
 * 1. Gemini Vision → Analyze image
 * 2. GPT-OSS-20B → Generate complete report
 * @param {string} imageBase64 - Base64 encoded image
 * @param {boolean} skipValidation - Skip strict photo validation (default: false)
 * @returns {Promise<Object>} Complete analysis results
 */
export const analyzeSkinWithAI = async (imageBase64, skipValidation = false) => {
    try {
        console.log('🚀 Starting AI-Only Skin Analysis (2 calls only)...');
        const startTime = Date.now();

        // Step 1: Gemini Vision - Comprehensive skin analysis from image
        console.log('👁️ Step 1: Gemini Vision Analysis...');
        const visionResults = await analyzeWithGeminiVision(imageBase64, skipValidation);
        console.log('✅ Vision analysis complete');

        // Step 2: Groq Text - Generate complete report (1x call for everything)
        console.log('💡 Step 2: Generating complete report with Groq...');
        const completeReport = await generateCompleteReport(visionResults);
        console.log('✅ Complete report generation complete');

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`✅ Complete analysis finished in ${duration}s with 2 API calls`);

        // Return combined results
        return {
            success: true,
            data: {
                // Core metrics
                overall_score: visionResults.overall_score,
                analysis_version: '6.0-ultra-optimized',
                engine: 'Gemini 2.5 Flash (Vision) + Groq GPT-OSS-20B (Text) - 2 calls only',
                processing_time: duration,
                
                // Skin analysis data from Gemini Vision
                ...visionResults,
                
                // Complete AI report from Groq (single comprehensive report)
                ai_report: completeReport,
                ai_insights: completeReport, // Backward compatibility
                
                // Metadata
                analyzed_at: new Date().toISOString(),
                api_provider: 'Gemini + Groq (Optimized)',
                api_calls_count: 2 // Only 2 calls!
            }
        };

    } catch (error) {
        console.error('❌ AI Analysis Error:', error);
        if (error?.code === 'INVALID_INPUT_QUALITY') {
            throw error;
        }
        
        // Try fallback to Groq Vision
        try {
            console.log('⚠️ Trying Groq vision fallback...');
            return await analyzeSkinWithGroqVision(imageBase64);
        } catch (groqError) {
            console.error('❌ Groq fallback also failed:', groqError);
            throw new Error(`Analysis failed: ${error.message}`);
        }
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

    const prompt = `You are an AI Dermatologist Expert. Analyze this facial image COMPREHENSIVELY and provide output in VALID JSON format.

CRITICAL INSTRUCTIONS:
1. Analyze ONLY what you can SEE in the image
2. Be REALISTIC with scores (0-100)
3. Provide SPECIFIC locations for issues
4. Analyze by facial zones
5. Output MUST be valid JSON without markdown
6. Validate input quality first. If image is not suitable, set quality_check.is_valid=false and explain why.
7. Reject analysis if: non-human face, multiple faces, mask/glasses blocking skin, very dark/overexposed image, blurry image, or spoof image (animation/printed/photo of screen).

REQUIRED JSON STRUCTURE:

{
  "overall_score": 75,
  "skin_type": "Combination",
  "fitzpatrick_type": "III",
  
  "acne": {
    "acne_count": 5,
    "acne_score": 30,
    "severity": "Mild",
    "types": {"whitehead": 2, "blackhead": 1, "papule": 2, "pustule": 0, "cyst": 0},
    "regions": {"forehead": 2, "cheeks": 1, "nose": 1, "chin": 1, "jawline": 0},
    "locations": ["Left forehead", "Right cheek", "Nose"]
  },
  
  "wrinkles": {
    "wrinkle_severity": 25,
    "wrinkle_count": 8,
    "severity": "Mild",
    "regions": {"forehead": 3, "eyes": 4, "mouth": 1, "cheeks": 0},
    "types": {"fine_lines": 6, "deep_wrinkles": 2, "crows_feet": 3, "forehead_lines": 2, "smile_lines": 1},
    "locations": ["Around eyes", "Forehead", "Smile lines"]
  },
  
  "pigmentation": {
    "dark_spot_count": 4,
    "melanin_index": 45,
    "pigmentation_area": 8.5,
    "severity": "Moderate",
    "uniformity_score": 65,
    "types": {"age_spots": 2, "sun_spots": 1, "melasma": 0, "post_inflammatory": 1, "freckles": 3},
    "regions": {"forehead": 1, "cheeks": 2, "nose": 0, "chin": 1},
    "locations": ["Right cheek", "Forehead", "Chin"]
  },
  
  "redness": {
    "redness_score": 35,
    "erythema_index": 40,
    "severity": "Mild",
    "regions": {"cheeks": 60, "nose": 45, "forehead": 20, "chin": 15},
    "causes": ["Sensitivity", "Mild irritation"],
    "locations": ["Cheeks", "Nose"]
  },
  
  "texture": {
    "roughness_score": 40,
    "smoothness_score": 60,
    "severity": "Mild",
    "texture_features": {"pore_visibility": 55, "skin_smoothness": 60, "surface_irregularity": 40, "bump_score": 30},
    "problem_areas": ["T-zone", "Cheeks"]
  },
  
  "pores": {
    "pore_density": 4.5,
    "texture_score": 65,
    "visibility": "Moderate",
    "regions": {"t_zone": 75, "cheeks": 45, "forehead": 60, "nose": 80, "chin": 50},
    "enlarged_pores_count": 12,
    "problem_areas": ["Nose", "T-zone"]
  },
  
  "hydration": {
    "hydration_level": 65,
    "status": "Normal",
    "gloss_index": 55,
    "recommendation": "Maintain current hydration",
    "dry_areas": ["Cheeks"],
    "oily_areas": ["T-zone"]
  },
  
  "oiliness": {
    "oiliness_score": 55,
    "sebum_level": "Moderate",
    "t_zone_score": 70,
    "skin_type": "Combination",
    "regions": {"forehead": 65, "nose": 75, "cheeks": 35, "chin": 60},
    "shine_areas": ["Nose", "Forehead"]
  },
  
  "skin_tone": {
    "ita_angle": 45,
    "undertone": "Warm",
    "uniformity_score": 70,
    "dominant_color": "#D4A574",
    "evenness": "Good",
    "problem_areas": []
  },
  
  "uv_damage": {
    "uv_damage_score": 30,
    "severity": "Mild",
    "affected_area_percentage": 15,
    "damage_types": ["Sun spots", "Uneven tone"],
    "recommendation": "Use SPF 50+ daily",
    "risk_level": "Moderate"
  },
  
  "age_prediction": {
    "predicted_age": 28,
    "confidence": 0.85,
    "age_category": "Young Adult",
    "factors": {"wrinkles": 25, "skin_elasticity": 75, "pigmentation": 30, "texture": 70},
    "aging_signs": ["Fine lines", "Minor pigmentation"]
  },
  
  "facial_zones": {
    "forehead": {"score": 70, "issues": ["Visible pores", "Slightly oily"], "condition": "Good"},
    "t_zone": {"score": 65, "issues": ["Large pores", "Oily"], "condition": "Fair"},
    "cheeks_right": {"score": 75, "issues": ["Slight redness"], "condition": "Good"},
    "cheeks_left": {"score": 75, "issues": ["Normal"], "condition": "Good"},
    "nose": {"score": 60, "issues": ["Very large pores", "Oily"], "condition": "Fair"},
    "chin": {"score": 70, "issues": ["Slightly oily"], "condition": "Good"},
    "under_eyes": {"score": 65, "issues": ["Fine lines"], "condition": "Fair"},
    "jawline": {"score": 80, "issues": [], "condition": "Excellent"}
  },
  
  "priority_concerns": [
    {"concern": "Enlarged Pores", "severity": "Moderate", "zones": ["Nose", "T-zone"], "priority": 1},
    {"concern": "Oiliness", "severity": "Moderate", "zones": ["T-zone"], "priority": 2},
    {"concern": "Fine Lines", "severity": "Mild", "zones": ["Eyes"], "priority": 3}
  ],
  
  "quality_check": {
    "quality_score": 85,
    "is_valid": true,
    "issues": [],
    "metrics": {
      "brightness": 75,
      "sharpness": 80,
      "face_detected": true,
      "angle": "frontal",
      "subject_type": "human_face",
      "face_count": 1,
      "lighting": "good",
      "confidence": 0.85
    }
  },
  
  "summary": "Your skin is in good condition with some areas needing attention. Pores are visible in T-zone and slightly oily. Skin texture is fairly smooth with some fine lines around eyes. Pigmentation is even with few dark spots. Consistent skincare routine will help maintain and improve skin condition."
}

IMPORTANT:
- Provide REALISTIC numeric values based on visual analysis
- If no issues visible, give high scores (80-100)
- If mild issues, give medium scores (50-79)
- If serious issues, give low scores (0-49)
- Locations must be SPECIFIC (e.g., "Upper right cheek", "Center forehead")
- Summary in English, 3-4 sentences, informative
- If quality_check.is_valid is false:
  - Do not hallucinate precise clinical detail
  - Set conservative neutral values
  - Explain retake reasons clearly in quality_check.issues

Output MUST be valid JSON without markdown or extra text.`;

    const response = await fetch(
        `${GEMINI_API_URL}/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
                    temperature: 0.1, // Very low for consistent analysis
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192
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
    
    // Clean JSON response
    textContent = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/\n/g, ' ')
        .trim();
    
    try {
        const parsed = JSON.parse(textContent);
        
        // Try validation first (unless skipped)
        if (!skipValidation) {
            try {
                ensureVisionInputValidity(parsed);
                console.log('✅ Gemini Vision JSON parsed successfully');
            } catch (validationError) {
                // Check if validation failed due to minor issues only
                const errorMessage = validationError.message || '';
                const hasOnlyMinorIssues = errorMessage.includes('Slightly') || 
                                         errorMessage.includes('Minor') ||
                                         errorMessage.includes('sedikit') ||
                                         errorMessage.includes('ringan');
                
                if (hasOnlyMinorIssues) {
                    console.log('⚠️ Minor quality issues detected, but proceeding with analysis');
                    console.log('Issues:', errorMessage);
                    // Add a warning flag but continue processing
                    parsed.quality_warning = errorMessage;
                } else {
                    // Re-throw for major issues only
                    throw validationError;
                }
            }
        } else {
            console.log('⚠️ Photo validation skipped - proceeding with analysis');
        }
        
        return parsed;
    } catch (parseError) {
        if (parseError?.code === 'INVALID_INPUT_QUALITY') {
            throw parseError;
        }
        console.error('❌ JSON parse failed:', parseError);
        console.error('Raw response:', textContent.substring(0, 500));
        throw new Error('Failed to parse Gemini Vision response');
    }
}

/**
 * Groq Text: Generate COMPLETE skin analysis report in ONE call
 * Using GPT-OSS-20B for comprehensive reasoning
 * Output: Single JSON with ALL data including 15 analysis modes
 */
async function generateCompleteReport(visionData) {
    // Extract ALL numerical data from vision analysis
    const acneData = visionData.acne || {};
    const wrinkleData = visionData.wrinkles || {};
    const pigmentationData = visionData.pigmentation || {};
    const rednessData = visionData.redness || {};
    const textureData = visionData.texture || {};
    const poresData = visionData.pores || {};
    const hydrationData = visionData.hydration || {};
    const oilinessData = visionData.oiliness || {};
    const skinToneData = visionData.skin_tone || {};
    const uvDamageData = visionData.uv_damage || {};
    const agePredictionData = visionData.age_prediction || {};
    const facialZones = visionData.facial_zones || {};
    
    const prompt = `Based on the following COMPLETE skin analysis data, provide comprehensive recommendations in JSON format.

COMPLETE SKIN ANALYSIS DATA:

OVERALL:
- Overall Score: ${visionData.overall_score}/100
- Skin Type: ${visionData.skin_type}
- Fitzpatrick Type: ${visionData.fitzpatrick_type}

ACNE ANALYSIS:
- Acne Count: ${acneData.acne_count || 0} spots
- Acne Score: ${acneData.acne_score || 0}/100
- Severity: ${acneData.severity || 'None'}
- Types: Whitehead (${acneData.types?.whitehead || 0}), Blackhead (${acneData.types?.blackhead || 0}), Papule (${acneData.types?.papule || 0}), Pustule (${acneData.types?.pustule || 0}), Cyst (${acneData.types?.cyst || 0})
- Regions: Forehead (${acneData.regions?.forehead || 0}), Cheeks (${acneData.regions?.cheeks || 0}), Nose (${acneData.regions?.nose || 0}), Chin (${acneData.regions?.chin || 0}), Jawline (${acneData.regions?.jawline || 0})
- Locations: ${acneData.locations?.join(', ') || 'None'}

WRINKLES ANALYSIS:
- Wrinkle Severity: ${wrinkleData.wrinkle_severity || 0}/100
- Wrinkle Count: ${wrinkleData.wrinkle_count || 0}
- Severity: ${wrinkleData.severity || 'None'}
- Types: Fine Lines (${wrinkleData.types?.fine_lines || 0}), Deep Wrinkles (${wrinkleData.types?.deep_wrinkles || 0}), Crows Feet (${wrinkleData.types?.crows_feet || 0}), Forehead Lines (${wrinkleData.types?.forehead_lines || 0}), Smile Lines (${wrinkleData.types?.smile_lines || 0})
- Regions: Forehead (${wrinkleData.regions?.forehead || 0}), Eyes (${wrinkleData.regions?.eyes || 0}), Mouth (${wrinkleData.regions?.mouth || 0}), Cheeks (${wrinkleData.regions?.cheeks || 0})
- Locations: ${wrinkleData.locations?.join(', ') || 'None'}

PIGMENTATION ANALYSIS:
- Dark Spot Count: ${pigmentationData.dark_spot_count || 0}
- Melanin Index: ${pigmentationData.melanin_index || 0}/100
- Pigmentation Area: ${pigmentationData.pigmentation_area || 0}%
- Severity: ${pigmentationData.severity || 'None'}
- Uniformity Score: ${pigmentationData.uniformity_score || 100}/100
- Types: Age Spots (${pigmentationData.types?.age_spots || 0}), Sun Spots (${pigmentationData.types?.sun_spots || 0}), Melasma (${pigmentationData.types?.melasma || 0}), Post-Inflammatory (${pigmentationData.types?.post_inflammatory || 0}), Freckles (${pigmentationData.types?.freckles || 0})
- Locations: ${pigmentationData.locations?.join(', ') || 'None'}

REDNESS ANALYSIS:
- Redness Score: ${rednessData.redness_score || 0}/100
- Erythema Index: ${rednessData.erythema_index || 0}/100
- Severity: ${rednessData.severity || 'None'}
- Regions: Cheeks (${rednessData.regions?.cheeks || 0}%), Nose (${rednessData.regions?.nose || 0}%), Forehead (${rednessData.regions?.forehead || 0}%), Chin (${rednessData.regions?.chin || 0}%)
- Causes: ${rednessData.causes?.join(', ') || 'None'}
- Locations: ${rednessData.locations?.join(', ') || 'None'}

TEXTURE ANALYSIS:
- Roughness Score: ${textureData.roughness_score || 0}/100
- Smoothness Score: ${textureData.smoothness_score || 100}/100
- Severity: ${textureData.severity || 'None'}
- Pore Visibility: ${textureData.texture_features?.pore_visibility || 0}/100
- Skin Smoothness: ${textureData.texture_features?.skin_smoothness || 100}/100
- Surface Irregularity: ${textureData.texture_features?.surface_irregularity || 0}/100
- Bump Score: ${textureData.texture_features?.bump_score || 0}/100
- Problem Areas: ${textureData.problem_areas?.join(', ') || 'None'}

PORES ANALYSIS:
- Pore Density: ${poresData.pore_density || 0}/10
- Texture Score: ${poresData.texture_score || 100}/100
- Visibility: ${poresData.visibility || 'Normal'}
- Enlarged Pores Count: ${poresData.enlarged_pores_count || 0}
- Regions: T-Zone (${poresData.regions?.t_zone || 0}%), Cheeks (${poresData.regions?.cheeks || 0}%), Forehead (${poresData.regions?.forehead || 0}%), Nose (${poresData.regions?.nose || 0}%), Chin (${poresData.regions?.chin || 0}%)
- Problem Areas: ${poresData.problem_areas?.join(', ') || 'None'}

HYDRATION ANALYSIS:
- Hydration Level: ${hydrationData.hydration_level || 0}%
- Status: ${hydrationData.status || 'Normal'}
- Gloss Index: ${hydrationData.gloss_index || 0}/100
- Dry Areas: ${hydrationData.dry_areas?.join(', ') || 'None'}
- Oily Areas: ${hydrationData.oily_areas?.join(', ') || 'None'}

OILINESS ANALYSIS:
- Oiliness Score: ${oilinessData.oiliness_score || 0}/100
- Sebum Level: ${oilinessData.sebum_level || 'Normal'}
- T-Zone Score: ${oilinessData.t_zone_score || 0}/100
- Regions: Forehead (${oilinessData.regions?.forehead || 0}%), Nose (${oilinessData.regions?.nose || 0}%), Cheeks (${oilinessData.regions?.cheeks || 0}%), Chin (${oilinessData.regions?.chin || 0}%)
- Shine Areas: ${oilinessData.shine_areas?.join(', ') || 'None'}

SKIN TONE ANALYSIS:
- ITA Angle: ${skinToneData.ita_angle || 0}°
- Undertone: ${skinToneData.undertone || 'Neutral'}
- Uniformity Score: ${skinToneData.uniformity_score || 100}/100
- Dominant Color: ${skinToneData.dominant_color || '#D4A574'}
- Evenness: ${skinToneData.evenness || 'Good'}
- Problem Areas: ${skinToneData.problem_areas?.join(', ') || 'None'}

UV DAMAGE ANALYSIS:
- UV Damage Score: ${uvDamageData.uv_damage_score || 0}/100
- Severity: ${uvDamageData.severity || 'None'}
- Affected Area: ${uvDamageData.affected_area_percentage || 0}%
- Damage Types: ${uvDamageData.damage_types?.join(', ') || 'None'}
- Risk Level: ${uvDamageData.risk_level || 'Low'}

AGE PREDICTION:
- Predicted Age: ${agePredictionData.predicted_age || 25} years
- Confidence: ${(agePredictionData.confidence || 0.85) * 100}%
- Age Category: ${agePredictionData.age_category || 'Young Adult'}
- Aging Signs: ${agePredictionData.aging_signs?.join(', ') || 'None'}

FACIAL ZONES SCORES:
- Forehead: ${facialZones.forehead?.score || 0}/100 - ${facialZones.forehead?.condition || 'Good'}
- T-Zone: ${facialZones.t_zone?.score || 0}/100 - ${facialZones.t_zone?.condition || 'Good'}
- Right Cheek: ${facialZones.cheeks_right?.score || 0}/100 - ${facialZones.cheeks_right?.condition || 'Good'}
- Left Cheek: ${facialZones.cheeks_left?.score || 0}/100 - ${facialZones.cheeks_left?.condition || 'Good'}
- Nose: ${facialZones.nose?.score || 0}/100 - ${facialZones.nose?.condition || 'Good'}
- Chin: ${facialZones.chin?.score || 0}/100 - ${facialZones.chin?.condition || 'Good'}
- Under Eyes: ${facialZones.under_eyes?.score || 0}/100 - ${facialZones.under_eyes?.condition || 'Good'}
- Jawline: ${facialZones.jawline?.score || 0}/100 - ${facialZones.jawline?.condition || 'Good'}

PRIORITY CONCERNS:
${visionData.priority_concerns?.map((c, i) => `${i + 1}. ${c.concern} (${c.severity}) - Zones: ${c.zones?.join(', ')}`).join('\n') || 'None'}

SUMMARY FROM VISION AI:
${visionData.summary || 'No summary available'}

Provide output in this JSON structure:

{
  "summary": "2-3 sentence summary of skin condition in Indonesian",
  
  "analysis_modes": [
    {
      "mode": "RGB Pores",
      "parameter": "Pores",
      "score": ${poresData.texture_score || 70},
      "status": "${poresData.visibility || 'Normal'}",
      "description": "Pore Density: ${poresData.pore_density || 0}/cm², Enlarged: ${poresData.enlarged_pores_count || 0}",
      "insight": "Specific insight in Indonesian about pores"
    },
    {
      "mode": "RGB Color Spot",
      "parameter": "Pigmentation",
      "score": ${pigmentationData.uniformity_score || 80},
      "status": "${pigmentationData.severity || 'Even'}",
      "description": "Dark Spots: ${pigmentationData.dark_spot_count || 0}, Melanin: ${pigmentationData.melanin_index || 0}",
      "insight": "Specific insight in Indonesian about pigmentation"
    },
    {
      "mode": "RGB Texture",
      "parameter": "Texture",
      "score": ${textureData.smoothness_score || 70},
      "status": "${textureData.severity || 'Smooth'}",
      "description": "Smoothness: ${textureData.smoothness_score || 0}/100, Roughness: ${textureData.roughness_score || 0}/100",
      "insight": "Specific insight in Indonesian about texture"
    },
    {
      "mode": "PL Roughness",
      "parameter": "Surface",
      "score": ${100 - (textureData.roughness_score || 30)},
      "status": "${textureData.severity || 'Smooth'}",
      "description": "Surface Irregularity: ${textureData.texture_features?.surface_irregularity || 0}/100",
      "insight": "Specific insight in Indonesian about surface roughness"
    },
    {
      "mode": "UV Acne",
      "parameter": "Acne",
      "score": ${100 - (acneData.acne_score || 0)},
      "status": "${acneData.severity || 'Clear'}",
      "description": "Acne Count: ${acneData.acne_count || 0}, Severity: ${acneData.severity || 'None'}",
      "insight": "Specific insight in Indonesian about acne"
    },
    {
      "mode": "UV Color Spot",
      "parameter": "UV Spots",
      "score": ${pigmentationData.uniformity_score || 80},
      "status": "${pigmentationData.severity || 'Even'}",
      "description": "UV Spots: ${pigmentationData.dark_spot_count || 0}",
      "insight": "Specific insight in Indonesian about UV spots"
    },
    {
      "mode": "UV Roughness",
      "parameter": "UV Surface",
      "score": ${100 - (textureData.roughness_score || 30)},
      "status": "${textureData.severity || 'Smooth'}",
      "description": "UV Surface Analysis",
      "insight": "Specific insight in Indonesian about UV roughness"
    },
    {
      "mode": "Skin Color Evenness",
      "parameter": "Tone",
      "score": ${skinToneData.uniformity_score || 80},
      "status": "${skinToneData.evenness || 'Good'}",
      "description": "Uniformity: ${skinToneData.uniformity_score || 0}/100, Undertone: ${skinToneData.undertone || 'Neutral'}",
      "insight": "Specific insight in Indonesian about skin tone"
    },
    {
      "mode": "Brown Area",
      "parameter": "Pigmentation",
      "score": ${100 - (pigmentationData.melanin_index || 0)},
      "status": "${pigmentationData.severity || 'Even'}",
      "description": "Pigmentation Area: ${pigmentationData.pigmentation_area || 0}%, Melanin: ${pigmentationData.melanin_index || 0}",
      "insight": "Specific insight in Indonesian about brown areas"
    },
    {
      "mode": "UV Spot",
      "parameter": "UV Damage",
      "score": ${100 - (uvDamageData.uv_damage_score || 0)},
      "status": "${uvDamageData.severity || 'Protected'}",
      "description": "UV Damage: ${uvDamageData.uv_damage_score || 0}/100, Affected: ${uvDamageData.affected_area_percentage || 0}%",
      "insight": "Specific insight in Indonesian about UV damage"
    },
    {
      "mode": "Skin Aging",
      "parameter": "Age",
      "score": ${Math.max(0, 100 - (agePredictionData.predicted_age || 25))},
      "status": "${agePredictionData.age_category || 'Youthful'}",
      "description": "Predicted Age: ${agePredictionData.predicted_age || 0} years, Signs: ${agePredictionData.aging_signs?.join(', ') || 'None'}",
      "insight": "Specific insight in Indonesian about aging"
    },
    {
      "mode": "Skin Whitening",
      "parameter": "Brightness",
      "score": ${skinToneData.ita_angle || 45},
      "status": "${skinToneData.evenness || 'Good'}",
      "description": "ITA Angle: ${skinToneData.ita_angle || 0}°, Undertone: ${skinToneData.undertone || 'Neutral'}",
      "insight": "Specific insight in Indonesian about brightness"
    },
    {
      "mode": "Wrinkles Map",
      "parameter": "Wrinkles",
      "score": ${100 - (wrinkleData.wrinkle_severity || 0)},
      "status": "${wrinkleData.severity || 'Minimal'}",
      "description": "Wrinkle Count: ${wrinkleData.wrinkle_count || 0}, Severity: ${wrinkleData.severity || 'None'}",
      "insight": "Specific insight in Indonesian about wrinkles"
    },
    {
      "mode": "Redness Map",
      "parameter": "Redness",
      "score": ${100 - (rednessData.redness_score || 0)},
      "status": "${rednessData.severity || 'Minimal'}",
      "description": "Redness: ${rednessData.redness_score || 0}/100, Erythema: ${rednessData.erythema_index || 0}",
      "insight": "Specific insight in Indonesian about redness"
    },
    {
      "mode": "Overall Analysis",
      "parameter": "Overall",
      "score": ${visionData.overall_score || 75},
      "status": "${visionData.overall_score >= 80 ? 'Excellent' : visionData.overall_score >= 60 ? 'Good' : visionData.overall_score >= 40 ? 'Fair' : 'Needs Attention'}",
      "description": "Overall Score: ${visionData.overall_score || 0}/100, Skin Type: ${visionData.skin_type || 'Normal'}",
      "insight": "Comprehensive overall assessment in Indonesian"
    }
  ],
  
  "key_insights": [
    "Specific and actionable insight 1 in Indonesian with actual numbers",
    "Specific and actionable insight 2 in Indonesian with actual numbers",
    "Specific and actionable insight 3 in Indonesian with actual numbers"
  ],
  
  "recommendations": [
    "Clear recommendation 1 in Indonesian",
    "Clear recommendation 2 in Indonesian",
    "Clear recommendation 3 in Indonesian",
    "Clear recommendation 4 in Indonesian"
  ],
  
  "lifestyle_tips": [
    "Practical lifestyle tip 1 in Indonesian",
    "Practical lifestyle tip 2 in Indonesian",
    "Practical lifestyle tip 3 in Indonesian"
  ],
  
  "product_suggestions": [
    {
      "type": "Cleanser",
      "reason": "Specific reason in Indonesian",
      "ingredients_to_look": "Salicylic Acid, Niacinamide",
      "avoid": "Alcohol, Fragrance",
      "usage": "2x sehari, pagi dan malam"
    },
    {
      "type": "Serum/Treatment",
      "reason": "Specific reason in Indonesian",
      "ingredients_to_look": "Niacinamide 10%, Zinc PCA",
      "avoid": "Heavy oils",
      "usage": "1x sehari, malam hari"
    },
    {
      "type": "Moisturizer",
      "reason": "Specific reason in Indonesian",
      "ingredients_to_look": "Hyaluronic Acid, Ceramides",
      "avoid": "Heavy oils",
      "usage": "2x sehari setelah serum"
    },
    {
      "type": "Sunscreen",
      "reason": "Proteksi dari UV damage",
      "ingredients_to_look": "SPF 50+ PA++++, Broad Spectrum",
      "avoid": "Oxybenzone",
      "usage": "Setiap pagi, reapply setiap 2-3 jam"
    }
  ],
  
  "skincare_routine": {
    "morning": [
      "Cleanser - Bersihkan wajah dengan gentle cleanser",
      "Toner - Seimbangkan pH kulit",
      "Serum - Aplikasikan serum sesuai kebutuhan",
      "Moisturizer - Kunci kelembaban",
      "Sunscreen - Proteksi dari UV"
    ],
    "evening": [
      "Cleanser - Bersihkan makeup dan kotoran",
      "Toner - Seimbangkan pH kulit",
      "Treatment - Gunakan treatment sesuai masalah kulit",
      "Serum - Aplikasikan serum malam",
      "Moisturizer - Kunci kelembaban"
    ]
  },
  
  "timeline": {
    "week_1_2": "Kulit mulai beradaptasi dengan rutinitas baru",
    "week_4_6": "Perbaikan mulai terlihat pada tekstur dan hidrasi",
    "month_3_plus": "Hasil optimal tercapai dengan konsistensi"
  },
  
  "dos_and_donts": {
    "dos": [
      "Specific do 1 in Indonesian",
      "Specific do 2 in Indonesian",
      "Specific do 3 in Indonesian"
    ],
    "donts": [
      "Specific dont 1 in Indonesian",
      "Specific dont 2 in Indonesian",
      "Specific dont 3 in Indonesian"
    ]
  },
  
  "overall_assessment": "2-3 sentence overall assessment in Indonesian, encouraging and realistic"
}

IMPORTANT:
- All text in Indonesian (Bahasa Indonesia)
- Recommendations must be SPECIFIC and ACTIONABLE
- Reference ACTUAL numbers from vision data in insights
- Each analysis_mode must have specific insight based on actual data
- Ingredient recommendations must be REAL and available in market
- Timeline must be REALISTIC
- Tone should be professional but friendly

Output MUST be valid JSON.`;

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: GROQ_TEXT_MODEL,
            messages: [
                { role: 'system', content: 'You are an AI Skincare Expert. Provide output in valid JSON format.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_completion_tokens: 4000,
            response_format: { type: 'json_object' }
        })
    });

    if (!response.ok) {
        console.error('Groq insights generation failed');
        // Return fallback insights with 15 modes
        return {
            summary: "Analisis lengkap telah selesai. Ikuti rekomendasi untuk hasil optimal.",
            analysis_modes: generateFallbackModes(visionData),
            key_insights: [
                "Kondisi kulit Anda menunjukkan hasil yang positif",
                "Beberapa area memerlukan perhatian khusus",
                "Rutinitas yang konsisten akan memberikan hasil terbaik"
            ],
            recommendations: [
                "Gunakan cleanser yang lembut 2x sehari",
                "Aplikasikan sunscreen SPF 50+ setiap pagi",
                "Jaga hidrasi dengan minum air yang cukup",
                "Konsisten dengan rutinitas skincare"
            ],
            lifestyle_tips: [
                "Tidur cukup 7-8 jam per malam",
                "Konsumsi makanan bergizi seimbang",
                "Kelola stress dengan baik"
            ],
            product_suggestions: [],
            skincare_routine: {
                morning: ["Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen"],
                evening: ["Cleanser", "Toner", "Treatment", "Moisturizer"]
            },
            timeline: {
                week_1_2: "Kulit mulai beradaptasi",
                week_4_6: "Perbaikan mulai terlihat",
                month_3_plus: "Hasil optimal tercapai"
            },
            overall_assessment: "Dengan perawatan yang tepat, kondisi kulit akan terus membaik."
        };
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    console.log('✅ Groq complete report generated successfully');
    return result;
}

/**
 * Generate fallback 15 modes if API fails
 */
function generateFallbackModes(visionData) {
    return [
        { mode: "RGB Pores", parameter: "Pores", score: visionData.pores?.texture_score || 70, status: visionData.pores?.visibility || "Normal", description: `Pore Density: ${visionData.pores?.pore_density || 0}/cm²`, insight: "Analisis pori-pori wajah Anda" },
        { mode: "RGB Color Spot", parameter: "Pigmentation", score: visionData.pigmentation?.uniformity_score || 80, status: visionData.pigmentation?.severity || "Even", description: `Dark Spots: ${visionData.pigmentation?.dark_spot_count || 0}`, insight: "Analisis bintik gelap pada kulit" },
        { mode: "RGB Texture", parameter: "Texture", score: visionData.texture?.smoothness_score || 70, status: visionData.texture?.severity || "Smooth", description: `Smoothness: ${visionData.texture?.smoothness_score || 0}/100`, insight: "Analisis tekstur kulit" },
        { mode: "PL Roughness", parameter: "Surface", score: 100 - (visionData.texture?.roughness_score || 30), status: visionData.texture?.severity || "Smooth", description: "Surface analysis", insight: "Analisis kekasaran permukaan" },
        { mode: "UV Acne", parameter: "Acne", score: 100 - (visionData.acne?.acne_score || 0), status: visionData.acne?.severity || "Clear", description: `Acne Count: ${visionData.acne?.acne_count || 0}`, insight: "Deteksi jerawat dengan UV" },
        { mode: "UV Color Spot", parameter: "UV Spots", score: visionData.pigmentation?.uniformity_score || 80, status: visionData.pigmentation?.severity || "Even", description: "UV spot detection", insight: "Deteksi bintik UV" },
        { mode: "UV Roughness", parameter: "UV Surface", score: 100 - (visionData.texture?.roughness_score || 30), status: visionData.texture?.severity || "Smooth", description: "UV surface analysis", insight: "Analisis permukaan UV" },
        { mode: "Skin Color Evenness", parameter: "Tone", score: visionData.skin_tone?.uniformity_score || 80, status: visionData.skin_tone?.evenness || "Good", description: `Uniformity: ${visionData.skin_tone?.uniformity_score || 0}/100`, insight: "Analisis kerataan warna kulit" },
        { mode: "Brown Area", parameter: "Pigmentation", score: 100 - (visionData.pigmentation?.melanin_index || 0), status: visionData.pigmentation?.severity || "Even", description: `Melanin: ${visionData.pigmentation?.melanin_index || 0}`, insight: "Pemetaan area coklat" },
        { mode: "UV Spot", parameter: "UV Damage", score: 100 - (visionData.uv_damage?.uv_damage_score || 0), status: visionData.uv_damage?.severity || "Protected", description: `UV Damage: ${visionData.uv_damage?.uv_damage_score || 0}/100`, insight: "Deteksi kerusakan UV" },
        { mode: "Skin Aging", parameter: "Age", score: Math.max(0, 100 - (visionData.age_prediction?.predicted_age || 25)), status: visionData.age_prediction?.age_category || "Youthful", description: `Age: ${visionData.age_prediction?.predicted_age || 0} years`, insight: "Analisis tanda penuaan" },
        { mode: "Skin Whitening", parameter: "Brightness", score: visionData.skin_tone?.ita_angle || 45, status: visionData.skin_tone?.evenness || "Good", description: `ITA: ${visionData.skin_tone?.ita_angle || 0}°`, insight: "Analisis kecerahan kulit" },
        { mode: "Wrinkles Map", parameter: "Wrinkles", score: 100 - (visionData.wrinkles?.wrinkle_severity || 0), status: visionData.wrinkles?.severity || "Minimal", description: `Count: ${visionData.wrinkles?.wrinkle_count || 0}`, insight: "Pemetaan kerutan" },
        { mode: "Redness Map", parameter: "Redness", score: 100 - (visionData.redness?.redness_score || 0), status: visionData.redness?.severity || "Minimal", description: `Redness: ${visionData.redness?.redness_score || 0}/100`, insight: "Pemetaan kemerahan" },
        { mode: "Overall Analysis", parameter: "Overall", score: visionData.overall_score || 75, status: visionData.overall_score >= 80 ? "Excellent" : visionData.overall_score >= 60 ? "Good" : "Fair", description: `Overall: ${visionData.overall_score || 0}/100`, insight: "Analisis menyeluruh" }
    ];
}
    // Extract ALL numerical data from vision analysis


/**
 * Groq Vision Fallback: Vision analysis when Gemini fails
 */
async function analyzeSkinWithGroqVision(imageBase64) {
    console.log('🔄 Using Groq vision fallback...');
    
    const base64Data = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;
    
    const prompt = `You are an AI Dermatologist Expert. Analyze this facial image and provide output in VALID JSON format.

Provide comprehensive analysis with this structure (same as Gemini):

{
  "overall_score": 75,
  "skin_type": "Combination",
  "fitzpatrick_type": "III",
  "acne": {"acne_count": 5, "acne_score": 30, "severity": "Mild", "locations": ["Forehead", "Cheeks"]},
  "wrinkles": {"wrinkle_severity": 25, "wrinkle_count": 8, "severity": "Mild", "locations": ["Eyes", "Forehead"]},
  "pigmentation": {"dark_spot_count": 4, "melanin_index": 45, "severity": "Moderate", "locations": ["Cheeks", "Forehead"]},
  "hydration": {"hydration_level": 65, "status": "Normal"},
  "oiliness": {"oiliness_score": 55, "sebum_level": "Moderate", "skin_type": "Combination"},
  "summary": "Your skin is in good condition with some areas needing attention."
}

Output MUST be valid JSON without markdown.`;

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
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Data}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.3,
            max_completion_tokens: 4096
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let textContent = data.choices[0].message.content;
    
    // Clean and parse JSON
    textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
        const parsed = JSON.parse(textContent);
        console.log('✅ Groq Vision JSON parsed successfully');
        
        // Generate insights using Groq text model
        const completeReport = await generateCompleteReport(parsed);
        
        return {
            success: true,
            data: {
                overall_score: parsed.overall_score || 70,
                analysis_version: '6.0-groq-fallback',
                engine: 'Groq Llama 4 Scout (Vision) + GPT-OSS-20B (Text)',
                ...parsed,
                ai_report: completeReport,
                ai_insights: completeReport
            }
        };
    } catch (parseError) {
        console.error('❌ Groq JSON parse failed:', parseError);
        throw new Error('Failed to parse Groq response');
    }
}

/**
 * Check if AI services are available
 */
export const checkAIHealth = async () => {
    try {
        // Quick test with Gemini
        const response = await fetch(
            `${GEMINI_API_URL}/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'test' }] }]
                })
            }
        );
        return response.ok;
    } catch {
        return false;
    }
};

export default {
    analyzeSkinWithAI,
    checkAIHealth
};
