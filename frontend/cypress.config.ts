import { defineConfig } from 'cypress'
import { loadEnv } from 'vite'
import path from 'path'

const env: Record<string, string> = loadEnv('development', path.dirname(__filename), '')
const port: string = env.VITE_DEV_PORT || '5173'
const apiBaseUrl: string = env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const baseUrl: string = `http://localhost:${port}`

export default defineConfig({
  projectId: 'qubit-e2e',
  e2e: {
    baseUrl,
    viewportWidth: 1280,
    viewportHeight: 720,
    // timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    // retries
    retries: {
      runMode: 2,
      openMode: 0,
    },
    // setup
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    // environment variables accessible in tests
    env: {
      apiBaseUrl,
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.ts',
  },
})