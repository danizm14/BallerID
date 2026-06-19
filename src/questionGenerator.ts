import { mockMatches } from './mockData';
import type { Match, PlayerMetrics } from './mockData';

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

// Helper to shuffle an array
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateQuizQuestions(count: number = 20): Question[] {
  const pool: Question[] = [];

  // Collect all players and all teams globally for tournament-wide comparisons
  const allPlayers: { player: PlayerMetrics; match: Match }[] = [];
  const allTeamsStats: { team: string; possession: number; crosses: number; shotsOnTarget: number; match: Match }[] = [];

  mockMatches.forEach(match => {
    match.players.forEach(p => {
      allPlayers.push({ player: p, match });
    });
    // Add stats for Team A
    allTeamsStats.push({
      team: match.teamA,
      possession: match.collective.possessionA,
      crosses: match.collective.crossesA,
      shotsOnTarget: match.collective.shotsOnTargetA,
      match
    });
    // Add stats for Team B
    allTeamsStats.push({
      team: match.teamB,
      possession: 100 - match.collective.possessionA,
      crosses: match.collective.crossesB,
      shotsOnTarget: match.collective.shotsOnTargetB,
      match
    });
  });

  const allGKs = allPlayers.filter(item => item.player.position === 'GK').map(item => item.player.name);
  const uniqueGKs = Array.from(new Set(allGKs));

  // --- 1. MATCH-LEVEL PLAYER QUESTIONS ---
  mockMatches.forEach((match) => {
    const outfieldPlayers = match.players.filter(p => p.position !== 'GK');
    const goalkeepers = match.players.filter(p => p.position === 'GK');

    // A) Max Speed
    const maxSpeedPlayer = outfieldPlayers.reduce((max, p) => p.maxSpeed > max.maxSpeed ? p : max, outfieldPlayers[0]);
    if (maxSpeedPlayer) {
      pool.push({
        id: `player-speed-${match.id}`,
        type: 'player',
        category: 'physique',
        questionES: `¿Quién ha sido el jugador del partido ${match.teamA} vs ${match.teamB} que ha alcanzado la velocidad máxima más alta?`,
        questionEN: `Who was the player in the ${match.teamA} vs ${match.teamB} match who reached the highest top speed?`,
        correctAnswer: maxSpeedPlayer.name,
        options: generatePlayerOptions(match, maxSpeedPlayer.name),
        detailES: `${maxSpeedPlayer.name} alcanzó una velocidad máxima de ${maxSpeedPlayer.maxSpeed} km/h.`,
        detailEN: `${maxSpeedPlayer.name} reached a top speed of ${maxSpeedPlayer.maxSpeed} km/h.`,
        difficulty: 'medium'
      });
    }

    // B) Total Distance
    const maxDistancePlayer = outfieldPlayers.reduce((max, p) => p.distance > max.distance ? p : max, outfieldPlayers[0]);
    if (maxDistancePlayer) {
      pool.push({
        id: `player-distance-${match.id}`,
        type: 'player',
        category: 'physique',
        questionES: `¿Quién ha sido el jugador del partido ${match.teamA} vs ${match.teamB} que ha recorrido la mayor distancia total?`,
        questionEN: `Who was the player in the ${match.teamA} vs ${match.teamB} match who covered the most total distance?`,
        correctAnswer: maxDistancePlayer.name,
        options: generatePlayerOptions(match, maxDistancePlayer.name),
        detailES: `${maxDistancePlayer.name} recorrió un total de ${maxDistancePlayer.distance} km durante el partido.`,
        detailEN: `${maxDistancePlayer.name} covered a total of ${maxDistancePlayer.distance} km during the match.`,
        difficulty: 'medium'
      });
    }

    // C) Sprints
    const maxSprintsPlayer = outfieldPlayers.reduce((max, p) => p.highIntensitySprints > max.highIntensitySprints ? p : max, outfieldPlayers[0]);
    if (maxSprintsPlayer && maxSprintsPlayer.highIntensitySprints > 0) {
      pool.push({
        id: `player-sprints-${match.id}`,
        type: 'player',
        category: 'physique',
        questionES: `¿Quién ha sido el jugador del partido ${match.teamA} vs ${match.teamB} que ha realizado más sprints de alta intensidad (>25 km/h)?`,
        questionEN: `Who was the player in the ${match.teamA} vs ${match.teamB} match who made the most high-intensity sprints (>25 km/h)?`,
        correctAnswer: maxSprintsPlayer.name,
        options: generatePlayerOptions(match, maxSprintsPlayer.name),
        detailES: `${maxSprintsPlayer.name} realizó ${maxSprintsPlayer.highIntensitySprints} sprints de alta intensidad.`,
        detailEN: `${maxSprintsPlayer.name} made ${maxSprintsPlayer.highIntensitySprints} high-intensity sprints.`,
        difficulty: 'medium'
      });
    }

    // D) Key Passes
    const maxKeyPassesPlayer = outfieldPlayers.reduce((max, p) => p.keyPasses > max.keyPasses ? p : max, outfieldPlayers[0]);
    if (maxKeyPassesPlayer && maxKeyPassesPlayer.keyPasses > 0) {
      pool.push({
        id: `player-passes-${match.id}`,
        type: 'player',
        category: 'tictac',
        questionES: `¿Quién ha sido el jugador del partido ${match.teamA} vs ${match.teamB} que ha creado más ocasiones / pases clave (pases de ruptura)?`,
        questionEN: `Who was the player in the ${match.teamA} vs ${match.teamB} match who created the most chances / key passes (completed line breaks)?`,
        correctAnswer: maxKeyPassesPlayer.name,
        options: generatePlayerOptions(match, maxKeyPassesPlayer.name),
        detailES: `${maxKeyPassesPlayer.name} completó ${maxKeyPassesPlayer.keyPasses} pases clave/rupturas.`,
        detailEN: `${maxKeyPassesPlayer.name} completed ${maxKeyPassesPlayer.keyPasses} key passes/line breaks.`,
        difficulty: 'medium'
      });
    }

    // E) Successful Dribbles
    const maxDribblesPlayer = outfieldPlayers.reduce((max, p) => p.successfulDribbles > max.successfulDribbles ? p : max, outfieldPlayers[0]);
    if (maxDribblesPlayer && maxDribblesPlayer.successfulDribbles > 0) {
      pool.push({
        id: `player-dribbles-${match.id}`,
        type: 'player',
        category: 'tictac',
        questionES: `¿Quién ha sido el jugador del partido ${match.teamA} vs ${match.teamB} que ha completado más regates con éxito (take-ons)?`,
        questionEN: `Who was the player in the ${match.teamA} vs ${match.teamB} match who completed the most successful dribbles (take-ons)?`,
        correctAnswer: maxDribblesPlayer.name,
        options: generatePlayerOptions(match, maxDribblesPlayer.name),
        detailES: `${maxDribblesPlayer.name} completó con éxito ${maxDribblesPlayer.successfulDribbles} regates.`,
        detailEN: `${maxDribblesPlayer.name} successfully completed ${maxDribblesPlayer.successfulDribbles} dribbles.`,
        difficulty: 'medium'
      });
    }

    // F) Recoveries
    const maxRecoveriesPlayer = outfieldPlayers.reduce((max, p) => p.ballRecoveries > max.ballRecoveries ? p : max, outfieldPlayers[0]);
    if (maxRecoveriesPlayer) {
      pool.push({
        id: `player-recoveries-${match.id}`,
        type: 'player',
        category: 'scouter',
        questionES: `¿Quién ha sido el jugador del partido ${match.teamA} vs ${match.teamB} que ha realizado más recuperaciones de balón?`,
        questionEN: `Who was the player in the ${match.teamA} vs ${match.teamB} match who made the most ball recoveries?`,
        correctAnswer: maxRecoveriesPlayer.name,
        options: generatePlayerOptions(match, maxRecoveriesPlayer.name),
        detailES: `${maxRecoveriesPlayer.name} recuperó el balón en ${maxRecoveriesPlayer.ballRecoveries} ocasiones.`,
        detailEN: `${maxRecoveriesPlayer.name} recovered the ball ${maxRecoveriesPlayer.ballRecoveries} times.`,
        difficulty: 'medium'
      });
    }

    // G) GK Saves
    if (goalkeepers.length >= 2) {
      const topGK = goalkeepers.reduce((best, gk) => (gk.saves || 0) > (best.saves || 0) ? gk : best, goalkeepers[0]);
      if (topGK && (topGK.saves || 0) > 0) {
        const gkDistractors = uniqueGKs.filter(name => name !== topGK.name);
        const selectedGkDistractors = shuffleArray(gkDistractors).slice(0, 3);
        const gkOptions = shuffleArray([topGK.name, ...selectedGkDistractors]);

        pool.push({
          id: `player-gkprevented-${match.id}`,
          type: 'player',
          category: 'scouter',
          questionES: `¿Qué portero en el partido ${match.teamA} vs ${match.teamB} ha realizado más paradas?`,
          questionEN: `Which goalkeeper in the ${match.teamA} vs ${match.teamB} match made the most saves?`,
          correctAnswer: topGK.name,
          options: gkOptions,
          detailES: `${topGK.name} realizó ${topGK.saves} paradas durante el partido.`,
          detailEN: `${topGK.name} made ${topGK.saves} saves during the match.`,
          difficulty: 'medium'
        });
      }
    }
  });

  // --- 2. MATCH-LEVEL TEAM QUESTIONS ---
  mockMatches.forEach(match => {
    // Possession (comparative)
    pool.push({
      id: `team-possession-${match.id}`,
      type: 'team',
      category: 'tictac',
      questionES: `En el partido ${match.teamA} vs ${match.teamB}, ¿qué equipo registró mayor porcentaje de posesión?`,
      questionEN: `In the ${match.teamA} vs ${match.teamB} match, which team registered the higher possession percentage?`,
      correctAnswer: match.collective.possessionA >= 50 ? match.teamA : match.teamB,
      options: shuffleArray([match.teamA, match.teamB, "Empate / Draw"]),
      detailES: `${match.teamA} tuvo un ${match.collective.possessionA}% de posesión frente al ${100 - match.collective.possessionA}% de ${match.teamB}.`,
      detailEN: `${match.teamA} had ${match.collective.possessionA}% possession compared to ${100 - match.collective.possessionA}% for ${match.teamB}.`,
      difficulty: 'easy'
    });

    // Exact Possession % (tictac)
    pool.push({
      id: `team-possession-exact-${match.id}-A`,
      type: 'team',
      category: 'tictac',
      questionES: `¿Cuál fue el porcentaje exacto de posesión de balón que registró la selección de ${match.teamA} en el partido contra ${match.teamB}?`,
      questionEN: `What was the exact ball possession percentage registered by ${match.teamA} in the match against ${match.teamB}?`,
      correctAnswer: `${match.collective.possessionA}%`,
      options: shuffleArray(Array.from(new Set([
        `${match.collective.possessionA}%`,
        `${100 - match.collective.possessionA}%`,
        `${match.collective.possessionA + 10}%`,
        `${Math.max(5, match.collective.possessionA - 15)}%`
      ])).slice(0, 4)),
      detailES: `${match.teamA} controló el ${match.collective.possessionA}% del balón frente a ${match.teamB}.`,
      detailEN: `${match.teamA} controlled ${match.collective.possessionA}% of the ball against ${match.teamB}.`,
      difficulty: 'easy'
    });

    // Crosses (comparative)
    pool.push({
      id: `team-crosses-${match.id}`,
      type: 'team',
      category: 'tictac',
      questionES: `En el partido ${match.teamA} vs ${match.teamB}, ¿qué equipo intentó más centros al área?`,
      questionEN: `In the ${match.teamA} vs ${match.teamB} match, which team attempted more crosses into the box?`,
      correctAnswer: match.collective.crossesA > match.collective.crossesB ? match.teamA : match.teamB,
      options: generateSimpleMatchOptions(match),
      detailES: `${match.teamA} hizo ${match.collective.crossesA} centros, mientras que ${match.teamB} hizo ${match.collective.crossesB}.`,
      detailEN: `${match.teamA} made ${match.collective.crossesA} crosses, while ${match.teamB} made ${match.collective.crossesB}.`,
      difficulty: 'easy'
    });

    // Exact Crosses (tictac)
    pool.push({
      id: `team-crosses-exact-${match.id}-A`,
      type: 'team',
      category: 'tictac',
      questionES: `¿Cuántos centros al área intentó realizar la selección de ${match.teamA} en su partido contra ${match.teamB}?`,
      questionEN: `How many crosses into the box did ${match.teamA} attempt in their match against ${match.teamB}?`,
      correctAnswer: `${match.collective.crossesA}`,
      options: shuffleArray(Array.from(new Set([
        `${match.collective.crossesA}`,
        `${match.collective.crossesB}`,
        `${match.collective.crossesA + 5}`,
        `${Math.max(0, match.collective.crossesA - 4)}`
      ])).slice(0, 4)),
      detailES: `${match.teamA} centró ${match.collective.crossesA} veces y ${match.teamB} centró ${match.collective.crossesB} veces.`,
      detailEN: `${match.teamA} made ${match.collective.crossesA} crosses and ${match.teamB} made ${match.collective.crossesB}.`,
      difficulty: 'medium'
    });

    // Shots on Target (comparative)
    pool.push({
      id: `team-shots-${match.id}`,
      type: 'team',
      category: 'big_data',
      questionES: `En el partido ${match.teamA} vs ${match.teamB}, ¿qué equipo realizó más disparos a puerta (tiros a gol)?`,
      questionEN: `In the ${match.teamA} vs ${match.teamB} match, which team made more shots on target?`,
      correctAnswer: match.collective.shotsOnTargetA > match.collective.shotsOnTargetB ? match.teamA : match.teamB,
      options: generateSimpleMatchOptions(match),
      detailES: `${match.teamA} disparó ${match.collective.shotsOnTargetA} veces a puerta, y ${match.teamB} disparó ${match.collective.shotsOnTargetB} veces.`,
      detailEN: `${match.teamA} made ${match.collective.shotsOnTargetA} shots on target, and ${match.teamB} made ${match.collective.shotsOnTargetB}.`,
      difficulty: 'easy'
    });

    // Exact Shots on Target (big_data)
    pool.push({
      id: `team-shots-exact-${match.id}-A`,
      type: 'team',
      category: 'big_data',
      questionES: `¿Cuántos disparos a puerta (tiros a gol) realizó la selección de ${match.teamA} en el partido contra ${match.teamB}?`,
      questionEN: `How many shots on target did ${match.teamA} make in the match against ${match.teamB}?`,
      correctAnswer: `${match.collective.shotsOnTargetA}`,
      options: shuffleArray(Array.from(new Set([
        `${match.collective.shotsOnTargetA}`,
        `${match.collective.shotsOnTargetB}`,
        `${match.collective.shotsOnTargetA + 3}`,
        `${Math.max(0, match.collective.shotsOnTargetA - 2)}`
      ])).slice(0, 4)),
      detailES: `${match.teamA} registró ${match.collective.shotsOnTargetA} tiros a gol frente a los ${match.collective.shotsOnTargetB} de ${match.teamB}.`,
      detailEN: `${match.teamA} registered ${match.collective.shotsOnTargetA} shots on target compared to ${match.collective.shotsOnTargetB} for ${match.teamB}.`,
      difficulty: 'medium'
    });

    // Expected Goals (xG) (big_data)
    const gkA = match.players.find(p => p.team === match.teamA && p.position === 'GK');
    const gkB = match.players.find(p => p.team === match.teamB && p.position === 'GK');
    const xgValA = gkB?.xGConceded;
    void gkA; // xGConceded for teamB (gkA) reserved for future use

    if (xgValA !== undefined) {
      pool.push({
        id: `team-xg-${match.id}-A`,
        type: 'team',
        category: 'big_data',
        questionES: `¿Cuál fue el valor de Goles Esperados (xG) calculado para la selección de ${match.teamA} en su encuentro contra ${match.teamB}?`,
        questionEN: `What was the Expected Goals (xG) value calculated for ${match.teamA} in their match against ${match.teamB}?`,
        correctAnswer: `${xgValA.toFixed(2)}`,
        options: shuffleArray(Array.from(new Set([
          `${xgValA.toFixed(2)}`,
          `${(xgValA + 0.52).toFixed(2)}`,
          `${Math.max(0.1, xgValA - 0.45).toFixed(2)}`,
          `${(xgValA + 1.15).toFixed(2)}`
        ])).slice(0, 4)),
        detailES: `El xG de ${match.teamA} fue de ${xgValA.toFixed(2)}, reflejando el peligro acumulado en sus disparos.`,
        detailEN: `The xG of ${match.teamA} was ${xgValA.toFixed(2)}, reflecting the cumulative danger of their shots.`,
        difficulty: 'hard'
      });
    }

    // Yellow cards (coach)
    pool.push({
      id: `match-yellows-${match.id}`,
      type: 'team',
      category: 'coach',
      questionES: `¿Cuántas tarjetas amarillas en total se mostraron en el partido entre ${match.teamA} y ${match.teamB}?`,
      questionEN: `How many total yellow cards were shown in the match between ${match.teamA} and ${match.teamB}?`,
      correctAnswer: `${match.collective.yellowCards}`,
      options: shuffleArray(Array.from(new Set([
        `${match.collective.yellowCards}`,
        `${match.collective.yellowCards + 2}`,
        `${Math.max(0, match.collective.yellowCards - 2)}`,
        `${match.collective.yellowCards + 3}`
      ])).slice(0, 4)),
      detailES: `Se mostraron un total de ${match.collective.yellowCards} tarjetas amarillas durante el partido.`,
      detailEN: `A total of ${match.collective.yellowCards} yellow cards were shown during the match.`,
      difficulty: 'medium'
    });
  });

  // --- 2B. NEW MATCH-LEVEL EVENT QUESTIONS (SCORES, GOAL SCORERS, MINUTES, ASSISTS) ---
  mockMatches.forEach(match => {
    const opponentOf = (team: string) => team === match.teamA ? match.teamB : match.teamA;

    // A) Match Score Question
    const correctScore = `${match.scoreA} - ${match.scoreB}`;
    pool.push({
      id: `match-score-${match.id}`,
      type: 'team',
      category: 'big_data',
      questionES: `¿Cuál fue el resultado final del partido entre ${match.teamA} y ${match.teamB}?`,
      questionEN: `What was the final score of the match between ${match.teamA} and ${match.teamB}?`,
      correctAnswer: correctScore,
      options: generateScoreOptions(match.scoreA, match.scoreB),
      detailES: `El partido terminó con marcador de ${match.scoreA} a ${match.scoreB}.`,
      detailEN: `The match ended with a score of ${match.scoreA} to ${match.scoreB}.`,
      difficulty: 'easy'
    });

    // B) Goals related questions
    if (match.goals && match.goals.length > 0) {
      match.goals.forEach((goal, gIdx) => {
        const opponent = opponentOf(goal.team);
        
        // 1. Goal Scorer Question
        pool.push({
          id: `goal-scorer-${match.id}-${gIdx}`,
          type: 'player',
          category: 'big_data',
          questionES: `¿Qué jugador anotó un gol para ${goal.team} en el partido contra ${opponent}?`,
          questionEN: `Which player scored a goal for ${goal.team} in the match against ${opponent}?`,
          correctAnswer: goal.scorer,
          options: generatePlayerOptions(match, goal.scorer),
          detailES: `${goal.scorer} marcó en el minuto ${goal.minute}' para ${goal.team}.`,
          detailEN: `${goal.scorer} scored in the ${goal.minute}' minute for ${goal.team}.`,
          difficulty: 'medium'
        });

        // 2. Goal Minute Question
        const correctMin = `${goal.minute}'`;
        pool.push({
          id: `goal-minute-${match.id}-${gIdx}`,
          type: 'player',
          category: 'coach',
          questionES: `¿En qué minuto marcó ${goal.scorer} su gol para ${goal.team} contra ${opponent}?`,
          questionEN: `In which minute did ${goal.scorer} score their goal for ${goal.team} against ${opponent}?`,
          correctAnswer: correctMin,
          options: generateMinuteOptions(goal.minute),
          detailES: `${goal.scorer} marcó en el minuto ${goal.minute}'.`,
          detailEN: `${goal.scorer} scored in the ${goal.minute}' minute.`,
          difficulty: 'hard'
        });

        // 3. Goal Assister Question (big_data)
        if (goal.assisted && goal.assister) {
          pool.push({
            id: `goal-assister-${match.id}-${gIdx}`,
            type: 'player',
            category: 'big_data',
            questionES: `¿Qué jugador dio el pase de gol (asistencia) para el gol de ${goal.scorer} contra ${opponent}?`,
            questionEN: `Which player provided the assist for ${goal.scorer}'s goal against ${opponent}?`,
            correctAnswer: goal.assister,
            options: generatePlayerOptions(match, goal.assister),
            detailES: `${goal.scorer} marcó al minuto ${goal.minute}' gracias al pase de ${goal.assister}.`,
            detailEN: `${goal.scorer} scored in the ${goal.minute}' minute from ${goal.assister}'s pass.`,
            difficulty: 'medium'
          });
        }
      });
    }
  });

  // --- 3. TOURNAMENT-WIDE GLOBAL PLAYER COMPARISON QUESTIONS ---
  if (allPlayers.length > 0) {
    // Max Speed Global
    const globalSpeed = allPlayers.reduce((max, item) => item.player.maxSpeed > max.player.maxSpeed ? item : max, allPlayers[0]);
    pool.push({
      id: "global-player-speed",
      type: 'global-player',
      category: 'physique',
      questionES: `De todos los jugadores del torneo, ¿quién ha registrado la velocidad máxima más alta en un partido?`,
      questionEN: `Of all the players in the tournament, who registered the highest top speed in a match?`,
      correctAnswer: globalSpeed.player.name,
      options: generateGlobalPlayerOptions(allPlayers, globalSpeed.player.name),
      detailES: `${globalSpeed.player.name} (${globalSpeed.player.team}) alcanzó la velocidad récord de ${globalSpeed.player.maxSpeed} km/h contra ${globalSpeed.match.teamA === globalSpeed.player.team ? globalSpeed.match.teamB : globalSpeed.match.teamA}.`,
      detailEN: `${globalSpeed.player.name} (${globalSpeed.player.team}) reached a record speed of ${globalSpeed.player.maxSpeed} km/h against ${globalSpeed.match.teamA === globalSpeed.player.team ? globalSpeed.match.teamB : globalSpeed.match.teamA}.`,
      difficulty: 'hard'
    });

    // Distance Global (Matchday 1)
    const globalDistance = allPlayers.reduce((max, item) => item.player.distance > max.player.distance ? item : max, allPlayers[0]);
    pool.push({
      id: "global-player-distance",
      type: 'global-player',
      category: 'physique',
      questionES: `De todos los jugadores de la jornada 1, ¿quién ha recorrido la mayor distancia total en un partido?`,
      questionEN: `Of all the players in matchday 1, who covered the most total distance in a single match?`,
      correctAnswer: globalDistance.player.name,
      options: generateGlobalPlayerOptions(allPlayers, globalDistance.player.name),
      detailES: `${globalDistance.player.name} (${globalDistance.player.team}) recorrió ${globalDistance.player.distance} km en su partido de la jornada 1.`,
      detailEN: `${globalDistance.player.name} (${globalDistance.player.team}) covered ${globalDistance.player.distance} km in their match in matchday 1.`,
      difficulty: 'hard'
    });

    // Sprints Global
    const globalSprints = allPlayers.reduce((max, item) => item.player.highIntensitySprints > max.player.highIntensitySprints ? item : max, allPlayers[0]);
    pool.push({
      id: "global-player-sprints",
      type: 'global-player',
      category: 'physique',
      questionES: `De todos los jugadores del torneo, ¿quién ha realizado más sprints de alta intensidad (>25 km/h) en un partido?`,
      questionEN: `Of all the players in the tournament, who made the most high-intensity sprints (>25 km/h) in a match?`,
      correctAnswer: globalSprints.player.name,
      options: generateGlobalPlayerOptions(allPlayers, globalSprints.player.name),
      detailES: `${globalSprints.player.name} (${globalSprints.player.team}) realizó ${globalSprints.player.highIntensitySprints} sprints de alta intensidad.`,
      detailEN: `${globalSprints.player.name} (${globalSprints.player.team}) made ${globalSprints.player.highIntensitySprints} high-intensity sprints.`,
      difficulty: 'hard'
    });

    // Key Passes Global
    const globalKeyPasses = allPlayers.reduce((max, item) => item.player.keyPasses > max.player.keyPasses ? item : max, allPlayers[0]);
    pool.push({
      id: "global-player-passes",
      type: 'global-player',
      category: 'tictac',
      questionES: `De todos los jugadores del torneo, ¿quién ha generado más pases clave / ocasiones (rupturas completadas) en un partido?`,
      questionEN: `Of all the players in the tournament, who generated the most key passes / chances (completed line breaks) in a match?`,
      correctAnswer: globalKeyPasses.player.name,
      options: generateGlobalPlayerOptions(allPlayers, globalKeyPasses.player.name),
      detailES: `${globalKeyPasses.player.name} (${globalKeyPasses.player.team}) dio ${globalKeyPasses.player.keyPasses} pases de ruptura clave en su partido.`,
      detailEN: `${globalKeyPasses.player.name} (${globalKeyPasses.player.team}) made ${globalKeyPasses.player.keyPasses} key line breaks in their match.`,
      difficulty: 'hard'
    });

    // Dribbles Global
    const globalDribbles = allPlayers.reduce((max, item) => item.player.successfulDribbles > max.player.successfulDribbles ? item : max, allPlayers[0]);
    pool.push({
      id: "global-player-dribbles",
      type: 'global-player',
      category: 'tictac',
      questionES: `De todos los jugadores del torneo, ¿quién ha completado más regates con éxito (take-ons) en un partido?`,
      questionEN: `Of all the players in the tournament, who completed the most successful dribbles (take-ons) in a match?`,
      correctAnswer: globalDribbles.player.name,
      options: generateGlobalPlayerOptions(allPlayers, globalDribbles.player.name),
      detailES: `${globalDribbles.player.name} (${globalDribbles.player.team}) completó ${globalDribbles.player.successfulDribbles} regates exitosos.`,
      detailEN: `${globalDribbles.player.name} (${globalDribbles.player.team}) completed ${globalDribbles.player.successfulDribbles} successful dribbles.`,
      difficulty: 'hard'
    });

    // Recoveries Global
    const globalRecoveries = allPlayers.reduce((max, item) => item.player.ballRecoveries > max.player.ballRecoveries ? item : max, allPlayers[0]);
    pool.push({
      id: "global-player-recoveries",
      type: 'global-player',
      category: 'scouter',
      questionES: `De todos los jugadores del torneo, ¿quién ha realizado más recuperaciones de balón en un partido?`,
      questionEN: `Of all the players in the tournament, who made the most ball recoveries in a match?`,
      correctAnswer: globalRecoveries.player.name,
      options: generateGlobalPlayerOptions(allPlayers, globalRecoveries.player.name),
      detailES: `${globalRecoveries.player.name} (${globalRecoveries.player.team}) completó ${globalRecoveries.player.ballRecoveries} recuperaciones de balón.`,
      detailEN: `${globalRecoveries.player.name} (${globalRecoveries.player.team}) completed ${globalRecoveries.player.ballRecoveries} ball recoveries.`,
      difficulty: 'hard'
    });

    // Saves Global (GK)
    const gks = allPlayers.filter(item => item.player.position === 'GK');
    if (gks.length > 0) {
      const globalSaves = gks.reduce((max, item) => (item.player.saves || 0) > (max.player.saves || 0) ? item : max, gks[0]);
      pool.push({
        id: "global-gk-saves",
        type: 'global-player',
        category: 'scouter',
        questionES: `De todos los porteros del torneo, ¿quién ha realizado el mayor número de paradas en un partido?`,
        questionEN: `Of all the goalkeepers in the tournament, who made the most saves in a match?`,
        correctAnswer: globalSaves.player.name,
        options: generateGlobalPlayerOptions(gks, globalSaves.player.name),
        detailES: `${globalSaves.player.name} (${globalSaves.player.team}) detuvo ${globalSaves.player.saves} tiros a gol en su partido.`,
        detailEN: `${globalSaves.player.name} (${globalSaves.player.team}) stopped ${globalSaves.player.saves} shots on goal in their match.`,
        difficulty: 'hard'
      });
    }
  }

  // --- 4. TOURNAMENT-WIDE GLOBAL TEAM COMPARISON QUESTIONS ---
  if (allTeamsStats.length > 0) {
    // Crosses Global
    const globalTeamCrosses = allTeamsStats.reduce((max, item) => item.crosses > max.crosses ? item : max, allTeamsStats[0]);
    pool.push({
      id: "global-team-crosses",
      type: 'global-team',
      category: 'tictac',
      questionES: `De todos los equipos del torneo, ¿cuál es el que ha intentado más centros al área en un solo partido?`,
      questionEN: `Of all the teams in the tournament, which one attempted the most crosses into the box in a single match?`,
      correctAnswer: globalTeamCrosses.team,
      options: generateGlobalTeamOptions(allTeamsStats, globalTeamCrosses.team),
      detailES: `${globalTeamCrosses.team} intentó ${globalTeamCrosses.crosses} centros al área en su partido de la jornada contra ${globalTeamCrosses.match.teamA === globalTeamCrosses.team ? globalTeamCrosses.match.teamB : globalTeamCrosses.match.teamA}.`,
      detailEN: `${globalTeamCrosses.team} attempted ${globalTeamCrosses.crosses} crosses into the box in their match against ${globalTeamCrosses.match.teamA === globalTeamCrosses.team ? globalTeamCrosses.match.teamB : globalTeamCrosses.match.teamA}.`,
      difficulty: 'hard'
    });

    // Shots on Target Global
    const globalTeamShots = allTeamsStats.reduce((max, item) => item.shotsOnTarget > max.shotsOnTarget ? item : max, allTeamsStats[0]);
    pool.push({
      id: "global-team-shots",
      type: 'global-team',
      category: 'big_data',
      questionES: `De todos los equipos del torneo, ¿cuál ha realizado más tiros a puerta en un solo partido?`,
      questionEN: `Of all the teams in the tournament, which one completed the most shots on target in a single match?`,
      correctAnswer: globalTeamShots.team,
      options: generateGlobalTeamOptions(allTeamsStats, globalTeamShots.team),
      detailES: `${globalTeamShots.team} completó ${globalTeamShots.shotsOnTarget} tiros a gol en su partido contra ${globalTeamShots.match.teamA === globalTeamShots.team ? globalTeamShots.match.teamB : globalTeamShots.match.teamA}.`,
      detailEN: `${globalTeamShots.team} completed ${globalTeamShots.shotsOnTarget} shots on goal in their match against ${globalTeamShots.match.teamA === globalTeamShots.team ? globalTeamShots.match.teamB : globalTeamShots.match.teamA}.`,
      difficulty: 'hard'
    });

    // Possession Global
    const globalTeamPoss = allTeamsStats.reduce((max, item) => item.possession > max.possession ? item : max, allTeamsStats[0]);
    pool.push({
      id: "global-team-possession",
      type: 'global-team',
      category: 'tictac',
      questionES: `De todos los equipos del torneo, ¿cuál ha registrado la mayor posesión de balón en un solo partido?`,
      questionEN: `Of all the teams in the tournament, which one registered the highest ball possession in a single match?`,
      correctAnswer: globalTeamPoss.team,
      options: generateGlobalTeamOptions(allTeamsStats, globalTeamPoss.team),
      detailES: `${globalTeamPoss.team} controló un ${globalTeamPoss.possession}% del tiempo de posesión en su partido contra ${globalTeamPoss.match.teamA === globalTeamPoss.team ? globalTeamPoss.match.teamB : globalTeamPoss.match.teamA}.`,
      detailEN: `${globalTeamPoss.team} controlled ${globalTeamPoss.possession}% of possession time in their match against ${globalTeamPoss.match.teamA === globalTeamPoss.team ? globalTeamPoss.match.teamB : globalTeamPoss.match.teamA}.`,
      difficulty: 'hard'
    });
  }

  // --- 5. STATIC SPECIALTY ROLE QUESTIONS (MEXICO VS SOUTH AFRICA + CROSS-MATCH KNOWLEDGE) ---
  pool.push(...staticQuestions);
  pool.push(...specialtyExtraQuestions);


  // --- 6. COMPILING THE FINAL RANDOMIZED LIST WITH RECYCLING SUPPORT ---
  const shuffledPool = shuffleArray(pool);

  if (count <= shuffledPool.length) {
    return shuffledPool.slice(0, count);
  } else {
    // Recycle questions if requested count exceeds pool size
    let result: Question[] = [];
    while (result.length < count) {
      result = result.concat(shuffleArray(shuffledPool));
    }
    // Give unique IDs to recycled questions so React lists work correctly
    return result.slice(0, count).map((q, idx) => ({
      ...q,
      id: `${q.id}-rec-${idx}`
    }));
  }
}

