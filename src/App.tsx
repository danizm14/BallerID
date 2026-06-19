import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Timer, 
  Users, 
  Share2, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Globe, 
  RotateCcw, 
  Info, 
  User, 
  ChevronRight, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { generateQuizQuestions } from './questionGenerator';
import type { Question } from './questionGenerator';
import { saveResult, fetchLeaderboard, fetchRoomLeaderboard } from './db';

interface RoomPlayer {
  nickname: string;
  score: number;
  completedAt: number;
  correctAnswers: number;
  categoryStats?: Record<string, number>;
}

type QuestionCategory = 'big_data' | 'tictac' | 'physique' | 'coach' | 'scouter';

const ROLE_LABELS: Record<QuestionCategory, { ES: string; EN: string; icon: string }> = {
  big_data: { ES: 'Analista Big Data', EN: 'Big Data Analyst', icon: '📊' },
  tictac:   { ES: 'Gurú del Táctico', EN: 'Tactical Guru', icon: '🎯' },
  physique: { ES: 'Preparador Físico', EN: 'Fitness Coach', icon: '⚡' },
  coach:    { ES: 'El Pizarra / Míster', EN: 'The Tactician / Míster', icon: '📋' },
  scouter:  { ES: 'Especialista Scouter', EN: 'Scouting Specialist', icon: '🔍' },
};


const DEFAULT_GLOBAL_BOTS: RoomPlayer[] = [
  { nickname: "Pep Guardiola", score: 28950, completedAt: Date.now() - 3600000 * 2, correctAnswers: 29 },
  { nickname: "Mikel Arteta", score: 22400, completedAt: Date.now() - 3600000 * 5, correctAnswers: 22 },
  { nickname: "Carlo Ancelotti", score: 18200, completedAt: Date.now() - 3600000 * 12, correctAnswers: 18 },
  { nickname: "Jose Mourinho", score: 13100, completedAt: Date.now() - 3600000 * 24, correctAnswers: 13 },
  { nickname: "Zinedine Zidane", score: 8500, completedAt: Date.now() - 3600000 * 48, correctAnswers: 9 }
];

const DEFAULT_CHAMPION_BOTS: RoomPlayer[] = [
  { nickname: "Pep Guardiola", score: 24200, completedAt: Date.now() - 3600000 * 2, correctAnswers: 25 },
  { nickname: "Mikel Arteta", score: 18400, completedAt: Date.now() - 3600000 * 5, correctAnswers: 20 },
  { nickname: "Carlo Ancelotti", score: 13100, completedAt: Date.now() - 3600000 * 12, correctAnswers: 15 },
  { nickname: "Jose Mourinho", score: 8500, completedAt: Date.now() - 3600000 * 24, correctAnswers: 10 },
  { nickname: "Zinedine Zidane", score: 3900, completedAt: Date.now() - 3600000 * 48, correctAnswers: 5 }
];

