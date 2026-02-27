import { generateStructuredJson } from "./azureOpenAIService";

const systemPrompt = `
Convert natural language recipe queries into JSON filters.
Output keys: name, ingredient, cuisine, cuisineType, maxPrepTime, maxCalories, minProtein.
If cuisine type is mentioned (for example mediterranean, asian, italian), map it to cuisineType.
Only return JSON.
`;

export async function parseNaturalLanguageSearch(query) {
  const raw = await generateStructuredJson({
    systemPrompt,
    userPrompt: query,
    temperature: 0
  });
  return JSON.parse(raw);
}
