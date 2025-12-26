
import { Match, League } from "../types";

// Fonti scommesse famose simulate
const BOOKMAKERS = ["Snai", "Bet365", "Eurobet", "PlanetWin365", "GoldBet", "Sisal", "Lottomatica", "Better"];

// Definizione squadre con "Power Ranking" (0-100) per calcolo quote realistiche
interface TeamDef { name: string; power: number; }

const TEAMS_DB: Record<League, TeamDef[]> = {
  [League.SERIE_A]: [
    { name: "Inter", power: 94 }, { name: "Napoli", power: 90 }, { name: "Juventus", power: 88 },
    { name: "Milan", power: 87 }, { name: "Atalanta", power: 88 }, { name: "Roma", power: 82 },
    { name: "Lazio", power: 84 }, { name: "Fiorentina", power: 85 }, { name: "Torino", power: 78 },
    { name: "Bologna", power: 77 }, { name: "Monza", power: 72 }, { name: "Genoa", power: 73 },
    { name: "Lecce", power: 70 }, { name: "Udinese", power: 74 }, { name: "Empoli", power: 69 },
    { name: "Verona", power: 68 }, { name: "Cagliari", power: 69 }, { name: "Parma", power: 67 },
    { name: "Como", power: 68 }, { name: "Venezia", power: 66 }
  ],
  [League.PREMIER_LEAGUE]: [
    { name: "Man City", power: 97 }, { name: "Arsenal", power: 94 }, { name: "Liverpool", power: 95 },
    { name: "Aston Villa", power: 86 }, { name: "Tottenham", power: 86 }, { name: "Chelsea", power: 88 },
    { name: "Man Utd", power: 83 }, { name: "Newcastle", power: 84 }, { name: "West Ham", power: 79 },
    { name: "Brighton", power: 81 }, { name: "Brentford", power: 76 }, { name: "Fulham", power: 77 },
    { name: "Crystal Palace", power: 75 }, { name: "Wolves", power: 74 }, { name: "Everton", power: 73 },
    { name: "Nottm Forest", power: 75 }, { name: "Leicester", power: 71 }, { name: "Southampton", power: 70 },
    { name: "Ipswich", power: 68 }, { name: "Bournemouth", power: 74 }
  ],
  [League.LA_LIGA]: [
     { name: "Real Madrid", power: 96 }, { name: "Barcelona", power: 94 }, { name: "Atl. Madrid", power: 89 },
     { name: "Girona", power: 80 }, { name: "Athletic Club", power: 84 }, { name: "Real Sociedad", power: 81 },
     { name: "Betis", power: 79 }, { name: "Valencia", power: 76 }, { name: "Villarreal", power: 82 },
     { name: "Sevilla", power: 78 }
  ],
  [League.CHAMPIONS_LEAGUE]: [
     { name: "Man City", power: 96 }, { name: "Real Madrid", power: 95 }, { name: "Bayern", power: 94 },
     { name: "Inter", power: 93 }, { name: "PSG", power: 90 }, { name: "Arsenal", power: 91 },
     { name: "Barcelona", power: 92 }, { name: "Leverkusen", power: 89 }, { name: "Atl. Madrid", power: 88 },
     { name: "Dortmund", power: 86 }
  ]
};

// Orari tipici per il weekend
const TIME_SLOTS = ["Sabato 15:00", "Sabato 18:00", "Sabato 20:45", "Domenica 12:30", "Domenica 15:00", "Domenica 15:00", "Domenica 18:00", "Domenica 20:45", "Lunedì 20:45"];

const cache: Record<string, Match[]> = {};

/**
 * Calcola quote realistiche basate sulla differenza di forza.
 * Usa Sigmoide per vittoria/sconfitta e Gaussiana per il pareggio.
 */
const calculateOdds = (homeP: number, awayP: number) => {
    // Fattore campo: vale circa 4 punti di power rating
    const homeAdvantage = 4;
    const diff = homeP - awayP + homeAdvantage;
    
    // 1. Probabilità Pareggio (Curva Gaussiana centrata a 0)
    // Più le squadre sono equilibrate (diff ~ 0), più alta è la probabilità di X.
    // baseDrawProb = probabilità massima di pareggio (match perfettamente pari)
    // sigma = quanto velocemente decade la probabilità di pareggio al crescere del divario
    const sigma = 22; 
    const baseDrawProb = 0.28; 
    let drawProb = baseDrawProb * Math.exp(-(Math.pow(diff, 2)) / (2 * Math.pow(sigma, 2)));

    // 2. Probabilità Vittoria Casa vs Trasferta (Sigmoide)
    // Distribuisce la probabilità rimanente (1 - draw) tra 1 e 2
    const k = 0.085; // Fattore di ripidità della curva
    const homeWinShare = 1 / (1 + Math.exp(-k * diff));

    const remainingProb = 1 - drawProb;
    let hProb = remainingProb * homeWinShare;
    let aProb = remainingProb * (1 - homeWinShare);

    // 3. Rumore Casuale (Noise)
    // Aggiunge variazione per non avere quote identiche per match simili
    const noise = () => (Math.random() * 0.03) - 0.015;
    hProb += noise();
    aProb += noise();
    // Il pareggio subisce meno rumore solitamente
    drawProb += (Math.random() * 0.01 - 0.005);

    // Normalizzazione somma a 1
    const total = hProb + aProb + drawProb;
    hProb /= total;
    aProb /= total;
    const dProb = drawProb / total;

    // 4. Applicazione Margine Bookmaker (es. 106%)
    const margin = 1.06;
    
    // Clamp per evitare quote estreme (es. 1.00)
    const minProb = 0.015; // Max quota ~70.00
    const hFinal = Math.max(minProb, Math.min(0.95, hProb));
    const dFinal = Math.max(minProb, Math.min(0.95, dProb));
    const aFinal = Math.max(minProb, Math.min(0.95, aProb));

    return {
        home: Number((margin / hFinal).toFixed(2)),
        draw: Number((margin / dFinal).toFixed(2)),
        away: Number((margin / aFinal).toFixed(2))
    };
};

