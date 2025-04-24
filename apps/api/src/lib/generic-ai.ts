import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider";
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { fireworks } from "@ai-sdk/fireworks";
import { deepinfra } from "@ai-sdk/deepinfra";
import { createVertex } from "@ai-sdk/google-vertex";

export type Provider =
  | "openai"
  | "ollama"
  | "anthropic"
  | "groq"
  | "google"
  | "openrouter"
  | "fireworks"
  | "deepinfra"
  | "vertex";
// 環境変数からプロバイダを決定（MODEL_PROVIDER > OLLAMA_BASE_URL > デフォルト値）
const defaultProvider: Provider = process.env.MODEL_PROVIDER as Provider || 
  (process.env.OLLAMA_BASE_URL ? "ollama" : "openai");

const providerList: Record<Provider, any> = {
  openai, //OPENAI_API_KEY
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
    project: "firecrawl",
    location: "us-central1",
    googleAuthOptions: process.env.VERTEX_CREDENTIALS ? {
      credentials: JSON.parse(atob(process.env.VERTEX_CREDENTIALS)),
    } : {
      keyFile: "./gke-key.json",
    },
  }),
};

export function getModel(name: string, provider: Provider = defaultProvider) {
  // 環境変数から指定されたプロバイダを検証
  const selectedProvider = provider as string;
  if (!Object.keys(providerList).includes(selectedProvider)) {
    console.warn(`指定されたプロバイダ "${selectedProvider}" は無効です。デフォルトの "${defaultProvider}" を使用します。`);
    provider = defaultProvider;
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
