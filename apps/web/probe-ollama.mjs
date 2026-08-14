import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

const provider = createOpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama', compatibility: 'compatible' });
const model = provider('llama3.1');
const start = Date.now();
const result = streamText({
  model,
  system: 'You are UltraIa Assistant. Answer in the user language.',
  messages: [{ role: 'user', content: 'Cuanto es 2+2? Responde solo con el numero.' }],
  tools: undefined,
  maxSteps: 4,
});
let text = '';
for await (const chunk of result.textStream) {
  text += chunk;
}
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`ELAPSED ${elapsed}s`);
console.log('REPLY:', JSON.stringify(text));