/**
 * GENERATORE DI PALINSESTO
 */
export const fetchUpcomingMatches = async (league: League): Promise<Match[]> => {
  if (cache[league]) return cache[league];

  const teams = [...(TEAMS_DB[league] || TEAMS_DB[League.SERIE_A])];
  
  // Shuffle
  for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  const matches: Match[] = [];
  const numMatches = Math.floor(teams.length / 2);

  const today = new Date();
  const nextSat = new Date();
  nextSat.setDate(today.getDate() + (6 - today.getDay() + 7) % 7); 

  for (let i = 0; i < numMatches; i++) {
      const homeTeam = teams[i * 2];
      const awayTeam = teams[i * 2 + 1];
      
      const odds = calculateOdds(homeTeam.power, awayTeam.power);
      
      const timeSlotStr = TIME_SLOTS[i % TIME_SLOTS.length];
      const [dayName, timeStr] = timeSlotStr.split(' ');
      
      const matchDate = new Date(nextSat);
      if (dayName === "Domenica") matchDate.setDate(matchDate.getDate() + 1);
      if (dayName === "Lunedì") matchDate.setDate(matchDate.getDate() + 2);
      
      const isoDate = `${matchDate.toISOString().split('T')[0]}T${timeStr}:00`;
      const deterministicId = btoa(`${league}-${homeTeam.name}-${awayTeam.name}`);

      matches.push({
          id: deterministicId,
          league,
          homeTeam: {
              name: homeTeam.name,
              logoPlaceholder: `https://ui-avatars.com/api/?name=${encodeURIComponent(homeTeam.name)}&background=1e293b&color=10b981&bold=true&length=2` 
          },
          awayTeam: {
              name: awayTeam.name,
              logoPlaceholder: `https://ui-avatars.com/api/?name=${encodeURIComponent(awayTeam.name)}&background=1e293b&color=10b981&bold=true&length=2`
          },
          startTime: isoDate,
          odds,
          status: 'SCHEDULED',
          // @ts-ignore
          source: BOOKMAKERS[Math.floor(Math.random() * BOOKMAKERS.length)]
      });
  }

  matches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  cache[league] = matches;
  return matches;
};

/**
 * Simulatore di Risultati
 * Usa le probabilità implicite nelle quote per determinare il segno (1X2),
 * poi genera un punteggio plausibile.
 */
export const simulateMatchResult = async (match: Match): Promise<{ homeScore: number; awayScore: number }> => {
  // 1. Determina l'esito (1, X, 2) basato sulle quote
  const probH = (1 / match.odds.home);
  const probD = (1 / match.odds.draw);
  const probA = (1 / match.odds.away);
  const totalProb = probH + probD + probA; // Normalizziamo (togliamo il margine del banco per la sim)
  
  const rand = Math.random() * totalProb;
  
  let outcome: '1' | 'X' | '2';
  if (rand < probH) outcome = '1';
  else if (rand < probH + probD) outcome = 'X';
  else outcome = '2';

  // 2. Genera Gol usando Poisson modificato
  // Lambda (media gol) dipende vagamente dalla forza della squadra (stimata dalle quote inverse)
  // Più la quota è bassa, più la squadra è forte e ci aspettiamo gol.
  
  // Base goals expectancy
  const baseGoals = 1.2;
  // Boost factor: se quota bassa (es 1.50), boost alto. Se quota alta (5.00), boost basso.
  const strengthH = Math.max(0, 3.0 - match.odds.home); // Es. 3 - 1.5 = 1.5 boost
  const strengthA = Math.max(0, 3.0 - match.odds.away);

  const lambdaH = baseGoals + (strengthH * 0.4);
  const lambdaA = baseGoals + (strengthA * 0.4);

  const poisson = (lambda: number) => {
    let L = Math.exp(-lambda), p = 1.0, k = 0;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  };

  let hScore = poisson(lambdaH);
  let aScore = poisson(lambdaA);

  // 3. Forza il risultato per rispettare l'Outcome determinato al punto 1
  if (outcome === '1') {
      if (hScore <= aScore) {
          // Forza vittoria casa
          hScore = aScore + 1 + poisson(0.5); 
      }
  } else if (outcome === '2') {
      if (aScore <= hScore) {
          // Forza vittoria ospite
          aScore = hScore + 1 + poisson(0.5);
      }
  } else {
      // Forza pareggio
      const drawScore = Math.round((hScore + aScore) / 2); // Media
      hScore = drawScore;
      aScore = drawScore;
  }

  // Cap massimo realistico (evita 10-10)
  hScore = Math.min(8, hScore);
  aScore = Math.min(8, aScore);

  return { homeScore: hScore, awayScore: aScore };
};
