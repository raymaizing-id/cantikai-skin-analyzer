import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, ShieldCheck, ShoppingBag, RefreshCw } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import apiService from '../services/api';

const categoryAliases = {
    cleanser: ['cleanser', 'face wash', 'pembersih'],
    moisturizer: ['moisturizer', 'pelembap', 'cream'],
    serum: ['serum', 'essence'],
    sunscreen: ['sunscreen', 'sun screen', 'spf', 'uv'],
    treatment: ['treatment', 'spot', 'acne', 'retinol']
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const normalizeCategory = (value) => {
    const normalized = normalizeText(value);
    if (!normalized) return '';

    for (const [key, aliases] of Object.entries(categoryAliases)) {
        if (aliases.some((alias) => normalized.includes(alias))) {
            return key;
        }
    }
    return normalized;
};

const parseStoredJson = (key) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const buildSkinProfile = (resultData) => {
    const hydration = Number(
        resultData?.hydration_level ??
        resultData?.hydration?.hydration_level ??
        resultData?.hydration?.level ??
        75
    );
    const oiliness = Number(
        resultData?.oiliness_score ??
        resultData?.oiliness?.oiliness_score ??
        resultData?.oiliness?.sebum_score ??
        45
    );
    const acneSeverity = String(
        resultData?.acne_severity ??
        resultData?.acne?.severity ??
        'Rendah'
    );
    const pigmentation = Number(
        resultData?.pigmentation_score ??
        resultData?.pigmentation?.pigmentation_score ??
        resultData?.melanin_index ??
        40
    );

    return {
        skinType: String(resultData?.skin_type || 'Normal'),
        hydrationLevel: hydration,
        oilinessScore: oiliness,
        acneSeverity,
        pigmentationScore: pigmentation
    };
};

const buildTargets = (profile) => {
    const targets = [];

    targets.push({
        key: 'sunscreen',
        label: 'Perlindungan UV',
        reason: 'Sunscreen wajib dipakai setiap pagi untuk mencegah kerusakan kulit.',
        keywords: ['uv', 'sunscreen', 'protection', 'sun'],
        categories: ['sunscreen'],
        priority: 28
    });

    if (profile.hydrationLevel < 70) {
        targets.push({
            key: 'hydration',
            label: 'Perbaikan hidrasi',
            reason: `Hidrasi terdeteksi ${profile.hydrationLevel}%. Fokus pada produk pelembap.`,
            keywords: ['hydration', 'moisture', 'dry', 'hydrating'],
            categories: ['moisturizer', 'serum'],
            priority: 26
        });
    }

    if (profile.oilinessScore > 60) {
        targets.push({
            key: 'oil-control',
            label: 'Kontrol minyak',
            reason: `Oiliness ${profile.oilinessScore}%, prioritaskan pembersih lembut dan treatment anti-minyak.`,
            keywords: ['oil', 'sebum', 'pore', 'acne'],
            categories: ['cleanser', 'treatment'],
            priority: 24
        });
    }

    if (normalizeText(profile.acneSeverity).includes('sedang') || normalizeText(profile.acneSeverity).includes('tinggi')) {
        targets.push({
            key: 'acne-support',
            label: 'Perawatan jerawat',
            reason: `Status jerawat: ${profile.acneSeverity}. Gunakan treatment terarah untuk membantu meredakan breakout.`,
            keywords: ['acne', 'blemish', 'spot', 'salicylic'],
            categories: ['treatment', 'cleanser'],
            priority: 22
        });
    }

    if (profile.pigmentationScore > 55) {
        targets.push({
            key: 'tone-evening',
            label: 'Perataan warna kulit',
            reason: 'Pigmentasi relatif tinggi, serum brightening dan antioksidan direkomendasikan.',
            keywords: ['brightening', 'vitamin c', 'pigment', 'spot'],
            categories: ['serum', 'treatment'],
            priority: 20
        });
    }

    if (targets.length === 1) {
        targets.push(
            {
                key: 'routine-base-cleanser',
                label: 'Rutinitas dasar',
                reason: 'Pembersih lembut membantu menjaga skin barrier tetap stabil.',
                keywords: ['cleanser', 'gentle', 'barrier'],
                categories: ['cleanser'],
                priority: 19
            },
            {
                key: 'routine-base-moisturizer',
                label: 'Rutinitas dasar',
                reason: 'Pelembap menjaga kelembapan kulit sepanjang hari.',
                keywords: ['hydrate', 'moisture', 'barrier'],
                categories: ['moisturizer'],
                priority: 18
            }
        );
    }

    return targets;
};

const scoreProduct = (product, targets, profile) => {
    const category = normalizeCategory(product.category);
    const searchable = `${product.name || ''} ${product.description || ''} ${product.concerns || ''} ${product.ingredients || ''}`.toLowerCase();
    const skinTypeText = normalizeText(product.skin_type);
    const normalizedProfileSkinType = normalizeText(profile.skinType);

    let score = Number(product.rating || 0) * 4;
    let reason = 'Cocok untuk menjaga rutinitas skincare harian Anda.';

    for (const target of targets) {
        const categoryMatch = target.categories.includes(category);
        const keywordMatch = target.keywords.some((keyword) => searchable.includes(keyword));
        if (categoryMatch || keywordMatch) {
            score += target.priority;
            reason = target.reason;
            break;
        }
    }

    if (product.is_featured) {
        score += 6;
    }

    if (skinTypeText && normalizedProfileSkinType && skinTypeText.includes(normalizedProfileSkinType)) {
        score += 8;
    }

    if (!category && normalizeText(product.name).includes('sunscreen')) {
        score += 8;
    }

    return { score, reason };
};

const Recommendations = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const [backendRecommendations, setBackendRecommendations] = useState(null);
    const [useBackendRecs, setUseBackendRecs] = useState(false);
    const [loadingAlternatives, setLoadingAlternatives] = useState(false);

    const persistedResult = useMemo(() => parseStoredJson('cantik_last_result_data'), []);
    const persistedInsights = useMemo(() => parseStoredJson('cantik_last_ai_insights'), []);
    const resultData = state?.resultData || persistedResult;
    const aiInsights = state?.aiInsights || persistedInsights;
    const profile = useMemo(() => buildSkinProfile(resultData || {}), [resultData]);
    const targets = useMemo(() => buildTargets(profile), [profile]);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            setError('');
            try {
                // Check if we have product recommendations from analysis (Beautylatory products)
                const analysisRecommendations = state?.backendRecommendations || resultData?.product_recommendations;
                
                if (analysisRecommendations && analysisRecommendations.length > 0) {
                    console.log('✅ Using Beautylatory product recommendations from analysis:', analysisRecommendations.length);
                    
                    // Use analysis recommendations directly (already from Beautylatory API)
                    setBackendRecommendations(analysisRecommendations);
                    setUseBackendRecs(true);
                    
                    // Also set as products for fallback
                    const transformedProducts = analysisRecommendations.map((rec, index) => ({
                        id: rec.slug || index,
                        name: rec.name,
                        slug: rec.slug,
                        category: rec.category,
                        description: rec.reason || 'Direkomendasikan berdasarkan analisis kulit Anda',
                        concerns: rec.addresses?.join(', ') || '',
                        rating: 4.5,
                        is_featured: index < 3,
                        skin_type: profile.skinType || 'all',
                        recommendation_reason: rec.reason
                    }));
                    
                    setProducts(transformedProducts);
                } else {
                    // Fallback to original product fetching logic
                    console.log('⚠️ No Beautylatory recommendations found, using original logic');
                    const data = await apiService.getProducts();
                    setProducts(Array.isArray(data) ? data : []);
                    setUseBackendRecs(false);
                }
                
            } catch (err) {
                console.error('Get recommendation products error:', err);
                setError(err.message || 'Gagal memuat produk rekomendasi');
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [state]);

    // Function to fetch alternative product recommendations using AI
    const fetchAlternativeRecommendations = async () => {
        if (loadingAlternatives) return;
        
        setLoadingAlternatives(true);
        try {
            console.log('🤖 Getting AI-powered alternative recommendations...');
            
            // Get analysis data from localStorage
            const lastResultData = parseStoredJson('cantik_last_result_data');
            if (!lastResultData) {
                throw new Error('No analysis data found in localStorage');
            }
            
            console.log('📊 Using analysis data:', lastResultData);
            
            // Prepare data for AI
            const analysisForAI = {
                overall_score: lastResultData.overall_score,
                skin_type: lastResultData.skin_type,
                main_concerns: lastResultData.ai_report?.main_concerns || lastResultData.main_concerns || [],
                hydration_level: lastResultData.hydration?.hydration_level || 0,
                oiliness_score: lastResultData.oiliness?.oiliness_score || 0,
                acne_score: lastResultData.acne?.acne_score || 0,
                current_recommendations: recommendedProducts.map(p => p.name)
            };
            
            // Call AI to get alternative recommendations
            const aiRecommendations = await getAIAlternativeRecommendations(analysisForAI);
            
            if (aiRecommendations && aiRecommendations.length > 0) {
                setBackendRecommendations(aiRecommendations);
                setUseBackendRecs(true);
                console.log(`✅ AI found ${aiRecommendations.length} alternative products`);
            } else {
                throw new Error('AI did not return any recommendations');
            }
            
        } catch (error) {
            console.error('❌ Error getting AI alternatives:', error);
            setError('Gagal mendapatkan rekomendasi alternatif. Coba lagi nanti.');
        } finally {
            setLoadingAlternatives(false);
        }
    };

    // AI function to get alternative recommendations
    const getAIAlternativeRecommendations = async (analysisData) => {
        const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
        const BEAUTYLATORY_API_URL = import.meta.env.VITE_PRODUCTS_API_URL;
        
        if (!GROQ_API_KEY || !BEAUTYLATORY_API_URL) {
            throw new Error('Missing API keys or URLs');
        }
        
        try {
            // First, fetch products from Beautylatory API
            console.log('🌐 Fetching products from Beautylatory API...');
            const response = await fetch(`${BEAUTYLATORY_API_URL}?page=1`);
            if (!response.ok) {
                throw new Error('Failed to fetch products from Beautylatory');
            }
            
            const productData = await response.json();
            if (!productData.data || productData.data.length === 0) {
                throw new Error('No products found in Beautylatory API');
            }
            
            // Prepare products info for AI
            const productsInfo = productData.data.map(product => ({
                name: product.name,
                slug: product.slug,
                category: product.category.name,
                description: product.description?.substring(0, 200) || 'Produk perawatan kulit berkualitas'
            }));
            
            console.log('🤖 Sending to AI for analysis...');
            
            // Create AI prompt
            const prompt = `Berdasarkan data analisis kulit, berikan 3 rekomendasi produk ALTERNATIF dalam format JSON.

DATA KULIT:
- Skor: ${analysisData.overall_score}/100
- Jenis: ${analysisData.skin_type}
- Masalah: ${analysisData.main_concerns.join(', ')}
- Hidrasi: ${analysisData.hydration_level}%
- Berminyak: ${analysisData.oiliness_score}/100

HINDARI PRODUK INI:
${analysisData.current_recommendations.join(', ')}

PRODUK TERSEDIA:
${productsInfo.slice(0, 10).map(p => `- ${p.name} (${p.category})`).join('\n')}

INSTRUKSI:
1. Pilih 3 produk BERBEDA dari yang sudah direkomendasikan
2. Berikan alasan singkat dan jelas
3. Format JSON yang valid dan bersih

FORMAT:
{
  "alternative_recommendations": [
    {
      "name": "Nama produk",
      "slug": "slug-produk", 
      "category": "Kategori",
      "reason": "Alasan singkat mengapa cocok",
      "addresses": ["masalah1", "masalah2"]
    }
  ]
}

PENTING: Berikan HANYA JSON, tanpa teks lain.`;

            // Call Groq API
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'openai/gpt-oss-20b',
                    messages: [
                        {
                            role: 'system',
                            content: 'Anda adalah AI skincare expert. Berikan rekomendasi produk dalam format JSON yang valid dan bersih. Jangan gunakan markdown atau teks tambahan, hanya JSON murni.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3, // Lower temperature for more consistent output
                    max_tokens: 1000,
                    top_p: 0.9,
                    frequency_penalty: 0.1
                })
            });
            
            if (!groqResponse.ok) {
                throw new Error(`Groq API error: ${groqResponse.status}`);
            }
            
            const groqData = await groqResponse.json();
            const aiContent = groqData.choices[0].message.content.trim();
            
            console.log('🔍 Raw AI Response:', aiContent);
            
            // Function to clean and fix JSON string
            const cleanJsonString = (str) => {
                // Remove markdown formatting
                let cleaned = str.replace(/```json\n?|\n?```/g, '').trim();
                cleaned = cleaned.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
                
                // Remove any leading/trailing text that's not JSON
                const jsonStart = cleaned.indexOf('{');
                const jsonEnd = cleaned.lastIndexOf('}');
                
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
                }
                
                // Fix common JSON issues
                cleaned = cleaned.replace(/,\s*}/g, '}'); // Remove trailing commas
                cleaned = cleaned.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
                
                // Fix unescaped quotes in strings
                cleaned = cleaned.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
                    if (p2.includes(':') || p2.includes(',')) {
                        return match; // This is likely a proper JSON structure
                    }
                    return `"${p1}${p2.replace(/"/g, '\\"')}${p3}"`;
                });
                
                return cleaned;
            };
            
            // Clean and parse JSON with better error handling
            const cleanContent = cleanJsonString(aiContent);
            
            console.log('🧹 Cleaned content for parsing:', cleanContent);
            
            let aiResult;
            try {
                aiResult = JSON.parse(cleanContent);
            } catch (parseError) {
                console.error('❌ JSON parsing failed:', parseError);
                console.log('📄 Full content that failed to parse:', cleanContent);
                
                // Fallback: create manual recommendations
                console.log('🔄 Using fallback recommendations...');
                return [
                    {
                        name: "BEAUTYLATORY - PHYTOSYNC Soothing Recovery Serum 20 ml",
                        slug: "beautylatory-phytosync-soothing-recovery-serum-20-ml",
                        category: "BEAUTYLATORY",
                        reason: "Alternatif untuk menenangkan kulit dan memperkuat skin barrier dengan formula yang lembut",
                        addresses: ["kulit sensitif", "recovery", "barrier repair"]
                    },
                    {
                        name: "BEAUTYLATORY - PHYTOSYNC Bright Complex Serum 20 ml",
                        slug: "beautylatory-phytosync-bright-complex-serum-20-ml",
                        category: "BEAUTYLATORY", 
                        reason: "Alternatif untuk mencerahkan dan meratakan warna kulit dengan antioksidan alami",
                        addresses: ["brightening", "pigmentasi", "antioksidan"]
                    },
                    {
                        name: "BEAUTYLATORY - Urban Shield Serum 20 ml",
                        slug: "beautylatory-urban-shield-serum-20-ml",
                        category: "BEAUTYLATORY",
                        reason: "Alternatif untuk perlindungan dari polusi dan stres lingkungan perkotaan",
                        addresses: ["perlindungan", "anti-polusi", "urban care"]
                    }
                ];
            }
            
            if (aiResult.alternative_recommendations && Array.isArray(aiResult.alternative_recommendations)) {
                return aiResult.alternative_recommendations;
            } else {
                console.warn('⚠️ Invalid AI response format, using fallback');
                // Fallback recommendations
                return [
                    {
                        name: "BEAUTYLATORY - PHYTOSYNC Golden Age Serum",
                        slug: "beautylatory-phytosync-golden-age-serum",
                        category: "BEAUTYLATORY",
                        reason: "Alternatif untuk perawatan anti-aging dengan peptide dan antioksidan premium",
                        addresses: ["anti-aging", "peptide", "regenerasi"]
                    },
                    {
                        name: "BEAUTYLATORY - PHYTOSYNC UV Defense Hybrid Sunscreen 50 gr",
                        slug: "beautylatory-phytosync-uv-defense-hybrid-sunscreen-50-gr",
                        category: "BEAUTYLATORY",
                        reason: "Alternatif perlindungan UV dengan formula hybrid yang ringan dan tidak lengket",
                        addresses: ["sun protection", "UV defense", "daily care"]
                    }
                ];
            }
            
        } catch (error) {
            console.error('❌ AI recommendation error:', error);
            throw error;
        }
    };

    const recommendedProducts = useMemo(() => {
        // If we have backend recommendations, use them
        if (useBackendRecs && backendRecommendations && backendRecommendations.length > 0) {
            return backendRecommendations.slice(0, 8);
        }

        // Fallback to local scoring
        const scored = products
            .map((product) => {
                const scoreInfo = scoreProduct(product, targets, profile);
                return {
                    ...product,
                    recommendation_score: scoreInfo.score,
                    recommendation_reason: scoreInfo.reason
                };
            })
            .sort((a, b) => b.recommendation_score - a.recommendation_score);

        const deduped = [];
        const seenKeys = new Set();
        for (const item of scored) {
            const key = `${normalizeText(item.name)}|${normalizeText(item.brand)}|${normalizeCategory(item.category)}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            deduped.push(item);
            if (deduped.length >= 8) break;
        }

        return deduped;
    }, [products, targets, profile, backendRecommendations, useBackendRecs]);

    const insightSnippets = Array.isArray(aiInsights?.recommendations)
        ? aiInsights.recommendations.slice(0, 2)
        : [];

    return (
        <div className="app-container" style={{ position: 'relative' }}>
            <div className="screen-content" style={{ padding: '26px 24px 130px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.8)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <ChevronLeft size={24} color="var(--text-headline)" />
                    </button>
                </div>

                <div className="card-glass" style={{ padding: '18px', marginBottom: '14px', background: 'linear-gradient(135deg, rgba(157,90,118,0.15), rgba(241,211,226,0.16))' }}>
                    <h1 className="headline" style={{ fontSize: '1.45rem', marginBottom: '8px' }}>
                        Rekomendasi Produk Personal
                    </h1>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '12px' }}>
                        Disusun berdasarkan hasil analisis kulit terbaru Anda dan kategori produk yang paling relevan.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.65)' }}>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-body)', marginBottom: '4px' }}>Skin Type</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-headline)' }}>{profile.skinType}</p>
                        </div>
                        <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.65)' }}>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-body)', marginBottom: '4px' }}>Hidrasi</p>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-headline)' }}>{profile.hydrationLevel}%</p>
                        </div>
                    </div>

                    {targets.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                            {targets.slice(0, 3).map((target) => (
                                <span key={target.key} style={{ fontSize: '0.72rem', padding: '5px 9px', borderRadius: '999px', background: 'rgba(255,255,255,0.7)', color: 'var(--text-headline)' }}>
                                    {target.label}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                {insightSnippets.length > 0 ? (
                    <div className="card-glass" style={{ padding: '14px', marginBottom: '14px' }}>
                        <p style={{ fontSize: '0.82rem', color: 'var(--primary-color)', fontWeight: 700, marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={14} />
                            Insight AI
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                            {insightSnippets.map((item, index) => (
                                <li key={`${item}-${index}`} style={{ color: 'var(--text-body)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '4px' }}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <p style={{ color: 'var(--text-body)' }}>Memuat rekomendasi produk...</p>
                    </div>
                ) : error ? (
                    <div className="card-glass" style={{ padding: '18px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-headline)', fontWeight: 600, marginBottom: '6px' }}>Gagal memuat rekomendasi</p>
                        <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', marginBottom: '10px' }}>{error}</p>
                        <button
                            onClick={() => navigate('/products')}
                            style={{ border: 'none', borderRadius: '10px', padding: '10px 14px', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                        >
                            Lihat Semua Produk
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recommendedProducts.map((product) => {
                            return (
                            <div key={product.id || product.slug} className="card-glass" style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>
                                            {product.brand || 'BEAUTYLATORY'}
                                        </p>
                                        <h4 style={{ fontSize: '1rem', color: 'var(--text-headline)', marginBottom: '8px', fontFamily: 'var(--font-sans)', lineHeight: 1.3 }}>
                                            {product.name}
                                        </h4>
                                    </div>
                                    <span style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: '999px', background: 'rgba(89,54,69,0.08)', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>
                                        {product.category || 'Produk'}
                                    </span>
                                </div>

                                <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '12px', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                                    {product.recommendation_reason || product.reason || 'Direkomendasikan berdasarkan analisis kulit Anda untuk hasil perawatan yang optimal.'}
                                </p>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <button
                                        onClick={() => navigate(`/products/${product.slug || product.id}`, {
                                            state: {
                                                recommendationReason: product.recommendation_reason || product.reason,
                                                fromRecommendations: true
                                            }
                                        })}
                                        style={{
                                            border: 'none',
                                            borderRadius: '10px',
                                            padding: '8px 12px',
                                            background: 'rgba(157,90,118,0.14)',
                                            color: 'var(--primary-color)',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ShoppingBag size={14} />
                                        Lihat Detail
                                    </button>
                                </div>
                            </div>
                        )})}

                        {recommendedProducts.length === 0 ? (
                            <div className="card-glass" style={{ padding: '18px', textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-headline)', fontWeight: 600, marginBottom: '8px' }}>Belum ada produk rekomendasi</p>
                                <p style={{ color: 'var(--text-body)', fontSize: '0.85rem', marginBottom: '12px' }}>
                                    Tambahkan produk aktif dari admin dashboard agar rekomendasi dapat ditampilkan.
                                </p>
                                <button
                                    onClick={() => navigate('/products')}
                                    style={{ border: 'none', borderRadius: '10px', padding: '10px 14px', background: 'var(--primary-color)', color: 'white', cursor: 'pointer' }}
                                >
                                    Buka Halaman Produk
                                </button>
                            </div>
                        ) : null}

                        {/* Alternative Recommendations Button */}
                        {recommendedProducts.length > 0 && (
                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                <button
                                    onClick={fetchAlternativeRecommendations}
                                    disabled={loadingAlternatives}
                                    style={{
                                        border: '2px solid var(--primary-color)',
                                        borderRadius: '12px',
                                        padding: '12px 20px',
                                        background: loadingAlternatives ? 'rgba(230, 0, 126, 0.1)' : 'transparent',
                                        color: 'var(--primary-color)',
                                        cursor: loadingAlternatives ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontFamily: 'var(--font-sans)',
                                        transition: 'all 0.3s ease',
                                        opacity: loadingAlternatives ? 0.7 : 1
                                    }}
                                    onMouseOver={(e) => {
                                        if (!loadingAlternatives) {
                                            e.currentTarget.style.background = 'var(--primary-color)';
                                            e.currentTarget.style.color = 'white';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!loadingAlternatives) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--primary-color)';
                                        }
                                    }}
                                >
                                    <RefreshCw 
                                        size={16} 
                                        style={{ 
                                            animation: loadingAlternatives ? 'spin 1s linear infinite' : 'none' 
                                        }} 
                                    />
                                    {loadingAlternatives ? 'Mencari Alternatif...' : 'Berikan Saya Rekomendasi Lain'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="card-glass" style={{ padding: '14px', marginTop: '14px' }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-headline)', marginBottom: '7px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <ShieldCheck size={15} color="var(--primary-color)" />
                        Tips Penggunaan
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.58, margin: 0 }}>
                        Gunakan produk baru secara bertahap, lakukan patch test, dan konsisten minimal 4-6 minggu untuk evaluasi hasil.
                    </p>
                </div>

                {/* CSS for spin animation */}
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>

            <BottomNav />
        </div>
    );
};

export default Recommendations;
