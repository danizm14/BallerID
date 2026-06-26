import { triviaQuestions } from './preguntas_trivia';

export interface Question {
  id: string;
  type: 'player' | 'team' | 'match-cards' | 'global-player' | 'global-team';
  category: 'big_data' | 'tictac' | 'physique' | 'coach' | 'scouter';
  questionES: string;
  questionEN: string;
  options: string[];
  correctAnswer: string;
  detailES: string;
  detailEN: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateQuizQuestions(count: number = 20): Question[] {
  const shuffled = shuffleArray(triviaQuestions);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
