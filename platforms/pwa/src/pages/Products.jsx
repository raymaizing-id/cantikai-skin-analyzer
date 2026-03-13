import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
            <div className="app-container" style={{ background: '#36212a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <Loader2 size={40} className="animate-spin" style={{ marginBottom: '16px' }} />
                    <p>Memuat produk...</p>
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
                        onClick={() => navigate('/')}
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
                        fontSize: '1.5rem', 
                        fontWeight: 700, 
                        margin: 0,
                        fontFamily: 'var(--font-sans)'
                    }}>
                        Rekomendasi Produk
                    </h1>
                </div>
            </div>

            {/* Products Grid */}
            <div style={{ padding: '20px' }}>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: '20px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    {products.map((product) => (
                        <div
                            key={product.slug}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            {/* Product Image */}
                            <div style={{ 
                                width: '100%', 
                                height: '200px', 
                                background: 'rgba(255, 255, 255, 0.1)',
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
                                        e.target.parentNode.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-size: 0.8rem;">No Image</div>';
                                    }}
                                />
                            </div>

                            {/* Product Info */}
                            <div style={{ padding: '16px' }}>
                                <div style={{ 
                                    background: 'rgba(255, 190, 215, 0.2)',
                                    color: 'rgba(255, 190, 215, 0.9)',
                                    fontSize: '0.7rem',
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    marginBottom: '8px',
                                    fontWeight: 500
                                }}>
                                    {product.category.name}
                                </div>
                                
                                <h3 style={{ 
                                    color: 'white', 
                                    fontSize: '1rem', 
                                    fontWeight: 600, 
                                    margin: '0 0 8px 0',
                                    lineHeight: 1.4,
                                    fontFamily: 'var(--font-sans)'
                                }}>
                                    {product.name}
                                </h3>
                                
                                <p style={{ 
                                    color: 'rgba(255, 255, 255, 0.7)', 
                                    fontSize: '0.8rem', 
                                    lineHeight: 1.5,
                                    margin: '0 0 16px 0',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {product.description}
                                </p>
                                
                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {/* Lihat Detail Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent card click
                                            handleProductClick(product.slug);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                            padding: '8px 12px',
                                            borderRadius: '16px',
                                            fontSize: '0.7rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.2s ease',
                                            flex: 1
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
                                        Lihat Detail
                                    </button>
                                    
                                    {/* Cobain Sekarang Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent card click
                                            window.open(`https://beautylatory.com/products/${product.slug}`, '_blank');
                                        }}
                                        style={{
                                            background: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 12px',
                                            borderRadius: '16px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.2s ease',
                                            flex: 1
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-1px)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 157, 0.3)';
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
                                background: currentPage === 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                                color: currentPage === 1 ? 'rgba(255, 255, 255, 0.5)' : 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '0.8rem'
                            }}
                        >
                            Previous
                        </button>
                        
                        <span style={{ 
                            color: 'rgba(255, 255, 255, 0.8)', 
                            fontSize: '0.8rem',
                            margin: '0 16px'
                        }}>
                            {currentPage} / {totalPages}
                        </span>
                        
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            style={{
                                background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                                color: currentPage === totalPages ? 'rgba(255, 255, 255, 0.5)' : 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                fontSize: '0.8rem'
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Products;