import { getModel, getEmbeddingModel, Provider } from './generic-ai';

/**
 * Configuration for a specific model including provider and fallback options
 */
export interface ModelConfig {
  /** The primary LLM provider to use */
  provider: Provider;
  /** The specific model name or deployment name */
  modelName: string;
  /** Fallback provider if primary fails */
  fallbackProvider?: Provider;
  /** Fallback model if primary fails */
  fallbackModel?: string;
}

/**
 * Default configurations for each feature
 * These can be overridden by environment variables
 */
const FEATURE_DEFAULTS: Record<string, ModelConfig> = {
  extract: {
    provider: 'openai',
    modelName: 'gpt-4o-mini',
    fallbackProvider: 'anthropic',
    fallbackModel: 'claude-3-5-sonnet-20241022'
  },
  embedding: {
    provider: 'openai',
    modelName: 'text-embedding-3-small'
  },
  research: {
    provider: 'openai',
    modelName: 'gpt-4o-mini'
  },
  llmstxt: {
    provider: 'openai',
    modelName: 'gpt-4o-mini'
  },
  smartscrape: {
    provider: 'openai',
    modelName: 'gpt-4o-mini'
  }
};

/** Valid LLM providers */
const VALID_PROVIDERS: Provider[] = [
  'openai', 'azure-openai', 'ollama', 'anthropic', 
  'groq', 'google', 'openrouter', 'fireworks', 
  'deepinfra', 'vertex'
];

/**
 * Gets the default LLM provider based on environment variables
 * Priority: OLLAMA_BASE_URL > LLM_PROVIDER > 'openai'
 * @returns The selected provider
 * @throws Error if LLM_PROVIDER is set to an unsupported value
 */
export function getLLMProvider(): Provider {
  // Check for OLLAMA_BASE_URL first (existing logic)
  if (process.env.OLLAMA_BASE_URL) {
    return 'ollama';
  }

  // Check LLM_PROVIDER environment variable
  const envProvider = process.env.LLM_PROVIDER as Provider;
  if (envProvider) {
    if (VALID_PROVIDERS.includes(envProvider)) {
      return envProvider;
    } else {
      throw new Error(`Unsupported LLM provider: ${envProvider}. Valid providers: ${VALID_PROVIDERS.join(', ')}`);
    }
  }

  // Default to openai
  return 'openai';
}

/**
 * Gets the model configuration for a specific feature
 * Supports feature-specific overrides via environment variables
 * @param feature The feature name (extract, embedding, research, etc.)
 * @returns ModelConfig with provider, model name, and fallback options
 * @throws Error if feature is unknown
 */
export function getModelConfig(feature: string): ModelConfig {
  if (!FEATURE_DEFAULTS[feature]) {
    const validFeatures = Object.keys(FEATURE_DEFAULTS).join(', ');
    throw new Error(`Unknown feature: ${feature}. Valid features: ${validFeatures}`);
  }

  const defaults = FEATURE_DEFAULTS[feature];
  const globalProvider = getLLMProvider();

  // Check for global model override
  const globalModelOverride = process.env.LLM_MODEL_OVERRIDE;
  if (globalModelOverride) {
    return {
      ...defaults,
      provider: globalProvider,
      modelName: globalModelOverride
    };
  }

  // Check for feature-specific overrides
  const featureProviderKey = `${feature.toUpperCase()}_MODEL_PROVIDER`;
  const featureModelKey = `${feature.toUpperCase()}_MODEL_NAME`;
  const featureRetryProviderKey = `${feature.toUpperCase()}_RETRY_MODEL_PROVIDER`;
  const featureRetryModelKey = `${feature.toUpperCase()}_RETRY_MODEL_NAME`;

  const provider = (process.env[featureProviderKey] as Provider) || globalProvider;
  let modelName = process.env[featureModelKey] || defaults.modelName;

  // Handle Azure OpenAI deployment names
  if (provider === 'azure-openai') {
    if (feature === 'embedding') {
      modelName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || modelName;
    } else {
      modelName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || modelName;
    }
  }

  // Handle Google Gemini model override
  if (provider === 'google' && process.env.GOOGLE_GEMINI_MODEL) {
    modelName = process.env.GOOGLE_GEMINI_MODEL;
  }

  const config: ModelConfig = {
    provider,
    modelName,
    fallbackProvider: (process.env[featureRetryProviderKey] as Provider) || defaults.fallbackProvider,
    fallbackModel: process.env[featureRetryModelKey] || defaults.fallbackModel
  };

  return config;
}

/**
 * Gets a configured model instance for a specific feature
 * Validates required environment variables and returns the appropriate model type
 * @param feature The feature name (extract, embedding, research, etc.)
 * @returns A configured model instance from the AI SDK
 * @throws Error if required environment variables are missing
 */
export function getModelForFeature(feature: string) {
  const config = getModelConfig(feature);

  // Validate required environment variables for each provider
  if (config.provider === 'azure-openai') {
    if (!process.env.AZURE_OPENAI_API_KEY) {
      throw new Error('Azure OpenAI API key is required when using azure-openai provider');
    }
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      throw new Error('Azure OpenAI endpoint is required when using azure-openai provider');
    }
  }

  if (config.provider === 'google' && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Google Generative AI API key is required when using google provider');
  }

  if (config.provider === 'vertex') {
    if (!process.env.VERTEX_PROJECT_ID && !process.env.VERTEX_CREDENTIALS) {
      throw new Error('Vertex AI requires either VERTEX_PROJECT_ID or VERTEX_CREDENTIALS');
    }
  }

  // For embedding models, use getEmbeddingModel
  if (feature === 'embedding') {
    return getEmbeddingModel(config.modelName, config.provider);
  }

  // For other models, use getModel
  return getModel(config.modelName, config.provider);
}