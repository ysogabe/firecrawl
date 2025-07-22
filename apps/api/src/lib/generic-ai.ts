import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider";
// Note: @ai-sdk/azure needs to be installed separately
// import { createAzure } from "@ai-sdk/azure";
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { fireworks } from "@ai-sdk/fireworks";
import { deepinfra } from "@ai-sdk/deepinfra";
import { createVertex } from "@ai-sdk/google-vertex";

export type Provider =
  | "openai"
  | "azure-openai"
  | "ollama"
  | "anthropic"
  | "groq"
  | "google"
  | "openrouter"
  | "fireworks"
  | "deepinfra"
  | "vertex";
const defaultProvider: Provider = process.env.OLLAMA_BASE_URL
  ? "ollama"
  : (process.env.LLM_PROVIDER as Provider) || "openai";

const providerList: Record<Provider, any> = {
  openai: createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
  }), //OPENAI_API_KEY
  "azure-openai": createOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: process.env.AZURE_OPENAI_ENDPOINT 
      ? `${process.env.AZURE_OPENAI_ENDPOINT}?api-version=${process.env.AZURE_OPENAI_API_VERSION || "2024-02-01"}`
      : undefined,
    // Temporary fallback to OpenAI SDK until @ai-sdk/azure is installed
  }), //AZURE_OPENAI_API_KEY (using OpenAI SDK as fallback)
  ollama: createOllama({
    baseURL: process.env.OLLAMA_BASE_URL,
  }),
  anthropic, //ANTHROPIC_API_KEY
  groq, //GROQ_API_KEY
  google, //GOOGLE_GENERATIVE_AI_API_KEY
  openrouter: createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  }),
  fireworks, //FIREWORKS_API_KEY
  deepinfra, //DEEPINFRA_API_KEY
  vertex: createVertex({
    project: process.env.VERTEX_PROJECT_ID!,
    baseURL: `https://aiplatform.googleapis.com/v1/projects/${process.env.VERTEX_PROJECT_ID}/locations/${process.env.VERTEX_LOCATION || 'global'}/publishers/google`,
    location: process.env.VERTEX_LOCATION || "global",
    googleAuthOptions: process.env.VERTEX_CREDENTIALS ? {
      credentials: JSON.parse(atob(process.env.VERTEX_CREDENTIALS)),
    } : {
      keyFile: "./gke-key.json",
    },
  }),
};

export function getModel(name: string, provider: Provider = defaultProvider) {
  if(name === "gemini-2.5-pro"){
    name = "gemini-2.5-pro"
  }
  return process.env.MODEL_NAME
    ? providerList[provider](process.env.MODEL_NAME)
    : providerList[provider](name);
}

export function getEmbeddingModel(
  name: string,
  provider: Provider = defaultProvider,
) {
  return process.env.MODEL_EMBEDDING_NAME
    ? providerList[provider].embedding(process.env.MODEL_EMBEDDING_NAME)
    : providerList[provider].embedding(name);
}
