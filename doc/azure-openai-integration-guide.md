# Azure OpenAI Service プロバイダー対応ガイド

## 1. 概要

このガイドでは、FireCrawl DeepResearchにAzure OpenAIプロバイダーを追加する実装について解説します。FireCrawlはさまざまなAIプロバイダーに対応し、環境変数を変更するだけで異なるAIモデルを使用できるようになっています。ここではAzure OpenAIサービスとの連携方法を説明します。

## 2. 実装詳細

### 2.1 依存関係

Azure OpenAIサービスを利用するために以下のパッケージをインストールしています：

```bash
npm install @ai-sdk/azure --save
```

### 2.2 プロバイダーの設定

`apps/api/src/lib/generic-ai.ts` ファイルにAzureプロバイダーを追加しました：

1. `Provider`型に`azure`を追加
2. `createAzure`のインポート
3. `providerList`に`azure`設定を追加

```typescript
// インポート
import { createAzure } from "@ai-sdk/azure";

// Provider型の拡張
export type Provider =
  | "openai"
  | "ollama"
  | "anthropic"
  | "groq"
  | "google"
  | "openrouter"
  | "fireworks"
  | "deepinfra"
  | "vertex"
  | "azure";  // Azureを追加

// providerListへの追加
const providerList: Record<Provider, any> = {
  // 他のプロバイダー設定...
  azure: createAzure({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2025-03-01-preview", 
    baseURL: process.env.AZURE_OPENAI_ENDPOINT, // カスタムエンドポイントがあれば指定
  }),
};
```

### 2.3 必要な環境変数

Azure OpenAIサービスを利用するための環境変数：

| 環境変数名 | 説明 | 例/デフォルト値 |
|------------|------|-----------------|
| `MODEL_PROVIDER` | プロバイダー指定（"azure"を指定) | "azure" |
| `MODEL_NAME` | 使用するモデル名 | "gpt-4" |
| `AZURE_OPENAI_API_KEY` | Azure OpenAIのAPIキー | *******（秘密情報） |
| `AZURE_OPENAI_RESOURCE_NAME` | リソース名 | "your-resource-name" |
| `AZURE_OPENAI_ENDPOINT` | カスタムエンドポイント（任意） | "https://your-resource.openai.azure.com" |
| `AZURE_OPENAI_API_VERSION` | APIバージョン（任意） | "2025-03-01-preview" |

## 3. Docker Composeでの設定例

docker-compose.yamlファイルでの環境変数設定例：

```yaml
services:
  worker:
    environment:
      # Azureプロバイダー指定
      MODEL_PROVIDER: "azure"
      # モデル名指定
      MODEL_NAME: "gpt-4"
      # Azure OpenAI設定
      AZURE_OPENAI_API_KEY: "${AZURE_OPENAI_API_KEY}"
      AZURE_OPENAI_RESOURCE_NAME: "your-resource-name"
      # 任意の設定
      AZURE_OPENAI_API_VERSION: "2025-03-01-preview"
```

## 4. 起動方法

Azure OpenAIサービスを使用して起動する方法：

```bash
# 環境変数ファイル（.env）から変数を読み込む場合
source .env && docker compose up -d

# コマンドラインで直接指定する場合
AZURE_OPENAI_API_KEY=your-api-key MODEL_PROVIDER=azure MODEL_NAME=gpt-4 AZURE_OPENAI_RESOURCE_NAME=your-resource docker compose up -d
```

## 5. 利用可能なモデル

Azure OpenAIサービスでは、モデル名をデプロイメント名として指定します。代表的なモデル名：

- `gpt-4`
- `gpt-4-turbo`
- `gpt-4o`
- `gpt-35-turbo`
- `text-embedding-ada-002`

注意：Azure OpenAIサービスではモデルをデプロイする必要があり、使用可能なモデルはデプロイ状況によって異なります。

## 6. テスト方法

DeepResearchのテスト実行：

```bash
# APIリクエスト例
curl -X POST http://localhost:3002/v1/deep-research -H "Content-Type: application/json" -d '{
  "topic": "Azure OpenAIサービスとOpenAIの違いと使い分け",
  "maxDepth": 1,
  "formats": ["markdown"]
}'

# 結果確認
curl -s http://localhost:3002/v1/deep-research/{jobId}
```

## 7. トラブルシューティング

- **401 Unauthorized エラー**: APIキーが正しく設定されているか確認
- **Resource not found エラー**: リソース名が正しいか確認
- **Model not deployed エラー**: 指定したモデルがAzureでデプロイされているか確認
- **API Version エラー**: サポートされているAPIバージョンを使用しているか確認

環境変数の設定ミスが最も一般的な問題です。エラーログを確認し、正しい設定値を使用してください。
