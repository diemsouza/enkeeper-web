import z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const schemaToJson = (schema: z.ZodType<any>) => {
  const { $schema, additionalProperties, ...cleanSchema } = zodToJsonSchema(
    schema,
  ) as any;
  return cleanSchema?.properties;
};

export const schemaToJsonLite = (schema: z.ZodType<any>): any => {
  if (schema instanceof z.ZodString) return "";
  if (schema instanceof z.ZodBoolean) return false;
  if (schema instanceof z.ZodNumber) return 0;
  if (schema instanceof z.ZodNull) return null;

  if (schema instanceof z.ZodNullable) {
    return schemaToJsonLite(schema.unwrap());
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    return Object.fromEntries(
      Object.entries(shape).map(([key, value]) => [
        key,
        schemaToJsonLite(value as z.ZodType<any>),
      ]),
    );
  }

  if (
    schema instanceof z.ZodUnion ||
    schema instanceof z.ZodDiscriminatedUnion
  ) {
    return schemaToJsonLite((schema.options as z.ZodType<any>[])[0]);
  }

  return null;
};

export const visionSchema = z.object({
  status: z.enum(["ok", "blocked", "unreadable"]),
  transcription_type: z.enum(["text", "description", ""]),
  content: z.string(),
  status_message: z.string(),
});

export type VisionResult = z.infer<typeof visionSchema>;

export const docProcessingSchema = z.object({
  title: z.string(),
  level: z.enum(["basic", "intermediate", "advanced"]),
  isValid: z.boolean(),
  invalidReason: z.string().nullable(),
  content: z.string(),
});

export type DocProcessingResult = z.infer<typeof docProcessingSchema>;

export const topicValidationSchema = z.object({
  isValid: z.boolean(),
  invalidReason: z.string().nullable(),
  focusSuggestions: z.array(z.object({ key: z.string(), label: z.string() })),
  subtopics: z.array(z.string()),
});

export type TopicValidationResult = z.infer<typeof topicValidationSchema>;

export const focusContentSchema = z.object({
  isValid: z.boolean(),
  invalidReason: z.string().nullable(),
  tooManyFocus: z.boolean(),
  focusKeys: z.array(z.string()).max(2),
  title: z.string(),
  level: z.enum(["basic", "intermediate", "advanced"]),
  content: z.string(),
});

export type FocusContentResult = z.infer<typeof focusContentSchema>;

export const sectionQuestionSchema = z.object({
  question: z.string(),
  answerKeys: z.array(z.string()),
  questionFormat: z.string().nullable(),
  questionOptions: z.array(z.string()),
  term: z.string().nullable(),
  termHint: z.string().nullable(),
  meaning: z.string().nullable(),
  sourceContent: z.string().nullable(),
  warning: z.string().nullable(),
});

export type SectionQuestionResult = z.infer<typeof sectionQuestionSchema>;

export const sectionQuestionsSchema = z.object({
  questions: z.array(sectionQuestionSchema),
});

export const answerEvaluationSchema = z.object({
  status: z.enum(["right", "partial", "wrong"]),
  feedback: z.string(),
  right_answer: z.string().nullable(),
  user_unknown: z.boolean().nullable(),
  eval_tip_class: z.enum([
    "calque",
    "near_synonym",
    "structure",
    "collocation",
    "literal_idiom",
    "register",
    "spelling",
    "none",
  ]),
  eval_tip: z.string().nullable(),
});

export type AnswerEvaluationResult = z.infer<typeof answerEvaluationSchema>;