// Distractor generators
function generatePlayerOptions(match: Match, correctAnswer: string): string[] {
  const allPlayerNames = match.players.map(p => p.name);
  const distractors = allPlayerNames.filter(name => name !== correctAnswer);
  const selectedDistractors = shuffleArray(distractors).slice(0, 3);
  return shuffleArray([correctAnswer, ...selectedDistractors]);
}

function generateSimpleMatchOptions(match: Match): string[] {
  return shuffleArray([match.teamA, match.teamB, "Ambos por igual / Both equal"]);
}

function generateGlobalPlayerOptions(allPlayersList: { player: PlayerMetrics }[], correctAnswer: string): string[] {
  const allNames = Array.from(new Set(allPlayersList.map(item => item.player.name)));
  const distractors = allNames.filter(name => name !== correctAnswer);
  const selectedDistractors = shuffleArray(distractors).slice(0, 3);
  return shuffleArray([correctAnswer, ...selectedDistractors]);
}

function generateGlobalTeamOptions(allTeamsList: { team: string }[], correctAnswer: string): string[] {
  const allNames = Array.from(new Set(allTeamsList.map(item => item.team)));
  const distractors = allNames.filter(name => name !== correctAnswer);
  const selectedDistractors = shuffleArray(distractors).slice(0, 3);
  return shuffleArray([correctAnswer, ...selectedDistractors]);
}

