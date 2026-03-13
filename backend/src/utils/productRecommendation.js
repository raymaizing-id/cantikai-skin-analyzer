/**
 * Advanced Product Recommendation Engine
 * Merekomendasikan produk dengan akurasi tinggi berdasarkan hasil analisis kulit
 */

/**
 * Mapping detail concern ke kategori dan keywords produk
 */
const CONCERN_PRODUCT_MAP = {
    acne: {
        categories: ['Cleanser', 'Facial Wash', 'Serum', 'Toner'],
        keywords: ['acne', 'salicylic', 'tea tree', 'bha', 'aha', 'pore', 'oil control'],
        priority: 'high',
        skinTypes: ['oily', 'combination']
    },
    wrinkles: {
        categories: ['Serum', 'Cream', 'Eye Cream', 'Moisturizer'],
        keywords: ['retinol', 'peptide', 'collagen', 'anti-aging', 'wrinkle', 'firming'],
        priority: 'high',
        skinTypes: ['dry', 'normal', 'sensitive']
    },
    pigmentation: {
        categories: ['Serum', 'Cream', 'Sunscreen'],
        keywords: ['vitamin c', 'brightening', 'whitening', 'niacinamide', 'kojic', 'arbutin'],
        priority: 'high',
        skinTypes: ['all']
    },
    pores: {
        categories: ['Cleanser', 'Serum', 'Toner', 'Facial Wash'],
        keywords: ['pore', 'minimizer', 'niacinamide', 'salicylic', 'clay'],
        priority: 'medium',
        skinTypes: ['oily', 'combination']
    },
    hydration: {
        categories: ['Moisturizer', 'Serum', 'Body Lotion', 'Toner'],
        keywords: ['hyaluronic', 'glycerin', 'hydrating', 'moisture', 'hydra'],
        priority: 'high',
        skinTypes: ['dry', 'sensitive', 'normal']
    },
    oiliness: {
        categories: ['Cleanser', 'Toner', 'Serum', 'Facial Wash'],
        keywords: ['oil control', 'sebum', 'mattifying', 'clay', 'salicylic'],
        priority: 'high',
        skinTypes: ['oily', 'combination']
    },
    redness: {
        categories: ['Cream', 'Serum', 'Moisturizer', 'Cleanser'],
        keywords: ['soothing', 'calming', 'cica', 'chamomile', 'aloe', 'anti-inflammatory'],
        priority: 'medium',
        skinTypes: ['sensitive', 'normal']
    },
    'dark circles': {
        categories: ['Eye Cream', 'Serum'],
        keywords: ['eye', 'dark circle', 'caffeine', 'peptide', 'brightening'],
        priority: 'low',
        skinTypes: ['all']
    },
    'skin aging': {
        categories: ['Serum', 'Cream', 'Eye Cream', 'Moisturizer'],
        keywords: ['anti-aging', 'retinol', 'peptide', 'collagen', 'firming'],
        priority: 'high',
        skinTypes: ['all']
    },
    'sun damage': {
        categories: ['Sunscreen', 'Serum', 'Cream'],
        keywords: ['sunscreen', 'uv', 'protection', 'spf'],
        priority: 'high',
        skinTypes: ['all']
    },
    sensitivity: {
        categories: ['Cleanser', 'Moisturizer', 'Cream'],
        keywords: ['gentle', 'soothing', 'hypoallergenic', 'fragrance-free', 'cica'],
        priority: 'high',
        skinTypes: ['sensitive']
    }
};

/**
 * Mapping skin type ke kategori prioritas
 */
const SKIN_TYPE_PRIORITY = {
    oily: {
        categories: ['Cleanser', 'Toner', 'Serum', 'Facial Wash'],
        keywords: ['oil control', 'mattifying', 'lightweight', 'gel'],
        avoidKeywords: ['heavy', 'rich', 'occlusive']
    },
    dry: {
        categories: ['Moisturizer', 'Cream', 'Body Lotion', 'Serum'],
        keywords: ['hydrating', 'nourishing', 'rich', 'ceramide', 'hyaluronic'],
        avoidKeywords: ['oil control', 'mattifying']
    },
    combination: {
        categories: ['Cleanser', 'Toner', 'Moisturizer', 'Serum'],
        keywords: ['balancing', 'lightweight', 'hydrating'],
        avoidKeywords: ['heavy', 'rich']
    },
    normal: {
        categories: ['Serum', 'Moisturizer', 'Sunscreen', 'Cleanser'],
        keywords: ['balanced', 'maintenance'],
        avoidKeywords: []
    },
    sensitive: {
        categories: ['Cleanser', 'Moisturizer', 'Cream'],
        keywords: ['gentle', 'soothing', 'hypoallergenic', 'fragrance-free'],
        avoidKeywords: ['harsh', 'strong', 'irritating']
    }
};

