import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  collectCoverageFrom: [
    "components/modules/exam/**/*.{ts,tsx}",
    "components/modules/subject/**/*.{ts,tsx}",
    "components/modules/chat/**/*.{ts,tsx}",
    "components/modules/documentation/**/*.{ts,tsx}",
    "lib/api/subjects.ts",
    "!components/modules/**/*.test.{ts,tsx}",
  ],
};

export default createJestConfig(config);
