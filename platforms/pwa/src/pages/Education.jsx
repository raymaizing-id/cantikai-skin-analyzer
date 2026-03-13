import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Droplets, Sun, Sparkles, Heart, Clock, Tag } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import apiService from '../services/api';

const Education = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const articlesData = await apiService.getArticles();
            setArticles(articlesData);
        } catch (error) {
            console.error('Error fetching articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['all', ...new Set(articles.map(a => a.category).filter(Boolean))];
    const filteredArticles = selectedCategory === 'all' 
        ? articles 
        : articles.filter(a => a.category === selectedCategory);

    const getCategoryIcon = (category) => {
        const icons = {
            'Dasar': Heart,
            'Skincare': Droplets,
            'Perlindungan': Sun,
            'Produk': Sparkles,
            'Tips': BookOpen
        };
        return icons[category] || BookOpen;
    };

    const estimateReadTime = (content) => {
        const wordsPerMinute = 200;
        const words = String(content || '').split(' ').length;
        return Math.ceil(words / wordsPerMinute);
    };

    const getTags = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        return String(value)
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    };

    return (
        <div className="app-container">
            <div className="screen-content" style={{ padding: '24px', paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <ArrowLeft size={20} color="var(--text-headline)" />
                    </button>
                    <h1 className="headline" style={{ fontSize: 'clamp(1.8rem, 6vw, 2.2rem)', margin: 0 }}>Edukasi</h1>
                </div>

                {/* Hero Card */}
                <div className="card-glass" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(230, 0, 126, 0.1), rgba(157, 143, 166, 0.1))' }}>
                    <BookOpen size={32} color="var(--primary-color)" style={{ marginBottom: '12px' }} />
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '8px' }}>Pelajari Tentang Skincare</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6 }}>
                        Temukan tips ahli, panduan, dan artikel untuk membantu Anda mencapai kulit terbaik
                    </p>
                </div>

                {/* Category Filter */}
                {categories.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '8px' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: selectedCategory === cat ? '2px solid var(--primary-color)' : '1px solid rgba(157, 143, 166, 0.3)',
                                    background: selectedCategory === cat ? 'rgba(230, 0, 126, 0.1)' : 'rgba(255,255,255,0.5)',
                                    color: selectedCategory === cat ? 'var(--primary-color)' : 'var(--text-body)',
                                    fontSize: '0.85rem',
                                    fontWeight: selectedCategory === cat ? 600 : 400,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {cat === 'all' ? 'Semua' : cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Articles */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--text-body)' }}>Memuat artikel...</p>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="card-glass" style={{ padding: '40px 24px', textAlign: 'center' }}>
                        <BookOpen size={48} color="var(--primary-color)" style={{ marginBottom: '16px' }} />
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-body)' }}>
                            Belum ada artikel tersedia
                        </p>
                    </div>
                ) : (
                    <>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '16px' }}>
                            {selectedCategory === 'all' ? 'Semua Artikel' : `Artikel ${selectedCategory}`}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredArticles.map((article) => {
                                const Icon = getCategoryIcon(article.category);
                                const readTime = estimateReadTime(article.content);
                                const articleTags = getTags(article.tags);
                                
                                return (
                                    <div
                                        key={article.id}
                                        className="card-glass"
                                        style={{ padding: '20px', cursor: 'pointer' }}
                                        onClick={() => navigate(`/education/${article.id}`)}
                                    >
                                        {(article.featured_image || article.image_url) && (
                                            <div style={{ 
                                                width: '100%', 
                                                height: '150px', 
                                                borderRadius: '12px', 
                                                overflow: 'hidden', 
                                                marginBottom: '16px',
                                                background: 'rgba(230, 0, 126, 0.05)'
                                            }}>
                                                <img 
                                                    src={apiService.resolveMediaUrl(article.featured_image || article.image_url)} 
                                                    alt={article.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ width: 56, height: 56, borderRadius: '12px', background: 'rgba(230, 0, 126, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Icon size={28} color="var(--primary-color)" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                    {article.category && (
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            {article.category}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={12} /> {readTime} menit
                                                    </span>
                                                    {articleTags.length > 0 && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Tag size={12} /> {articleTags[0]}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-headline)', marginBottom: '6px' }}>
                                                    {article.title}
                                                </h4>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.4 }}>
                                                    {article.excerpt || article.content.substring(0, 120) + '...'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
            
            <BottomNav />
        </div>
    );
};

export default Education;
