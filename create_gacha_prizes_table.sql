-- Gacha Prizes table for doorprize gachapon game
CREATE TABLE IF NOT EXISTS gacha_prizes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gacha_prizes ENABLE ROW LEVEL SECURITY;

-- Anyone can read prizes (public game page needs this)
CREATE POLICY "Allow public read gacha_prizes" ON gacha_prizes FOR SELECT USING (true);

-- Only authenticated users can manage prizes
CREATE POLICY "Allow authenticated insert gacha_prizes" ON gacha_prizes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update gacha_prizes" ON gacha_prizes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete gacha_prizes" ON gacha_prizes FOR DELETE USING (auth.role() = 'authenticated');
