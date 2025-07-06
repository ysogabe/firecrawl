# Multiple LLM Provider Support Design Document

## 目次
1. [概要](#概要)
2. [現状分析](#現状分析)
3. [LLM利用機能一覧](#llm利用機能一覧)
4. [設計方針](#設計方針)
5. [環境変数設計](#環境変数設計)
6. [実装計画](#実装計画)
7. [ファイル別変更内容](#ファイル別変更内容)

## 概要

このドキュメントは、FirecrawlのLLMプロバイダーを複数対応（特にAzure OpenAIとGoogle Gemini）させるための設計書です。環境変数による柔軟な設定を可能にし、ハードコーディングされた値を全て除去します。

## 現状分析

### 現在サポートされているプロバイダー
- OpenAI (デフォルト)
- Anthropic (Claude)
- Google (Gemini/Vertex AI)
- Groq
- Ollama
- OpenRouter
- Fireworks
- DeepInfra

### 主な問題点
1. **ハードコーディングされたモデル名**
   - `gpt-4o-mini` (複数箇所)
   - `claude-3-5-sonnet-20240620` (リトライモデル)
   - `text-embedding-3-small` (埋め込み)
   - `gemini-2.5-pro-preview-06-05` (Gemini変換)

2. **ハードコーディングされたプロバイダー**
   - デフォルトプロバイダーが "openai" 固定
   - 各機能で特定のプロバイダーが前提

3. **その他のハードコーディング**
   - Vertex AIプロジェクト名: "firecrawl"
   - Gemini価格設定ロジック

## LLM利用機能一覧

### 1. 構造化データ抽出 (Extract)
**機能説明**: Webページから構造化データを抽出
**主要ファイル**:
- `/srv/firecrawl/apps/api/src/lib/extract/extraction-service.ts`
- `/srv/firecrawl/apps/api/src/scraper/scrapeURL/transformers/llmExtract.ts`
- `/srv/firecrawl/apps/api/src/lib/extract/completions/*.ts`
**使用モデル**: 
- メイン: `gpt-4o-mini` (ハードコーディング)
- リトライ: `claude-3-5-sonnet-20240620` (ハードコーディング)

### 2. ディープリサーチ (Deep Research)
**機能説明**: AI駆動の反復的リサーチ
**主要ファイル**:
- `/srv/firecrawl/apps/api/src/lib/deep-research/deep-research-service.ts`
- `/srv/firecrawl/apps/api/src/lib/deep-research/research-manager.ts`
**使用モデル**: generateCompletions経由（設定可能だが、デフォルトはハードコーディング）

### 3. スマートスクレイピング (Smart Scrape)
**機能説明**: AIガイドによる複雑なウェブサイトのナビゲーション
**主要ファイル**:
- `/srv/firecrawl/apps/api/src/scraper/scrapeURL/lib/smartScrape.ts`
- `/srv/firecrawl/apps/api/src/scraper/scrapeURL/lib/extractSmartScrape.ts`
**使用モデル**: エージェント機能経由

### 4. 埋め込みとランキング (Embeddings & Ranking)
**機能説明**: 検索結果のランキング
**主要ファイル**:
- `/srv/firecrawl/apps/api/src/lib/ranker.ts`
- `/srv/firecrawl/apps/api/src/lib/extract/reranker.ts`
**使用モデル**: `text-embedding-3-small` (ハードコーディング)

### 5. LLMs.txt生成
**機能説明**: AI対応ドキュメントの生成
**主要ファイル**:
- `/srv/firecrawl/apps/api/src/lib/generate-llmstxt/generate-llmstxt-service.ts`
**使用モデル**: `gpt-4o-mini` (ハードコーディング)

### 6. 検索機能 (Search)
**機能説明**: AI強化検索
**主要ファイル**:
- `/srv/firecrawl/apps/api/src/controllers/v1/search.ts`
**使用モデル**: 埋め込みモデル経由

## 設計方針

### 1. 環境変数による完全な設定可能性
- プロバイダー選択
- モデル選択（機能別）
- API設定（エンドポイント、認証）

### 2. 後方互換性の維持
- 既存の環境変数をサポート
- デフォルト動作の保持

### 3. Azure OpenAIとGoogle Geminiの完全サポート
- Azure特有の設定（リソース名、デプロイメント名）
- Gemini APIとVertex AIの両方をサポート

### 4. 柔軟な価格設定
- 環境変数による価格オーバーライド
- プロバイダー別の価格設定

## 環境変数設計

### グローバル設定
```env
# デフォルトLLMプロバイダー
LLM_PROVIDER=azure-openai  # openai, azure-openai, google, anthropic, etc.

# モデルオーバーライド（全機能共通）
LLM_MODEL_OVERRIDE=  # 指定時、全機能でこのモデルを使用
```

### プロバイダー別設定

#### Azure OpenAI
```env
# Azure OpenAI設定
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o  # デプロイメント名

# Azure OpenAI埋め込みモデル
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-small
```

#### Google Gemini
```env
# Google Gemini API設定
GOOGLE_GENERATIVE_AI_API_KEY=
GOOGLE_GEMINI_MODEL=gemini-2.0-pro  # gemini-1.5-pro, gemini-2.0-pro-exp, etc.

# Google Vertex AI設定（代替）
VERTEX_PROJECT_ID=your-project-id  # "firecrawl"のハードコーディングを置換
VERTEX_LOCATION=us-central1
VERTEX_CREDENTIALS=  # Base64エンコードされた認証情報
```

### 機能別モデル設定
```env
# 抽出機能
EXTRACT_MODEL_PROVIDER=azure-openai
EXTRACT_MODEL_NAME=gpt-4o
EXTRACT_RETRY_MODEL_PROVIDER=google
EXTRACT_RETRY_MODEL_NAME=gemini-2.0-pro

# 埋め込み機能
EMBEDDING_MODEL_PROVIDER=azure-openai
EMBEDDING_MODEL_NAME=text-embedding-3-small

# ディープリサーチ
RESEARCH_MODEL_PROVIDER=google
RESEARCH_MODEL_NAME=gemini-2.0-pro

# LLMs.txt生成
LLMSTXT_MODEL_PROVIDER=azure-openai
LLMSTXT_MODEL_NAME=gpt-4o-mini

# スマートスクレイピング
SMART_SCRAPE_MODEL_PROVIDER=anthropic
SMART_SCRAPE_MODEL_NAME=claude-3-5-sonnet-20241022
```

### 価格設定オーバーライド
```env
# カスタム価格設定（1Mトークンあたりのドル）
PRICE_OVERRIDE_INPUT_gpt-4o=5.00
PRICE_OVERRIDE_OUTPUT_gpt-4o=15.00
PRICE_OVERRIDE_INPUT_gemini-2.0-pro=1.25
PRICE_OVERRIDE_OUTPUT_gemini-2.0-pro=5.00
```

## 実装計画

### フェーズ1: コア基盤の更新

#### 1.1 generic-ai.tsの拡張
```typescript
// Azure OpenAIプロバイダーの追加
type Provider = 
  | "openai"
  | "azure-openai"  // 新規追加
  | "ollama"
  | "anthropic"
  | "groq"
  | "google"
  | "openrouter"
  | "fireworks"
  | "deepinfra"
  | "vertex";

// 環境変数ベースのデフォルトプロバイダー
const defaultProvider: Provider = process.env.LLM_PROVIDER as Provider || "openai";

// Azure OpenAI設定
const providerList: Record<Provider, any> = {
  // ... 既存プロバイダー
  "azure-openai": createAzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    baseURL: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
  }),
  // ...
};
```

#### 1.2 モデル設定システムの作成
新規ファイル: `/srv/firecrawl/apps/api/src/lib/llm-config.ts`
```typescript
export interface ModelConfig {
  provider: Provider;
  modelName: string;
  fallbackProvider?: Provider;
  fallbackModel?: string;
}

export function getModelConfig(feature: string): ModelConfig {
  // 環境変数から機能別設定を取得
}
```

### フェーズ2: ハードコーディング除去

#### 2.1 llmExtract.tsの修正
```typescript
// Before:
model = getModel("gpt-4o-mini", "openai")

// After:
const config = getModelConfig("extract");
model = getModel(config.modelName, config.provider)
```

#### 2.2 ranker.tsの修正
```typescript
// Before:
model: getEmbeddingModel("text-embedding-3-small")

// After:
const config = getModelConfig("embedding");
model: getEmbeddingModel(config.modelName, config.provider)
```

#### 2.3 価格設定の外部化
```typescript
// model-prices.tsの修正
export function getModelPrice(model: string, provider: string) {
  // 環境変数によるオーバーライドをチェック
  const inputOverride = process.env[`PRICE_OVERRIDE_INPUT_${model}`];
  const outputOverride = process.env[`PRICE_OVERRIDE_OUTPUT_${model}`];
  
  if (inputOverride && outputOverride) {
    return {
      input_cost: parseFloat(inputOverride),
      output_cost: parseFloat(outputOverride)
    };
  }
  
  // デフォルト価格を返す
  return modelPrices[model] || defaultPrice;
}
```

### フェーズ3: 環境変数と設定の更新

#### 3.1 .env.exampleの更新
```env
# ===== LLM Configuration =====

## Global LLM Settings
# Default LLM provider for all features
# Options: openai, azure-openai, google, anthropic, groq, ollama, etc.
LLM_PROVIDER=openai

# Override all features to use this model (optional)
# LLM_MODEL_OVERRIDE=gpt-4o

## Azure OpenAI Configuration
# Required if using azure-openai as provider
# AZURE_OPENAI_API_KEY=
# AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
# AZURE_OPENAI_API_VERSION=2024-02-01
# AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
# AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-3-small

## Google Configuration
# For Gemini API
# GOOGLE_GENERATIVE_AI_API_KEY=
# GOOGLE_GEMINI_MODEL=gemini-2.0-pro

# For Vertex AI
# VERTEX_PROJECT_ID=your-project-id
# VERTEX_LOCATION=us-central1
# VERTEX_CREDENTIALS=base64-encoded-credentials

## Feature-specific Model Configuration
# Extract Feature
# EXTRACT_MODEL_PROVIDER=azure-openai
# EXTRACT_MODEL_NAME=gpt-4o
# EXTRACT_RETRY_MODEL_PROVIDER=google
# EXTRACT_RETRY_MODEL_NAME=gemini-2.0-pro

# ... 他の機能別設定
```

## ファイル別変更内容

### コアファイル（必須変更）

1. **`/srv/firecrawl/apps/api/src/lib/generic-ai.ts`**
   - Azure OpenAIプロバイダーの追加
   - 環境変数によるデフォルトプロバイダー設定
   - Vertex AIプロジェクト名のハードコーディング除去

2. **`/srv/firecrawl/apps/api/src/lib/llm-config.ts`** (新規作成)
   - 機能別モデル設定管理
   - 環境変数パース
   - フォールバック処理

3. **`/srv/firecrawl/apps/api/.env.example`**
   - 新しい環境変数の追加
   - ドキュメント化

### 機能別ファイル（モデル使用箇所）

#### 抽出機能
4. **`/srv/firecrawl/apps/api/src/scraper/scrapeURL/transformers/llmExtract.ts`**
   - ハードコーディングされたモデル名の除去
   - 設定ベースのモデル選択

5. **`/srv/firecrawl/apps/api/src/lib/extract/extraction-service.ts`**
   - モデル設定の適用

6. **`/srv/firecrawl/apps/api/src/lib/extract/completions/*.ts`** (全ファイル)
   - 各完了ハンドラーでの設定適用

#### 埋め込み機能
7. **`/srv/firecrawl/apps/api/src/lib/ranker.ts`**
   - ハードコーディングされた埋め込みモデルの除去

8. **`/srv/firecrawl/apps/api/src/lib/extract/reranker.ts`**
   - 設定ベースのモデル選択

#### ディープリサーチ
9. **`/srv/firecrawl/apps/api/src/lib/deep-research/research-manager.ts`**
   - モデル設定の適用

10. **`/srv/firecrawl/apps/api/src/lib/deep-research/deep-research-service.ts`**
    - 設定ベースのモデル選択

#### LLMs.txt生成
11. **`/srv/firecrawl/apps/api/src/lib/generate-llmstxt/generate-llmstxt-service.ts`**
    - ハードコーディングされたモデルの除去

#### 価格設定
12. **`/srv/firecrawl/apps/api/src/lib/extract/usage/model-prices.ts`**
    - 環境変数による価格オーバーライド
    - Gemini特殊価格ロジックの外部化

#### Fire-0バリアント（代替実装）
13-22. **`/srv/firecrawl/apps/api/src/lib/extract/fire-0/*.ts`** (全ファイル)
    - 各ファイルで同様の変更を適用

### コントローラー
23. **`/srv/firecrawl/apps/api/src/controllers/v1/extract.ts`**
24. **`/srv/firecrawl/apps/api/src/controllers/v1/search.ts`**
25. **`/srv/firecrawl/apps/api/src/controllers/v1/scrape.ts`**
26. **`/srv/firecrawl/apps/api/src/controllers/v1/generate-llmstxt.ts`**
    - 各エンドポイントでのモデル設定適用

### テストとドキュメント
27. **`/srv/firecrawl/apps/api/README.md`** (更新)
    - 新しい環境変数の説明
    - 設定例

28. **新規テストファイル**
    - モデル設定のユニットテスト
    - 各プロバイダーの統合テスト

## 移行ガイド

### 既存ユーザー向け
1. 既存の設定は引き続き動作（後方互換性）
2. 新機能を使用する場合のみ新しい環境変数を設定

### 新規ユーザー向け
1. 使用したいプロバイダーのAPIキーを設定
2. `LLM_PROVIDER`でデフォルトプロバイダーを選択
3. 必要に応じて機能別の設定をカスタマイズ

## まとめ

この設計により、以下が実現されます：
1. **完全な設定可能性**: すべてのLLM関連設定が環境変数で制御可能
2. **ハードコーディングの除去**: モデル名、プロバイダー、価格設定のハードコーディングを完全除去
3. **Azure OpenAIとGoogle Geminiの完全サポート**: 両プロバイダーの特有の設定に対応
4. **後方互換性**: 既存の設定を壊さない
5. **拡張性**: 新しいプロバイダーやモデルの追加が容易