import { GoogleGenAI, Type } from "@google/genai";
import { Match, League } from "../types";

// Helper to safely get the AI instance
const getAI = () => {
  try {
    // Support both Vite standard env vars and process.env fallback
    // @ts-ignore
    const apiKey = import.meta.env?.VITE_API_KEY || process.env.API_KEY;

    if (apiKey) {
      return new GoogleGenAI({ apiKey: apiKey });
    }
    throw new Error("API Key not found");
  } catch (error) {
    // We explicitly throw to trigger the fallback in the calling functions
    throw error;
  }
};

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- REAL LOGO MAPPING ---
// Using reliable sources (Wikimedia Commons, etc.) for high quality PNGs where possible.
const TEAM_LOGOS: Record<string, string> = {
    // SERIE A
    'Inter': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
    'Milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
    'Juventus': 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg',
    'Napoli': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli_2007_%281%29.png',
    'Roma': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/AS_Roma_Logo_2017.svg',
    'Lazio': 'https://upload.wikimedia.org/wikipedia/commons/3/3b/S.S._Lazio_badge.svg',
    'Atalanta': 'https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg',
    'Fiorentina': 'https://upload.wikimedia.org/wikipedia/commons/7/79/ACF_Fiorentina_logo.svg',
    'Torino': 'https://upload.wikimedia.org/wikipedia/en/2/2e/Torino_FC_Logo.svg',
    'Bologna': 'https://upload.wikimedia.org/wikipedia/en/5/5b/Bologna_F.C._1909_logo.svg',
    'Verona': 'https://upload.wikimedia.org/wikipedia/en/a/a2/Hellas_Verona_FC_logo_%282020%29.svg',
    'Udinese': 'https://upload.wikimedia.org/wikipedia/en/c/ce/Udinese_Calcio_logo.svg',
    'Sassuolo': 'https://upload.wikimedia.org/wikipedia/en/1/1c/US_Sassuolo_Calcio_logo.svg',
    'Monza': 'https://upload.wikimedia.org/wikipedia/commons/2/29/AC_Monza_logo.svg',
    'Genoa': 'https://upload.wikimedia.org/wikipedia/en/6/6c/Genoa_C.F.C._logo.svg',
    'Lecce': 'https://upload.wikimedia.org/wikipedia/en/a/a8/US_Lecce_Badge.svg',
    'Cagliari': 'https://upload.wikimedia.org/wikipedia/en/6/61/Cagliari_Calcio_1920.svg',

    // PREMIER LEAGUE
    'Man City': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
    'Arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
    'Liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
    'Man Utd': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
    'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
    'Tottenham': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
    'Newcastle': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
    'Aston Villa': 'https://upload.wikimedia.org/wikipedia/en/9/9f/Aston_Villa_logo.svg',

    // LA LIGA
    'Real Madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
    'Barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
    'Atlético Madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
    'Sevilla': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
    'Real Sociedad': 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg',
    'Valencia': 'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg',
    'Betis': 'https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg',
    'Villarreal': 'https://upload.wikimedia.org/wikipedia/en/7/70/Villarreal_CF_logo.svg',

    // CHAMPIONS LEAGUE EXTRA
    'Bayern Munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
    'PSG': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    'Dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg'
};

const getLogoForTeam = (teamName: string): string => {
    // Try exact match
    if (TEAM_LOGOS[teamName]) return TEAM_LOGOS[teamName];

    // Try partial match or standard variations
    const lowerName = teamName.toLowerCase();
    const foundKey = Object.keys(TEAM_LOGOS).find(key => 
        lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)
    );
    
    if (foundKey) return TEAM_LOGOS[foundKey];

    // Fallback if not found (Generic colorful avatar)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=random&color=fff&size=128&bold=true`;
};

const TEAMS_BY_LEAGUE: Record<string, string[]> = {
  [League.SERIE_A]: ['Inter', 'Milan', 'Juventus', 'Napoli', 'Roma', 'Lazio', 'Atalanta', 'Fiorentina', 'Torino', 'Bologna'],
  [League.PREMIER_LEAGUE]: ['Man City', 'Arsenal', 'Liverpool', 'Man Utd', 'Chelsea', 'Tottenham', 'Newcastle', 'Aston Villa'],
  [League.LA_LIGA]: ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Sevilla', 'Real Sociedad', 'Valencia', 'Betis', 'Villarreal'],
  [League.CHAMPIONS_LEAGUE]: ['Man City', 'Real Madrid', 'Bayern Munich', 'PSG', 'Inter', 'Arsenal', 'Barcelona', 'Atlético Madrid']
};

