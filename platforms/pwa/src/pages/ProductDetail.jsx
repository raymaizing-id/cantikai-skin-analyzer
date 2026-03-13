import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

const ProductDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${import.meta.env.VITE_PRODUCTS_API_URL}/${slug}`);
                
                if (!response.ok) {
                    throw new Error('Product not found');
                }
                
                const data = await response.json();
                setProduct(data.data);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching product:', err);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchProduct();
        }
    }, [slug]);

    const formatDescription = (description) => {
        return description.split('\r\n').map((line, index) => {
            if (line.trim() === '') return null;
            
            // Check if it's a header (all caps or starts with certain keywords)
            const isHeader = line.match(/^[A-Z\s&-]+$/) || 
                           line.startsWith('Manfaat Utama') || 
                           line.startsWith('Tekstur & Aroma') ||
                           line.startsWith('Cocok untuk') ||
                           line.startsWith('Key Ingredients');
            
            if (isHeader) {
                return (
                    <h4 key={index} style={{ 
                        color: 'var(--primary-color)', 
                        fontSize: '1rem', 
                        fontWeight: 600, 
                        margin: '20px 0 8px 0',
                        fontFamily: 'var(--font-sans)'
                    }}>
                        {line}
                    </h4>
                );
            }
            
            return (
                <p key={index} style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontSize: '0.9rem', 
                    lineHeight: 1.6,
                    margin: '8px 0'
                }}>
                    {line}
                </p>
            );
        }).filter(Boolean);
    };

    if (loading) {
        return (
            <div className="app-container" style={{ background: '#36212a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <Loader2 size={40} className="animate-spin" style={{ marginBottom: '16px' }} />
                    <p>Memuat detail produk...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-container" style={{ background: '#36212a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <p style={{ marginBottom: '16px' }}>Error: {error}</p>
                    <button 
                        onClick={() => navigate('/products')}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '24px',
                            cursor: 'pointer'
                        }}
                    >
                        Kembali ke Produk
                    </button>
                </div>
            </div>
        );
    }

    if (!product) {
        return null;
    }

    return (
        <div className="app-container" style={{ background: '#36212a', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ 
                position: 'sticky', 
                top: 0, 
                background: 'rgba(54, 33, 42, 0.95)', 
                backdropFilter: 'blur(10px)',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/products')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'white'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{ 
                        color: 'white', 
                        fontSize: '1.2rem', 
                        fontWeight: 700, 
                        margin: 0,
                        fontFamily: 'var(--font-sans)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        Detail Produk
                    </h1>
                </div>
            </div>

            {/* Product Content */}
            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
                {/* Product Image */}
                <div style={{ 
                    width: '100%', 
                    height: '300px', 
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <img 
                        src={product.image_url} 
                        alt={product.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-size: 1rem;">No Image Available</div>';
                        }}
                    />
                </div>

                {/* Product Info */}
                <div style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                }}>
                    {/* Category */}
                    <div style={{ 
                        background: 'rgba(255, 190, 215, 0.2)',
                        color: 'rgba(255, 190, 215, 0.9)',
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        display: 'inline-block',
                        marginBottom: '16px',
                        fontWeight: 500
                    }}>
                        {product.category.name}
                    </div>
                    
                    {/* Product Name */}
                    <h2 style={{ 
                        color: 'white', 
                        fontSize: '1.5rem', 
                        fontWeight: 700, 
                        margin: '0 0 20px 0',
                        lineHeight: 1.3,
                        fontFamily: 'var(--font-sans)'
                    }}>
                        {product.name}
                    </h2>
                    
                    {/* Product Description */}
                    <div style={{ marginTop: '20px' }}>
                        {formatDescription(product.description)}
                    </div>
                    
                    {/* Cobain Sekarang Button */}
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <button
                            onClick={() => window.open(`https://beautylatory.com/products/${product.slug}`, '_blank')}
                            style={{
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '14px 32px',
                                borderRadius: '30px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                                transition: 'all 0.2s ease',
                                marginBottom: '16px'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 157, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            Cobain Sekarang
                        </button>
                    </div>
                </div>

                {/* Back Button */}
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                        onClick={() => navigate('/products')}
                        style={{
                            background: 'transparent',
                            color: 'rgba(255, 255, 255, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            padding: '12px 28px',
                            borderRadius: '25px',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                    >
                        Kembali ke Produk
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;