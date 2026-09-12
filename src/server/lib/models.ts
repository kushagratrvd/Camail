import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

export function getModelInstance(
  modelString: string,
  keys: { google?: string; openai?: string; anthropic?: string } = {}
) {
  const [provider, modelName] = modelString.split('/');
  if (!provider || !modelName) {
    throw new Error(`Invalid model format: ${modelString}`);
  }

  switch (provider) {
    case 'google': {
      const apiKey = keys.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error('Missing Google Gemini API Key');
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      return googleProvider(modelName);
    }
    case 'openai': {
      const apiKey = keys.openai || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('Missing OpenAI API Key');
      const openaiProvider = createOpenAI({ apiKey });
      return openaiProvider(modelName);
    }
    case 'anthropic': {
      const apiKey = keys.anthropic || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Missing Anthropic API Key');
      const anthropicProvider = createAnthropic({ apiKey });
      return anthropicProvider(modelName);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
