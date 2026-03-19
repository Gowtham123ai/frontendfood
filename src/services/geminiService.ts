import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'AIzaSyA_mock_key_for_now' });

export async function getFoodSuggestions(prompt: string, menu: MenuItem[]) {
  try {
    const model = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a helpful food assistant for MAGIZHAMUDHU Kitchen. 
        Here is our current menu: ${JSON.stringify(menu.map(m => ({ name: m.name, price: m.price, category: m.category, description: m.description })))}
        
        User says: "${prompt}"
        
        Suggest 2-3 items from the menu based on their request. Keep it friendly and concise.
        If they ask in Tamil, respond in Tamil. Otherwise, respond in English.
      `,
    });

    const response = await model;
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, our AIchef is currently busy. Please try asking again later!";
  }
}

export async function getAIRecommendations(menu: MenuItem[], userPreferences: string = ''): Promise<string[]> {
  try {
    const hour = new Date().getHours();
    let timeOfDay = "evening";
    if (hour < 11) timeOfDay = "morning";
    else if (hour < 16) timeOfDay = "afternoon";
    else if (hour < 21) timeOfDay = "evening";
    else timeOfDay = "late night";

    const prompt = `
      You are an elite food recommendation AI for a cloud kitchen.
      Current time of day: ${timeOfDay}.
      User preferences (if any): ${userPreferences}
      
      Menu: ${JSON.stringify(menu.map(m => ({ id: m.id, name: m.name, category: m.category, rating: m.rating })))}
      
      Based ONLY on the menu provided, time of day, and preferences, select exactly 4 item IDs that would be the best recommendations right now.
      Return ONLY a JSON array of strings containing the item IDs. No other text. Example: ["id1", "id2", "id3", "id4"]
    `;

    const model = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const response = await model;
    const text = response.text || "[]";
    const cleaned = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Rec Error:", error);
    // Fallback to rule-based if AI fails
    return menu.sort((a,b) => b.rating - a.rating).slice(0, 4).map(m => m.id);
  }
}
