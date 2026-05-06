import react from '@vitejs/plugin-react'

// Export plain object to avoid typing issues in some TypeScript setups
export default {
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
} as any