// --- FALLBACK DATA GENERATOR ---
const generateFallbackMatches = (league: League): Match[] => {
  const teams = TEAMS_BY_LEAGUE[league] || TEAMS_BY_LEAGUE[League.SERIE_A];
  // Shuffle teams
  const shuffled = [...teams].sort(() => 0.5 - Math.random());
  const matches: Match[] = [];
  
  // Create pairings
  for (let i = 0; i < Math.floor(shuffled.length / 2); i++) {
    const homeTeam = shuffled[i * 2];
    const awayTeam = shuffled[i * 2 + 1];
    
    // Generate realistic odds
    // Random strength factor (0 to 1)
    const homeStrength = Math.random();
    const awayStrength = Math.random();
    
    let oddsHome, oddsDraw, oddsAway;

    // Logic to set odds based on random strength
    if (homeStrength > awayStrength + 0.2) {
      // Home favorite
      oddsHome = 1.50 + (Math.random() * 0.5);
      oddsDraw = 3.50 + (Math.random() * 1.0);
      oddsAway = 4.50 + (Math.random() * 2.0);
    } else if (awayStrength > homeStrength + 0.2) {
      // Away favorite
      oddsHome = 3.50 + (Math.random() * 2.0);
      oddsDraw = 3.30 + (Math.random() * 0.8);
      oddsAway = 1.60 + (Math.random() * 0.6);
    } else {
      // Balanced
      oddsHome = 2.40 + (Math.random() * 0.5);
      oddsDraw = 3.00 + (Math.random() * 0.4);
      oddsAway = 2.60 + (Math.random() * 0.5);
    }

    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 5) + 1); // Next 1-6 days
    date.setHours(12 + Math.floor(Math.random() * 10), [0, 30][Math.floor(Math.random() * 2)], 0, 0);

    matches.push({
      id: generateId(),
      league: league,
      homeTeam: { 
        name: homeTeam, 
        logoPlaceholder: getLogoForTeam(homeTeam) 
      },
      awayTeam: { 
        name: awayTeam, 
        logoPlaceholder: getLogoForTeam(awayTeam) 
      },
      startTime: date.toISOString(),
      odds: {
        home: parseFloat(oddsHome.toFixed(2)),
        draw: parseFloat(oddsDraw.toFixed(2)),
        away: parseFloat(oddsAway.toFixed(2))
      },
      status: 'SCHEDULED'
    });
  }
  return matches;
};
// -------------------------------

export const fetchUpcomingMatches = async (league: League): Promise<Match[]> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Generate a realistic list of 5 upcoming soccer matches for ${league} for the current or next season 2024/2025.
    Include realistic betting odds (decimal format, e.g., 1.50, 3.20, 4.50) for Home Win (1), Draw (X), and Away Win (2).
    The odds should reflect the relative strength of the teams.
    Use current date as baseline, schedule them for the next 7 days.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              homeTeamName: { type: Type.STRING },
              awayTeamName: { type: Type.STRING },
              oddsHome: { type: Type.NUMBER },
              oddsDraw: { type: Type.NUMBER },
              oddsAway: { type: Type.NUMBER },
              daysFromNow: { type: Type.INTEGER, description: "Number of days from today match is played (1-7)" },
              hour: { type: Type.STRING, description: "Time in HH:MM format" }
            },
            required: ["homeTeamName", "awayTeamName", "oddsHome", "oddsDraw", "oddsAway", "daysFromNow", "hour"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Invalid or empty response from AI");
    }

    // Transform into app format
    const matches: Match[] = data.map((item: any) => {
      const date = new Date();
      date.setDate(date.getDate() + item.daysFromNow);
      const [hours, minutes] = item.hour.split(':');
      date.setHours(parseInt(hours), parseInt(minutes));

      return {
        id: generateId(),
        league: league,
        homeTeam: { 
          name: item.homeTeamName, 
          logoPlaceholder: getLogoForTeam(item.homeTeamName)
        },
        awayTeam: { 
          name: item.awayTeamName, 
          logoPlaceholder: getLogoForTeam(item.awayTeamName)
        },
        startTime: date.toISOString(),
        odds: {
          home: item.oddsHome,
          draw: item.oddsDraw,
          away: item.oddsAway
        },
        status: 'SCHEDULED'
      };
    });

    return matches;

  } catch (error) {
    console.warn("Gemini API failed or missing key, using fallback simulation data.", error);
    // Return simulated data so the app is always usable
    return generateFallbackMatches(league);
  }
};

export const simulateMatchResult = async (match: Match): Promise<{ homeScore: number; awayScore: number }> => {
  // Enhanced prompt for realistic simulation
  const prompt = `
    Act as a soccer match simulator engine. 
    Simulate the final score for: ${match.homeTeam.name} vs ${match.awayTeam.name}.
    
    Betting Odds: 
    - Home Win: ${match.odds.home}
    - Draw: ${match.odds.draw}
    - Away Win: ${match.odds.away}
    
    Rules for realism:
    1. Calculate implied probabilities from odds (1/odd).
    2. Use a Poisson distribution logic for goal scoring. Stronger teams (lower odds) should score more on average.
    3. Scores should typically be low (e.g., 1-0, 2-1, 1-1, 0-0, 3-1). High scores (e.g. 5-4) should be very rare.
    4. Allow for upsets but keep them statistically consistent with the odds.
    
    Return ONLY the final score.
  `;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            homeScore: { type: Type.INTEGER },
            awayScore: { type: Type.INTEGER }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{\"homeScore\": 0, \"awayScore\": 0}");
    return result;
  } catch (error) {
    // Fallback logic based on probabilities if AI fails
    const probHome = 1 / match.odds.home;
    const probAway = 1 / match.odds.away;
    const probDraw = 1 / match.odds.draw; // rough approximation
    
    const roll = Math.random();
    
    let homeScore = 0;
    let awayScore = 0;

    // Determine winner based on normalized probabilities
    const totalProb = probHome + probAway + probDraw;
    const normHome = probHome / totalProb;
    const normAway = probAway / totalProb;
    
    if (roll < normHome) {
        // Home wins
        homeScore = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        awayScore = Math.floor(Math.random() * homeScore);
    } else if (roll < normHome + normAway) {
        // Away wins
        awayScore = Math.floor(Math.random() * 3) + 1;
        homeScore = Math.floor(Math.random() * awayScore);
    } else {
        // Draw
        homeScore = Math.floor(Math.random() * 2); // 0 or 1 usually
        awayScore = homeScore;
    }

    return { homeScore, awayScore };
  }
};