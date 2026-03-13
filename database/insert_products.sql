-- Clear produk lama
DELETE FROM products WHERE id < 100;

-- Insert produk baru dengan deskripsi lengkap
INSERT INTO products (name, brand, category, description, price, image_url, ingredients, skin_type, concerns, rating, is_active, is_featured) VALUES

('UMRAH HAJJ SERIES - Serenity Body Lotion', 'ADHWA', 'Body Lotion', 'Lotion tubuh multifungsi yang memberikan kelembapan intensif, perlindungan dari sinar UV, efek mencerahkan, dan menenangkan kulit. Sangat cocok untuk jemaah haji dan umrah yang menghadapi kondisi ekstrem seperti sinar matahari langsung, dehidrasi kulit, dan iritasi karena gesekan pakaian atau udara panas.', 52000, 'https://beautylatory.com/storage/20/1759675224_68e283588783f.webp', 'UV filter, Niacinamide, Goat milk', 'All Types', 'Whitening, UV Protection, Hydration', 3.0, 1, 1),

('PHYTOSYNC - Urban Shield Serum', 'BEAUTYLATORY', 'Serum', 'PHYTOSYNC Urban Shield Serum adalah solusi cerdas untuk melindungi kulit dari efek buruk polusi, radikal bebas, dan stres lingkungan perkotaan. Diperkaya dengan kombinasi niacinamide, ceramide, antioksidan kuat, serta botox-like peptide, serum ini bekerja untuk memperkuat skin barrier, mencegah penuaan dini, menjaga kelembapan, sekaligus membuat kulit tampak sehat, cerah, dan elastis.', 133910, 'https://beautylatory.com/storage/54/7.-URBAN-SHIELD.png', 'Niacinamide, Argireline Peptide Solution C, Phyrosaccharide APP, Aquaceria Basic (Ceramide), Vitamin E, Baba GN 2.0, Grape & Blackcurrant Extract, Pomegranate Extract, White Strawberry Extract, Rose & Honey Extract', 'All Types', 'Anti-aging, Brightening, Pollution Protection', 5.0, 1, 1),

('Mugwort Deep Cleansing Facial Wash', 'BEAUTYLATORY', 'Cleanser', 'Facial wash dengan mugwort extract untuk membersihkan wajah secara mendalam dan mengatasi jerawat. Formula lembut namun efektif mengangkat kotoran dan minyak berlebih tanpa merusak skin barrier.', 94100, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', 'Mugwort Extract, Salicylic Acid, Tea Tree Oil', 'Oily, Acne-prone', 'Acne Treatment, Deep Cleansing', 4.7, 1, 0),

('Triple Action Skin Defense Sunscreen', 'BEAUTYLATORY', 'Sunscreen', 'Sunscreen dengan perlindungan triple action melawan UVA, UVB, dan infrared. Memberikan perlindungan maksimal sambil menjaga kulit tetap lembab dan tidak lengket.', 109400, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 'Zinc Oxide, Titanium Dioxide, Vitamin E, Aloe Vera', 'All Types', 'UV Protection, Anti-aging', 4.8, 1, 0),

('Shower Gel Calm Up', 'MOMMYLATORY', 'Cleanser', 'Shower gel dengan aroma menenangkan yang lembut di kulit. Mengandung bahan alami yang membersihkan tanpa mengeringkan kulit.', 160500, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', 'Natural Plant Extract, Glycerin, Chamomile', 'All Types', 'Cleansing, Relaxation', 4.5, 1, 0),

('Body Lotion Calm Up', 'MOMMYLATORY', 'Body Lotion', 'Body lotion dengan tekstur ringan yang cepat meresap. Memberikan kelembapan tahan lama dan aroma menenangkan sepanjang hari.', 117400, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 'Shea Butter, Glycerin, Chamomile Extract', 'All Types', 'Hydration, Moisturizing', 4.6, 1, 0),

('Mangosteen Sun Protector', 'UMADERM', 'Sunscreen', 'Sun protector dengan mangosteen extract yang kaya antioksidan. Melindungi kulit dari sinar UV sambil memberikan efek mencerahkan dan anti-aging.', 60000, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 'Mangosteen Extract, UV Filter SPF 50+, Vitamin C', 'All Types', 'UV Protection, Brightening, Anti-aging', 4.6, 1, 0),

('Radiance Gold Serum', 'UMADERM', 'Serum', 'Serum premium dengan gold particles untuk memberikan kilau alami dan efek mencerahkan. Mengandung vitamin C dan antioksidan untuk hasil maksimal.', 63700, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800', 'Gold Particles, Vitamin C, Hyaluronic Acid, Niacinamide', 'All Types', 'Brightening, Anti-aging, Radiance', 4.7, 1, 0),

('Niacinamide Pore Minimizer', 'BEAUTYLATORY', 'Serum', 'Serum dengan niacinamide tinggi untuk meminimalkan pori-pori dan mengontrol produksi minyak. Cocok untuk kulit berminyak dan kombinasi.', 85000, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800', 'Niacinamide 10%, Zinc PCA, Witch Hazel', 'Oily, Combination', 'Pore Minimizing, Oil Control', 4.6, 1, 0),

('Retinol Night Cream', 'BEAUTYLATORY', 'Moisturizer', 'Night cream dengan retinol untuk anti-aging dan regenerasi kulit saat tidur. Membantu mengurangi garis halus dan meningkatkan tekstur kulit.', 125000, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 'Retinol 0.5%, Peptides, Ceramides, Squalane', 'All Types', 'Anti-aging, Regeneration', 4.8, 1, 0),

('Hyaluronic Acid Hydrating Toner', 'BEAUTYLATORY', 'Toner', 'Toner dengan hyaluronic acid untuk memberikan hidrasi maksimal sebelum menggunakan serum atau moisturizer. Membuat kulit terasa lembut dan kenyal.', 75000, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', 'Hyaluronic Acid, Glycerin, Rose Water', 'All Types', 'Hydration, Plumping', 4.7, 1, 0),

('Vitamin C Brightening Essence', 'BEAUTYLATORY', 'Essence', 'Essence dengan vitamin C untuk mencerahkan dan meratakan tone kulit. Mengandung antioksidan kuat untuk melindungi dari radikal bebas.', 95000, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800', 'Vitamin C 15%, Ferulic Acid, Vitamin E', 'All Types', 'Brightening, Antioxidant', 4.8, 1, 1),

('Peptide Eye Cream', 'BEAUTYLATORY', 'Eye Cream', 'Eye cream dengan peptide untuk mengatasi kerutan dan kantung mata. Formula khusus untuk area mata yang sensitif.', 105000, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', 'Peptides, Caffeine, Hyaluronic Acid', 'All Types', 'Anti-aging, Dark Circles', 4.7, 1, 0),

('Ceramide Barrier Repair Cream', 'BEAUTYLATORY', 'Moisturizer', 'Cream dengan ceramide kompleks untuk memperbaiki dan memperkuat skin barrier. Ideal untuk kulit sensitif dan rusak.', 115000, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 'Ceramides NP/AP/EOP, Cholesterol, Fatty Acids', 'Sensitive, Dry', 'Barrier Repair, Soothing', 4.9, 1, 0);
