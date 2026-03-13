-- Add columns untuk tracking rekomendasi produk berdasarkan analisis
ALTER TABLE analyses ADD COLUMN recommended_products JSON DEFAULT NULL;
ALTER TABLE analyses ADD COLUMN recommendation_reason JSON DEFAULT NULL;
ALTER TABLE analyses ADD COLUMN skin_concerns JSON DEFAULT NULL;

-- Contoh data untuk testing
UPDATE analyses SET 
  skin_concerns = JSON_ARRAY('Acne', 'Oily', 'Large Pores'),
  recommended_products = JSON_ARRAY(
    JSON_OBJECT('id', 3, 'name', 'Mugwort Deep Cleansing Facial Wash', 'reason', 'Cocok untuk kulit berminyak dan berjerawat'),
    JSON_OBJECT('id', 9, 'name', 'Niacinamide Pore Minimizer', 'reason', 'Membantu meminimalkan pori-pori besar'),
    JSON_OBJECT('id', 4, 'name', 'Triple Action Skin Defense Sunscreen', 'reason', 'Perlindungan UV untuk mencegah jerawat memburuk')
  ),
  recommendation_reason = JSON_OBJECT(
    'analysis_type', 'AI Skin Analysis',
    'confidence', 0.92,
    'timestamp', NOW(),
    'notes', 'Rekomendasi berdasarkan deteksi kulit berminyak dengan jerawat aktif'
  )
WHERE id = 1;
