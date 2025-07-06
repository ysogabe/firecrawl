# Google Gemini Models Guide for Firecrawl

## Available Models (as of July 2025)

### Production-Ready Models

#### 1. **Gemini 2.5 Flash** (RECOMMENDED)
- **Model ID**: `gemini-2.5-flash`
- **Best for**: General-purpose use, excellent price-performance ratio
- **Features**: Adaptive thinking, multimodal support (text, image, video, audio)
- **Context**: 1M tokens input, 65K tokens output
- **Pricing**: $0.30/1M input tokens, $2.50/1M output tokens
- **Use cases**: Extract, Research, LLMs.txt generation

#### 2. **Gemini 2.5 Pro**
- **Model ID**: `gemini-2.5-pro`
- **Best for**: Complex reasoning, advanced analysis
- **Features**: Enhanced thinking, state-of-the-art performance
- **Context**: 1M tokens input, 65K tokens output
- **Pricing**: $1.25-2.50/1M input tokens, $10-15/1M output tokens
- **Use cases**: Complex research, advanced extraction tasks

#### 3. **Gemini 2.0 Flash**
- **Model ID**: `gemini-2.0-flash`
- **Best for**: Fast responses, next-gen features
- **Features**: Superior speed, native tool use
- **Context**: 1M tokens input, 8K tokens output
- **Pricing**: $0.10/1M input tokens, $0.40/1M output tokens
- **Use cases**: High-speed processing, real-time applications

#### 4. **Gemini 2.0 Flash-Lite**
- **Model ID**: `gemini-2.0-flash-lite`
- **Best for**: High-volume, cost-sensitive applications
- **Features**: Lowest cost, good performance
- **Context**: 1M tokens input, 8K tokens output
- **Pricing**: $0.075/1M input tokens, $0.30/1M output tokens
- **Use cases**: Bulk processing, simple extraction tasks

#### 5. **Gemini 1.5 Flash** (Stable fallback)
- **Model ID**: `gemini-1.5-flash`
- **Best for**: Proven stability, versatile performance
- **Features**: Well-tested, reliable
- **Context**: 1M tokens input, 8K tokens output
- **Pricing**: $0.075-0.15/1M input tokens, $0.30-0.60/1M output tokens
- **Use cases**: Production systems requiring stability

### Embedding Models

#### 1. **Text Embedding 004** (RECOMMENDED)
- **Model ID**: `text-embedding-004`
- **Features**: State-of-the-art quality, 768 dimensions
- **Max input**: 2,048 tokens
- **Pricing**: Free in free tier
- **Use cases**: Semantic search, similarity matching

#### 2. **Embedding 001**
- **Model ID**: `embedding-001`
- **Features**: Basic embeddings, 768 dimensions
- **Max input**: 2,048 tokens
- **Pricing**: Free in free tier
- **Use cases**: Standard embedding tasks

### Preview/Experimental Models

#### 1. **Gemini 2.5 Flash-Lite Preview**
- **Model ID**: `gemini-2.5-flash-lite-preview-06-17`
- **Features**: Ultra-low cost, preview features
- **Context**: 1M tokens input, 64K tokens output
- **Pricing**: $0.10/1M input tokens, $0.40/1M output tokens
- **Note**: May change, use with caution

## Configuration Examples

### Balanced Configuration (Recommended)
```env
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
EXTRACT_MODEL_NAME=gemini-2.5-flash
EMBEDDING_MODEL_NAME=text-embedding-004
RESEARCH_MODEL_NAME=gemini-2.5-flash
LLMSTXT_MODEL_NAME=gemini-2.5-flash
```

### High Performance Configuration
```env
GOOGLE_GEMINI_MODEL=gemini-2.5-pro
EXTRACT_MODEL_NAME=gemini-2.5-pro
EMBEDDING_MODEL_NAME=text-embedding-004
RESEARCH_MODEL_NAME=gemini-2.5-pro
LLMSTXT_MODEL_NAME=gemini-2.5-pro
```

### Cost-Optimized Configuration
```env
GOOGLE_GEMINI_MODEL=gemini-2.0-flash-lite
EXTRACT_MODEL_NAME=gemini-2.0-flash-lite
EMBEDDING_MODEL_NAME=text-embedding-004
RESEARCH_MODEL_NAME=gemini-2.0-flash-lite
LLMSTXT_MODEL_NAME=gemini-2.0-flash-lite
```

### Stable Production Configuration
```env
GOOGLE_GEMINI_MODEL=gemini-1.5-flash
EXTRACT_MODEL_NAME=gemini-1.5-flash
EMBEDDING_MODEL_NAME=embedding-001
RESEARCH_MODEL_NAME=gemini-1.5-flash
LLMSTXT_MODEL_NAME=gemini-1.5-flash
```

## Price Override Configuration

If newer models are not in the pricing database, you can add price overrides:

```env
# Prices are in USD per million tokens
# Gemini 2.5 Flash
PRICE_OVERRIDE_INPUT_gemini-2.5-flash=0.30
PRICE_OVERRIDE_OUTPUT_gemini-2.5-flash=2.50

# Gemini 2.5 Pro
PRICE_OVERRIDE_INPUT_gemini-2.5-pro=1.25
PRICE_OVERRIDE_OUTPUT_gemini-2.5-pro=10.00

# Gemini 2.0 Flash-Lite
PRICE_OVERRIDE_INPUT_gemini-2.0-flash-lite=0.075
PRICE_OVERRIDE_OUTPUT_gemini-2.0-flash-lite=0.30
```

## Model Selection Guide

1. **For general use**: Start with `gemini-2.5-flash`
2. **For complex tasks**: Upgrade to `gemini-2.5-pro`
3. **For high volume**: Use `gemini-2.0-flash-lite`
4. **For stability**: Fallback to `gemini-1.5-flash`
5. **For embeddings**: Always use `text-embedding-004`

## Important Notes

1. All models support multimodal input (text, images, video, audio)
2. Pricing varies based on context length for some models
3. Preview models may have rate limits and can change without notice
4. The system automatically falls back to MODEL_NAME if specific feature models are not set
5. Always test new models in development before production deployment