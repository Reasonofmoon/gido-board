/**
 * 碁道코딩 — LLM Provider Abstraction
 *
 * Provides a unified interface for calling LLM APIs (Claude / OpenAI).
 * Falls back to heuristic-based action generation when no API key is available.
 *
 * This is the "정책 네트워크(Policy Network)" input layer.
 */

import { z } from 'zod';
import {
  anthropicResponseSchema,
  llmConfigSchema,
  llmEnvironmentSchema,
  openAIResponseSchema,
  type LLMConfig,
  type OpenAIResponse,
} from './llm-provider.schema.js';

export type { LLMConfig } from './llm-provider.schema.js';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export type RemoteLLMProvider = Exclude<LLMConfig['provider'], 'heuristic'>;

export const DEFAULT_LLM_MODELS: Record<RemoteLLMProvider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5',
};

const DEFAULT_MAX_TOKENS = 4096;

function providerDisplayName(provider: RemoteLLMProvider): string {
  return provider === 'anthropic' ? 'Anthropic' : 'OpenAI';
}

export class LLMConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMConfigurationError';
  }
}

export class LLMProviderError extends Error {
  readonly provider: RemoteLLMProvider;
  readonly status: number | undefined;

  constructor(provider: RemoteLLMProvider, message: string, status?: number) {
    super(message);
    this.name = 'LLMProviderError';
    this.provider = provider;
    this.status = status;
  }
}

export class LLMResponseParseError extends LLMProviderError {
  constructor(provider: RemoteLLMProvider, message: string) {
    super(provider, `${providerDisplayName(provider)} response parse error: ${message}`);
    this.name = 'LLMResponseParseError';
  }
}

function formatValidationIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
    .join('; ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatApiErrorBody(body: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) return 'empty response body';

  try {
    const parsed: unknown = JSON.parse(trimmedBody) as unknown;
    if (isRecord(parsed)) {
      const error = parsed.error;
      if (isRecord(error) && typeof error.message === 'string') {
        return error.message;
      }
      if (typeof parsed.message === 'string') return parsed.message;
    }
  } catch {
    // Preserve non-JSON provider error bodies as-is.
  }

  return trimmedBody;
}

async function parseJsonResponse(
  response: Response,
  provider: RemoteLLMProvider
): Promise<unknown> {
  const body = await response.text();

  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'invalid JSON';
    throw new LLMResponseParseError(provider, `invalid JSON response: ${detail}`);
  }
}

async function assertSuccessfulResponse(
  response: Response,
  provider: RemoteLLMProvider
): Promise<void> {
  if (response.ok) return;

  const body = await response.text();
  const providerName = providerDisplayName(provider);
  throw new LLMProviderError(
    provider,
    `${providerName} API error (${response.status}): ${formatApiErrorBody(body)}`,
    response.status
  );
}

function resolveConfig(config: LLMConfig): ResolvedLLMConfig {
  const parsed = llmConfigSchema.safeParse(config);
  if (!parsed.success) {
    throw new LLMConfigurationError(
      `Invalid LLM configuration: ${formatValidationIssues(parsed.error)}`
    );
  }

  const provider = parsed.data.provider;
  if (provider === 'heuristic') {
    throw new LLMConfigurationError('Heuristic mode — no LLM call available');
  }

  const apiKey = parsed.data.apiKey;
  if (!apiKey) {
    throw new LLMConfigurationError(
      `Invalid LLM configuration: ${provider} provider requires an API key`
    );
  }

  return {
    provider,
    apiKey,
    model: parsed.data.model ?? DEFAULT_LLM_MODELS[provider],
    maxTokens: parsed.data.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
}

interface ResolvedLLMConfig {
  provider: RemoteLLMProvider;
  apiKey: string;
  model: string;
  maxTokens: number;
}

/**
 * Detect available LLM provider from environment variables.
 */
export function detectLLMConfig(environment: NodeJS.ProcessEnv = process.env): LLMConfig {
  const parsed = llmEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new LLMConfigurationError(
      `Invalid LLM environment configuration: ${formatValidationIssues(parsed.error)}`
    );
  }

  const { ANTHROPIC_API_KEY, OPENAI_API_KEY, GIDO_MODEL } = parsed.data;

  if (ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      apiKey: ANTHROPIC_API_KEY,
      model: GIDO_MODEL ?? DEFAULT_LLM_MODELS.anthropic,
      maxTokens: DEFAULT_MAX_TOKENS,
    };
  }

  if (OPENAI_API_KEY) {
    return {
      provider: 'openai',
      apiKey: OPENAI_API_KEY,
      model: GIDO_MODEL ?? DEFAULT_LLM_MODELS.openai,
      maxTokens: DEFAULT_MAX_TOKENS,
    };
  }

  return { provider: 'heuristic' };
}

