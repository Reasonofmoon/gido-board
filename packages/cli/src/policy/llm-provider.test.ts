import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  callLLM,
  detectLLMConfig,
  LLMProviderError,
  type LLMMessage,
} from './llm-provider.js';

const ENV_KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GIDO_MODEL'] as const;
const originalEnvironment = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
) as Record<(typeof ENV_KEYS)[number], string | undefined>;
const originalFetch = globalThis.fetch;

type TestEnvironment = Partial<Record<(typeof ENV_KEYS)[number], string>>;

function setEnvironment(environment: TestEnvironment): void {
  for (const key of ENV_KEYS) {
    const value = environment[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function messages(): LLMMessage[] {
  return [
    { role: 'system', content: 'You are a code strategist.' },
    { role: 'user', content: 'Suggest the next move.' },
  ];
}

afterEach(() => {
  setEnvironment(originalEnvironment);
  globalThis.fetch = originalFetch;
});

describe('LLM provider model lifecycle', () => {
  it('uses Claude Sonnet 5 as the Anthropic default model', () => {
    setEnvironment({ ANTHROPIC_API_KEY: 'anthropic-test-key' });

    assert.deepEqual(detectLLMConfig(), {
      provider: 'anthropic',
      apiKey: 'anthropic-test-key',
      model: 'claude-sonnet-5',
      maxTokens: 4096,
    });
  });

  it('uses GPT-5 as the OpenAI default model', () => {
    setEnvironment({ OPENAI_API_KEY: 'openai-test-key' });

    assert.deepEqual(detectLLMConfig(), {
      provider: 'openai',
      apiKey: 'openai-test-key',
      model: 'gpt-5',
      maxTokens: 4096,
    });
  });

  it('trims and applies a validated GIDO_MODEL override', () => {
    setEnvironment({
      OPENAI_API_KEY: 'openai-test-key',
      GIDO_MODEL: '  gpt-5-mini  ',
    });

    assert.equal(detectLLMConfig().model, 'gpt-5-mini');
  });

  it('rejects an empty GIDO_MODEL override', () => {
    setEnvironment({
      OPENAI_API_KEY: 'openai-test-key',
      GIDO_MODEL: '   ',
    });

    assert.throws(() => detectLLMConfig(), /Invalid LLM environment configuration.*GIDO_MODEL/);
  });

  it('calls the OpenAI Responses API and parses output text and usage', async () => {
    const requests: { input: RequestInfo | URL; init: RequestInit | undefined }[] = [];
    globalThis.fetch = async (input, init) => {
      requests.push({ input, init });
      return response({
        model: 'gpt-5',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: '[{"id":"move-1"}]' }],
          },
        ],
        usage: { input_tokens: 8, output_tokens: 3 },
      });
    };

    const result = await callLLM(
      { provider: 'openai', apiKey: 'openai-test-key', model: 'gpt-5', maxTokens: 256 },
      messages()
    );

    assert.equal(requests.length, 1);
    assert.equal(String(requests[0].input), 'https://api.openai.com/v1/responses');
    assert.deepEqual(JSON.parse(String(requests[0].init?.body)), {
      model: 'gpt-5',
      max_output_tokens: 256,
      input: messages(),
    });
    assert.deepEqual(result, {
      content: '[{"id":"move-1"}]',
      model: 'gpt-5',
      usage: { inputTokens: 8, outputTokens: 3 },
    });
  });

  it('parses Anthropic text output and usage without unsafe casts', async () => {
    globalThis.fetch = async () => response({
      model: 'claude-sonnet-5',
      content: [{ type: 'text', text: 'anthropic result' }],
      usage: { input_tokens: 5, output_tokens: 4 },
    });

    const result = await callLLM(
      { provider: 'anthropic', apiKey: 'anthropic-test-key', model: 'claude-sonnet-5', maxTokens: 256 },
      messages()
    );

    assert.deepEqual(result, {
      content: 'anthropic result',
      model: 'claude-sonnet-5',
      usage: { inputTokens: 5, outputTokens: 4 },
    });
  });

  it('reports an OpenAI response parsing error when no text output is present', async () => {
    globalThis.fetch = async () => response({
      model: 'gpt-5',
      output: [{ type: 'message', role: 'assistant', content: [] }],
    });

    await assert.rejects(
      () => callLLM({ provider: 'openai', apiKey: 'openai-test-key', model: 'gpt-5' }, messages()),
      /OpenAI response parse error/
    );
  });

  it('reports an Anthropic response parsing error for malformed content', async () => {
    globalThis.fetch = async () => response({
      model: 'claude-sonnet-5',
      content: [{ type: 'tool_use', input: {} }],
    });

    await assert.rejects(
      () => callLLM({ provider: 'anthropic', apiKey: 'anthropic-test-key', model: 'claude-sonnet-5' }, messages()),
      /Anthropic response parse error/
    );
  });

  it('reports provider-specific HTTP errors with status and API message', async () => {
    const cases: {
      provider: 'anthropic' | 'openai';
      apiKey: string;
      model: string;
      label: 'Anthropic' | 'OpenAI';
      status: number;
      message: string;
    }[] = [
      {
        provider: 'anthropic',
        apiKey: 'anthropic-test-key',
        model: 'claude-sonnet-5',
        label: 'Anthropic',
        status: 401,
        message: 'invalid api key',
      },
      {
        provider: 'openai',
        apiKey: 'openai-test-key',
        model: 'gpt-5',
        label: 'OpenAI',
        status: 429,
        message: 'rate limit exceeded',
      },
    ];

    for (const testCase of cases) {
      globalThis.fetch = async () => response({ error: { message: testCase.message } }, testCase.status);

      await assert.rejects(
        () => callLLM(testCase, messages()),
        (error: unknown) => {
          if (!(error instanceof LLMProviderError)) return false;
          assert.equal(error.provider, testCase.provider);
          assert.equal(error.status, testCase.status);
          assert.equal(
            error.message,
            `${testCase.label} API error (${testCase.status}): ${testCase.message}`
          );
          return true;
        }
      );
    }
  });

  it('rejects an LLM config without an API key before making a request', async () => {
    globalThis.fetch = async () => {
      throw new Error('fetch should not be called');
    };

    await assert.rejects(
      () => callLLM({ provider: 'openai', apiKey: '', model: 'gpt-5' }, messages()),
      /Invalid LLM configuration/
    );
  });
});
