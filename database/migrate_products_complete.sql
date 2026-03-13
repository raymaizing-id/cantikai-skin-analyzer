-- Migrate semua produk dari product_source ke skin_analyzer dengan deskripsi lengkap

DELETE FROM skin_analyzer.products WHERE id >= 94;

INSERT INTO skin_analyzer.products (id, name, brand, category, description, price, image_url, ingredients, skin_type, concerns, rating, is_active, is_featured)
SELECT 
  p.id,
  p.name,
  COALESCE(m.name, 'Unknown Brand') as brand,
  COALESCE(c.name, 'General') as category,
  CASE 
    WHEN p.name LIKE '%Shower Gel%' THEN CONCAT('Shower gel premium dengan formula khusus. Ukuran: ', COALESCE(p.neto, '250'), ' ', COALESCE(p.pieces, 'ml'), '. Membersihkan kulit dengan lembut tanpa mengeringkan.')
    WHEN p.name LIKE '%Body Lotion%' THEN CONCAT('Body lotion berkualitas tinggi dengan tekstur ringan. Ukuran: ', COALESCE(p.neto, '250'), ' ', COALESCE(p.pieces, 'ml'), '. Memberikan kelembapan tahan lama dan membuat kulit terasa lembut.')
    WHEN p.name LIKE '%Shampoo%' THEN CONCAT('Shampoo premium untuk perawatan rambut. Ukuran: ', COALESCE(p.neto, '250'), ' ', COALESCE(p.pieces, 'ml'), '. Membersihkan rambut tanpa merusak struktur rambut.')
    WHEN p.name LIKE '%Massage Cream%' THEN CONCAT('Massage cream dengan formula khusus. Ukuran: ', COALESCE(p.neto, '250'), ' ', COALESCE(p.pieces, 'ml'), '. Cocok untuk relaksasi dan perawatan kulit.')
    WHEN p.name LIKE '%Sunscreen%' THEN CONCAT('Sunscreen dengan perlindungan maksimal. Ukuran: ', COALESCE(p.neto, '100'), ' ', COALESCE(p.pieces, 'ml'), '. Melindungi kulit dari sinar UV sambil menjaga kelembapan.')
    WHEN p.name LIKE '%Facial Wash%' THEN CONCAT('Facial wash dengan formula khusus. Ukuran: ', COALESCE(p.neto, '100'), ' ', COALESCE(p.pieces, 'ml'), '. Membersihkan wajah secara mendalam dan mengatasi masalah kulit.')
    WHEN p.name LIKE '%Serum%' THEN CONCAT('Serum premium dengan formula aktif. Ukuran: ', COALESCE(p.neto, '20'), ' ', COALESCE(p.pieces, 'ml'), '. Memberikan nutrisi dan perawatan intensif untuk kulit.')
    WHEN p.name LIKE '%Cream%' THEN CONCAT('Cream berkualitas tinggi dengan formula khusus. Ukuran: ', COALESCE(p.neto, '30'), ' ', COALESCE(p.pieces, 'gr'), '. Memberikan perawatan intensif dan hasil maksimal.')
    WHEN p.name LIKE '%Lip%' THEN CONCAT('Lip care premium dengan formula khusus. Ukuran: ', COALESCE(p.neto, '5'), ' ', COALESCE(p.pieces, 'gr'), '. Merawat bibir dengan lembut dan memberikan hasil optimal.')
    WHEN p.name LIKE '%Baby%' THEN CONCAT('Baby care dengan formula lembut dan aman. Ukuran: ', COALESCE(p.neto, '100'), ' ', COALESCE(p.pieces, 'ml'), '. Cocok untuk kulit bayi yang sensitif.')
    WHEN p.name LIKE '%Intimate%' THEN CONCAT('Intimate care dengan formula khusus. Ukuran: ', COALESCE(p.neto, '60'), ' ', COALESCE(p.pieces, 'ml'), '. Memberikan perlindungan dan kenyamanan maksimal.')
    WHEN p.name LIKE '%Deo%' THEN CONCAT('Deodorant dengan formula tahan lama. Ukuran: ', COALESCE(p.neto, '60'), ' ', COALESCE(p.pieces, 'ml'), '. Memberikan perlindungan sepanjang hari.')
    WHEN p.name LIKE '%Mist%' THEN CONCAT('Face mist dengan formula segar. Ukuran: ', COALESCE(p.neto, '60'), ' ', COALESCE(p.pieces, 'ml'), '. Menyegarkan dan memberikan kilau alami.')
    WHEN p.name LIKE '%Class%' THEN 'Workshop edukatif untuk belajar skincare dan beauty. Pengalaman interaktif dengan instruktur profesional.'
    ELSE CONCAT('Produk premium dengan kualitas terbaik. Ukuran: ', COALESCE(p.neto, 'Standard'), ' ', COALESCE(p.pieces, 'unit'), '.')
  END as description,
  p.price,
  CASE 
    WHEN p.name LIKE '%Lip Color%' THEN 'https://images.unsplash.com/photo-1586894572957-98d00b94c5d0?w=800'
    WHEN p.name LIKE '%Baby%' THEN 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800'
    WHEN p.name LIKE '%Serum%' THEN 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800'
    WHEN p.name LIKE '%Sunscreen%' THEN 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'
    WHEN p.name LIKE '%Cream%' THEN 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'
    WHEN p.name LIKE '%Lotion%' THEN 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'
    WHEN p.name LIKE '%Wash%' THEN 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800'
    WHEN p.name LIKE '%Gel%' THEN 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800'
    WHEN p.name LIKE '%Mist%' THEN 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800'
    ELSE 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800'
  END as image_url,
  CASE 
    WHEN p.name LIKE '%Shower Gel%' THEN 'Natural Plant Extract, Glycerin, Essential Oil'
    WHEN p.name LIKE '%Body Lotion%' THEN 'Shea Butter, Glycerin, Vitamin E'
    WHEN p.name LIKE '%Shampoo%' THEN 'Natural Plant Extract, Protein, Vitamin B'
    WHEN p.name LIKE '%Massage Cream%' THEN 'Shea Butter, Almond Oil, Essential Oil'
    WHEN p.name LIKE '%Sunscreen%' THEN 'UV Filter, Vitamin E, Aloe Vera'
    WHEN p.name LIKE '%Facial Wash%' THEN 'Salicylic Acid, Tea Tree Oil, Glycerin'
    WHEN p.name LIKE '%Serum%' THEN 'Vitamin C, Hyaluronic Acid, Antioxidant'
    WHEN p.name LIKE '%Cream%' THEN 'Ceramides, Peptides, Hyaluronic Acid'
    WHEN p.name LIKE '%Lip%' THEN 'Hyaluronic Acid, Vitamin E, Jojoba Oil'
    WHEN p.name LIKE '%Baby%' THEN 'Shea Butter, Chamomile, Aloe Vera'
    WHEN p.name LIKE '%Intimate%' THEN 'Lactic Acid, Chamomile, Aloe Vera'
    ELSE 'Natural Ingredients, Glycerin, Vitamin E'
  END as ingredients,
  CASE 
    WHEN p.name LIKE '%Baby%' THEN 'Sensitive, Baby'
    WHEN p.name LIKE '%Intimate%' THEN 'All Types'
    ELSE 'All Types'
  END as skin_type,
  CASE 
    WHEN p.name LIKE '%Shower Gel%' THEN 'Cleansing, Relaxation'
    WHEN p.name LIKE '%Body Lotion%' THEN 'Hydration, Moisturizing'
    WHEN p.name LIKE '%Shampoo%' THEN 'Hair Cleansing, Nourishing'
    WHEN p.name LIKE '%Massage Cream%' THEN 'Massage, Relaxation'
    WHEN p.name LIKE '%Sunscreen%' THEN 'UV Protection, Anti-aging'
    WHEN p.name LIKE '%Facial Wash%' THEN 'Cleansing, Acne Treatment'
    WHEN p.name LIKE '%Serum%' THEN 'Brightening, Anti-aging'
    WHEN p.name LIKE '%Cream%' THEN 'Moisturizing, Anti-aging'
    WHEN p.name LIKE '%Lip%' THEN 'Lip Care, Color'
    WHEN p.name LIKE '%Baby%' THEN 'Baby Care, Gentle'
    WHEN p.name LIKE '%Intimate%' THEN 'Intimate Care, Protection'
    ELSE 'General Care'
  END as concerns,
  4.5 as rating,
  1 as is_active,
  CASE WHEN p.price > 100000 THEN 1 ELSE 0 END as is_featured
FROM product_source.products p
LEFT JOIN product_source.merek m ON p.merek_id = m.id
LEFT JOIN product_source.categories c ON p.category_id = c.id
WHERE p.status = 'Y'
ORDER BY p.id;
