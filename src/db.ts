/**
 * db.ts — Leaderboard persistence layer
 *
 * Uses Supabase when env vars are available; silently falls back to
 * localStorage-only mode otherwise (e.g. local dev without .env.local).
 *
 * Table schema (run once in Supabase SQL editor):
 *
 *   CREATE TABLE IF NOT EXISTS leaderboard (
 *     id              BIGSERIAL PRIMARY KEY,
 *     nickname        TEXT        NOT NULL,
 *     score           INTEGER     NOT NULL DEFAULT 0,
 *     mode            TEXT        NOT NULL CHECK (mode IN ('individual','champion','multiplayer')),
 *     correct_answers INTEGER     NOT NULL DEFAULT 0,
 *     phase_reached   TEXT,
 *     category_stats  JSONB,
 *     room_id         TEXT,
 *     completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *
 *   CREATE INDEX IF NOT EXISTS idx_lb_mode  ON leaderboard(mode);
 *   CREATE INDEX IF NOT EXISTS idx_lb_score ON leaderboard(score DESC);
 *   CREATE INDEX IF NOT EXISTS idx_lb_room  ON leaderboard(room_id);
 *
 *   ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "read_all"   ON leaderboard FOR SELECT USING (true);
 *   CREATE POLICY "insert_all" ON leaderboard FOR INSERT WITH CHECK (true);
 */

import { supabase } from './supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  mode: 'individual' | 'champion' | 'multiplayer';
  correctAnswers: number;
  phaseReached?: string;
  categoryStats?: Record<string, number>;
  roomId?: string;
  completedAt: number; // unix ms timestamp
}

export interface LeaderboardRow {
  nickname: string;
  score: number;
  completedAt: number;
  correctAnswers: number;
  categoryStats?: Record<string, number>;
}

// ─── Save result ──────────────────────────────────────────────────────────────

export async function saveResult(entry: LeaderboardEntry): Promise<void> {
  if (!supabase) return; // no-op in offline mode

  const { error } = await supabase.from('leaderboard').insert({
    nickname:        entry.nickname,
    score:           entry.score,
    mode:            entry.mode,
    correct_answers: entry.correctAnswers,
    phase_reached:   entry.phaseReached ?? null,
    category_stats:  entry.categoryStats ?? null,
    room_id:         entry.roomId ?? null,
    completed_at:    new Date(entry.completedAt).toISOString(),
  });

  if (error) {
    console.error('[BallerID] Failed to save result to Supabase:', error.message);
  }
}

// ─── Fetch leaderboard ────────────────────────────────────────────────────────

/**
 * Returns top-N entries for a given mode (individual or champion).
 * Falls back to an empty array if Supabase is not configured.
 */
export async function fetchLeaderboard(
  mode: 'individual' | 'champion',
  limit = 20
): Promise<LeaderboardRow[]> {
  if (!supabase) return [];

  // Get best score per nickname using a subquery approach:
  // Fetch top scores, deduplicated by nickname (keep highest score per user).
  const { data, error } = await supabase
    .from('leaderboard')
    .select('nickname, score, correct_answers, category_stats, completed_at')
    .eq('mode', mode)
    .order('score', { ascending: false })
    .limit(limit * 3); // fetch extra to handle deduplication

  if (error) {
    console.error('[BallerID] Failed to fetch leaderboard:', error.message);
    return [];
  }

  // Deduplicate: keep only best score per nickname
  const seen = new Map<string, LeaderboardRow>();
  for (const row of (data ?? [])) {
    const key = row.nickname.toLowerCase();
    if (!seen.has(key) || row.score > seen.get(key)!.score) {
      seen.set(key, {
        nickname:      row.nickname,
        score:         row.score,
        correctAnswers: row.correct_answers,
        categoryStats:  row.category_stats ?? undefined,
        completedAt:   new Date(row.completed_at).getTime(),
      });
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── Fetch room leaderboard ───────────────────────────────────────────────────

export async function fetchRoomLeaderboard(
  roomId: string,
  limit = 20
): Promise<LeaderboardRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('leaderboard')
    .select('nickname, score, correct_answers, category_stats, completed_at')
    .eq('mode', 'multiplayer')
    .eq('room_id', roomId)
    .order('score', { ascending: false })
    .limit(limit * 3);

  if (error) {
    console.error('[BallerID] Failed to fetch room leaderboard:', error.message);
    return [];
  }

  const seen = new Map<string, LeaderboardRow>();
  for (const row of (data ?? [])) {
    const key = row.nickname.toLowerCase();
    if (!seen.has(key) || row.score > seen.get(key)!.score) {
      seen.set(key, {
        nickname:      row.nickname,
        score:         row.score,
        correctAnswers: row.correct_answers,
        categoryStats:  row.category_stats ?? undefined,
        completedAt:   new Date(row.completed_at).getTime(),
      });
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─── Delete result ────────────────────────────────────────────────────────────

export async function deleteResult(
  nickname: string,
  mode: 'individual' | 'champion' | 'multiplayer',
  roomId?: string
): Promise<boolean> {
  if (!supabase) return false;

  let query = supabase
    .from('leaderboard')
    .delete()
    .eq('nickname', nickname)
    .eq('mode', mode);

  if (roomId) {
    query = query.eq('room_id', roomId);
  }

  const { error } = await query;
  if (error) {
    console.error('[BallerID] Failed to delete entry from Supabase:', error.message);
    return false;
  }
  return true;
}