/**
 * Calculate relevance score untuk setiap produk
 */
const calculateRelevanceScore = (product, analysis, concernPriorities) => {
    let score = 0;
    const skinType = String(analysis.skin_type || '').toLowerCase();
    const productName = String(product.name || '').toLowerCase();
    const productDesc = String(product.description || '').toLowerCase();
    const productIngredients = String(product.ingredients || '').toLowerCase();
    const productConcerns = String(product.concerns || '').toLowerCase();
    const productCategory = String(product.category || '').toLowerCase();

    // 1. Category match (base score) - flexible matching
    const matchedCategories = Object.keys(CONCERN_PRODUCT_MAP)
        .filter(concern => concernPriorities.includes(concern))
        .flatMap(concern => CONCERN_PRODUCT_MAP[concern].categories.map(c => c.toLowerCase()));
    
    if (matchedCategories.some(cat => productCategory.includes(cat) || cat.includes(productCategory))) {
        score += 20;
    }

    // 2. Skin type compatibility
    const skinTypeConfig = SKIN_TYPE_PRIORITY[skinType];
    if (skinTypeConfig) {
        // Bonus untuk kategori yang cocok dengan skin type
        if (skinTypeConfig.categories.some(cat => productCategory.includes(cat.toLowerCase()) || cat.toLowerCase().includes(productCategory))) {
            score += 15;
        }

        // Bonus untuk keywords yang cocok
        skinTypeConfig.keywords.forEach(keyword => {
            if (productName.includes(keyword) || productDesc.includes(keyword) || productIngredients.includes(keyword)) {
                score += 5;
            }
        });

        // Penalty untuk avoid keywords
        skinTypeConfig.avoidKeywords.forEach(keyword => {
            if (productName.includes(keyword) || productDesc.includes(keyword)) {
                score -= 10;
            }
        });
    }

    // 3. Concern-specific keywords match
    Object.entries(CONCERN_PRODUCT_MAP).forEach(([concern, config]) => {
        if (concernPriorities.includes(concern)) {
            config.keywords.forEach(keyword => {
                if (productName.includes(keyword) || productDesc.includes(keyword) || productIngredients.includes(keyword)) {
                    const priorityBonus = config.priority === 'high' ? 8 : config.priority === 'medium' ? 5 : 2;
                    score += priorityBonus;
                }
            });
        }
    });

    // 4. Rating bonus
    const rating = parseFloat(product.rating) || 0;
    score += rating * 3;

    // 5. Price positioning (prefer mid-range)
    const price = parseFloat(product.price) || 0;
    if (price >= 50000 && price <= 150000) {
        score += 10;
    } else if (price > 150000 && price <= 250000) {
        score += 5;
    }

    // 6. Brand reputation (brands dengan banyak produk dianggap lebih terpercaya)
    // Ini akan di-calculate di query

    return score;
};

/**
 * Main recommendation function
 */
