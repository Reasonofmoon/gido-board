import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);

const tokenUsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
});

const textContentSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

export const llmProviderSchema = z.enum(['anthropic', 'openai', 'heuristic']);

export const llmConfigSchema = z.object({
  provider: llmProviderSchema,
  apiKey: nonEmptyStringSchema.optional(),
  model: nonEmptyStringSchema.optional(),
  maxTokens: z.number().int().positive().optional(),
});

export const llmEnvironmentSchema = z.object({
  ANTHROPIC_API_KEY: nonEmptyStringSchema.optional(),
  OPENAI_API_KEY: nonEmptyStringSchema.optional(),
  GIDO_MODEL: nonEmptyStringSchema.optional(),
});

export const anthropicResponseSchema = z.object({
  content: z.array(textContentSchema),
  model: nonEmptyStringSchema.optional(),
  usage: tokenUsageSchema.optional().nullable(),
});

export const openAIResponseSchema = z.object({
  model: nonEmptyStringSchema.optional(),
  output_text: z.string().optional(),
  output: z.array(z.object({
    type: z.string(),
    role: z.string().optional(),
    content: z.array(textContentSchema).optional(),
  })).optional(),
  usage: tokenUsageSchema.optional().nullable(),
});

export type LLMConfig = z.infer<typeof llmConfigSchema>;
export type AnthropicResponse = z.infer<typeof anthropicResponseSchema>;
export type OpenAIResponse = z.infer<typeof openAIResponseSchema>;
