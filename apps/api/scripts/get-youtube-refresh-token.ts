// apps/api/scripts/get-youtube-refresh-token.ts
import { google } from 'googleapis';
import * as http from 'http';
import * as url from 'url';
import * as open from 'open';
import * as dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!; // must be http://localhost:4000/oauth2/callback

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI in .env');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const scopes = ['https://www.googleapis.com/auth/youtube.upload'];

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent',
});

(async () => {
  // Start a tiny callback server
  const server = http.createServer(async (req, res) => {
    const { pathname, query } = url.parse(req.url || '', true) as any;
    if (pathname === '/oauth2/callback') {
      const code = query.code as string | undefined;
      if (!code) {
        res.statusCode = 400;
        res.end('Missing ?code param');
        return;
      }
      try {
        const { tokens } = await oauth2.getToken(code);
        res.end('✔️ Got the code! You can close this tab.');
        console.log('\nGOOGLE_REFRESH_TOKEN=', tokens.refresh_token, '\n');
      } catch (e) {
        res.statusCode = 500;
        res.end('Failed to exchange code. Check the terminal.');
        console.error(e);
      } finally {
        server.close();
      }
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  server.listen(4000, async () => {
    console.log('\nListening on http://localhost:4000 …');
    console.log('Opening browser to:', authUrl, '\n');
    await open.default(authUrl);
  });
})();

