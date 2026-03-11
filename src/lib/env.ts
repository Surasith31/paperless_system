//src/dbconnect/env.ts
import { z } from "zod";

// Schema สำหรับ environment variables
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// Type for environment variables
export type Env = z.infer<typeof envSchema>;

// Validate and export environment variables
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((err) => err.path.join(".")).join(", ");
      throw new Error(`❌ Invalid environment variables: ${missing}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Export individual values for convenience
export const {
  NODE_ENV,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  NEXT_PUBLIC_APP_URL,
} = env;
