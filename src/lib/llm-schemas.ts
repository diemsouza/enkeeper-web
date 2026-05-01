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
  transcription_type: z.enum(['text', 'description']),
  content: z.string(),
});

export type VisionResult = z.infer<typeof visionSchema>;

export const docProcessingSchema = z.object({
  title: z.string(),
  topics: z.array(z.string()),
  content: z.string(),
  approach: z.enum(["memorize", "understand", "practice", "discuss", "reflect"]),
  approachConfidence: z.enum(["high", "medium", "low"]),
  isValid: z.boolean(),
  invalidReason: z.string().nullable(),
});

export type DocProcessingResult = z.infer<typeof docProcessingSchema>;
