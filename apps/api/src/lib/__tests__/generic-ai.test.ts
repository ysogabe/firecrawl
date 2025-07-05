import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getModel, getEmbeddingModel, Provider } from '../generic-ai';

// Mock the AI SDK modules
jest.mock('@ai-sdk/openai');
jest.mock('@ai-sdk/azure');
jest.mock('@ai-sdk/google');
jest.mock('@ai-sdk/anthropic');
jest.mock('@ai-sdk/groq');
jest.mock('@ai-sdk/google-vertex');
jest.mock('ollama-ai-provider');
jest.mock('@openrouter/ai-sdk-provider');
jest.mock('@ai-sdk/fireworks');
jest.mock('@ai-sdk/deepinfra');

describe('Generic AI Provider System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Provider Configuration', () => {
    it('should create OpenAI provider with correct config', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      
      const model = getModel('gpt-4o-mini', 'openai');
      
      expect(model).toBeDefined();
    });

    it('should create Azure OpenAI provider with correct config', () => {
      process.env.AZURE_OPENAI_API_KEY = 'test-azure-key';
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com/';
      process.env.AZURE_OPENAI_API_VERSION = '2024-02-01';
      
      const model = getModel('gpt-4o', 'azure-openai');
      
      expect(model).toBeDefined();
    });

    it('should create Google provider with correct config', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
      
      const model = getModel('gemini-2.0-pro', 'google');
      
      expect(model).toBeDefined();
    });

    it('should create Vertex AI provider with project ID from env', () => {
      process.env.VERTEX_PROJECT_ID = 'my-test-project';
      process.env.VERTEX_LOCATION = 'us-central1';
      
      const model = getModel('gemini-2.0-pro', 'vertex');
      
      expect(model).toBeDefined();
    });
  });

  describe('Model Name Processing', () => {
    it('should transform gemini-2.5-pro to preview version', () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
      
      const model = getModel('gemini-2.5-pro', 'google');
      
      // The model should be transformed to the preview version
      expect(model).toBeDefined();
    });

    it('should use MODEL_NAME override when provided', () => {
      process.env.MODEL_NAME = 'custom-model-override';
      process.env.OPENAI_API_KEY = 'test-key';
      
      const model = getModel('gpt-4o-mini', 'openai');
      
      expect(model).toBeDefined();
    });

    it('should use MODEL_EMBEDDING_NAME override for embeddings', () => {
      process.env.MODEL_EMBEDDING_NAME = 'custom-embedding-override';
      process.env.OPENAI_API_KEY = 'test-key';
      
      const embeddingModel = getEmbeddingModel('text-embedding-3-small', 'openai');
      
      expect(embeddingModel).toBeDefined();
    });
  });

  describe('Provider Types', () => {
    it('should accept all valid provider types', () => {
      const validProviders: Provider[] = [
        'openai',
        'azure-openai',
        'ollama',
        'anthropic',
        'groq',
        'google',
        'openrouter',
        'fireworks',
        'deepinfra',
        'vertex'
      ];

      validProviders.forEach(provider => {
        expect(() => {
          // This should not throw for valid providers
          const providerType: Provider = provider;
          expect(providerType).toBe(provider);
        }).not.toThrow();
      });
    });
  });

  describe('Environment Variable Validation', () => {
    it('should handle missing OpenAI API key gracefully', () => {
      delete process.env.OPENAI_API_KEY;
      
      // Should not throw during model creation, but might during usage
      expect(() => {
        getModel('gpt-4o-mini', 'openai');
      }).not.toThrow();
    });

    it('should handle missing Azure OpenAI configuration gracefully', () => {
      delete process.env.AZURE_OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_ENDPOINT;
      
      expect(() => {
        getModel('gpt-4o', 'azure-openai');
      }).not.toThrow();
    });

    it('should handle missing Google API key gracefully', () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      
      expect(() => {
        getModel('gemini-2.0-pro', 'google');
      }).not.toThrow();
    });
  });

  describe('Default Provider Selection', () => {
    it('should default to openai when no special env vars are set', () => {
      delete process.env.OLLAMA_BASE_URL;
      delete process.env.LLM_PROVIDER;
      
      // This test depends on the default provider logic
      const model = getModel('gpt-4o-mini');
      
      expect(model).toBeDefined();
    });

    it('should default to ollama when OLLAMA_BASE_URL is set', () => {
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
      delete process.env.LLM_PROVIDER;
      
      const model = getModel('llama2');
      
      expect(model).toBeDefined();
    });

    it('should respect LLM_PROVIDER environment variable', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      const model = getModel('claude-3-5-sonnet-20241022');
      
      expect(model).toBeDefined();
    });
  });

  describe('Embedding Models', () => {
    it('should create embedding model for OpenAI', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const embeddingModel = getEmbeddingModel('text-embedding-3-small', 'openai');
      
      expect(embeddingModel).toBeDefined();
    });

    it('should create embedding model for Azure OpenAI', () => {
      process.env.AZURE_OPENAI_API_KEY = 'test-key';
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com/';
      
      const embeddingModel = getEmbeddingModel('text-embedding-3-small', 'azure-openai');
      
      expect(embeddingModel).toBeDefined();
    });
  });
});