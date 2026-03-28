-- Add assistant_knowledge column to doctors table
-- This stores the AI assistant's knowledge base, skills, and capabilities for each doctor

ALTER TABLE doctors 
ADD COLUMN assistant_knowledge TEXT DEFAULT NULL 
COMMENT 'Knowledge base for AI assistant representing this doctor';

-- Update existing doctors with default assistant knowledge based on their specialty and bio
UPDATE doctors 
SET assistant_knowledge = CONCAT(
    'Saya adalah asisten AI untuk ', name, ', seorang ', specialty, '. ',
    COALESCE(bio, ''), ' ',
    'Saya dapat membantu Anda dengan informasi tentang layanan dokter ini, menjawab pertanyaan umum seputar ', specialty, ', ',
    'dan membantu Anda memutuskan apakah konsultasi dengan dokter ini sesuai untuk kebutuhan Anda.'
)
WHERE assistant_knowledge IS NULL;