export const getProductRecommendations = async (dbAll, analysis) => {
    try {
        if (!analysis) return [];

        const skinType = String(analysis.skin_type || '').toLowerCase();
        const scores = analysis.scores || {};
        const concerns = Array.isArray(analysis.priority_concerns) ? analysis.priority_concerns : [];

        console.log('🔍 Recommendation Analysis:', {
            skinType,
            concernsCount: concerns.length,
            scoresCount: Object.keys(scores).length
        });

        // Build concern priorities list
        const concernPriorities = [];

        // Dari priority_concerns (highest priority)
        concerns
            .sort((a, b) => {
                const severityMap = { high: 3, moderate: 2, mild: 1 };
                return (severityMap[b.severity] || 0) - (severityMap[a.severity] || 0);
            })
            .slice(0, 5)
            .forEach(concern => {
                const key = String(concern.concern || '').toLowerCase().trim();
                if (key && !concernPriorities.includes(key)) {
                    concernPriorities.push(key);
                }
            });

        // Dari scores (jika score tinggi = masalah)
        Object.entries(scores).forEach(([key, score]) => {
            const numScore = parseFloat(score) || 0;
            if (numScore >= 7 && !concernPriorities.includes(key)) {
                concernPriorities.push(key);
            }
        });

        // Selalu tambahkan sunscreen untuk semua skin type
        if (!concernPriorities.includes('sun damage')) {
            concernPriorities.push('sun damage');
        }

        console.log('📋 Concern Priorities:', concernPriorities);

        // Build kategori yang direkomendasikan
        const recommendedCategories = new Set();
        const categoryPriority = {};

        // Dari skin type
        const skinTypeConfig = SKIN_TYPE_PRIORITY[skinType];
        if (skinTypeConfig) {
            skinTypeConfig.categories.forEach(cat => {
                recommendedCategories.add(cat);
                categoryPriority[cat] = (categoryPriority[cat] || 0) + 3;
            });
        }

        // Dari concerns
        concernPriorities.forEach(concern => {
            const config = CONCERN_PRODUCT_MAP[concern];
            if (config) {
                config.categories.forEach(cat => {
                    recommendedCategories.add(cat);
                    const priorityValue = config.priority === 'high' ? 3 : config.priority === 'medium' ? 2 : 1;
                    categoryPriority[cat] = (categoryPriority[cat] || 0) + priorityValue;
                });
            }
        });

        // Query produk dari database
        const categoryArray = Array.from(recommendedCategories);
        if (categoryArray.length === 0) {
            console.warn('⚠️ No recommended categories found, using all products');
            // Fallback: get all active products
            const allProducts = await dbAll(
                'SELECT id, name, brand, category, price, image_url, description, ingredients, concerns, rating, is_featured FROM products WHERE is_active = 1 ORDER BY rating DESC, price ASC LIMIT 30'
            );
            return allProducts.slice(0, 8);
        }

        const placeholders = categoryArray.map(() => '?').join(',');
        const query = `
            SELECT 
                id, name, brand, category, price, image_url, description, 
                ingredients, concerns, rating, is_featured
            FROM products
            WHERE category IN (${placeholders})
            AND is_active = 1
            ORDER BY rating DESC, price ASC
            LIMIT 30
        `;

        console.log('🔎 Query categories:', categoryArray);
        const products = await dbAll(query, categoryArray);
        console.log('📦 Found products:', products.length);

        // Calculate relevance score untuk setiap produk
        const rankedProducts = products.map(product => {
            const relevanceScore = calculateRelevanceScore(product, analysis, concernPriorities);
            
            return {
                ...product,
                relevanceScore,
                matchReason: buildMatchReason(product, analysis, concernPriorities)
            };
        });

        // Sort by relevance dan ambil top 6-8
        const topProducts = rankedProducts
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 8)
            .map(({ relevanceScore, ...product }) => product);

        console.log('✅ Top recommended products:', topProducts.map(p => ({ id: p.id, name: p.name, score: p.relevanceScore })));
        return topProducts;

    } catch (error) {
        console.error('❌ Error getting product recommendations:', error.message);
        return [];
    }
};

/**
 * Build match reason untuk setiap produk
 */
const buildMatchReason = (product, analysis, concernPriorities) => {
    const reasons = [];
    const skinType = String(analysis.skin_type || '').toLowerCase();
    const productName = String(product.name || '').toLowerCase();
    const productDesc = String(product.description || '').toLowerCase();

    // Check skin type match
    const skinTypeConfig = SKIN_TYPE_PRIORITY[skinType];
    if (skinTypeConfig && skinTypeConfig.categories.some(cat => product.category.includes(cat))) {
        reasons.push(`Cocok untuk kulit ${analysis.skin_type}`);
    }

    // Check concern match
    concernPriorities.forEach(concern => {
        const config = CONCERN_PRODUCT_MAP[concern];
        if (config) {
            config.keywords.forEach(keyword => {
                if (productName.includes(keyword) || productDesc.includes(keyword)) {
                    reasons.push(`Membantu mengatasi ${concern}`);
                }
            });
        }
    });

    // Rating
    if (product.rating >= 4.5) {
        reasons.push(`Rating tinggi (${product.rating})`);
    }

    return reasons.slice(0, 2).join(' • ');
};

/**
 * Format rekomendasi untuk response
 */
export const formatRecommendations = (products, analysis) => {
    return {
        total: products.length,
        products: products,
        reasoning: {
            skin_type: analysis.skin_type,
            top_concerns: (analysis.priority_concerns || []).slice(0, 3),
            recommendation_note: `Produk-produk ini dipilih berdasarkan tipe kulit ${analysis.skin_type} dan masalah kulit yang terdeteksi dari hasil analisis.`
        }
    };
};
