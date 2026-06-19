-- SQL Script to set up the BallerID Leaderboard database table.
-- Run this in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS leaderboard (
  id              BIGSERIAL PRIMARY KEY,
  nickname        TEXT        NOT NULL,
  score           INTEGER     NOT NULL DEFAULT 0,
  mode            TEXT        NOT NULL CHECK (mode IN ('individual', 'champion', 'multiplayer')),
  correct_answers INTEGER     NOT NULL DEFAULT 0,
  phase_reached   TEXT,
  category_stats  JSONB,
  room_id         TEXT,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for frequent queries and fast lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_mode  ON leaderboard(mode);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_room  ON leaderboard(room_id);

-- Enable Row Level Security (RLS)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all entries
CREATE POLICY "Allow public read" 
  ON leaderboard 
  FOR SELECT 
  USING (true);

-- Allow public inserts
CREATE POLICY "Allow public insert" 
  ON leaderboard 
  FOR INSERT 
  WITH CHECK (true);

-- Allow public deletes (for the admin panel)
CREATE POLICY "Allow public delete" 
  ON leaderboard 
  FOR DELETE 
  USING (true);
