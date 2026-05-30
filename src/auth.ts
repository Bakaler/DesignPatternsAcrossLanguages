import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env['DATABASE_URL'] }),

  baseURL: process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000',

  socialProviders: {
    github: {
      clientId:     process.env['GITHUB_CLIENT_ID']!,
      clientSecret: process.env['GITHUB_CLIENT_SECRET']!,
    },
    linkedin: {
      clientId:     process.env['LINKEDIN_CLIENT_ID']!,
      clientSecret: process.env['LINKEDIN_CLIENT_SECRET']!,
    },
  },

  trustedOrigins: [
    process.env['CLIENT_ORIGIN'] ?? 'http://localhost:4200',
  ],
});
