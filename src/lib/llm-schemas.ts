import { Warning } from "postcss";
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
  transcription_type: z.enum(["text", "description"]),
  content: z.string(),
});

export type VisionResult = z.infer<typeof visionSchema>;

export const docProcessingSchema = z.object({
  title: z.string(),
  level: z.enum(["basic", "intermediate", "advanced"]),
  isValid: z.boolean(),
  invalidReason: z.string().nullable(),
  sections: z.array(
    z.object({
      title: z.string(),
      sectionType: z.enum(["vocabulary", "text", "exercise"]),
      order: z.number().int(),
      content: z.string(),
    }),
  ),
});

export type DocProcessingResult = z.infer<typeof docProcessingSchema>;

export const sectionQuestionSchema = z.object({
  sourceItem: z.string().optional(),
  question: z.string(),
  answerKeys: z.array(z.string()),
  questionFormat: z.string().optional(),
  questionOptions: z.array(z.string()).default([]),
  warning: z.string().optional(),
});

export type SectionQuestionResult = z.infer<typeof sectionQuestionSchema>;

export const sectionQuestionsSchema = z.object({
  questions: z.array(sectionQuestionSchema),
});

export const answerEvaluationSchema = z.object({
  status: z.enum(["right", "partial", "wrong"]),
  feedback: z.string(),
  user_unknown: z.boolean().optional(),
});

export type AnswerEvaluationResult = z.infer<typeof answerEvaluationSchema>;
