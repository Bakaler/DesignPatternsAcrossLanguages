import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { auth } from '../auth';
import { fromNodeHeaders } from 'better-auth/node';
import sanitizeHtml from 'sanitize-html';

// Allowlist tuned to Quill's output — keeps formatting, strips everything dangerous
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'a',
    'ol', 'ul', 'li', 'blockquote',
    'h1', 'h2', 'h3', 'pre', 'code', 'span',
  ],
  allowedAttributes: {
    'a':    ['href', 'target', 'rel'],
    'pre':  ['class'],   // ql-syntax
    'code': ['class'],
    'span': ['class'],
  },
  allowedClasses: {
    'pre':  ['ql-syntax'],
    'code': ['ql-*'],
    'span': ['ql-*'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // Force all links to open safely in a new tab
    'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
};

const router = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getSession(req: Request) {
  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
}

// ── Ban list check ────────────────────────────────────────────────────────────
async function isBanned(text: string): Promise<boolean> {
  const { rows } = await pool.query<{ phrase: string }>('SELECT phrase FROM ban_list');
  const lower = text.toLowerCase();
  return rows.some(r => lower.includes(r.phrase.toLowerCase()));
}

// ── Row → comment shape ───────────────────────────────────────────────────────
interface CommentRow {
  id: number;
  pattern_key: string;
  user_id: string;
  parent_id: number | null;
  body_html: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_name: string;
  user_image: string | null;
  upvotes: number;
  downvotes: number;
  user_vote: number | null;
}

function toComment(row: CommentRow, myUserId?: string) {
  const isDeleted = row.deleted_at !== null;
  return {
    id:        row.id,
    parentId:  row.parent_id,
    userId:    row.user_id,
    author:    isDeleted ? null : row.user_name,
    avatar:    isDeleted ? null : row.user_image,
    bodyHtml:  isDeleted ? null : row.body_html,
    deleted:   isDeleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    upvotes:   Number(row.upvotes),
    downvotes: Number(row.downvotes),
    myVote:    myUserId ? (row.user_vote ?? null) : null,
    isOwn:     myUserId ? row.user_id === myUserId : false,
  };
}

// ── GET /api/comments/:patternKey ─────────────────────────────────────────────
router.get('/:patternKey', async (req: Request, res: Response) => {
  const { patternKey } = req.params;
  const session = await getSession(req).catch(() => null);
  const myUserId = session?.user?.id;

  const { rows } = await pool.query<CommentRow>(`
    SELECT
      c.id, c.pattern_key, c.user_id, c.parent_id, c.body_html,
      c.created_at, c.updated_at, c.deleted_at,
      u.name  AS user_name,
      u.image AS user_image,
      COALESCE(SUM(CASE WHEN v.value =  1 THEN 1 ELSE 0 END), 0) AS upvotes,
      COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
      MAX(CASE WHEN v.user_id = $2 THEN v.value END)              AS user_vote
    FROM comments c
    JOIN "user" u ON u.id = c.user_id
    LEFT JOIN votes v ON v.comment_id = c.id
    WHERE c.pattern_key = $1
    GROUP BY c.id, u.name, u.image
    ORDER BY
      CASE WHEN SUM(v.value) IS NULL THEN 0
           ELSE (COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END),0)::float /
                 NULLIF(COUNT(v.user_id), 0))
      END DESC NULLS LAST,
      c.created_at ASC
  `, [patternKey, myUserId ?? null]);

  res.json(rows.map(r => toComment(r, myUserId)));
});

// ── POST /api/comments ────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  const session = await getSession(req).catch(() => null);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { patternKey, parentId, bodyHtml } = req.body as {
    patternKey: string;
    parentId?: number;
    bodyHtml: string;
  };

  if (!patternKey || !bodyHtml?.trim()) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }

  if (bodyHtml.length > 20_000) {
    res.status(400).json({ error: 'Comment too long' });
    return;
  }

  const clean = sanitizeHtml(bodyHtml, SANITIZE_OPTIONS);

  // Silent ban — return 201 without inserting
  if (await isBanned(clean)) {
    res.status(201).json({ ok: true });
    return;
  }

  await pool.query(
    `INSERT INTO comments (pattern_key, user_id, parent_id, body_html)
     VALUES ($1, $2, $3, $4)`,
    [patternKey, session.user.id, parentId ?? null, clean]
  );

  res.status(201).json({ ok: true });
});

// ── PATCH /api/comments/:id ───────────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response) => {
  const session = await getSession(req).catch(() => null);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { bodyHtml } = req.body as { bodyHtml: string };
  if (!bodyHtml?.trim()) { res.status(400).json({ error: 'Missing body' }); return; }

  if (bodyHtml.length > 20_000) {
    res.status(400).json({ error: 'Comment too long' });
    return;
  }

  const clean = sanitizeHtml(bodyHtml, SANITIZE_OPTIONS);

  if (await isBanned(clean)) {
    res.status(200).json({ ok: true });
    return;
  }

  const { rowCount } = await pool.query(
    `UPDATE comments
     SET body_html = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL`,
    [clean, req.params['id'], session.user.id]
  );

  if (!rowCount) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ok: true });
});

// ── DELETE /api/comments/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  const session = await getSession(req).catch(() => null);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const { rowCount } = await pool.query(
    `UPDATE comments
     SET deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [req.params['id'], session.user.id]
  );

  if (!rowCount) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ok: true });
});

// ── POST /api/comments/:id/vote ───────────────────────────────────────────────
router.post('/:id/vote', async (req: Request, res: Response) => {
  const session = await getSession(req).catch(() => null);
  if (!session?.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const value = Number(req.body.value);
  if (value !== 1 && value !== -1) {
    res.status(400).json({ error: 'value must be 1 or -1' });
    return;
  }

  await pool.query(
    `INSERT INTO votes (user_id, comment_id, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, comment_id) DO UPDATE SET value = EXCLUDED.value`,
    [session.user.id, req.params['id'], value]
  );

  res.json({ ok: true });
});

export default router;
