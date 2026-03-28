-- ============================================
-- Doctors & Appointments System
-- ============================================

-- Table: doctors
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 0.0,
    review_count INT DEFAULT 0,
    price_per_session DECIMAL(10,2) DEFAULT 0.00,
    photo_url VARCHAR(500),
    bio TEXT,
    experience_years INT DEFAULT 0,
    education TEXT,
    available_days JSON,
    available_hours JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_specialization (specialization),
    INDEX idx_rating (rating),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: doctor_appointments
CREATE TABLE IF NOT EXISTS doctor_appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: doctor_reviews
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_id INT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES doctor_appointments(id) ON DELETE SET NULL,
    INDEX idx_doctor_id (doctor_id),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample doctors
INSERT IGNORE INTO doctors (id, name, specialization, rating, review_count, price_per_session, photo_url, bio, experience_years, education, available_days, available_hours) VALUES
(1, 'Dr. Johan Janson', 'Dermatologist', 4.8, 85, 95.00, '/assets/doctors/dr-johan.jpg', 'Spesialis kulit dengan pengalaman 15+ tahun dalam menangani berbagai masalah kulit termasuk jerawat, penuaan dini, dan hiperpigmentasi.', 15, 'MD - Harvard Medical School, Dermatology Residency - Johns Hopkins', '["Mon", "Tue", "Wed", "Thu", "Fri"]', '["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]'),

(2, 'Dr. Marilyn Stanton', 'General Physician', 5.0, 85, 75.00, '/assets/doctors/dr-marilyn.jpg', 'Dokter umum dengan fokus pada kesehatan kulit dan perawatan preventif. Berpengalaman dalam konsultasi skincare dan nutrisi.', 10, 'MD - Stanford University, Family Medicine Residency', '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]', '["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]'),

(3, 'Dr. Marvin McKinney', 'Cardiologist', 4.3, 85, 120.00, '/assets/doctors/dr-marvin.jpg', 'Ahli jantung yang juga memahami hubungan antara kesehatan jantung dan kondisi kulit. Memberikan konsultasi holistik.', 12, 'MD - Yale School of Medicine, Cardiology Fellowship', '["Tue", "Wed", "Thu", "Fri"]', '["09:00", "10:00", "11:00", "14:00", "15:00"]'),

(4, 'Dr. Arlene McCoy', 'Physician', 4.5, 85, 80.00, '/assets/doctors/dr-arlene.jpg', 'Dokter dengan pendekatan holistik dalam perawatan kesehatan. Fokus pada pencegahan dan gaya hidup sehat.', 8, 'MD - Columbia University, Internal Medicine Residency', '["Mon", "Wed", "Fri", "Sat"]', '["08:00", "09:00", "10:00", "14:00", "15:00", "16:00"]'),

(5, 'Dr. Eleanor Pena', 'Arthropathic', 4.4, 85, 90.00, '/assets/doctors/dr-eleanor.jpg', 'Spesialis dalam menangani kondisi sendi dan tulang yang dapat mempengaruhi kesehatan kulit.', 11, 'MD - Duke University, Rheumatology Fellowship', '["Mon", "Tue", "Thu", "Fri"]', '["09:00", "10:00", "11:00", "14:00", "15:00"]'),

(6, 'Dr. Kaiya Donin', 'Endocrinologist', 5.0, 85, 110.00, '/assets/doctors/dr-kaiya.jpg', 'Ahli endokrin yang memahami hubungan hormon dengan kesehatan kulit. Menangani masalah kulit hormonal.', 13, 'MD - University of Pennsylvania, Endocrinology Fellowship', '["Tue", "Wed", "Thu", "Fri", "Sat"]', '["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]');
