import { GoogleGenAI, Type } from "@google/genai";
import { Match, League } from "../types";

// Helper to safely get the AI instance
// This prevents the app from crashing at startup if the API key is missing
const getAI = () => {
  try {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    throw error;
  }
};

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

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
          logoPlaceholder: `https://picsum.photos/seed/${item.homeTeamName.replace(/\s/g, '')}/48/48` 
        },
        awayTeam: { 
          name: item.awayTeamName, 
          logoPlaceholder: `https://picsum.photos/seed/${item.awayTeamName.replace(/\s/g, '')}/48/48` 
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
    console.error("Error fetching matches from Gemini:", error);
    // Fallback if AI fails
    return [];
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