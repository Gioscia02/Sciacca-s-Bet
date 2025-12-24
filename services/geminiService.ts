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
// Switched to ESPN CDN for high reliability and consistent PNG format.
const TEAM_LOGOS: Record<string, string> = {
    // SERIE A
    'Inter': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/110.png',
    'Milan': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/103.png',
    'Juventus': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/111.png',
    'Napoli': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/114.png',
    'Roma': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/104.png',
    'Lazio': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/112.png',
    'Atalanta': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/125.png',
    'Fiorentina': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/107.png',
    'Torino': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/118.png',
    'Bologna': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/116.png',
    'Verona': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/123.png',
    'Hellas Verona': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/123.png',
    'Udinese': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/119.png',
    'Sassuolo': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/3576.png',
    'Monza': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/3653.png',
    'Genoa': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/3263.png',
    'Lecce': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/113.png',
    'Cagliari': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/106.png',
    'Empoli': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/2736.png',
    'Salernitana': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/3429.png',
    'Frosinone': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/3650.png',
    'Parma': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/115.png',
    'Como': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/2744.png',
    'Venezia': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/206.png',

    // PREMIER LEAGUE
    'Man City': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/382.png',
    'Manchester City': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/382.png',
    'Arsenal': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/359.png',
    'Liverpool': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/364.png',
    'Man Utd': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/360.png',
    'Manchester United': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/360.png',
    'Chelsea': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/363.png',
    'Tottenham': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/367.png',
    'Newcastle': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/361.png',
    'Aston Villa': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/362.png',
    'West Ham': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/371.png',
    'Brighton': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/331.png',

    // LA LIGA
    'Real Madrid': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/86.png',
    'Barcelona': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/83.png',
    'Atlético Madrid': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/1068.png',
    'Sevilla': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/243.png',
    'Real Sociedad': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/89.png',
    'Valencia': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/94.png',
    'Betis': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/244.png',
    'Villarreal': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/102.png',

    // CHAMPIONS LEAGUE / EUROPE
    'Bayern': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/132.png',
    'Bayern Munich': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/132.png',
    'Dortmund': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/124.png',
    'Leverkusen': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/131.png',
    'PSG': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/160.png',
    'Paris Saint-Germain': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/160.png'
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