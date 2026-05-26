import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT ?? '3000';

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Pattern file reader ───────────────────────────────────────────────────────
// GET /api/patterns/:category/:name?lang=typescript
// e.g. /api/patterns/CreationalPatterns/AbstractFactory?lang=typescript
const PATTERNS_DIR = path.join(__dirname, '..', 'patterns');

const LANG_EXT: Record<string, string> = {
  typescript: 'ts',
  java:       'java',
  csharp:     'cs',
  python:     'py',
  ruby:       'rb',
};

app.get('/api/patterns/:category/:name', (req: Request, res: Response) => {
  const { category, name } = req.params;
  const lang = (req.query['lang'] as string) ?? 'typescript';

  // Sanitise — only allow alphanumeric + hyphen/underscore in segments
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
  const outputPath = path.join(PATTERNS_DIR, category, name, 'output');  // shared across all languages

  fs.readFile(filePath, 'utf-8', (err, content) => {
    if (err) {
      res.status(404).json({ exists: false, content: null, output: null });
      return;
    }
    // Attach console output if a .output file exists alongside the code
    let output: string | null = null;
    try { output = fs.readFileSync(outputPath, 'utf-8'); } catch { /* no output file */ }
    res.json({ exists: true, content, lang, output });
  });
});

// GET /api/patterns/:category/:name/available — which languages exist
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

// GET /api/stats — live counts derived from the patterns directory
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

app.listen(Number(PORT), () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