export default function App() {
  // Global View States
  const [lang, setLang] = useState<'ES' | 'EN'>('ES');
  const [mode, setMode] = useState<'individual' | 'multiplayer' | 'champion'>('champion');
  const [view, setView] = useState<'welcome' | 'lobby' | 'quiz' | 'results'>('welcome');
  const [roomId, setRoomId] = useState<string>('');
  const [nickname, setNickname] = useState<string>(() => localStorage.getItem('ballerid_nickname') || '');
  const [isDetectedRoom, setIsDetectedRoom] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const quizStartTimeRef = useRef<number>(0);
  
  // Save nickname to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ballerid_nickname', nickname);
  }, [nickname]);
  
  // Leaderboards
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<RoomPlayer[]>([]);
  const [championPlayers, setChampionPlayers] = useState<RoomPlayer[]>([]);
  
  // Wildcards
  const [wildcardUsed, setWildcardUsed] = useState<'var' | 'prorroga' | null>(null);
  const [removedOptions, setRemovedOptions] = useState<string[]>([]);

  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  // Quiz States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});

  // High-precision Timer States
  const [timeLeft, setTimeLeft] = useState<number>(15); // visual seconds
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const timeTakenRef = useRef<number>(0); // high resolution seconds taken

  // Phase transitions
  const [transitionPhase, setTransitionPhase] = useState<string | null>(null);
  const [transitionSecLeft, setTransitionSecLeft] = useState<number>(3);

  // Translations
  const t = {
    ES: {
      title: "BallerID",
      subtitle: "Control de Pasaportes y Rendimiento FIFA",
      tagline: "El quiz definitivo sobre analítica avanzada de fútbol y métricas FIFA.",
      modeInd: "Desafío Individual (Muerte Súbita)",
      modeMult: "Multijugador (Salas)",
      modeChamp: "Campeonato Mundial",
      modeChampHeader: "¿Crees que puedes ser el pizarrita que se proclame campeón mundial?",
      startChampion: "Iniciar Campeonato",
      champRulesTitle: "Manual del Campeón Mundial",
      champRule1: "Cada 5 preguntas correctas subes de fase (Grupos -> Octavos -> Cuartos -> Semifinal -> Final).",
      champRule2: "El tiempo límite disminuye en cada fase (15s -> 12s -> 10s -> 8s -> 6s).",
      champRule3: "La dificultad de las preguntas aumenta en cada fase.",
      champRule4: "Tienes un único comodín por partida: VAR (descarta 2 incorrectas) o Prórroga (+15 segundos).",
      wildcardLabel: "Comodines Disponibles (1 uso por partida)",
      varName: "VAR",
      varDesc: "Descarta 2 incorrectas",
      prorrogaName: "Prórroga",
      prorrogaDesc: "+15s de tiempo",
      championLeaderboard: "Historial de Campeones Mundiales",
      phaseCol: "Fase Alcanzada",
      victoryMsg: "¡CAMPEÓN MUNDIAL! Has superado todas las fases del torneo y levantado la Copa.",
      defeatMsg: "¡ELIMINADO! Has caído en la fase del torneo.",
      createRoom: "Generar Nueva Sala",
      joinRoom: "Unirse a Sala",
      enterNickname: "Escribe tu Apodo",
      nicknamePlaceholder: "Ej. Xavi6",
      nicknameRequired: "El apodo debe tener entre 2 y 15 caracteres.",
      roomIdRequired: "El ID de la sala es obligatorio.",
      lobbyTitle: "Sala de Embarque",
      roomIdLabel: "ID de Sala",
      shareLobbyMsg: "Comparte este enlace de visa con tus amigos. Hasta 20 jugadores pueden unirse.",
      copyLink: "Copiar Enlace de Sala",
      linkCopied: "¡Enlace copiado al portapapeles!",
      startQuiz: "Iniciar Análisis (10 Preguntas)",
      startIndividual: "Iniciar Muerte Súbita (Hasta 100 Preguntas)",
      playersInRoom: "Pasaportes Registrados en Sala",
      globalLeaderboard: "Clasificación General de Pizarritas",
      scoreCol: "Puntos",
      dateCol: "Fecha de Vuelo",
      noPlayersYet: "Ningún jugador ha completado el análisis todavía. ¡Sé el primero!",
      pizarritaTag: "El Pizarrita",
      tacticianTag: "The Tactician",
      questionCounter: "Análisis de Datos",
      timeRemaining: "Tiempo Restante",
      secondsShort: "s",
      nextQuestion: "Siguiente Pregunta",
      finishQuiz: "Finalizar Análisis",
      correctStamp: "APROBADO",
      incorrectStamp: "DENEGADO",
      timeExpired: "TIEMPO AGOTADO",
      correctAnswer: "Respuesta correcta:",
      yourScore: "Tu Puntuación",
      finalScoreMsg: "Has completado tu análisis en el catálogo FIFA.",
      gameOverMsg: "¡ELIMINADO! Has fallado una pregunta y tu pasaporte ha sido denegado.",
      accuracy: "Aciertos",
      correctCountLabel: "correctas",
      aciertosLabel: "aciertos",
      congratsPizarrita: "¡Enhorabuena! Has obtenido la visa de oro 'El Pizarrita'.",
      keepTrying: "Sigue analizando métricas para arrebatarle la pizarra al líder.",
      playAgain: "Jugar de Nuevo",
      viewLobby: "Volver a la Sala",
      viewMainMenu: "Volver al Menú",
      speedBonus: "Bono de velocidad",
      rulesTitle: "Manual del entrenador FIFA",
      rule1: "Preguntas dinámicas basadas en métricas reales de todo el torneo (centros, pases, velocidad, xG).",
      rule2: "Límite estricto de 15 segundos por pregunta.",
      rule3: "Puntuación = 500 base + Bono de velocidad (hasta 500 extra por responder rápido).",
      rule4: "En Muerte Súbita, si fallas una sola pregunta la partida termina de inmediato.",
      modeMultDesc: "Genera una sala única y comparte el enlace. Tus amigos podrán unirse en cualquier momento y competir en la tabla de clasificación exclusiva de esa sala."
    },
    EN: {
      title: "BallerID",
      subtitle: "FIFA Performance Passport Control",
      tagline: "The ultimate quiz on advanced football analytics and FIFA metrics.",
      modeInd: "Single Player (Sudden Death)",
      modeMult: "Multiplayer (Rooms)",
      modeChamp: "World Championship",
      modeChampHeader: "Do you think you can be the tactician crowned World Champion?",
      startChampion: "Start Championship",
      champRulesTitle: "World Champion Handbook",
      champRule1: "Every 5 correct answers you advance in phase (Groups -> Last 16 -> Quarters -> Semis -> Final).",
      champRule2: "The time limit decreases in each phase (15s -> 12s -> 10s -> 8s -> 6s).",
      champRule3: "The difficulty of the questions increases in each phase.",
      champRule4: "You have a single wildcard per game: VAR (excludes 2 incorrect) or Extra Time (+15 seconds).",
      wildcardLabel: "Available Wildcards (1 use per game)",
      varName: "VAR",
      varDesc: "Excludes 2 incorrect options",
      prorrogaName: "Extra Time",
      prorrogaDesc: "+15s of extra time",
      championLeaderboard: "World Champions Leaderboard",
      phaseCol: "Phase Reached",
      victoryMsg: "WORLD CHAMPION! You have passed all tournament phases and lifted the Cup.",
      defeatMsg: "ELIMINATED! You fell during the tournament stage.",
      createRoom: "Generate New Room",
      joinRoom: "Join Room",
      enterNickname: "Enter Your Nickname",
      nicknamePlaceholder: "e.g. PepClassic",
      nicknameRequired: "Nickname must be between 2 and 15 characters.",
      roomIdRequired: "Room ID is required.",
      lobbyTitle: "Boarding Gate",
      roomIdLabel: "Room ID",
      shareLobbyMsg: "Share this visa link with your friends. Up to 20 players can join.",
      copyLink: "Copy Room Link",
      linkCopied: "Link copied to clipboard!",
      startQuiz: "Start Analysis (10 Questions)",
      startIndividual: "Start Sudden death",
      playersInRoom: "Registered Passports in Room",
      globalLeaderboard: "Global Leaderboard of Tacticians",
      scoreCol: "Points",
      dateCol: "Flight Date",
      noPlayersYet: "No players have completed the analysis yet. Be the first!",
      pizarritaTag: "El Pizarrita",
      tacticianTag: "The Tactician",
      questionCounter: "Data Analysis",
      timeRemaining: "Time Remaining",
      secondsShort: "s",
      nextQuestion: "Next Question",
      finishQuiz: "Finish Analysis",
      correctStamp: "APPROVED",
      incorrectStamp: "DENIED",
      timeExpired: "TIME EXPIRED",
      correctAnswer: "Correct answer:",
      yourScore: "Your Score",
      finalScoreMsg: "You have completed your analysis of the FIFA catalogue.",
      gameOverMsg: "ELIMINATED! You missed a question and your passport was denied.",
      accuracy: "Accuracy",
      correctCountLabel: "correct",
      aciertosLabel: "correct",
      congratsPizarrita: "Congratulations! You have obtained the gold visa 'The Tactician'.",
      keepTrying: "Keep analyzing metrics to steal the clipboard from the leader.",
      playAgain: "Play Again",
      viewLobby: "Return to Lobby",
      viewMainMenu: "Return to Menu",
      speedBonus: "Speed bonus",
      rulesTitle: "FIFA Coach Handbook",
      rule1: "Dynamic questions based on real stats across all teams (crosses, passes, speed, xG).",
      rule2: "Strict 15-second time limit per question.",
      rule3: "Score = 500 base + Speed bonus (up to 500 extra for answering quickly).",
      rule4: "In Sudden Death, if you miss a single question the game ends immediately.",
      modeMultDesc: "Generate a unique room and share the link. Your friends can join at any time and compete in that room's exclusive leaderboard."
    }
  };

  // URL Query Parameter Checking & Leaderboard Sync on Mount
  useEffect(() => {
    // Load global leaderboard
    loadGlobalLeaderboard();
    loadChampionLeaderboard();

    const params = new URLSearchParams(window.location.search);
    const rId = params.get('roomId');
    if (rId) {
      const upperRoomId = rId.toUpperCase();
      setMode('multiplayer');
      setRoomId(upperRoomId);
      setIsDetectedRoom(true);

      const savedNickname = localStorage.getItem('ballerid_nickname') || '';
      if (savedNickname.trim().length >= 2 && savedNickname.trim().length <= 15) {
        // Auto-join lobby on refresh if nickname is already present
        loadRoomPlayers(upperRoomId);
        setView('lobby');
      } else {
        loadRoomPlayers(upperRoomId);
      }
    }
  }, []);

  // Poll Room Leaderboard every 5 seconds in multiplayer mode when in lobby or results views
  useEffect(() => {
    if (mode !== 'multiplayer' || !roomId || (view !== 'lobby' && view !== 'results')) return;

    // Load immediately when entering view
    loadRoomPlayers(roomId);

    const interval = setInterval(() => {
      loadRoomPlayers(roomId);
    }, 5000);

    return () => clearInterval(interval);
  }, [mode, roomId, view]);

  // Auto-dismiss transition overlay
  useEffect(() => {
    if (!transitionPhase) return;
    setTransitionSecLeft(3);

    const interval = window.setInterval(() => {
      setTransitionSecLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDismissTransition();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [transitionPhase]);

  const handleDismissTransition = () => {
    setTransitionPhase(null);
    setCurrentIdx(prev => {
      const nextIdx = prev + 1;
      setSelectedOpt(null);
      setIsAnswered(false);
      resetAndStartTimer('champion', correctCount);
      return nextIdx;
    });
  };

  const downloadCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgImage = new Image();
    const logoImage = new Image();

    let loadedCount = 0;
    const onImageLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        drawEverything();
      }
    };

    bgImage.src = '/championship_card_bg.png';
    bgImage.onload = onImageLoaded;

    logoImage.src = '/logo.jpg';
    logoImage.onload = onImageLoaded;

    const drawEverything = () => {
      // Draw background
      ctx.drawImage(bgImage, 0, 0, 600, 800);

      // Gold border frame
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 8;
      ctx.strokeRect(15, 15, 570, 770);
      
      ctx.strokeStyle = 'rgba(253, 251, 247, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, 540, 740);

      // Draw logo in the top center
      const logoWidth = 70;
      const logoHeight = 70;
      const logoX = 300 - logoWidth / 2;
      const logoY = 45;

      ctx.save();
      ctx.beginPath();
      ctx.arc(300, logoY + logoHeight / 2, logoWidth / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
      ctx.restore();

      // Golden ring around the logo
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(300, logoY + logoHeight / 2, logoWidth / 2, 0, Math.PI * 2);
      ctx.stroke();

      // 1. Title Principal: "CERTIFICADO DE RECONOCIMIENTO"
      ctx.fillStyle = '#D4AF37'; 
      ctx.font = '900 24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFICADO DE RECONOCIMIENTO', 300, 160);

      // 2. Apodo del Jugador (large)
      ctx.fillStyle = '#fdfbf7'; 
      ctx.font = '900 36px Outfit';
      ctx.fillText(nickname.toUpperCase(), 300, 210);

      // 3. Condicional de Modo
      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 12px Inter';
      let modeText = '';
      if (mode === 'individual') {
        modeText = 'Modo: Récord Personal';
      } else if (mode === 'champion') {
        modeText = 'Modo: Torneo Oficial (CHAMPIONSHIP)';
      } else {
        modeText = 'Modo: Sala Multijugador';
      }
      ctx.fillText(modeText.toUpperCase(), 300, 235);

      // Divider
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(200, 260);
      ctx.lineTo(400, 260);
      ctx.stroke();

      // 4. Bloque Central: Texto explicativo
      ctx.fillStyle = '#fdfbf7'; 
      ctx.font = '400 13px Inter';
      ctx.fillText('Por su destacada participación en el modo de juego', 300, 295);
      
      let detailGameText = '';
      if (mode === 'champion') {
        detailGameText = 'Torneo Oficial (CHAMPIONSHIP) en la plataforma BallerID';
      } else if (mode === 'individual') {
        detailGameText = 'Muerte Súbita (Récord Personal) en la plataforma BallerID';
      } else {
        detailGameText = 'Multijugador (Sala de Competencia) en la plataforma BallerID';
      }
      ctx.fillText(detailGameText, 300, 315);

      // 5. Bloque de Métricas
      // Puntuación obtenida (gold or star if top 1)
      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 16px Outfit';
      const mvpStar = isTopPlayer ? ' ⭐ ¡MVP de la Partida!' : '';
      ctx.fillText(`PUNTUACIÓN OBTENIDA: ${score.toLocaleString()} PTOS.${mvpStar}`, 300, 385);

      // Rol de Especialidad
      if (Object.keys(categoryStats).length > 0) {
        const role = calculateSpecialtyRole(categoryStats);
        const roleInfo = ROLE_LABELS[role];
        ctx.fillStyle = '#fdfbf7';
        ctx.font = '700 16px Outfit';
        ctx.fillText(`ROL ESPECIALIDAD: ${roleInfo.icon} ${(lang === 'ES' ? roleInfo.ES : roleInfo.EN).toUpperCase()}`, 300, 425);
      }

      // Tiempo de juego y precisión
      ctx.fillStyle = '#fdfbf7';
      ctx.font = '500 13px Inter';
      const precisionText = `${correctCount}/${mode === 'champion' ? '25' : mode === 'individual' ? '100' : '10'}`;
      ctx.fillText(`TIEMPO DE JUEGO: ${elapsedTime}S    •    PRECISIÓN: ${precisionText}`, 300, 465);

      // License ID
      ctx.fillStyle = 'rgba(253, 251, 247, 0.4)';
      ctx.font = '10px Inter';
      ctx.fillText(`LICENCIA B-ID: BRD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`, 300, 520);

      // 6. Bloque Inferior
      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 12px Inter';
      
      // Fecha a la izquierda
      ctx.textAlign = 'left';
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      ctx.fillText(`FECHA: ${day}/${month}/${year}`, 50, 730);

      // Firma Autorizada a la derecha
      ctx.textAlign = 'right';
      ctx.fillText('FIRMA DIGITAL AUTORIZADA', 550, 730);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ballerid_certificate_${nickname}.png`;
      link.href = dataUrl;
      link.click();
    };
  };

  const mergeLeaderboards = (cloud: RoomPlayer[], localOrBots: RoomPlayer[]): RoomPlayer[] => {
    const seen = new Map<string, RoomPlayer>();
    for (const item of localOrBots) {
      seen.set(item.nickname.toLowerCase(), item);
    }
    for (const item of cloud) {
      const key = item.nickname.toLowerCase();
      if (!seen.has(key) || item.score > seen.get(key)!.score) {
        seen.set(key, item);
      }
    }
    return Array.from(seen.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  };

  // Sync Room Leaderboard
  const loadRoomPlayers = async (rId: string) => {
    const cloudEntries = await fetchRoomLeaderboard(rId);
    const allRooms = JSON.parse(localStorage.getItem('ballerid_rooms') || '{}');
    const localBoard = allRooms[rId] || [];
    const merged = mergeLeaderboards(cloudEntries as RoomPlayer[], localBoard);
    
    // Cache merged version back to local
    allRooms[rId] = merged;
    localStorage.setItem('ballerid_rooms', JSON.stringify(allRooms));
    setRoomPlayers(merged);
  };

  // Load Global Leaderboard
  const loadGlobalLeaderboard = async () => {
    const cloudEntries = await fetchLeaderboard('individual');
    const globalBoard = localStorage.getItem('ballerid_global_leaderboard');
    const localBoard = globalBoard ? JSON.parse(globalBoard) : [];
    const merged = mergeLeaderboards(cloudEntries as RoomPlayer[], localBoard.length > 0 ? localBoard : DEFAULT_GLOBAL_BOTS);
    
    localStorage.setItem('ballerid_global_leaderboard', JSON.stringify(merged));
    setGlobalPlayers(merged);
  };

  // Load Champion Leaderboard
  const loadChampionLeaderboard = async () => {
    const cloudEntries = await fetchLeaderboard('champion');
    const board = localStorage.getItem('ballerid_champion_leaderboard');
    const localBoard = board ? JSON.parse(board) : [];
    const merged = mergeLeaderboards(cloudEntries as RoomPlayer[], localBoard.length > 0 ? localBoard : DEFAULT_CHAMPION_BOTS);
    
    localStorage.setItem('ballerid_champion_leaderboard', JSON.stringify(merged));
    setChampionPlayers(merged);
  };

  const handleStartIndividual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || nickname.length < 2 || nickname.length > 15) {
      setValidationError(t[lang].nicknameRequired);
      return;
    }
    setValidationError('');
    startQuiz(100, 'individual');
  };

  const handleStartChampion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || nickname.length < 2 || nickname.length > 15) {
      setValidationError(t[lang].nicknameRequired);
      return;
    }
    setValidationError('');
    startQuiz(25, 'champion');
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || nickname.length < 2 || nickname.length > 15) {
      setValidationError(t[lang].nicknameRequired);
      return;
    }
    setValidationError('');
    
    // Generate Room ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = 'BRD-';
    for (let i = 0; i < 5; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(randomCode);
    
    // Set query param
    const newUrl = `${window.location.origin}${window.location.pathname}?roomId=${randomCode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // Save initial room structure with creator registered as score -1
    const allRooms = JSON.parse(localStorage.getItem('ballerid_rooms') || '{}');
    const newEntry: RoomPlayer = {
      nickname: nickname.trim(),
      score: -1,
      completedAt: Date.now(),
      correctAnswers: 0
    };
    allRooms[randomCode] = [newEntry];
    localStorage.setItem('ballerid_rooms', JSON.stringify(allRooms));
    setRoomPlayers([newEntry]);

    // Save registration score to Supabase (async)
    saveResult({
      nickname: nickname.trim(),
      score: -1,
      mode: 'multiplayer',
      correctAnswers: 0,
      roomId: randomCode,
      completedAt: Date.now()
    }).then(() => {
      loadRoomPlayers(randomCode);
    });

    setView('lobby');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || nickname.length < 2 || nickname.length > 15) {
      setValidationError(t[lang].nicknameRequired);
      return;
    }
    if (!roomId.trim()) {
      setValidationError(t[lang].roomIdRequired);
      return;
    }
    setValidationError('');
    const cleanRoomId = roomId.trim().toUpperCase();
    setRoomId(cleanRoomId);

    // Set query param
    const newUrl = `${window.location.origin}${window.location.pathname}?roomId=${cleanRoomId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // Save player score as -1 in local rooms to represent "joined but not finished"
    const allRooms = JSON.parse(localStorage.getItem('ballerid_rooms') || '{}');
    const players: RoomPlayer[] = allRooms[cleanRoomId] || [];
    const existingIdx = players.findIndex(p => p.nickname.toLowerCase() === nickname.toLowerCase());
    const newEntry: RoomPlayer = {
      nickname: nickname.trim(),
      score: -1,
      completedAt: Date.now(),
      correctAnswers: 0
    };
    if (existingIdx !== -1) {
      // Keep existing score if they already played and have a score >= 0
      if (players[existingIdx].score < 0) {
        players[existingIdx] = newEntry;
      }
    } else {
      players.push(newEntry);
    }
    allRooms[cleanRoomId] = players;
    localStorage.setItem('ballerid_rooms', JSON.stringify(allRooms));

    // Save registration score to Supabase (async)
    saveResult({
      nickname: nickname.trim(),
      score: -1,
      mode: 'multiplayer',
      correctAnswers: 0,
      roomId: cleanRoomId,
      completedAt: Date.now()
    }).then(() => {
      loadRoomPlayers(cleanRoomId);
    });

    setView('lobby');
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?roomId=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
    });
  };

  const getPhaseTimeLimit = (count: number, currentMode: 'individual' | 'multiplayer' | 'champion' = mode) => {
    if (currentMode !== 'champion') return 15;
    if (count < 5) return 15;      // Group Stage
    if (count < 10) return 12;     // Round of 16
    if (count < 15) return 10;     // Quarter-finals
    if (count < 20) return 8;      // Semi-finals
    return 6;                      // Final
  };

  const getPhaseName = (count: number) => {
    if (count < 5) return lang === 'ES' ? 'Fase de Grupos' : 'Group Stage';
    if (count < 10) return lang === 'ES' ? 'Octavos de Final' : 'Round of 16';
    if (count < 15) return lang === 'ES' ? 'Cuartos de Final' : 'Quarter-finals';
    if (count < 20) return lang === 'ES' ? 'Semifinal' : 'Semi-finals';
    if (count < 25) return lang === 'ES' ? 'Final' : 'Final';
    return lang === 'ES' ? 'Campeón Mundial' : 'World Champion';
  };

  const getPhaseReachedLabel = (count: number) => {
    if (count >= 25) return lang === 'ES' ? '🥇 Campeón' : '🥇 Champion';
    if (count >= 20) return lang === 'ES' ? '🥈 Final' : '🥈 Final';
    if (count >= 15) return lang === 'ES' ? '🥉 Semifinal' : '🥉 Semifinal';
    if (count >= 10) return lang === 'ES' ? 'Cuartos' : 'Quarter-finals';
    if (count >= 5) return lang === 'ES' ? 'Octavos' : 'Round of 16';
    return lang === 'ES' ? 'Grupos' : 'Group Stage';
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Start Quiz (count: 20 for MP, 100 for SP, 25 for Championship)
  const startQuiz = (count: number, forceMode?: 'individual' | 'multiplayer' | 'champion') => {
    const activeMode = forceMode || mode;
    setMode(activeMode);
    
    let generated: Question[] = [];
    if (activeMode === 'champion') {
      // Build exactly 25 questions with increasing difficulty
      // Retrieve a large pool to select from
      const largePool = generateQuizQuestions(150);
      const easy = largePool.filter(q => q.difficulty === 'easy');
      const medium = largePool.filter(q => q.difficulty === 'medium');
      const hard = largePool.filter(q => q.difficulty === 'hard');
      
      const shufEasy = shuffleArray(easy);
      const shufMed = shuffleArray(medium);
      const shufHard = shuffleArray(hard);
      
      // Group Stage (0-4): 5 Easy
      const g1 = shufEasy.slice(0, 5);
      
      // Round of 16 (5-9): 2 Easy + 3 Medium
      const g2 = [...shufEasy.slice(5, 7), ...shufMed.slice(0, 3)];
      
      // Quarter-finals (10-14): 5 Medium
      const g3 = shufMed.slice(3, 8);
      
      // Semi-finals (15-19): 2 Medium + 3 Hard
      const g4 = [...shufMed.slice(8, 10), ...shufHard.slice(0, 3)];
      
      // Final (20-24): 5 Hard
      const g5 = shufHard.slice(3, 8);
      
      generated = [...g1, ...g2, ...g3, ...g4, ...g5];
      if (generated.length < 25) {
        const fallback = generateQuizQuestions(25);
        generated = generated.concat(fallback).slice(0, 25);
      }
    } else {
      generated = generateQuizQuestions(count);
    }

    setQuestions(generated);
    setCurrentIdx(0);
    setScore(0);
    setCorrectCount(0);
    setCategoryStats({});
    setSelectedOpt(null);
    setIsAnswered(false);
    setWildcardUsed(null);
    setRemovedOptions([]);
    setView('quiz');
    resetAndStartTimer(activeMode, 0);
    quizStartTimeRef.current = performance.now();
  };

  const handleUseVar = () => {
    if (wildcardUsed !== null || isAnswered || !activeQuestion) return;
    setWildcardUsed('var');
    const incorrectOptions = activeQuestion.options.filter(o => o !== activeQuestion.correctAnswer);
    const toRemove = shuffleArray(incorrectOptions).slice(0, 2);
    setRemovedOptions(toRemove);
  };

  const handleUseProrroga = () => {
    if (wildcardUsed !== null || isAnswered) return;
    setWildcardUsed('prorroga');
    startTimeRef.current += 15000;
    
    const limit = getPhaseTimeLimit(correctCount, mode);
    const elapsedMs = performance.now() - startTimeRef.current;
    const secondsLeft = Math.max(0, limit - elapsedMs / 1000);
    setTimeLeft(parseFloat(secondsLeft.toFixed(1)));
  };

  // Timer Management
  const resetAndStartTimer = (currentMode: 'individual' | 'multiplayer' | 'champion' = mode, currentCorrectCount: number = correctCount) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setRemovedOptions([]); // Clear any VAR choices for the new question
    const limit = getPhaseTimeLimit(currentCorrectCount, currentMode);
    setTimeLeft(limit);
    startTimeRef.current = performance.now();
    
    timerIntervalRef.current = window.setInterval(() => {
      const elapsedMs = performance.now() - startTimeRef.current;
      const secondsLeft = Math.max(0, limit - elapsedMs / 1000);
      setTimeLeft(parseFloat(secondsLeft.toFixed(1)));
      
      if (secondsLeft <= 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        handleTimeExpired();
      }
    }, 100);
  };

  const stopTimer = (currentMode: 'individual' | 'multiplayer' | 'champion' = mode, currentCorrectCount: number = correctCount) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    const limit = getPhaseTimeLimit(currentCorrectCount, currentMode);
    const elapsedMs = performance.now() - startTimeRef.current;
    timeTakenRef.current = Math.min(limit, elapsedMs / 1000);
  };

  const handleTimeExpired = () => {
    const limit = getPhaseTimeLimit(correctCount, mode);
    timeTakenRef.current = limit;
    setSelectedOpt(null);
    setIsAnswered(true);
  };

  const selectOption = (opt: string) => {
    if (isAnswered) return;
    stopTimer(mode, correctCount);
    setSelectedOpt(opt);
    setIsAnswered(true);

    const question = questions[currentIdx];
    const isCorrect = opt === question.correctAnswer;

    if (isCorrect) {
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);
      const limit = getPhaseTimeLimit(correctCount, mode);
      const bonus = ((limit - timeTakenRef.current) / limit) * 500;
      const questionPoints = Math.round(500 + Math.max(0, bonus));
      setScore(prev => prev + questionPoints);

      // Track category stats
      if (question.category) {
        setCategoryStats(prev => ({
          ...prev,
          [question.category]: (prev[question.category] || 0) + 1
        }));
      }
    }
  };

  const calculateSpecialtyRole = (stats: Record<string, number>): QuestionCategory => {
    const cats: QuestionCategory[] = ['big_data', 'tictac', 'physique', 'coach', 'scouter'];
    let best: QuestionCategory = 'big_data';
    let bestCount = -1;
    for (const cat of cats) {
      const c = stats[cat] || 0;
      if (c > bestCount) { bestCount = c; best = cat; }
    }
    return best;
  };

  const nextQuestion = () => {
    const question = questions[currentIdx];
    const isCorrect = selectedOpt === question.correctAnswer;

    if (mode === 'individual') {
      if (!isCorrect) {
        finishIndividualQuiz();
        return;
      }
      
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setSelectedOpt(null);
        setIsAnswered(false);
        resetAndStartTimer(mode, correctCount);
      } else {
        finishIndividualQuiz();
      }
    } else if (mode === 'champion') {
      if (!isCorrect) {
        finishChampionQuiz();
        return;
      }
      
      if (currentIdx < questions.length - 1) {
        if (correctCount % 5 === 0 && correctCount > 0 && correctCount < 25) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setTransitionPhase(getPhaseName(correctCount));
          return;
        }

        setCurrentIdx(prev => prev + 1);
        setSelectedOpt(null);
        setIsAnswered(false);
        resetAndStartTimer(mode, correctCount);
      } else {
        finishChampionQuiz();
      }
    } else {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setSelectedOpt(null);
        setIsAnswered(false);
        resetAndStartTimer(mode, correctCount);
      } else {
        finishMultiplayerQuiz();
      }
    }
  };

  const finishIndividualQuiz = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    const elapsed = Math.round((performance.now() - quizStartTimeRef.current) / 1000);
    setElapsedTime(elapsed);

    const newEntry: RoomPlayer = {
      nickname: nickname.trim(),
      score: score,
      completedAt: Date.now(),
      correctAnswers: correctCount,
      categoryStats
    };

    // Save score to Global Leaderboard (Optimistic local)
    const globalBoard: RoomPlayer[] = JSON.parse(localStorage.getItem('ballerid_global_leaderboard') || '[]');
    const existingIdx = globalBoard.findIndex(p => p.nickname.toLowerCase() === nickname.toLowerCase());
    if (existingIdx !== -1) {
      if (score > globalBoard[existingIdx].score) {
        globalBoard[existingIdx] = newEntry;
      }
    } else {
      globalBoard.push(newEntry);
    }
    globalBoard.sort((a, b) => b.score - a.score);
    const limitedGlobal = globalBoard.slice(0, 20);
    localStorage.setItem('ballerid_global_leaderboard', JSON.stringify(limitedGlobal));
    setGlobalPlayers(limitedGlobal);

    // Async save & sync to Supabase
    saveResult({
      nickname: newEntry.nickname,
      score: newEntry.score,
      mode: 'individual',
      correctAnswers: newEntry.correctAnswers,
      categoryStats: newEntry.categoryStats,
      completedAt: newEntry.completedAt
    }).then(() => {
      loadGlobalLeaderboard();
    });

    setView('results');
  };

  const finishChampionQuiz = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    const elapsed = Math.round((performance.now() - quizStartTimeRef.current) / 1000);
    setElapsedTime(elapsed);

    const newEntry: RoomPlayer = {
      nickname: nickname.trim(),
      score: score,
      completedAt: Date.now(),
      correctAnswers: correctCount,
      categoryStats
    };

    // Save score to Champion Leaderboard (Optimistic local)
    const championBoard: RoomPlayer[] = JSON.parse(localStorage.getItem('ballerid_champion_leaderboard') || '[]');
    const existingIdx = championBoard.findIndex(p => p.nickname.toLowerCase() === nickname.toLowerCase());
    if (existingIdx !== -1) {
      if (score > championBoard[existingIdx].score) {
        championBoard[existingIdx] = newEntry;
      }
    } else {
      championBoard.push(newEntry);
    }
    championBoard.sort((a, b) => b.score - a.score);
    const limitedChampion = championBoard.slice(0, 20);
    localStorage.setItem('ballerid_champion_leaderboard', JSON.stringify(limitedChampion));
    setChampionPlayers(limitedChampion);

    // Async save & sync to Supabase
    saveResult({
      nickname: newEntry.nickname,
      score: newEntry.score,
      mode: 'champion',
      correctAnswers: newEntry.correctAnswers,
      phaseReached: getPhaseReachedLabel(correctCount),
      categoryStats: newEntry.categoryStats,
      completedAt: newEntry.completedAt
    }).then(() => {
      loadChampionLeaderboard();
    });

    setView('results');
  };

  const finishMultiplayerQuiz = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    const elapsed = Math.round((performance.now() - quizStartTimeRef.current) / 1000);
    setElapsedTime(elapsed);

    const newEntry: RoomPlayer = {
      nickname: nickname.trim(),
      score: score,
      completedAt: Date.now(),
      correctAnswers: correctCount,
      categoryStats
    };

    // Save player score to Room ranking (Optimistic local)
    const allRooms = JSON.parse(localStorage.getItem('ballerid_rooms') || '{}');
    const players: RoomPlayer[] = allRooms[roomId] || [];
    const existingIdx = players.findIndex(p => p.nickname.toLowerCase() === nickname.toLowerCase());
    if (existingIdx !== -1) {
      if (score > players[existingIdx].score) {
        players[existingIdx] = newEntry;
      }
    } else {
      players.push(newEntry);
    }
    players.sort((a, b) => b.score - a.score);
    const limitedPlayers = players.slice(0, 20);
    allRooms[roomId] = limitedPlayers;
    localStorage.setItem('ballerid_rooms', JSON.stringify(allRooms));
    setRoomPlayers(limitedPlayers);

    // Async save & sync to Supabase
    saveResult({
      nickname: newEntry.nickname,
      score: newEntry.score,
      mode: 'multiplayer',
      correctAnswers: newEntry.correctAnswers,
      roomId: roomId,
      categoryStats: newEntry.categoryStats,
      completedAt: newEntry.completedAt
    }).then(() => {
      loadRoomPlayers(roomId);
    });

    setView('results');
  };

  const handlePlayAgain = () => {
    startQuiz(mode === 'individual' ? 100 : mode === 'champion' ? 25 : 10);
  };

  const handleExitToWelcome = () => {
    // Reset room query param
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    setRoomId('');
    setIsDetectedRoom(false);
    setView('welcome');
  };

  const activeQuestion = questions[currentIdx];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(lang === 'ES' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine if this user is the top player "El Pizarrita" / "The Tactician"
  const getIsTop = () => {
    if (mode === 'individual') {
      return globalPlayers.length > 0 && globalPlayers[0].nickname.toLowerCase() === nickname.toLowerCase();
    } else {
      return roomPlayers.length > 0 && roomPlayers[0].nickname.toLowerCase() === nickname.toLowerCase();
    }
  };
  const isTopPlayer = getIsTop();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-brand-cream text-brand-wine selection:bg-brand-wine selection:text-brand-cream ink-distress">
      {/* HEADER */}
      <header className="w-full max-w-5xl mx-auto px-4 py-6 flex items-center justify-between border-b border-brand-border">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleExitToWelcome}>
          <img src="/logo.jpg" alt="BallerID Logo" className="w-14 h-14 rounded-full border border-brand-wine object-cover scale-95" />
          <div>
            <h1 className="text-2xl font-bold font-serif leading-tight tracking-wider" id="main-title">
              {t[lang].title}
            </h1>
            <p className="text-xs uppercase tracking-widest text-brand-wine/70 font-sans">
              {t[lang].subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {roomId && mode === 'multiplayer' && (
            <div className="hidden sm:flex items-center gap-2 border border-brand-border rounded px-3 py-1 bg-brand-cream/50">
              <span className="text-xs font-serif uppercase tracking-wider text-brand-wine/70">{t[lang].roomIdLabel}:</span>
              <span className="font-mono text-sm font-bold tracking-wider">{roomId}</span>
            </div>
          )}
          
          <button 
            type="button"
            id="lang-toggle-btn"
            onClick={() => setLang(lang === 'ES' ? 'EN' : 'ES')}
            className="flex items-center gap-1 text-xs border border-brand-wine/40 hover:border-brand-wine rounded px-3 py-1.5 transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-bold">{lang === 'ES' ? 'ENGLISH' : 'ESPAÑOL'}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col items-center justify-center">
        
        {/* VIEW 1: WELCOME SCREEN WITH MODE TABS */}
        {view === 'welcome' && (
          <div className="w-full max-w-3xl flex flex-col items-center">
            
            <div className="w-20 h-20 rounded-full border border-brand-wine overflow-hidden mb-6 flex items-center justify-center">
              <img src="/logo.jpg" alt="BallerID Logo" className="w-full h-full object-cover" />
            </div>

            <h2 className="text-3xl font-serif text-center mb-2" id="welcome-header">
              {t[lang].title}
            </h2>
            <p className="text-center text-sm text-brand-wine/80 max-w-md mb-8">
              {t[lang].tagline}
            </p>

            {/* GAME MODE SWITCHER TABS */}
            <div className="w-full max-w-2xl flex border-b border-brand-border mb-6">
              <button
                type="button"
                id="mode-ind-tab"
                onClick={() => {
                  setMode('individual');
                  setValidationError('');
                }}
                className={`flex-1 py-3 font-serif font-semibold text-center text-sm sm:text-md tracking-wide transition-all border-b-2 cursor-pointer ${
                  mode === 'individual' 
                    ? 'border-brand-wine text-brand-wine bg-brand-wine/5 font-bold' 
                    : 'border-transparent text-brand-wine/60 hover:text-brand-wine hover:bg-brand-cream/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t[lang].modeInd}</span>
                  <span className="inline sm:hidden">{lang === 'ES' ? 'Muerte Súbita' : 'Sudden Death'}</span>
                </div>
              </button>

              <button
                type="button"
                id="mode-champ-tab"
                onClick={() => {
                  setMode('champion');
                  setValidationError('');
                }}
                className={`flex-1 py-3 font-serif font-semibold text-center text-sm sm:text-md tracking-wide transition-all border-b-2 cursor-pointer ${
                  mode === 'champion' 
                    ? 'border-brand-wine text-brand-wine bg-brand-wine/5 font-bold' 
                    : 'border-transparent text-brand-wine/60 hover:text-brand-wine hover:bg-brand-cream/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{t[lang].modeChamp}</span>
                </div>
              </button>

              <button
                type="button"
                id="mode-mult-tab"
                onClick={() => {
                  setMode('multiplayer');
                  setValidationError('');
                }}
                className={`flex-1 py-3 font-serif font-semibold text-center text-sm sm:text-md tracking-wide transition-all border-b-2 cursor-pointer ${
                  mode === 'multiplayer' 
                    ? 'border-brand-wine text-brand-wine bg-brand-wine/5 font-bold' 
                    : 'border-transparent text-brand-wine/60 hover:text-brand-wine hover:bg-brand-cream/50'
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t[lang].modeMult}</span>
                  <span className="inline sm:hidden">{lang === 'ES' ? 'Salas' : 'Rooms'}</span>
                </div>
              </button>
            </div>

            <div className="w-full max-w-2xl flex flex-col md:flex-row gap-6">
              {/* Left Side Form depending on Mode */}
              <div className="flex-1 bg-brand-cream border border-brand-border rounded-lg p-6 shadow-sm passport-border flex flex-col justify-between">
                
                <form 
                  className="w-full flex flex-col gap-4" 
                  onSubmit={
                    mode === 'individual' 
                      ? handleStartIndividual 
                      : mode === 'champion'
                      ? handleStartChampion
                      : (isDetectedRoom ? handleJoinRoom : handleCreateRoom)
                  }
                >
                  {mode === 'champion' && (
                    <div className="mb-1 p-3 bg-brand-wine/5 border border-brand-border rounded">
                      <h4 className="text-[11px] font-serif font-bold text-brand-wine uppercase tracking-wider leading-relaxed">
                        🏆 {t[lang].modeChampHeader}
                      </h4>
                    </div>
                  )}

                  <div>
                    <label htmlFor="nickname-input" className="block text-xs uppercase tracking-wider font-semibold mb-1">
                      {t[lang].enterNickname}
                    </label>
                    <input 
                      type="text"
                      id="nickname-input"
                      placeholder={t[lang].nicknamePlaceholder}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full border border-brand-border rounded px-4 py-2.5 bg-brand-cream/35 focus:outline-none focus:border-brand-wine focus:ring-1 focus:ring-brand-wine font-mono"
                      required
                    />
                  </div>

                  {mode === 'individual' ? (
                    /* Individual Sudden Death */
                    <button 
                      type="submit" 
                      id="start-individual-btn"
                      className="w-full bg-brand-wine text-brand-cream py-3 rounded font-serif text-lg tracking-wide hover:bg-brand-wine/90 transition-all cursor-pointer font-semibold flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-brand-cream" />
                      {t[lang].startIndividual}
                    </button>
                  ) : mode === 'champion' ? (
                    /* World Cup Champion Mode */
                    <button 
                      type="submit" 
                      id="start-champion-btn"
                      className="w-full bg-brand-wine text-brand-cream py-3 rounded font-serif text-lg tracking-wide hover:bg-brand-wine/90 transition-all cursor-pointer font-semibold flex items-center justify-center gap-1"
                    >
                      <Trophy className="w-4 h-4 fill-brand-cream" />
                      {t[lang].startChampion}
                    </button>
                  ) : (
                    /* Multiplayer Room Flow */
                    isDetectedRoom ? (
                      <div className="flex flex-col gap-2">
                        <div className="bg-brand-wine/5 border border-brand-border rounded p-3 mb-2 flex items-center gap-3">
                          <Users className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <span className="text-xs uppercase tracking-widest text-brand-wine/77 font-semibold block">SALA DETECTADA</span>
                            <span className="font-mono text-sm font-bold">{roomId}</span>
                          </div>
                        </div>
                        <button 
                          type="submit" 
                          id="join-room-btn"
                          className="w-full bg-brand-wine text-brand-cream py-3 rounded font-serif text-lg tracking-wide hover:bg-brand-wine/90 transition-all cursor-pointer font-semibold"
                        >
                          {t[lang].joinRoom} {roomId}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <button 
                          type="submit" 
                          id="create-room-btn"
                          className="w-full bg-brand-wine text-brand-cream py-3 rounded font-serif text-lg tracking-wide hover:bg-brand-wine/90 transition-all cursor-pointer font-semibold"
                        >
                          {t[lang].createRoom}
                        </button>
                        
                        <div className="flex gap-1">
                          <input 
                            type="text"
                            id="room-id-input"
                            placeholder="ROOM-ID"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleJoinRoom(e);
                              }
                            }}
                            className="w-full border border-brand-border rounded-l px-3 bg-brand-cream/35 uppercase font-mono text-center focus:outline-none focus:border-brand-wine"
                          />
                          <button 
                            type="button"
                            id="manual-join-btn"
                            onClick={(e) => handleJoinRoom(e)}
                            className="bg-brand-wine/10 border border-brand-wine text-brand-wine px-3 rounded-r hover:bg-brand-wine/15 transition-all text-xs font-semibold cursor-pointer"
                          >
                            {t[lang].joinRoom}
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {validationError && (
                    <p className="text-xs text-feedback-error font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {validationError}
                    </p>
                  )}
                </form>

                {/* RULES CARD */}
                <div className="border-t border-brand-border mt-6 pt-6">
                  {mode === 'champion' ? (
                    <>
                      <h3 className="text-xs uppercase tracking-widest text-brand-wine/75 font-semibold mb-3 flex items-center gap-1.5 font-serif-title">
                        <Trophy className="w-4 h-4" />
                        {t[lang].champRulesTitle}
                      </h3>
                      <ul className="text-xs text-brand-wine/80 flex flex-col gap-2 pl-4 list-decimal leading-relaxed">
                        <li>{t[lang].champRule1}</li>
                        <li>{t[lang].champRule2}</li>
                        <li>{t[lang].champRule3}</li>
                        <li className="font-semibold text-brand-wine">{t[lang].champRule4}</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xs uppercase tracking-widest text-brand-wine/75 font-semibold mb-3 flex items-center gap-1.5 font-serif-title">
                        <Info className="w-4 h-4" />
                        {t[lang].rulesTitle}
                      </h3>
                      <ul className="text-xs text-brand-wine/80 flex flex-col gap-2 pl-4 list-decimal leading-relaxed">
                        <li>{t[lang].rule1}</li>
                        <li>{t[lang].rule2}</li>
                        <li>{t[lang].rule3}</li>
                        <li className="font-semibold text-brand-wine">{t[lang].rule4}</li>
                      </ul>
                    </>
                  )}
                </div>

              </div>

              {/* Right Side Leaderboard: Global or Room depending on Mode */}
              <div className="flex-1 bg-brand-cream border border-brand-border rounded-lg p-6 shadow-sm passport-border flex flex-col justify-between">
                
                {mode === 'individual' ? (
                  /* GLOBAL LEADERBOARD */
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-sm uppercase tracking-widest text-brand-wine/75 font-semibold mb-4 font-serif-title flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      {t[lang].globalLeaderboard}
                    </h3>

                    <div className="flex-1 overflow-y-auto max-h-[320px] pr-1">
                      <div className="flex flex-col gap-2">
                        {globalPlayers.map((player, idx) => {
                          const isFirst = idx === 0;
                          return (
                            <div 
                              key={`${player.nickname}-${player.completedAt}`}
                              className={`border rounded p-2.5 bg-brand-cream/35 flex items-center justify-between transition-all relative ${
                                isFirst ? 'border-feedback-warning bg-feedback-warning/5 ring-1 ring-feedback-warning/20' : 'border-brand-border'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                                  isFirst ? 'bg-feedback-warning text-brand-cream' : 'bg-brand-wine/10 text-brand-wine'
                                }`}>
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold">{player.nickname}</span>
                                    {isFirst && (
                                      <span className="text-[8px] uppercase font-serif font-bold text-brand-cream bg-feedback-warning px-1 rounded tracking-wide">
                                        {lang === 'ES' ? t.ES.pizarritaTag : t.EN.tacticianTag}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] text-brand-wine/50 block">
                                    {formatDate(player.completedAt)} • {player.correctAnswers} {t[lang].aciertosLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-xs text-brand-wine">
                                  {player.score.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : mode === 'champion' ? (
                  /* CHAMPION LEADERBOARD */
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-sm uppercase tracking-widest text-brand-wine/75 font-semibold mb-4 font-serif-title flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      {t[lang].championLeaderboard}
                    </h3>

                    <div className="flex-1 overflow-y-auto max-h-[320px] pr-1">
                      <div className="flex flex-col gap-2">
                        {championPlayers.map((player, idx) => {
                          const isFirst = idx === 0;
                          return (
                            <div 
                              key={`${player.nickname}-${player.completedAt}`}
                              className={`border rounded p-2.5 bg-brand-cream/35 flex items-center justify-between transition-all relative ${
                                isFirst ? 'border-feedback-warning bg-feedback-warning/5 ring-1 ring-feedback-warning/20' : 'border-brand-border'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                                  isFirst ? 'bg-feedback-warning text-brand-cream' : 'bg-brand-wine/10 text-brand-wine'
                                }`}>
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs font-semibold">{player.nickname}</span>
                                    {isFirst && (
                                      <span className="text-[8px] uppercase font-serif font-bold text-brand-cream bg-feedback-warning px-1 rounded tracking-wide">
                                        🏆 CHAMP
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8px] text-brand-wine/50 block">
                                    {formatDate(player.completedAt)} • {getPhaseReachedLabel(player.correctAnswers)} ({player.correctAnswers} {t[lang].correctCountLabel})
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-xs text-brand-wine">
                                  {player.score.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MULTIPLAYER LOBBY ROOMS INFO */
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                    <Users className="w-12 h-12 mb-3 opacity-60" />
                    <h3 className="font-serif text-lg mb-2">{t[lang].modeMult}</h3>
                    <p className="text-xs text-brand-wine/75 leading-relaxed">
                      {t[lang].modeMultDesc}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: MULTIPLAYER LOBBY SCREEN (unchanged/restored) */}
        {view === 'lobby' && (
          <div className="w-full max-w-3xl flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-brand-cream border border-brand-border rounded-lg p-6 shadow-sm passport-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5" />
                  <h2 className="text-xl font-serif">{t[lang].lobbyTitle}</h2>
                </div>
                
                <div className="border border-brand-border rounded p-4 bg-brand-cream/40 mb-4 flex flex-col gap-2 rotate-[-0.5deg]">
                  <span className="text-[10px] uppercase tracking-wider text-brand-wine/60 font-semibold">{t[lang].roomIdLabel}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-bold tracking-widest">{roomId}</span>
                    <button 
                      type="button"
                      id="copy-link-btn"
                      onClick={copyRoomLink}
                      className="flex items-center gap-1.5 text-xs bg-brand-wine text-brand-cream hover:bg-brand-wine/90 py-1.5 px-3 rounded transition-all cursor-pointer"
                    >
                      {copyFeedback ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copyFeedback ? t[lang].linkCopied.split(' ')[0] : t[lang].copyLink}</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-brand-wine/80 leading-relaxed mb-4">
                  {t[lang].shareLobbyMsg}
                </p>

                {copyFeedback && (
                  <div className="bg-feedback-warning/10 border border-feedback-warning/30 rounded p-2.5 text-xs text-brand-wine flex items-center gap-2 mb-4 animate-pulse">
                    <Share2 className="w-4 h-4 text-feedback-warning" />
                    <span>{t[lang].linkCopied}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-brand-border pt-6 mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-2.5 bg-brand-wine/5 border border-brand-border rounded px-4 py-2.5">
                  <User className="w-4 h-4 opacity-75" />
                  <span className="text-xs font-mono">
                    {lang === 'ES' ? 'Entrenador' : 'Coach'}: <strong className="font-semibold text-sm">{nickname}</strong>
                  </span>
                </div>
                
                <button 
                  type="button"
                  id="start-quiz-btn"
                  onClick={() => startQuiz(10)}
                  className="w-full bg-brand-wine text-brand-cream hover:bg-brand-wine/90 py-3.5 rounded font-serif text-lg tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer font-semibold"
                >
                  <Play className="w-4 h-4 fill-brand-cream" />
                  {t[lang].startQuiz}
                </button>
                
                <button
                  type="button"
                  onClick={handleExitToWelcome}
                  className="text-xs text-brand-wine/60 hover:text-brand-wine text-center underline"
                >
                  Salir de la sala
                </button>
              </div>
            </div>

            <div className="flex-1 bg-brand-cream border border-brand-border rounded-lg p-6 shadow-sm passport-border flex flex-col">
              <h3 className="text-sm uppercase tracking-widest text-brand-wine/75 font-semibold mb-4 font-serif-title flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {t[lang].playersInRoom} ({roomPlayers.length}/20)
              </h3>

              <div className="flex-1 overflow-y-auto max-h-[350px] pr-1">
                {roomPlayers.length === 0 ? (
                  <p className="text-xs text-brand-wine/60 italic text-center py-8">
                    {t[lang].noPlayersYet}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {roomPlayers.map((player, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div 
                          key={`${player.nickname}-${player.completedAt}`}
                          className={`border rounded p-3 bg-brand-cream/35 flex items-center justify-between transition-all relative ${
                            isFirst ? 'border-feedback-warning bg-feedback-warning/5 ring-1 ring-feedback-warning/20' : 'border-brand-border'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                              isFirst ? 'bg-feedback-warning text-brand-cream' : 'bg-brand-wine/10 text-brand-wine'
                            }`}>
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-sm font-semibold">{player.nickname}</span>
                                {isFirst && player.score >= 0 && (
                                  <span className="text-[9px] uppercase font-serif font-bold text-brand-cream bg-feedback-warning px-1.5 py-0.5 rounded rotate-[-2deg] tracking-wide">
                                    {lang === 'ES' ? t.ES.pizarritaTag : t.EN.tacticianTag}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-brand-wine/50 block">
                                {formatDate(player.completedAt)} • {player.score === -1 ? (lang === 'ES' ? 'Sin jugar' : 'Not played') : `${player.correctAnswers}/10`}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-brand-wine">
                              {player.score === -1 ? '⏳' : player.score.toLocaleString()}
                            </span>
                            <span className="text-[8px] uppercase tracking-wider block text-brand-wine/50">
                              {player.score === -1 ? (lang === 'ES' ? 'En espera' : 'Waiting') : t[lang].scoreCol}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: PLAYING QUIZ SCREEN */}
        {view === 'quiz' && activeQuestion && (
          <div className="w-full max-w-2xl bg-brand-cream border border-brand-border rounded-lg p-6 sm:p-8 shadow-sm passport-border flex flex-col relative overflow-hidden">
            
            {/* Phase Transition Overlay */}
            {transitionPhase && (
              <div className="absolute inset-0 bg-brand-wine text-brand-cream z-50 flex flex-col items-center justify-center p-6 sm:p-8 text-center animate-fade-in">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="relative z-10 max-w-sm flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full border-2 border-feedback-warning flex items-center justify-center text-center rotate-[-6deg] mb-6 bg-brand-wine/50 animate-pulse">
                    <Trophy className="w-10 h-10 text-feedback-warning animate-bounce" />
                  </div>
                  
                  <span className="text-[10px] tracking-[0.2em] uppercase text-feedback-warning font-bold font-mono mb-2">
                    {lang === 'ES' ? '¡FASE COMPLETADA!' : 'STAGE COMPLETED!'}
                  </span>
                  
                  <h2 className="text-3xl font-serif font-black tracking-wide text-brand-cream mb-4 animate-scale-up">
                    {lang === 'ES' ? `ACCEDIENDO A ${transitionPhase.toUpperCase()}` : `ACCESSING ${transitionPhase.toUpperCase()}`}
                  </h2>
                  
                  <div className="border border-brand-cream/30 rounded p-4 bg-brand-wine/40 mb-6 font-mono text-xs w-full">
                    <p className="mb-2 text-brand-cream/80">
                      ⏱️ {lang === 'ES' ? 'Nuevo Límite de Tiempo:' : 'New Time Limit:'}{' '}
                      <strong className="text-feedback-warning">{getPhaseTimeLimit(correctCount, 'champion')}s</strong>
                    </p>
                    <p className="text-brand-cream/80">
                      🧠 {lang === 'ES' ? 'Dificultad de Preguntas:' : 'Question Difficulty:'}{' '}
                      <strong className="text-feedback-warning">
                        {correctCount < 5 ? (lang === 'ES' ? 'Fácil' : 'Easy') :
                         correctCount < 15 ? (lang === 'ES' ? 'Media' : 'Medium') :
                         (lang === 'ES' ? 'Difícil' : 'Hard')}
                      </strong>
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleDismissTransition}
                    className="bg-feedback-warning text-brand-wine hover:bg-feedback-warning/90 py-2.5 px-6 rounded font-serif text-sm tracking-wider transition-all cursor-pointer font-bold animate-pulse shadow-md"
                  >
                    {lang === 'ES' ? 'Entrar a la Fase' : 'Enter Stage'} ({transitionSecLeft}s)
                  </button>
                </div>
              </div>
            )}

            {/* Top Stats Banner */}
            <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-6 text-xs font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                {mode === 'champion' ? (
                  <span className="bg-feedback-warning text-brand-cream px-2 py-0.5 rounded font-serif text-xs font-bold tracking-wider uppercase animate-pulse">
                    🏆 {getPhaseName(correctCount)}
                  </span>
                ) : (
                  <span className="font-serif text-brand-wine/70">{t[lang].questionCounter}</span>
                )}
                <span className="bg-brand-wine text-brand-cream px-2 py-0.5 rounded font-mono text-sm font-bold">
                  {mode === 'individual' ? `Ronda / Round ${currentIdx + 1}` : `${currentIdx + 1}/${questions.length}`}
                </span>
                {mode === 'individual' && (
                  <span className="text-[9px] bg-feedback-error text-brand-cream px-1.5 py-0.5 rounded font-bold rotate-[-1deg]">
                    MUERTE SÚBITA
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-brand-wine/5 border border-brand-border rounded px-2.5 py-1">
                  <Trophy className="w-3.5 h-3.5 text-brand-wine/70" />
                  <span className="font-mono font-bold text-sm">{score}</span>
                </div>
                
                <div className={`flex items-center gap-1.5 border rounded px-2.5 py-1 transition-all ${
                  timeLeft <= 3 ? 'border-feedback-error bg-feedback-error/10 text-feedback-error animate-pulse' : 'border-brand-border'
                }`}>
                  <Timer className={`w-3.5 h-3.5 ${timeLeft <= 3 ? 'text-feedback-error' : 'text-brand-wine/70'}`} />
                  <span className="font-mono font-bold text-sm w-8 text-right">
                    {timeLeft.toFixed(1)}{t[lang].secondsShort}
                  </span>
                </div>
              </div>
            </div>

            {/* Timer visual line countdown */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-brand-border">
              <div 
                className={`h-full transition-all duration-100 ${timeLeft <= 3 ? 'bg-feedback-error' : 'bg-brand-wine'}`}
                style={{ width: `${(timeLeft / getPhaseTimeLimit(correctCount, mode)) * 100}%` }}
              />
            </div>

            {/* THE QUESTION DISPLAY */}
            <div className="mb-8 mt-2 text-center flex flex-col items-center">
              <div className="passport-stamp px-4 py-3 rotate-[-1deg] text-xs font-bold border-2 border-brand-border max-w-max mb-4 inline-block tracking-wider rounded">
                FIFA DATA VISAS • {activeQuestion.type.replace('-', ' ')}
              </div>
              
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-center leading-relaxed max-w-xl">
                {lang === 'ES' ? activeQuestion.questionES : activeQuestion.questionEN}
              </h3>
            </div>

            {/* WILDCARDS PANEL */}
            {mode === 'champion' && (
              <div className="border border-brand-border/60 rounded-lg p-3 bg-brand-cream/35 mb-5 flex flex-col gap-2 rotate-[0.5deg]">
                <span className="text-[9px] uppercase tracking-widest text-brand-wine/60 font-bold block font-mono">
                  {t[lang].wildcardLabel}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={wildcardUsed !== null || isAnswered}
                    onClick={handleUseVar}
                    className={`flex-1 border py-2 px-3 rounded flex items-center justify-between transition-all text-xs font-mono font-semibold cursor-pointer ${
                      wildcardUsed === 'var'
                        ? 'border-feedback-success bg-feedback-success/5 text-feedback-success font-bold'
                        : wildcardUsed !== null
                        ? 'border-brand-border/40 opacity-40 text-brand-wine/40'
                        : 'border-brand-wine hover:bg-brand-wine/5 text-brand-wine'
                    }`}
                  >
                    <span>🖥️ {t[lang].varName}</span>
                    <span className="text-[9px] font-normal opacity-75">({t[lang].varDesc})</span>
                  </button>
                  
                  <button
                    type="button"
                    disabled={wildcardUsed !== null || isAnswered}
                    onClick={handleUseProrroga}
                    className={`flex-1 border py-2 px-3 rounded flex items-center justify-between transition-all text-xs font-mono font-semibold cursor-pointer ${
                      wildcardUsed === 'prorroga'
                        ? 'border-feedback-success bg-feedback-success/5 text-feedback-success font-bold'
                        : wildcardUsed !== null
                        ? 'border-brand-border/40 opacity-40 text-brand-wine/40'
                        : 'border-brand-wine hover:bg-brand-wine/5 text-brand-wine'
                    }`}
                  >
                    <span>⏱️ {t[lang].prorrogaName}</span>
                    <span className="text-[9px] font-normal opacity-75">({t[lang].prorrogaDesc})</span>
                  </button>
                </div>
              </div>
            )}

            {/* OPTIONS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
              {activeQuestion.options.map((option, index) => {
                const isCorrect = option === activeQuestion.correctAnswer;
                const isSelected = option === selectedOpt;
                const isRemoved = removedOptions.includes(option);
                
                let cardStyle = "border-brand-border bg-brand-cream/25 hover:border-brand-wine interactive-card";
                let checkIcon = null;

                if (isRemoved) {
                  cardStyle = "border-brand-border/30 opacity-20 bg-transparent cursor-not-allowed line-through";
                } else if (isAnswered) {
                  if (isCorrect) {
                    cardStyle = "border-feedback-success bg-feedback-success/5 text-feedback-success font-semibold ring-1 ring-feedback-success/35";
                    checkIcon = <CheckCircle2 className="w-5 h-5 text-feedback-success flex-shrink-0" />;
                  } else if (isSelected) {
                    cardStyle = "border-feedback-error bg-feedback-error/5 text-feedback-error ring-1 ring-feedback-error/35";
                    checkIcon = <XCircle className="w-5 h-5 text-feedback-error flex-shrink-0" />;
                  } else {
                    cardStyle = "border-brand-border/60 opacity-60 bg-transparent";
                  }
                }

                return (
                  <button
                    key={`${index}-${option}`}
                    type="button"
                    id={`option-btn-${index}`}
                    disabled={isAnswered || isRemoved}
                    onClick={() => selectOption(option)}
                    className={`border rounded-lg p-4 text-left font-mono text-sm leading-snug flex items-center justify-between gap-3 ${cardStyle} transition-all cursor-pointer`}
                  >
                    <span>{option} {nickname.toUpperCase() === 'CHEAT' && isCorrect && '⭐'}</span>
                    {checkIcon}
                  </button>
                );
              })}
            </div>

            {/* FEEDBACK BOTTOM PANEL */}
            {isAnswered && (
              <div className="border-t border-brand-border pt-6 flex flex-col items-center text-center animate-stamp">
                
                {selectedOpt === null ? (
                  <div className="passport-stamp text-feedback-error border-feedback-error border-3 px-6 py-2 rotate-[-5deg] font-serif font-black tracking-widest text-lg mb-3">
                    {t[lang].timeExpired}
                  </div>
                ) : selectedOpt === activeQuestion.correctAnswer ? (
                  <div className="flex flex-col items-center gap-1.5 mb-2">
                    <div className="passport-stamp text-feedback-success border-feedback-success border-3 px-6 py-2 rotate-[-5deg] font-serif font-black tracking-widest text-lg">
                      {t[lang].correctStamp}
                    </div>
                    <span className="text-[10px] font-mono text-feedback-success bg-feedback-success/10 px-2 py-0.5 rounded">
                      +{Math.round(500 + Math.max(0, ((getPhaseTimeLimit(correctCount, mode) - timeTakenRef.current) / getPhaseTimeLimit(correctCount, mode)) * 500))} pts ({t[lang].speedBonus}: +{Math.round(Math.max(0, ((getPhaseTimeLimit(correctCount, mode) - timeTakenRef.current) / getPhaseTimeLimit(correctCount, mode)) * 500))})
                    </span>
                  </div>
                ) : (
                  <div className="passport-stamp text-feedback-error border-feedback-error border-3 px-6 py-2 rotate-[5deg] font-serif font-black tracking-widest text-lg mb-3">
                    {t[lang].incorrectStamp}
                  </div>
                )}

                <p className="text-xs text-brand-wine/90 max-w-lg mb-6 leading-relaxed bg-brand-wine/5 border border-brand-border/60 rounded px-4 py-3 font-mono mt-1 text-center">
                  <span className="font-bold text-[10px] uppercase block tracking-wider text-brand-wine/70 mb-1">{t[lang].correctAnswer}</span>
                  {lang === 'ES' ? activeQuestion.detailES : activeQuestion.detailEN}
                </p>

                <button
                  type="button"
                  id="next-question-btn"
                  onClick={nextQuestion}
                  className="bg-brand-wine text-brand-cream hover:bg-brand-wine/90 py-3 px-8 rounded font-serif text-md tracking-wider flex items-center gap-1.5 transition-all cursor-pointer font-semibold animate-bounce"
                >
                  <span>
                    {mode === 'individual' 
                      ? (selectedOpt === activeQuestion.correctAnswer ? t[lang].nextQuestion : t[lang].finishQuiz) 
                      : mode === 'champion'
                      ? (selectedOpt === activeQuestion.correctAnswer && currentIdx < questions.length - 1 ? t[lang].nextQuestion : t[lang].finishQuiz)
                      : (currentIdx < questions.length - 1 ? t[lang].nextQuestion : t[lang].finishQuiz)
                    }
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>
            )}

          </div>
        )}

        {/* VIEW 4: RESULTS & RANKINGS */}
        {view === 'results' && (
          <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6">
            
            {/* Left Box: Personal Results Summary & Certificate Card */}
            <div className="flex-[0.9] bg-brand-cream border border-brand-border rounded-lg p-6 shadow-sm passport-border flex flex-col justify-between items-center text-center animate-stamp">
              
              <div className="w-full">
                {/* Official Coach License Certificate Display */}
                <div 
                  className="w-full max-w-xs mx-auto aspect-[3/4.25] rounded-xl border border-feedback-warning/30 relative overflow-hidden shadow-lg p-6 flex flex-col justify-between text-center select-none mb-6"
                  style={{
                    backgroundImage: `url('/championship_card_bg.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 10px 25px -5px rgba(45, 12, 17, 0.3)'
                  }}
                >
                  {/* Card Border frame */}
                  <div className="absolute inset-3 border border-feedback-warning/20 pointer-events-none rounded-lg"></div>

                  {isTopPlayer && (
                    <div className="absolute top-4 right-4 bg-feedback-warning text-brand-wine text-[8px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded shadow z-20">
                      ★ TOP 1
                    </div>
                  )}

                  {/* Header: Logo and Title */}
                  <div className="relative z-10 pt-2 flex flex-col items-center gap-2">
                    <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-full border-2 border-feedback-warning object-cover" />
                    <h4 className="text-[10px] font-outfit font-black tracking-wider text-feedback-warning uppercase">
                      CERTIFICADO DE RECONOCIMIENTO
                    </h4>
                  </div>

                  {/* Body Content */}
                  <div className="relative z-10 my-2 flex flex-col gap-1.5">
                    <h3 className="text-lg font-outfit font-black text-brand-cream tracking-wide uppercase truncate px-2">
                      {nickname}
                    </h3>
                    
                    <span className="text-[9px] uppercase tracking-widest text-feedback-warning font-sans font-bold">
                      {mode === 'individual' ? 'Modo: Récord Personal' : mode === 'champion' ? 'Modo: Torneo Oficial (CHAMPIONSHIP)' : 'Modo: Sala Multijugador'}
                    </span>

                    <div className="w-8 h-[1px] bg-feedback-warning/40 mx-auto my-0.5"></div>

                    <p className="text-[10px] text-brand-cream/80 font-sans leading-relaxed">
                      Por su destacada participación en el modo de juego de rendimiento y analítica avanzada de fútbol BallerID.
                    </p>

                    <div className="w-8 h-[1px] bg-feedback-warning/40 mx-auto my-0.5"></div>

                    {/* Metrics */}
                    <div className="flex flex-col gap-1 text-[11px] font-sans text-brand-cream/90 mt-1">
                      <div className="font-outfit font-bold text-feedback-warning">
                        PUNTUACIÓN: {score.toLocaleString()} PTOS. {isTopPlayer && '⭐ ¡MVP de la Partida!'}
                      </div>
                      
                      {Object.keys(categoryStats).length > 0 && (() => {
                        const role = calculateSpecialtyRole(categoryStats);
                        const roleInfo = ROLE_LABELS[role];
                        return (
                          <div className="font-outfit font-bold">
                            ROL: {roleInfo.icon} {(lang === 'ES' ? roleInfo.ES : roleInfo.EN).toUpperCase()}
                          </div>
                        );
                      })()}
                      
                      <div className="text-[9px] text-brand-cream/70">
                        TIEMPO: {elapsedTime}S &bull; PRECISIÓN: {correctCount}/{mode === 'champion' ? '25' : mode === 'individual' ? '100' : '10'}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="relative z-10 flex justify-between items-center text-[8px] font-sans font-bold text-feedback-warning/80 border-t border-brand-cream/10 pt-2 px-1">
                    <div>FECHA: {(() => {
                      const today = new Date();
                      const day = String(today.getDate()).padStart(2, '0');
                      const month = String(today.getMonth() + 1).padStart(2, '0');
                      const year = today.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}</div>
                    <div>FIRMA DIGITAL AUTORIZADA</div>
                  </div>
                </div>

                {/* Social Sharing Drawer */}
                <div className="w-full flex flex-col gap-2 mb-6 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={downloadCertificate}
                    className="w-full bg-feedback-warning text-brand-wine hover:bg-feedback-warning/90 py-2.5 rounded font-serif text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold shadow-md"
                  >
                    📥 {lang === 'ES' ? 'Descargar Certificado (PNG)' : 'Download Certificate (PNG)'}
                  </button>

                  <div className="flex gap-2">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        lang === 'ES'
                          ? `¡He alcanzado la fase de ${getPhaseReachedLabel(correctCount)} en el Campeonato Mundial de BallerID con ${score.toLocaleString()} puntos! ⚽ ¿Puedes superarme? Juega aquí: ${window.location.origin}`
                          : `I reached ${getPhaseReachedLabel(correctCount)} in the BallerID World Championship with ${score.toLocaleString()} points! ⚽ Can you beat my record? Play here: ${window.location.origin}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#25D366] text-white py-2 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all text-center"
                    >
                      💬 WhatsApp
                    </a>

                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        lang === 'ES'
                          ? `¡He alcanzado la fase de ${getPhaseReachedLabel(correctCount)} en el Campeonato Mundial de #BallerID con ${score.toLocaleString()} puntos! 🏆 ¿Crees que puedes superarme? @FIFAcom`
                          : `I reached ${getPhaseReachedLabel(correctCount)} in the #BallerID World Championship with ${score.toLocaleString()} points! 🏆 Do you have what it takes? @FIFAcom`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#1DA1F2] text-white py-2 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-all text-center"
                    >
                      🐦 Twitter / X
                    </a>
                  </div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2 pt-4 border-t border-brand-border mt-4">
                <button
                  type="button"
                  id="play-again-btn"
                  onClick={handlePlayAgain}
                  className="w-full bg-brand-wine text-brand-cream hover:bg-brand-wine/90 py-3 rounded font-serif text-md tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t[lang].playAgain}
                </button>
                
                {mode === 'multiplayer' ? (
                  <button
                    type="button"
                    id="back-to-lobby-btn"
                    onClick={() => setView('lobby')}
                    className="w-full border border-brand-wine text-brand-wine hover:bg-brand-wine/5 py-2.5 rounded font-serif text-md tracking-wider transition-all cursor-pointer"
                  >
                    {t[lang].viewLobby}
                  </button>
                ) : (
                  <button
                    type="button"
                    id="back-to-menu-btn"
                    onClick={handleExitToWelcome}
                    className="w-full border border-brand-wine text-brand-wine hover:bg-brand-wine/5 py-2.5 rounded font-serif text-md tracking-wider transition-all cursor-pointer"
                  >
                    {t[lang].viewMainMenu}
                  </button>
                )}
              </div>

            </div>

            {/* Right Box: Leaderboard / Passports */}
            <div className="flex-1 bg-brand-cream border border-brand-border rounded-lg p-6 shadow-sm passport-border flex flex-col">
              
              <div className="flex items-center justify-between mb-4 border-b border-brand-border pb-3">
                <h3 className="text-sm uppercase tracking-widest text-brand-wine/75 font-semibold font-serif-title flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  {mode === 'individual' 
                    ? t[lang].globalLeaderboard 
                    : mode === 'champion'
                    ? t[lang].championLeaderboard
                    : t[lang].playersInRoom
                  }
                </h3>
                {mode === 'multiplayer' && (
                  <span className="font-mono text-xs text-brand-wine/60">ID: {roomId}</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 flex flex-col gap-2">
                {(mode === 'individual' 
                  ? globalPlayers 
                  : mode === 'champion'
                  ? championPlayers
                  : roomPlayers
                ).map((player, idx) => {
                  const isFirst = idx === 0;
                  const isCurrentUser = player.nickname.toLowerCase() === nickname.toLowerCase();
                  
                  return (
                    <div 
                      key={`${player.nickname}-${player.completedAt}`}
                      className={`border rounded p-3 flex items-center justify-between transition-all relative ${
                        isCurrentUser ? 'bg-brand-wine/5 border-brand-wine' : 'bg-brand-cream/35 border-brand-border'
                      } ${isFirst ? 'ring-1 ring-feedback-warning/45 border-feedback-warning bg-feedback-warning/[0.03]' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                          isFirst ? 'bg-feedback-warning text-brand-cream' : 'bg-brand-wine/10 text-brand-wine'
                        }`}>
                          #{idx + 1}
                        </span>
                        
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono text-sm ${isCurrentUser ? 'font-bold underlineDecoration' : 'font-semibold'}`}>
                              {player.nickname} {isCurrentUser && `(Tú)`}
                            </span>
                            {isFirst && player.score >= 0 && (
                              <span className="text-[9px] uppercase font-serif font-bold text-brand-cream bg-feedback-warning px-1.5 py-0.5 rounded rotate-[-2deg] tracking-wide">
                                {mode === 'champion' ? '🏆 CHAMP' : (lang === 'ES' ? t.ES.pizarritaTag : t.EN.tacticianTag)}
                              </span>
                            )}
                          </div>
                          
                          <span className="text-[9px] text-brand-wine/50 block">
                            {formatDate(player.completedAt)} • {
                              player.score === -1 
                                ? (lang === 'ES' ? 'Sin jugar' : 'Not played') 
                                : (mode === 'champion' 
                                  ? getPhaseReachedLabel(player.correctAnswers) 
                                  : `${player.correctAnswers} ${t[lang].correctCountLabel}`)
                            }
                            {player.score !== -1 && player.categoryStats && Object.keys(player.categoryStats).length > 0 && (() => {
                              const role = calculateSpecialtyRole(player.categoryStats);
                              const info = ROLE_LABELS[role];
                              return <span className="ml-1 text-[8px] text-brand-wine/70 font-semibold">{info.icon} {lang === 'ES' ? info.ES : info.EN}</span>;
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-brand-wine">
                          {player.score === -1 ? '⏳' : player.score.toLocaleString()}
                        </span>
                        <span className="text-[8px] uppercase tracking-wider block text-brand-wine/50">
                          {player.score === -1 ? (lang === 'ES' ? 'En espera' : 'Waiting') : t[lang].scoreCol}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-6 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between text-xs text-brand-wine/70 font-mono gap-4">
        <div>
          © 2026 BALLERID MVP. TODOS LOS DERECHOS DE ANALÍTICA RESERVADOS.
        </div>
        <div className="flex items-center gap-4">
          <span>HOSTED VIA LOCALSTORAGE</span>
          <span>B-ID SECURE PROTOCOL</span>
        </div>
      </footer>
    </div>
  );
}