/**
 * Call the LLM API with the given messages.
 * Uses native fetch — no SDK dependency.
 */
export async function callLLM(
  config: LLMConfig,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  const resolvedConfig = resolveConfig(config);

  if (resolvedConfig.provider === 'anthropic') {
    return callAnthropic(resolvedConfig, messages);
  }

  return callOpenAI(resolvedConfig, messages);
}

async function callAnthropic(
  config: ResolvedLLMConfig,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  const systemMsg = messages.find((message) => message.role === 'system');
  const userMsgs = messages.filter((message) => message.role !== 'system');

  const body = {
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemMsg?.content ?? '',
    messages: userMsgs.map((message) => ({ role: message.role, content: message.content })),
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  await assertSuccessfulResponse(response, 'anthropic');
  const payload = await parseJsonResponse(response, 'anthropic');
  const parsed = anthropicResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LLMResponseParseError('anthropic', formatValidationIssues(parsed.error));
  }

  const textBlock = parsed.data.content.find(
    (contentBlock) => contentBlock.type === 'text' && contentBlock.text !== undefined
  );
  if (!textBlock || textBlock.text === undefined) {
    throw new LLMResponseParseError('anthropic', 'response did not contain a text content block');
  }

  return {
    content: textBlock.text,
    model: parsed.data.model ?? config.model,
    usage: parsed.data.usage
      ? {
        inputTokens: parsed.data.usage.input_tokens,
        outputTokens: parsed.data.usage.output_tokens,
      }
      : undefined,
  };
}

function extractOpenAIText(response: OpenAIResponse): string | undefined {
  if (response.output_text !== undefined) return response.output_text;

  const textParts: string[] = [];
  let hasTextOutput = false;

  for (const outputItem of response.output ?? []) {
    for (const contentItem of outputItem.content ?? []) {
      if (contentItem.type === 'output_text' && contentItem.text !== undefined) {
        hasTextOutput = true;
        textParts.push(contentItem.text);
      }
    }
  }

  return hasTextOutput ? textParts.join('') : undefined;
}

async function callOpenAI(
  config: ResolvedLLMConfig,
  messages: LLMMessage[]
): Promise<LLMResponse> {
  const body = {
    model: config.model,
    max_output_tokens: config.maxTokens,
    input: messages.map((message) => ({ role: message.role, content: message.content })),
  };

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  await assertSuccessfulResponse(response, 'openai');
  const payload = await parseJsonResponse(response, 'openai');
  const parsed = openAIResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new LLMResponseParseError('openai', formatValidationIssues(parsed.error));
  }

  const content = extractOpenAIText(parsed.data);
  if (content === undefined) {
    throw new LLMResponseParseError('openai', 'response did not contain text output');
  }

  return {
    content,
    model: parsed.data.model ?? config.model,
    usage: parsed.data.usage
      ? {
        inputTokens: parsed.data.usage.input_tokens,
        outputTokens: parsed.data.usage.output_tokens,
      }
      : undefined,
  };
}
