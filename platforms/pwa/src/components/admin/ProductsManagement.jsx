import React, { useEffect, useMemo, useState } from 'react';
import { Search, Package, ExternalLink, AlertCircle, Sparkles } from 'lucide-react';

const fieldStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(157, 90, 118, 0.2)',
    background: 'rgba(255,255,255,0.9)',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s'
};

const cardStyle = {
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.95)',
    boxShadow: '0 10px 40px rgba(89,54,69,0.08)',
    backdropFilter: 'blur(25px)',
    WebkitBackdropFilter: 'blur(25px)',
    overflow: 'hidden'
};

const ProductsManagement = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [error, setError] = useState('');

    const fetchBeautylatoryProducts = async () => {
        try {
            const BEAUTYLATORY_API_URL = import.meta.env.VITE_PRODUCTS_API_URL;
            
            console.log('🔍 Beautylatory API URL:', BEAUTYLATORY_API_URL);
            
            if (!BEAUTYLATORY_API_URL) {
                throw new Error('Beautylatory API URL not configured in environment variables');
            }

            console.log('🔄 Fetching products from Beautylatory API...');
            const response = await fetch(BEAUTYLATORY_API_URL);
            
            console.log('📡 Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 Raw API response:', data);
            console.log('✅ Beautylatory products loaded:', Array.isArray(data) ? data.length : 'Not an array');
            
            let productsArray = [];
            
            if (Array.isArray(data)) {
                productsArray = data;
            } else if (data.products && Array.isArray(data.products)) {
                console.log('✅ Found products array in data.products');
                productsArray = data.products;
            } else if (data.data && Array.isArray(data.data)) {
                console.log('✅ Found products array in data.data');
                productsArray = data.data;
            } else {
                throw new Error('API response is not in expected format');
            }
            
            // Map API fields to our component fields
            const mappedProducts = productsArray.map(product => ({
                id: product.id,
                slug: product.slug,
                name: product.name,
                brand: product.brand,
                description: product.description,
                image: product.image_url || product.image, // API uses image_url
                category: product.category?.name || product.category, // API has category object
                concerns: product.concerns || [],
                link: product.link || `https://beautylatory.com/products/${product.slug}`
            }));
            
            console.log('✅ Mapped products:', mappedProducts.length);
            setProducts(mappedProducts);
            
            setError('');
        } catch (err) {
            console.error('❌ Failed to fetch Beautylatory products:', err);
            setError(err.message || 'Failed to load products from Beautylatory API');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBeautylatoryProducts();
    }, []);

    const categories = useMemo(() => {
        const unique = Array.from(new Set(products.map((item) => item.category).filter(Boolean)));
        return ['all', ...unique.sort()];
    }, [products]);

    const filteredProducts = useMemo(() => {
        const term = search.toLowerCase();
        return products.filter((product) => {
            const matchCategory = category === 'all' || product.category === category;
            const content = `${product.name || ''} ${product.brand || ''} ${product.category || ''}`.toLowerCase();
            return matchCategory && content.includes(term);
        });
    }, [products, search, category]);

    if (loading) {
        return (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    border: '4px solid rgba(157, 90, 118, 0.2)',
                    borderTop: '4px solid var(--primary-color)',
                    borderRadius: '50%',
                    margin: '0 auto 20px',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ color: 'var(--text-body)', fontSize: '0.95rem' }}>Loading Beautylatory products...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '16px' }} />
                <p style={{ color: '#dc2626', fontSize: '1rem', marginBottom: '8px', fontWeight: 600 }}>
                    Failed to Load Products
                </p>
                <p style={{ color: 'var(--text-body)', fontSize: '0.9rem', marginBottom: '20px' }}>
                    {error}
                </p>
                <button
                    onClick={() => {
                        setLoading(true);
                        fetchBeautylatoryProducts();
                    }}
                    style={{
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.95rem'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Package size={28} color="var(--primary-color)" />
                    <h2 style={{ fontSize: '1.75rem', color: 'var(--text-headline)', fontFamily: 'var(--font-serif)', margin: 0 }}>
                        Beautylatory Products
                    </h2>
                </div>
                <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', margin: 0 }}>
                    {filteredProducts.length} products from Beautylatory API • Read-only view
                </p>
            </div>

            {/* Search & Filter */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products..."
                        style={{ ...fieldStyle, paddingLeft: '48px' }}
                    />
                </div>
                <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    style={fieldStyle}
                >
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Products Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '20px',
                marginBottom: '24px'
            }}>
                {filteredProducts.map((product, index) => (
                    <div 
                        key={product.slug || index} 
                        style={{
                            ...cardStyle,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 15px 50px rgba(89,54,69,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 10px 40px rgba(89,54,69,0.08)';
                        }}
                    >
                        {/* Image */}
                        <div style={{ 
                            width: '100%', 
                            height: '200px', 
                            overflow: 'hidden',
                            position: 'relative',
                            background: 'rgba(157, 90, 118, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {product.image ? (
                                <img 
                                    src={product.image}
                                    alt={product.name} 
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <Package size={48} color="var(--text-body)" style={{ opacity: 0.3 }} />
                            )}
                            
                            {/* Category Badge */}
                            {product.category && (
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    background: 'rgba(255,255,255,0.95)',
                                    backdropFilter: 'blur(10px)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--primary-color)',
                                    textTransform: 'capitalize'
                                }}>
                                    {product.category}
                                </div>
                            )}
                        </div>
                        
                        {/* Content */}
                        <div style={{ padding: '16px' }}>
                            {/* Brand */}
                            {product.brand && (
                                <p style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'var(--text-body)', 
                                    marginBottom: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontWeight: 600
                                }}>
                                    {product.brand}
                                </p>
                            )}
                            
                            {/* Name */}
                            <h3 style={{ 
                                fontSize: '1.05rem', 
                                fontWeight: 600, 
                                color: 'var(--text-headline)', 
                                marginBottom: '8px',
                                fontFamily: 'var(--font-sans)',
                                lineHeight: 1.3,
                                minHeight: '2.6rem'
                            }}>
                                {product.name}
                            </h3>

                            {/* Description */}
                            {product.description && (
                                <p style={{ 
                                    fontSize: '0.85rem', 
                                    color: 'var(--text-body)', 
                                    marginBottom: '12px',
                                    lineHeight: 1.5,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {product.description}
                                </p>
                            )}

                            {/* Tags */}
                            {product.concerns && product.concerns.length > 0 && (
                                <div style={{ 
                                    display: 'flex', 
                                    flexWrap: 'wrap', 
                                    gap: '6px',
                                    marginBottom: '12px'
                                }}>
                                    {product.concerns.slice(0, 3).map((concern, idx) => (
                                        <span 
                                            key={idx}
                                            style={{ 
                                                fontSize: '0.7rem', 
                                                background: 'rgba(157, 90, 118, 0.08)', 
                                                borderRadius: '6px', 
                                                padding: '3px 8px', 
                                                color: 'var(--primary-color)',
                                                fontWeight: 500
                                            }}
                                        >
                                            {concern}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Link */}
                            {product.link && (
                                <a
                                    href={product.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '0.85rem',
                                        color: 'var(--primary-color)',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        padding: '8px 12px',
                                        background: 'rgba(157, 90, 118, 0.08)',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(157, 90, 118, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(157, 90, 118, 0.08)';
                                    }}
                                >
                                    View Product
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredProducts.length === 0 && !loading && !error && (
                <div style={{ 
                    ...cardStyle, 
                    padding: '60px 20px', 
                    textAlign: 'center' 
                }}>
                    <AlertCircle size={48} color="var(--text-body)" style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p style={{ color: 'var(--text-body)', fontSize: '1rem', margin: 0 }}>
                        No products found
                    </p>
                </div>
            )}

            {/* Info Footer */}
            <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(157, 90, 118, 0.05)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <Sparkles size={20} color="var(--primary-color)" />
                <p style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-body)', 
                    margin: 0,
                    lineHeight: 1.5
                }}>
                    Products are fetched from Beautylatory API. This is a read-only view for reference purposes.
                </p>
            </div>
        </div>
    );
};

export default ProductsManagement;
