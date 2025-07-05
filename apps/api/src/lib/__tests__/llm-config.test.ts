import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ModelConfig, getModelConfig, getLLMProvider, getModelForFeature } from '../llm-config';

describe('LLM Configuration System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Default Provider Selection', () => {
    it('should return openai as default provider when no env vars set', () => {
      delete process.env.LLM_PROVIDER;
      delete process.env.OLLAMA_BASE_URL;
      
      const provider = getLLMProvider();
      expect(provider).toBe('openai');
    });

    it('should return azure-openai when LLM_PROVIDER is set', () => {
      process.env.LLM_PROVIDER = 'azure-openai';
      
      const provider = getLLMProvider();
      expect(provider).toBe('azure-openai');
    });

    it('should return google when LLM_PROVIDER is set to google', () => {
      process.env.LLM_PROVIDER = 'google';
      
      const provider = getLLMProvider();
      expect(provider).toBe('google');
    });

    it('should prioritize OLLAMA_BASE_URL over LLM_PROVIDER', () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
      
      const provider = getLLMProvider();
      expect(provider).toBe('ollama');
    });
  });

  describe('Feature-specific Model Configuration', () => {
    it('should return extract model config with defaults', () => {
      const config = getModelConfig('extract');
      
      expect(config).toEqual({
        provider: 'openai',
        modelName: 'gpt-4o-mini',
        fallbackProvider: 'anthropic',
        fallbackModel: 'claude-3-5-sonnet-20241022'
      });
    });

    it('should return embedding model config with defaults', () => {
      const config = getModelConfig('embedding');
      
      expect(config).toEqual({
        provider: 'openai',
        modelName: 'text-embedding-3-small',
        fallbackProvider: undefined,
        fallbackModel: undefined
      });
    });

    it('should override extract config with environment variables', () => {
      process.env.EXTRACT_MODEL_PROVIDER = 'azure-openai';
      process.env.EXTRACT_MODEL_NAME = 'gpt-4o';
      process.env.EXTRACT_RETRY_MODEL_PROVIDER = 'google';
      process.env.EXTRACT_RETRY_MODEL_NAME = 'gemini-2.0-pro';
      
      const config = getModelConfig('extract');
      
      expect(config).toEqual({
        provider: 'azure-openai',
        modelName: 'gpt-4o',
        fallbackProvider: 'google',
        fallbackModel: 'gemini-2.0-pro'
      });
    });

    it('should override embedding config with environment variables', () => {
      process.env.EMBEDDING_MODEL_PROVIDER = 'azure-openai';
      process.env.EMBEDDING_MODEL_NAME = 'text-embedding-3-large';
      
      const config = getModelConfig('embedding');
      
      expect(config).toEqual({
        provider: 'azure-openai',
        modelName: 'text-embedding-3-large',
        fallbackProvider: undefined,
        fallbackModel: undefined
      });
    });

    it('should respect global LLM_MODEL_OVERRIDE', () => {
      process.env.LLM_MODEL_OVERRIDE = 'gpt-4o';
      
      const extractConfig = getModelConfig('extract');
      const embeddingConfig = getModelConfig('embedding');
      
      expect(extractConfig.modelName).toBe('gpt-4o');
      expect(embeddingConfig.modelName).toBe('gpt-4o');
    });
  });

  describe('Azure OpenAI Configuration', () => {
    it('should return Azure OpenAI config when provider is azure-openai', () => {
      process.env.LLM_PROVIDER = 'azure-openai';
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = 'gpt-4o-deployment';
      
      const config = getModelConfig('extract');
      
      expect(config.provider).toBe('azure-openai');
      expect(config.modelName).toBe('gpt-4o-deployment');
    });

    it('should use deployment name for Azure OpenAI embeddings', () => {
      process.env.EMBEDDING_MODEL_PROVIDER = 'azure-openai';
      process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME = 'text-embedding-deployment';
      
      const config = getModelConfig('embedding');
      
      expect(config.provider).toBe('azure-openai');
      expect(config.modelName).toBe('text-embedding-deployment');
    });
  });

  describe('Google Gemini Configuration', () => {
    it('should return Google config with custom model', () => {
      process.env.LLM_PROVIDER = 'google';
      process.env.GOOGLE_GEMINI_MODEL = 'gemini-2.0-pro';
      
      const config = getModelConfig('extract');
      
      expect(config.provider).toBe('google');
      expect(config.modelName).toBe('gemini-2.0-pro');
    });

    it('should use vertex project ID when configured', () => {
      process.env.LLM_PROVIDER = 'vertex';
      process.env.VERTEX_PROJECT_ID = 'my-project';
      
      const config = getModelConfig('extract');
      
      expect(config.provider).toBe('vertex');
    });
  });

  describe('Model Resolution', () => {
    it('should resolve model instance for openai provider', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const model = getModelForFeature('extract');
      
      expect(model).toBeDefined();
      expect(model.modelId).toContain('gpt-4o-mini');
    });

    it('should resolve model instance for azure-openai provider', () => {
      process.env.LLM_PROVIDER = 'azure-openai';
      process.env.AZURE_OPENAI_API_KEY = 'test-key';
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com/';
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = 'gpt-4o';
      
      const model = getModelForFeature('extract');
      
      expect(model).toBeDefined();
      expect(model.modelId).toContain('gpt-4o');
    });

    it('should resolve model instance for google provider', () => {
      process.env.LLM_PROVIDER = 'google';
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
      process.env.GOOGLE_GEMINI_MODEL = 'gemini-2.0-pro';
      
      const model = getModelForFeature('extract');
      
      expect(model).toBeDefined();
      expect(model.modelId).toContain('gemini-2.0-pro');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown feature', () => {
      expect(() => {
        getModelConfig('unknown-feature');
      }).toThrow('Unknown feature: unknown-feature');
    });

    it('should throw error for unsupported provider', () => {
      process.env.LLM_PROVIDER = 'invalid-provider';
      
      expect(() => {
        getLLMProvider();
      }).toThrow('Unsupported LLM provider: invalid-provider');
    });

    it('should throw error when Azure OpenAI keys are missing', () => {
      process.env.LLM_PROVIDER = 'azure-openai';
      delete process.env.AZURE_OPENAI_API_KEY;
      
      expect(() => {
        getModelForFeature('extract');
      }).toThrow('Azure OpenAI API key is required');
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should use fallback model when primary model fails', () => {
      process.env.EXTRACT_MODEL_PROVIDER = 'anthropic';
      process.env.EXTRACT_MODEL_NAME = 'claude-3-5-sonnet-20241022';
      process.env.EXTRACT_RETRY_MODEL_PROVIDER = 'openai';
      process.env.EXTRACT_RETRY_MODEL_NAME = 'gpt-4o';
      
      const config = getModelConfig('extract');
      
      expect(config.fallbackProvider).toBe('openai');
      expect(config.fallbackModel).toBe('gpt-4o');
    });
  });
});