function generateScoreOptions(scoreA: number, scoreB: number): string[] {
  const correct = `${scoreA} - ${scoreB}`;
  const optionsSet = new Set<string>([correct]);
  
  const candidates = [
    `${scoreA + 1} - ${scoreB}`,
    `${scoreA} - ${scoreB + 1}`,
    scoreA !== scoreB ? `${scoreB} - ${scoreA}` : null,
    scoreA > 0 ? `${scoreA - 1} - ${scoreB}` : `${scoreA} - ${scoreB + 2}`,
    scoreB > 0 ? `${scoreA} - ${scoreB - 1}` : `${scoreA + 2} - ${scoreB}`,
    "0 - 0", "1 - 0", "2 - 1", "3 - 1", "2 - 0"
  ].filter((s): s is string => s !== null && s !== correct);

  for (const s of candidates) {
    if (optionsSet.size >= 4) break;
    optionsSet.add(s);
  }

  const fallbackScores = ["0 - 0", "1 - 1", "2 - 0", "2 - 1", "3 - 0", "3 - 2"];
  for (const s of fallbackScores) {
    if (optionsSet.size >= 4) break;
    optionsSet.add(s);
  }

  return shuffleArray(Array.from(optionsSet));
}

function generateMinuteOptions(minute: number): string[] {
  const correct = `${minute}'`;
  const distSet = new Set<string>();

  const deltas = [-15, +10, +25, -5, +5, -10, +15];
  const shuffledDeltas = shuffleArray(deltas);
  for (const d of shuffledDeltas) {
    const altMin = minute + d;
    if (altMin > 0 && altMin <= 95 && altMin !== minute) {
      distSet.add(`${altMin}'`);
      if (distSet.size >= 3) break;
    }
  }

  while (distSet.size < 3) {
    const randMin = Math.floor(Math.random() * 88) + 2;
    if (randMin !== minute) {
      distSet.add(`${randMin}'`);
    }
  }

  return shuffleArray([correct, ...Array.from(distSet)]);
}

