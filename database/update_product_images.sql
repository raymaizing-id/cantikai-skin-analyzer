-- Update gambar produk dengan URL yang lebih relevan berdasarkan nama produk

UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Shower Gel%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800' WHERE name LIKE '%Body Lotion%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Shampoo%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800' WHERE name LIKE '%Massage Cream%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800' WHERE name LIKE '%Sunscreen%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Facial Wash%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800' WHERE name LIKE '%Serum%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800' WHERE name LIKE '%Cream%' AND name NOT LIKE '%Massage%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1586894572957-98d00b94c5d0?w=800' WHERE name LIKE '%Lip%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Baby%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Intimate%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Deo%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Mist%';
UPDATE skin_analyzer.products SET image_url = 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800' WHERE name LIKE '%Class%';
