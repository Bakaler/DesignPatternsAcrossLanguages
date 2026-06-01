import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import commentsRouter from './routes/comments';
import { pool } from './db/client';

const app = express();
const PORT = process.env['PORT'] ?? '3000';

async function runMigration() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf-8');
  await pool.query(sql);
  console.log('[db] Migration complete.');
}

app.use(helmet());
app.use(cors({
  origin:      process.env['CLIENT_ORIGIN'] ?? 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json());

// ── Better Auth — handles all /api/auth/** routes ─────────────────────────────
app.all('/api/auth/*', toNodeHandler(auth));

// ── Comments ──────────────────────────────────────────────────────────────────
app.use('/api/comments', commentsRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Pattern file reader ───────────────────────────────────────────────────────
const PATTERNS_DIR = path.join(__dirname, '..', 'patterns');

const LANG_EXT: Record<string, string> = {
  typescript: 'ts',
  java:       'java',
  csharp:     'cs',
  python:     'py',
  ruby:       'rb',
  cpp:        'cpp',
};

app.get('/api/patterns/:category/:name', (req: Request, res: Response) => {
  const { category, name } = req.params;
  const lang = (req.query['lang'] as string) ?? 'typescript';

  if (!/^[\w-]+$/.test(category) || !/^[\w-]+$/.test(name)) {
    res.status(400).json({ error: 'Invalid path segment' });
    return;
  }

  const ext = LANG_EXT[lang];
  if (!ext) {
    res.status(400).json({ error: `Unknown language: ${lang}` });
    return;
  }

  const filePath   = path.join(PATTERNS_DIR, category, name, lang, `${lang}.${ext}`);
  const outputPath = path.join(PATTERNS_DIR, category, name, 'output');

  // Containment check — prevent any path from escaping PATTERNS_DIR
  if (!path.resolve(filePath).startsWith(path.resolve(PATTERNS_DIR))) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, 'utf-8', (err, content) => {
    if (err) {
      res.status(404).json({ exists: false, content: null, output: null });
      return;
    }
    let output: string | null = null;
    try { output = fs.readFileSync(outputPath, 'utf-8'); } catch { /* no output file */ }
    res.json({ exists: true, content, lang, output });
  });
});

app.get('/api/patterns/:category/:name/available', (req: Request, res: Response) => {
  const { category, name } = req.params;

  if (!/^[\w-]+$/.test(category) || !/^[\w-]+$/.test(name)) {
    res.status(400).json({ error: 'Invalid path segment' });
    return;
  }

  const dir = path.join(PATTERNS_DIR, category, name);
  const available: string[] = [];

  for (const [lang, ext] of Object.entries(LANG_EXT)) {
    const filePath = path.join(dir, lang, `${lang}.${ext}`);
    if (fs.existsSync(filePath)) available.push(lang);
  }

  res.json({ available });
});

// ── Test file reader ──────────────────────────────────────────────────────────
const TESTS_DIR = path.join(__dirname, '..', 'patterns', '_tests');

app.get('/api/tests/:category/:name/available', (req: Request, res: Response) => {
  const { category, name } = req.params;
  const lang = (req.query['lang'] as string) ?? 'typescript';

  if (!/^[\w-]+$/.test(category) || !/^[\w-]+$/.test(name)) {
    res.status(400).json({ error: 'Invalid path segment' });
    return;
  }

  const ext = LANG_EXT[lang];
  if (!ext) { res.json({ unit: false, integration: false }); return; }

  const dir = path.join(TESTS_DIR, category, name, lang);
  res.json({
    unit:        fs.existsSync(path.join(dir, `unit.test.${ext}`)),
    integration: fs.existsSync(path.join(dir, `integration.test.${ext}`)),
  });
});

app.get('/api/tests/:category/:name', (req: Request, res: Response) => {
  const { category, name } = req.params;
  const lang = (req.query['lang'] as string) ?? 'typescript';
  const type = (req.query['type'] as string) ?? 'unit';

  if (!/^[\w-]+$/.test(category) || !/^[\w-]+$/.test(name)) {
    res.status(400).json({ error: 'Invalid path segment' });
    return;
  }

  // Whitelist type — only 'unit' or 'integration' are valid
  if (type !== 'unit' && type !== 'integration') {
    res.status(400).json({ error: 'Invalid type' });
    return;
  }

  const ext = LANG_EXT[lang];
  if (!ext) {
    res.status(400).json({ error: `Unknown language: ${lang}` });
    return;
  }

  const filePath   = path.join(TESTS_DIR, category, name, lang, `${type}.test.${ext}`);
  const outputPath = path.join(TESTS_DIR, category, name, lang, `${type}.output`);

  // Containment check — prevent any path from escaping TESTS_DIR
  if (!path.resolve(filePath).startsWith(path.resolve(TESTS_DIR))) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, 'utf-8', (err, content) => {
    if (err) {
      res.status(404).json({ exists: false, content: null, output: null });
      return;
    }
    let output: string | null = null;
    try { output = fs.readFileSync(outputPath, 'utf-8'); } catch { /* no output file */ }
    res.json({ exists: true, content, lang, output });
  });
});

app.get('/api/stats', (_req: Request, res: Response) => {
  let implementations = 0;
  const patterns      = new Set<string>();
  const languages     = new Set<string>();

  try {
    const categories = fs.readdirSync(PATTERNS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory()).map(d => d.name);

    for (const category of categories) {
      const catDir = path.join(PATTERNS_DIR, category);
      const patternDirs = fs.readdirSync(catDir, { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);

      for (const pattern of patternDirs) {
        for (const [lang, ext] of Object.entries(LANG_EXT)) {
          const filePath = path.join(catDir, pattern, lang, `${lang}.${ext}`);
          if (fs.existsSync(filePath)) {
            implementations++;
            patterns.add(pattern);
            languages.add(lang);
          }
        }
      }
    }
  } catch { /* patterns dir unreadable */ }

  res.json({ implementations, patterns: patterns.size, languages: languages.size });
});

runMigration()
  .then(() => {
    app.listen(Number(PORT), () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('[db] Migration failed:', err);
    process.exit(1);
  });