// 15 Static specialty questions based on Mexico vs South Africa
const staticQuestions: Question[] = [
  {
    id: "static-1",
    type: "player",
    category: "big_data",
    questionES: "¿Quién anotó el primer gol de México al minuto 8 y con qué parte del cuerpo realizó el remate?",
    questionEN: "Who scored Mexico's first goal in the 8th minute and with which body part did they finish?",
    options: [
      "Raúl Jiménez con la cabeza / Raúl Jiménez with the head",
      "Julián Quiñones con el pie derecho / Julián Quiñones with the right foot",
      "Roberto Alvarado con la pierna izquierda / Roberto Alvarado with the left leg",
      "Alexis Vega con el pie derecho / Alexis Vega with the right foot"
    ],
    correctAnswer: "Julián Quiñones con el pie derecho / Julián Quiñones with the right foot",
    detailES: "Julián Quiñones anotó al minuto 8 empujando el balón con el pie derecho tras un rebote en el área.",
    detailEN: "Julián Quiñones scored in the 8th minute tapping the ball in with his right foot after a rebound.",
    difficulty: "medium"
  },
  {
    id: "static-2",
    type: "team",
    category: "big_data",
    questionES: "¿Cuál fue el valor de Goles Esperados (xG) calculado para la selección de Sudáfrica al finalizar el encuentro?",
    questionEN: "What was the Expected Goals (xG) value calculated for South Africa at the end of the match?",
    options: ["1.78", "0.50", "0.10", "0.00"],
    correctAnswer: "0.10",
    detailES: "Sudáfrica generó escasas llegadas claras acumulando solo un 0.10 de xG en todo el partido.",
    detailEN: "South Africa generated very few clear threats, accumulating only 0.10 xG during the game.",
    difficulty: "hard"
  },
  {
    id: "static-3",
    type: "team",
    category: "big_data",
    questionES: "De los 3 intentos de gol totales que realizó Sudáfrica, ¿cuántos fueron directamente a portería (On Target)?",
    questionEN: "Of the 3 total goal attempts made by South Africa, how many were on target?",
    options: [
      "0 intentos / 0 attempts",
      "1 intento / 1 attempt",
      "2 intentos / 2 attempts",
      "3 intentos / 3 attempts"
    ],
    correctAnswer: "2 intentos / 2 attempts",
    detailES: "Sudáfrica disparó 3 veces, 2 de ellas fueron con dirección a puerta y salvadas por el portero mexicano.",
    detailEN: "South Africa had 3 attempts, 2 of which were on target and saved by the Mexican goalkeeper.",
    difficulty: "medium"
  },
  {
    id: "static-4",
    type: "team",
    category: "big_data",
    questionES: "¿Qué tipo de jugada o asistencia (Delivery Type) propició el segundo gol de México anotado por Raúl Jiménez?",
    questionEN: "What type of play or assist (Delivery Type) led to Mexico's second goal scored by Raúl Jiménez?",
    options: [
      "Un tiro libre directo (Freekick) / Direct free kick",
      "Un balón suelto en el área (Loose Ball) / Loose ball in the box",
      "Un centro (Cross) / A cross",
      "Una progresión individual (Ball Progression) / Individual run"
    ],
    correctAnswer: "Un centro (Cross) / A cross",
    detailES: "El gol de Raúl Jiménez provino de un centro preciso al corazón del área.",
    detailEN: "Raúl Jiménez's goal came from a precise cross into the heart of the box.",
    difficulty: "medium"
  },
  {
    id: "static-5",
    type: "team",
    category: "tictac",
    questionES: "¿Cuál fue el porcentaje exacto de posesión de balón que registró la selección de México?",
    questionEN: "What was the exact ball possession percentage registered by Mexico?",
    options: ["47.0%", "36.1%", "50.5%", "57.1%"],
    correctAnswer: "57.1%",
    detailES: "México controló ampliamente el balón adueñándose de un 57.1% de posesión total.",
    detailEN: "Mexico dictated the play, holding 57.1% of overall possession.",
    difficulty: "easy"
  },
  {
    id: "static-6",
    type: "player",
    category: "tictac",
    questionES: "¿Qué mediocampista mexicano logró un perfecto 100% de efectividad en sus pases, completando los 28 que intentó tras ingresar de cambio?",
    questionEN: "Which Mexican midfielder achieved a perfect 100% pass completion rate, completing all 28 attempts after coming on as a substitute?",
    options: ["Erik Lira", "Álvaro Fidalgo", "Luis Chávez", "Gilberto Mora"],
    correctAnswer: "Luis Chávez",
    detailES: "Luis Chávez ingresó en la segunda parte y entregó todos sus 28 pases con total precisión.",
    detailEN: "Luis Chávez entered in the second half and completed all 28 passes with total accuracy.",
    difficulty: "hard"
  },
  {
    id: "static-7",
    type: "team",
    category: "tictac",
    questionES: "¿Cuántos pases totales intentó realizar la selección de Sudáfrica durante los 90 minutos?",
    questionEN: "How many total passes did South Africa attempt during the 90 minutes?",
    options: [
      "547 pases / 547 passes",
      "351 pases / 351 passes",
      "290 pases / 290 passes",
      "495 pases / 495 passes"
    ],
    correctAnswer: "351 pases / 351 passes",
    detailES: "Sudáfrica intentó proponer juego asociativo sumando 351 intentos de pase.",
    detailEN: "South Africa attempted to establish passing patterns, registering 351 pass attempts.",
    difficulty: "medium"
  },
  {
    id: "static-8",
    type: "player",
    category: "physique",
    questionES: "¿Qué jugador registró la velocidad punta (Top Speed) más alta de todo el partido, alcanzando los 34.4 km/h?",
    questionEN: "Which player registered the highest top speed of the match, reaching 34.4 km/h?",
    options: [
      "Raúl Jiménez (México)",
      "Iqraam Rayners (Sudáfrica)",
      "Thalente Mbatha (Sudáfrica)",
      "Roberto Alvarado (México)"
    ],
    correctAnswer: "Thalente Mbatha (Sudáfrica)",
    detailES: "El centrocampista sudafricano Thalente Mbatha fue el más rápido alcanzando 34.4 km/h.",
    detailEN: "South African midfielder Thalente Mbatha was the fastest player on the pitch, hitting 34.4 km/h.",
    difficulty: "hard"
  },
  {
    id: "static-9",
    type: "player",
    category: "physique",
    questionES: "¿Qué futbolista de la selección mexicana recorrió la mayor distancia total, superando los 10.2 kilómetros en el campo?",
    questionEN: "Which player from the Mexican team covered the most total distance, exceeding 10.2 kilometers?",
    options: ["Israel Reyes", "Johan Vásquez", "Jesús Gallardo", "César Montes"],
    correctAnswer: "Israel Reyes",
    detailES: "Israel Reyes cubrió la mayor cantidad de terreno para México con 10.27 km recorridos.",
    detailEN: "Israel Reyes covered the most ground for Mexico, running 10.27 km.",
    difficulty: "medium"
  },
  {
    id: "static-10",
    type: "player",
    category: "physique",
    questionES: "¿Qué jugador de México lideró la estadística de movimientos de ruptura al espacio (\"In Behind\") ofreciéndose en 22 ocasiones?",
    questionEN: "Which Mexican player led the \"In Behind\" runs statistic, offering himself 22 times?",
    options: ["Julián Quiñones", "Raúl Jiménez", "Roberto Alvarado", "Erik Lira"],
    correctAnswer: "Roberto Alvarado",
    detailES: "Roberto Alvarado lideró las desmarques verticales rompiendo líneas al espacio en 22 ocasiones.",
    detailEN: "Roberto Alvarado led the vertical runs, breaching lines into open space 22 times.",
    difficulty: "hard"
  },
  {
    id: "static-11",
    type: "team",
    category: "coach",
    questionES: "¿Qué esquema o formación táctica inicial presentó la selección de Sudáfrica en el terreno de juego?",
    questionEN: "What starting tactical scheme or formation did South Africa present on the pitch?",
    options: ["4-1-2-3", "4-4-2", "5-3-2", "3-5-2"],
    correctAnswer: "5-3-2",
    detailES: "Sudáfrica estructuró su bloque inicial en una formación compacta de 5-3-2.",
    detailEN: "South Africa organized their initial shape in a compact 5-3-2 layout.",
    difficulty: "easy"
  },
  {
    id: "static-12",
    type: "team",
    category: "coach",
    questionES: "¿En qué minuto exacto realizó México su doble cambio para dar ingreso a Gilberto Mora y Luis Chávez?",
    questionEN: "At which exact minute did Mexico make their double substitution to bring on Gilberto Mora and Luis Chávez?",
    options: [
      "Al minuto 76 / 76th minute",
      "Al minuto 66 / 66th minute",
      "Al minuto 79 / 79th minute",
      "Al minuto 92 / 92nd minute"
    ],
    correctAnswer: "Al minuto 66 / 66th minute",
    detailES: "México refrescó su mediocampo al minuto 66 dando entrada a Mora y Chávez.",
    detailEN: "Mexico refreshed their midfield in the 66th minute by introducing Mora and Chávez.",
    difficulty: "medium"
  },
  {
    id: "static-13",
    type: "team",
    category: "coach",
    questionES: "¿Qué porcentaje de tiempo pasó la estructura defensiva de México posicionada en un bloque bajo (Low Block)?",
    questionEN: "What percentage of time did Mexico's defensive structure spend positioned in a low block?",
    options: ["25%", "11%", "5%", "0%"],
    correctAnswer: "5%",
    detailES: "La presión adelantada mexicana evitó replegarse, pasando solo un escaso 5% del tiempo en bloque bajo.",
    detailEN: "Mexico's advanced pressing prevented retreats, spending only 5% of game time in a low block.",
    difficulty: "hard"
  },
  {
    id: "static-14",
    type: "player",
    category: "scouter",
    questionES: "¿Quién fue el máximo recuperador de la selección de México, firmando un total de 8 recuperaciones de balón (Possession Regains)?",
    questionEN: "Who was Mexico's top ball recoverer, registering a total of 8 possession regains?",
    options: ["Edson Álvarez", "Johan Vásquez", "Jesús Gallardo", "César Montes"],
    correctAnswer: "Jesús Gallardo",
    detailES: "Jesús Gallardo lideró las recuperaciones de posesión robando un total de 8 balones.",
    detailEN: "Jesús Gallardo led possession recoveries, intercepting 8 balls.",
    difficulty: "medium"
  },
  {
    id: "static-15",
    type: "player",
    category: "scouter",
    questionES: "¿Qué porcentaje de paradas (Save %) registró el guardameta mexicano Raúl Rangel ante las situaciones de peligro que enfrentó?",
    questionEN: "What save percentage (Save %) did Mexican goalkeeper Raúl Rangel register against the dangerous situations he faced?",
    options: ["50%", "74%", "83%", "100%"],
    correctAnswer: "100%",
    detailES: "Raúl Rangel tuvo una actuación perfecta bajo palos parando el 100% de los tiros recibidos.",
    detailEN: "Raúl Rangel had a flawless performance, saving 100% of target shots faced.",
    difficulty: "easy"
  }
];

