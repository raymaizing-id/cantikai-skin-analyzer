import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const Products = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProducts = async (page = 1) => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_PRODUCTS_API_URL}?page=${page}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            
            const data = await response.json();
            setProducts(data.data);
            setCurrentPage(data.meta.current_page);
            setTotalPages(data.meta.last_page);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleProductClick = (slug) => {
        navigate(`/products/${slug}`);
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            fetchProducts(page);
        }
    };

    if (loading) {
        return (
            <div className="app-container" style={{ background: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-headline)' }}>
                    <Loader2 size={40} className="animate-spin" style={{ marginBottom: '16px', color: 'var(--primary-color)' }} />
                    <p>Memuat produk...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-container" style={{ background: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-headline)' }}>
                    <p style={{ marginBottom: '16px' }}>Error: {error}</p>
                    <button 
                        onClick={() => fetchProducts()}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '24px',
                            cursor: 'pointer'
                        }}
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container" style={{ background: 'white', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ 
                position: 'sticky', 
                top: 0, 
                background: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(10px)',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(157, 90, 118, 0.1)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            background: 'rgba(157, 90, 118, 0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--primary-color)'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{ 
                        color: 'var(--text-headline)', 
                        fontSize: '1.5rem', 
                        fontWeight: 700, 
                        margin: 0,
                        fontFamily: 'var(--font-sans)'
                    }}>
                        Rekomendasi Produk
                    </h1>
                </div>
            </div>

            {/* Products Grid - 2 cards per row */}
            <div style={{ padding: '20px 20px 140px' }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '16px',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    {products.map((product) => (
                        <div
                            key={product.slug}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                border: '1px solid rgba(157, 90, 118, 0.1)',
                                boxShadow: '0 2px 8px rgba(157, 90, 118, 0.08)'
                            }}
                        >
                            {/* Product Image */}
                            <div style={{ 
                                width: '100%', 
                                height: '160px', 
                                background: 'rgba(157, 90, 118, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
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
                                        e.target.parentNode.innerHTML = '<div style="color: rgba(157, 90, 118, 0.5); font-size: 0.8rem;">No Image</div>';
                                    }}
                                />
                            </div>

                            {/* Product Info */}
                            <div style={{ padding: '14px' }}>
                                <div style={{ 
                                    background: 'rgba(157, 90, 118, 0.1)',
                                    color: 'var(--primary-color)',
                                    fontSize: '0.65rem',
                                    padding: '3px 8px',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    marginBottom: '8px',
                                    fontWeight: 600
                                }}>
                                    {product.category.name}
                                </div>
                                
                                <h3 style={{ 
                                    color: 'var(--text-headline)', 
                                    fontSize: '0.9rem', 
                                    fontWeight: 600, 
                                    margin: '0 0 8px 0',
                                    lineHeight: 1.3,
                                    fontFamily: 'var(--font-sans)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {product.name}
                                </h3>
                                
                                <p style={{ 
                                    color: 'var(--text-body)', 
                                    fontSize: '0.75rem', 
                                    lineHeight: 1.4,
                                    margin: '0 0 12px 0',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {product.description}
                                </p>
                                
                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {/* Lihat Detail Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleProductClick(product.slug);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            color: 'var(--primary-color)',
                                            border: '1px solid var(--primary-color)',
                                            padding: '6px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.2s ease',
                                            flex: 1
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(157, 90, 118, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'transparent';
                                        }}
                                    >
                                        Detail
                                    </button>
                                    
                                    {/* Cobain Sekarang Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`https://beautylatory.com/products/${product.slug}`, '_blank');
                                        }}
                                        style={{
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '6px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.2s ease',
                                            flex: 1
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(157, 90, 118, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        Cobain
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '40px'
                    }}>
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            style={{
                                background: currentPage === 1 ? 'rgba(157, 90, 118, 0.1)' : 'rgba(157, 90, 118, 0.2)',
                                color: currentPage === 1 ? 'rgba(157, 90, 118, 0.5)' : 'var(--primary-color)',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 500
                            }}
                        >
                            Previous
                        </button>
                        
                        <span style={{ 
                            color: 'var(--text-body)', 
                            fontSize: '0.8rem',
                            margin: '0 16px'
                        }}>
                            {currentPage} / {totalPages}
                        </span>
                        
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            style={{
                                background: currentPage === totalPages ? 'rgba(157, 90, 118, 0.1)' : 'rgba(157, 90, 118, 0.2)',
                                color: currentPage === totalPages ? 'rgba(157, 90, 118, 0.5)' : 'var(--primary-color)',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 500
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    );
};

export default Products;