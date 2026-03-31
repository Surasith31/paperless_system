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
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().min(1, "UPLOAD_DIR is required"),
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
export const NODE_ENV: string = env.NODE_ENV;
export const DATABASE_URL: string = env.DATABASE_URL;
export const JWT_SECRET: string = env.JWT_SECRET;
export const JWT_EXPIRES_IN: string = env.JWT_EXPIRES_IN;
export const NEXT_PUBLIC_APP_URL: string = env.NEXT_PUBLIC_APP_URL;
export const UPLOAD_DIR: string = env.UPLOAD_DIR;