// Additional specialty role questions — cross-match, tactical & general knowledge
const specialtyExtraQuestions: Question[] = [
  // ---- BIG DATA ----
  {
    id: "sx-bd-1",
    type: "team",
    category: "big_data",
    questionES: "¿Qué métrica avanzada mide la probabilidad de que un disparo acabe en gol, teniendo en cuenta el ángulo, distancia y tipo de remate?",
    questionEN: "Which advanced metric measures the probability that a shot will result in a goal, considering angle, distance, and shot type?",
    options: ["xG (Goles Esperados / Expected Goals)", "PPDA (Pases por Acción Defensiva)", "PSxG (Post-Shot xG)", "OBV (On-Ball Value)"],
    correctAnswer: "xG (Goles Esperados / Expected Goals)",
    detailES: "El xG (Expected Goals) cuantifica la calidad de cada oportunidad de gol en base a múltiples factores estadísticos.",
    detailEN: "xG (Expected Goals) quantifies the quality of each goal opportunity based on multiple statistical factors.",
    difficulty: "medium"
  },
  {
    id: "sx-bd-2",
    type: "team",
    category: "big_data",
    questionES: "En análisis de datos de fútbol, ¿qué sigla se utiliza para medir el rendimiento defensivo de un equipo basado en sus pases permitidos al rival por acción defensiva?",
    questionEN: "In football data analysis, which acronym is used to measure a team's defensive performance based on passes allowed per defensive action?",
    options: ["PPDA", "xA", "OBV", "EPV"],
    correctAnswer: "PPDA",
    detailES: "El PPDA (Pases Por Acción Defensiva) cuantifica cuánto presiona un equipo, indicando su intensidad defensiva.",
    detailEN: "PPDA (Passes Allowed Per Defensive Action) quantifies how much a team presses, indicating their defensive intensity.",
    difficulty: "hard"
  },
  {
    id: "sx-bd-3",
    type: "player",
    category: "big_data",
    questionES: "¿En qué año se celebró la primera edición del FIFA World Cup en la que se recopiló de forma oficial datos de tracking de jugadores con chips en la pelota?",
    questionEN: "In which year was the first FIFA World Cup edition where official player tracking data with chips in the ball was officially collected?",
    options: ["2014", "2018", "2022", "2026"],
    correctAnswer: "2022",
    detailES: "Qatar 2022 fue el primer Mundial en el que FIFA utilizó tecnología oficial de tracking con chips en el balón para obtener datos de posicionamiento en tiempo real.",
    detailEN: "Qatar 2022 was the first World Cup where FIFA used official tracking technology with chips in the ball to obtain real-time positioning data.",
    difficulty: "medium"
  },
  {
    id: "sx-bd-4",
    type: "team",
    category: "big_data",
    questionES: "¿Qué valor de xG por partido indicaría que un equipo es muy dominante en la creación de oportunidades claras de gol?",
    questionEN: "What xG per match value would indicate that a team is very dominant in creating clear goal-scoring chances?",
    options: ["Más de 2.5 xG / More than 2.5 xG", "Entre 1.0 y 1.5 xG / Between 1.0 and 1.5", "Menos de 0.5 xG / Less than 0.5 xG", "Exactamente 1.0 xG / Exactly 1.0 xG"],
    correctAnswer: "Más de 2.5 xG / More than 2.5 xG",
    detailES: "Un equipo que genera más de 2.5 xG por partido está creando oportunidades de muy alta calidad de forma consistente.",
    detailEN: "A team that generates more than 2.5 xG per match is consistently creating very high-quality scoring opportunities.",
    difficulty: "easy"
  },
  {
    id: "sx-bd-5",
    type: "player",
    category: "big_data",
    questionES: "¿Cómo se denomina la estadística avanzada que mide el valor añadido por cada acción con balón de un jugador, incluyendo pases, regates y disparos?",
    questionEN: "What is the name of the advanced statistic that measures the value added by each of a player's on-ball actions, including passes, dribbles, and shots?",
    options: ["OBV (On-Ball Value)", "xA (Expected Assists)", "EPV (Expected Possession Value)", "VAEP (Valuing Actions by Estimating Probabilities)"],
    correctAnswer: "OBV (On-Ball Value)",
    detailES: "El OBV (On-Ball Value) mide cuánto aumenta o disminuye la probabilidad de marcar o encajar un gol con cada acción individual del jugador.",
    detailEN: "OBV (On-Ball Value) measures how much each player action increases or decreases the probability of scoring or conceding a goal.",
    difficulty: "hard"
  },
  // ---- TICTAC ----
  {
    id: "sx-tt-1",
    type: "team",
    category: "tictac",
    questionES: "¿Qué formación táctica utiliza tres centrales, dos carrileros y un pivote doble en el mediocampo?",
    questionEN: "Which tactical formation uses three centre-backs, two wing-backs, and a double pivot in midfield?",
    options: ["3-5-2 / 5-3-2", "4-3-3", "4-4-2 en diamante / 4-4-2 diamond", "4-2-3-1"],
    correctAnswer: "3-5-2 / 5-3-2",
    detailES: "El 3-5-2/5-3-2 emplea tres centrales, dos carrileros que suben y bajan constantemente, y un doble pivote en el centro del campo.",
    detailEN: "The 3-5-2/5-3-2 uses three centre-backs, two wing-backs who constantly overlap, and a double pivot in central midfield.",
    difficulty: "easy"
  },
  {
    id: "sx-tt-2",
    type: "team",
    category: "tictac",
    questionES: "¿Qué concepto táctico describe el movimiento de presión organizada de un equipo para recuperar el balón en campo contrario inmediatamente tras perderlo?",
    questionEN: "Which tactical concept describes an organised pressure movement by a team to recover the ball in the opposition's half immediately after losing it?",
    options: ["Pressing / Gegenpressing", "Bloque bajo / Low block", "Juego de posición / Positional play", "Transición / Transition"],
    correctAnswer: "Pressing / Gegenpressing",
    detailES: "El Gegenpressing o contrapresión es una táctica en la que el equipo presiona agresiva e inmediatamente al rival tras perder el balón.",
    detailEN: "Gegenpressing or counter-pressing is a tactic where the team aggressively and immediately presses opponents after losing possession.",
    difficulty: "medium"
  },
  {
    id: "sx-tt-3",
    type: "team",
    category: "tictac",
    questionES: "¿Qué se entiende por 'juego de posición' (Positional Play) en el contexto táctico moderno del fútbol?",
    questionEN: "What is understood by 'Positional Play' in the modern tactical context of football?",
    options: [
      "Control del balón para crear superioridades posicionales y espacios / Ball control to create positional superiorities and spaces",
      "Defender con un bloque bajo y contraatacar / Defend with a low block and counter-attack",
      "Jugar con muchos jugadores en el área rival / Play with many players in the opponent's box",
      "Uso intensivo de los laterales y las bandas / Intensive use of full-backs and wide areas"
    ],
    correctAnswer: "Control del balón para crear superioridades posicionales y espacios / Ball control to create positional superiorities and spaces",
    detailES: "El Juego de Posición busca el control del balón mediante la creación de superioridades numéricas, posicionales y cualitativas en cada zona del campo.",
    detailEN: "Positional Play seeks ball control through the creation of numerical, positional, and qualitative superiorities in each area of the pitch.",
    difficulty: "medium"
  },
  {
    id: "sx-tt-4",
    type: "player",
    category: "tictac",
    questionES: "¿Qué se llama al jugador que juega como mediocampista central de referencia, encargado de conectar defensa y ataque y organizar el juego?",
    questionEN: "What is the player who plays as a reference central midfielder called, responsible for connecting defence and attack and organising play?",
    options: ["Pivote / Pivot", "Interior / Interior midfielder", "Mediapunta / Attacking midfielder", "Carrilero / Wing-back"],
    correctAnswer: "Pivote / Pivot",
    detailES: "El pivote es el mediocampista defensivo que sirve de ancla del equipo, organizando el juego y protegiendo la zaga.",
    detailEN: "The pivot is the defensive midfielder who anchors the team, organising play and protecting the back line.",
    difficulty: "easy"
  },
  {
    id: "sx-tt-5",
    type: "team",
    category: "tictac",
    questionES: "¿Qué zona del campo se considera crítica en el 'juego de posición' para desorganizar al rival y crear ocasiones de gol?",
    questionEN: "Which area of the pitch is considered critical in 'positional play' to disorganise the opponent and create goalscoring chances?",
    options: ["El espacio entre líneas / The space between lines", "Las bandas / The wide areas", "El área propia / Your own box", "Las esquinas / The corners"],
    correctAnswer: "El espacio entre líneas / The space between lines",
    detailES: "En el juego de posición, el espacio entre las líneas defensiva y media rival es el área clave donde un jugador libre puede recibir y girar.",
    detailEN: "In positional play, the space between the opposition's defensive and midfield lines is the key area where a free player can receive and turn.",
    difficulty: "medium"
  },
  // ---- PHYSIQUE ----
  {
    id: "sx-ph-1",
    type: "player",
    category: "physique",
    questionES: "¿A qué velocidad mínima en km/h se considera que un futbolista está realizando un sprint de alta intensidad según los estándares de análisis de rendimiento?",
    questionEN: "At what minimum speed in km/h is a footballer considered to be performing a high-intensity sprint according to performance analysis standards?",
    options: ["25 km/h", "20 km/h", "30 km/h", "18 km/h"],
    correctAnswer: "25 km/h",
    detailES: "El umbral estándar para clasificar un sprint como de alta intensidad en el fútbol profesional es de 25 km/h.",
    detailEN: "The standard threshold to classify a sprint as high-intensity in professional football is 25 km/h.",
    difficulty: "easy"
  },
  {
    id: "sx-ph-2",
    type: "player",
    category: "physique",
    questionES: "¿Qué posición en el campo recorre en promedio la mayor distancia total durante un partido de fútbol de alto nivel?",
    questionEN: "Which position on the pitch covers the greatest total distance on average during a top-level football match?",
    options: ["Centrocampistas / Midfielders", "Delanteros / Forwards", "Defensas centrales / Centre-backs", "Porteros / Goalkeepers"],
    correctAnswer: "Centrocampistas / Midfielders",
    detailES: "Los centrocampistas son los jugadores que recorren más distancia total en un partido debido a su implicación tanto en ataque como en defensa.",
    detailEN: "Midfielders are the players who cover the most total distance in a match due to their involvement in both attack and defence.",
    difficulty: "easy"
  },
  {
    id: "sx-ph-3",
    type: "player",
    category: "physique",
    questionES: "¿Cuántos kilómetros recorre aproximadamente un centrocampista de élite en un partido de 90 minutos?",
    questionEN: "Approximately how many kilometres does an elite midfielder cover in a 90-minute match?",
    options: ["10-13 km", "5-7 km", "14-16 km", "7-9 km"],
    correctAnswer: "10-13 km",
    detailES: "Un centrocampista de élite recorre entre 10 y 13 kilómetros en un partido, con variaciones según su rol y el sistema táctico.",
    detailEN: "An elite midfielder covers between 10 and 13 kilometres in a match, with variations depending on their role and tactical system.",
    difficulty: "medium"
  },
  {
    id: "sx-ph-4",
    type: "player",
    category: "physique",
    questionES: "¿Qué tecnología de seguimiento físico se utilizó de forma oficial por primera vez en un Mundial para monitorear en tiempo real la posición y velocidad de los jugadores?",
    questionEN: "What physical tracking technology was officially used for the first time in a World Cup to monitor player position and speed in real time?",
    options: ["Semi-Automated Offside Technology (SAOT) con chips en la pelota", "GPS en chalecos / GPS in vests", "Cámaras de alta velocidad / High-speed cameras", "Sensores en las botas / Sensors in boots"],
    correctAnswer: "Semi-Automated Offside Technology (SAOT) con chips en la pelota",
    detailES: "En Qatar 2022, FIFA usó la SAOT junto a chips en el balón y 12 cámaras dedicadas para obtener datos de posición en tiempo real.",
    detailEN: "At Qatar 2022, FIFA used SAOT alongside chips in the ball and 12 dedicated cameras to obtain real-time positional data.",
    difficulty: "hard"
  },
  {
    id: "sx-ph-5",
    type: "player",
    category: "physique",
    questionES: "¿Cuántas acciones de alta intensidad (sprints, aceleraciones, cambios de dirección) puede realizar un futbolista de élite durante un partido profesional?",
    questionEN: "How many high-intensity actions (sprints, accelerations, direction changes) can an elite footballer perform during a professional match?",
    options: ["150-200 acciones / 150-200 actions", "30-50 acciones / 30-50 actions", "500+ acciones / 500+ actions", "10-20 acciones / 10-20 actions"],
    correctAnswer: "150-200 acciones / 150-200 actions",
    detailES: "Un jugador de élite realiza entre 150 y 200 acciones de alta intensidad en un partido de 90 minutos.",
    detailEN: "An elite player performs between 150 and 200 high-intensity actions in a 90-minute match.",
    difficulty: "medium"
  },
  // ---- COACH ----
  {
    id: "sx-co-1",
    type: "team",
    category: "coach",
    questionES: "¿Cuál es el número máximo de sustituciones que permite el reglamento FIFA en un partido oficial de la Copa del Mundo?",
    questionEN: "What is the maximum number of substitutions permitted by FIFA regulations in an official World Cup match?",
    options: ["5 sustituciones / 5 substitutions", "3 sustituciones / 3 substitutions", "6 sustituciones / 6 substitutions", "4 sustituciones / 4 substitutions"],
    correctAnswer: "5 sustituciones / 5 substitutions",
    detailES: "Desde 2022, FIFA permite un máximo de 5 sustituciones por partido en los torneos oficiales.",
    detailEN: "Since 2022, FIFA allows a maximum of 5 substitutions per match in official tournaments.",
    difficulty: "easy"
  },
  {
    id: "sx-co-2",
    type: "team",
    category: "coach",
    questionES: "¿En qué ventana del partido (por minuto) es estadísticamente más frecuente que los entrenadores realicen la primera sustitución en partidos de élite?",
    questionEN: "In which match window (by minute) is it statistically most common for coaches to make their first substitution in elite matches?",
    options: ["Minuto 60-70 / 60th-70th minute", "Minuto 30-45 / 30th-45th minute", "Minuto 80-90 / 80th-90th minute", "Primer tiempo / First half"],
    correctAnswer: "Minuto 60-70 / 60th-70th minute",
    detailES: "Estadísticamente, el rango del minuto 60 al 70 es cuando más entrenadores realizan su primer cambio en partidos de élite.",
    detailEN: "Statistically, the 60th to 70th minute range is when most coaches make their first substitution in elite matches.",
    difficulty: "medium"
  },
  {
    id: "sx-co-3",
    type: "team",
    category: "coach",
    questionES: "¿Qué son los 'duelos aéreos' en el lenguaje del análisis táctico y por qué son importantes en el plan de juego de un entrenador?",
    questionEN: "What are 'aerial duels' in the language of tactical analysis and why are they important in a coach's game plan?",
    options: [
      "Disputas de cabeza por balones altos, claves en centros y balones a largo / Header contests for high balls, key in crosses and long balls",
      "Disputas en el suelo entre dos jugadores / Ground duels between two players",
      "Los duelos entre portero y delantero / Goalkeeper vs forward duels",
      "Disputas por balones divididos en el mediocampo / Duels for divided balls in midfield"
    ],
    correctAnswer: "Disputas de cabeza por balones altos, claves en centros y balones a largo / Header contests for high balls, key in crosses and long balls",
    detailES: "Los duelos aéreos son disputas por balones altos mediante cabezazos, cruciales en situaciones de centro lateral o saques de banda.",
    detailEN: "Aerial duels are disputes for high balls using headers, crucial in crossing situations or throw-ins.",
    difficulty: "easy"
  },
  {
    id: "sx-co-4",
    type: "team",
    category: "coach",
    questionES: "¿Cuántos jugadores puede incluir un equipo en su convocatoria oficial para la Copa del Mundo FIFA 2026?",
    questionEN: "How many players can a team include in their official squad for the FIFA World Cup 2026?",
    options: ["26 jugadores / 26 players", "23 jugadores / 23 players", "30 jugadores / 30 players", "25 jugadores / 25 players"],
    correctAnswer: "26 jugadores / 26 players",
    detailES: "Para el Mundial 2026, FIFA amplió la convocatoria a 26 jugadores por selección, siguiendo el formato adoptado en 2022.",
    detailEN: "For the 2026 World Cup, FIFA expanded the squad list to 26 players per team, following the format adopted in 2022.",
    difficulty: "easy"
  },
  {
    id: "sx-co-5",
    type: "team",
    category: "coach",
    questionES: "¿Qué concepto táctico describe la situación en la que un equipo no defiende en bloque bajo ni presiona alto, sino que espera al rival en campo propio de forma organizada?",
    questionEN: "What tactical concept describes the situation in which a team neither defends in a low block nor presses high, but waits for the opponent in their own half in an organised way?",
    options: ["Bloque medio / Mid-block", "Presión alta / High press", "Bloque bajo / Low block", "Contraataque / Counter-attack"],
    correctAnswer: "Bloque medio / Mid-block",
    detailES: "El bloque medio implica defender organizado en la zona media del campo, sin presionar en extremo alto ni retroceder hasta la propia área.",
    detailEN: "The mid-block means defending in an organised manner in the middle zone of the pitch, without pressing extremely high or retreating to your own penalty area.",
    difficulty: "medium"
  },
  // ---- SCOUTER ----
  {
    id: "sx-sc-1",
    type: "player",
    category: "scouter",
    questionES: "¿Qué métrica utiliza un scouter para evaluar la capacidad de un jugador de recuperar el balón tras una pérdida inmediata?",
    questionEN: "What metric does a scout use to evaluate a player's ability to recover the ball immediately after a loss?",
    options: ["Recuperaciones de Posesión / Possession Regains", "Pases Clave / Key Passes", "Regates Exitosos / Successful Dribbles", "Distancia Total / Total Distance"],
    correctAnswer: "Recuperaciones de Posesión / Possession Regains",
    detailES: "Las 'Recuperaciones de Posesión' (Possession Regains) miden la frecuencia con la que un jugador intercepta o recupera el balón para su equipo.",
    detailEN: "'Possession Regains' measure how frequently a player intercepts or recovers the ball for their team.",
    difficulty: "easy"
  },
  {
    id: "sx-sc-2",
    type: "player",
    category: "scouter",
    questionES: "¿Qué perfil analítico buscaría un scouter en un delantero para un equipo que juega en transición rápida?",
    questionEN: "What analytical profile would a scout look for in a striker for a team that plays in fast transition?",
    options: [
      "Alta velocidad punta y muchas carreras a la espalda de la defensa / High top speed and many runs in behind the defence",
      "Mucha posesión y muchos pases / High possession and many passes",
      "Alta efectividad en el juego aéreo / High effectiveness in aerial play",
      "Gran resistencia y mucha distancia recorrida / Great stamina and lots of distance covered"
    ],
    correctAnswer: "Alta velocidad punta y muchas carreras a la espalda de la defensa / High top speed and many runs in behind the defence",
    detailES: "En un sistema de transición rápida, el scouter prioriza delanteros veloces que aprovechen el espacio a la espalda de la defensa rival.",
    detailEN: "In a fast transition system, scouts prioritise fast strikers who exploit space behind the opposition's back line.",
    difficulty: "medium"
  },
  {
    id: "sx-sc-3",
    type: "player",
    category: "scouter",
    questionES: "¿Qué datos de un portero son más relevantes para un scouter que busca al mejor guardameta del torneo?",
    questionEN: "What goalkeeper data are most relevant to a scout looking for the best goalkeeper of the tournament?",
    options: [
      "Porcentaje de paradas (Save %), xG concedido vs goles reales y salidas al área / Save %, xG conceded vs real goals, and area exits",
      "Distancia recorrida y velocidad máxima / Distance covered and top speed",
      "Pases completados y asistencias / Completed passes and assists",
      "Número de despejes y tarjetas amarillas / Number of clearances and yellow cards"
    ],
    correctAnswer: "Porcentaje de paradas (Save %), xG concedido vs goles reales y salidas al área / Save %, xG conceded vs real goals, and area exits",
    detailES: "Para evaluar a un portero, los scouts analizan el Save%, la diferencia entre xG y goles reales, y su capacidad de salir al área.",
    detailEN: "To evaluate a goalkeeper, scouts analyse Save%, the difference between xG and real goals, and their ability to come off their line.",
    difficulty: "medium"
  },
  {
    id: "sx-sc-4",
    type: "player",
    category: "scouter",
    questionES: "¿Cuál es la posición del campo donde el scouting moderno valora más las métricas de 'pases progresivos' y 'carreras progresivas'?",
    questionEN: "Which position on the pitch does modern scouting value most in terms of 'progressive passes' and 'progressive carries' metrics?",
    options: ["Lateral / Full-back", "Portero / Goalkeeper", "Delantero centro / Centre-forward", "Extremo / Winger"],
    correctAnswer: "Lateral / Full-back",
    detailES: "En el fútbol moderno, los laterales son clave en la construcción del juego, y sus pases y carreras progresivas son métricas muy valoradas por los scouts.",
    detailEN: "In modern football, full-backs are key in build-up play, and their progressive passes and carries are highly valued metrics by scouts.",
    difficulty: "hard"
  },
  {
    id: "sx-sc-5",
    type: "team",
    category: "scouter",
    questionES: "¿Qué indica el índice de 'Duelos Ganados' (% de duelos ganados) sobre el perfil de un jugador desde la perspectiva de un scouter?",
    questionEN: "What does the 'Duels Won' index (% of duels won) indicate about a player's profile from a scout's perspective?",
    options: [
      "Competitividad e intensidad en disputas individuales / Competitiveness and intensity in individual contests",
      "Capacidad goleadora del jugador / Player's goalscoring ability",
      "Nivel técnico en el pase / Technical passing level",
      "Resistencia aeróbica / Aerobic endurance"
    ],
    correctAnswer: "Competitividad e intensidad en disputas individuales / Competitiveness and intensity in individual contests",
    detailES: "Un alto porcentaje de duelos ganados refleja intensidad física, decisión en las disputas y mentalidad competitiva.",
    detailEN: "A high percentage of duels won reflects physical intensity, decision in contests, and a competitive mindset.",
    difficulty: "easy"
  }
];

