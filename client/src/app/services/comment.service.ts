import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Comment {
  id:        number;
  parentId:  number | null;
  userId:    string;
  author:    string | null;
  avatar:    string | null;
  bodyHtml:  string | null;
  deleted:   boolean;
  createdAt: string;
  updatedAt: string;
  upvotes:   number;
  downvotes: number;
  myVote:    number | null;
  isOwn:     boolean;
  children?: Comment[];
}

@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);

  async getComments(patternKey: string): Promise<Comment[]> {
    const flat = await firstValueFrom(
      this.http.get<Comment[]>(`/api/comments/${patternKey}`, { withCredentials: true })
    );
    return buildTree(flat);
  }

  postComment(patternKey: string, bodyHtml: string, parentId?: number) {
    return firstValueFrom(
      this.http.post('/api/comments', { patternKey, bodyHtml, parentId }, { withCredentials: true })
    );
  }

  editComment(id: number, bodyHtml: string) {
    return firstValueFrom(
      this.http.patch(`/api/comments/${id}`, { bodyHtml }, { withCredentials: true })
    );
  }

  deleteComment(id: number) {
    return firstValueFrom(
      this.http.delete(`/api/comments/${id}`, { withCredentials: true })
    );
  }

  vote(id: number, value: 1 | -1) {
    return firstValueFrom(
      this.http.post(`/api/comments/${id}/vote`, { value }, { withCredentials: true })
    );
  }
}

function buildTree(flat: Comment[]): Comment[] {
  const map = new Map<number, Comment>();
  const roots: Comment[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, children: [] });
  }

  for (const c of map.values()) {
    if (c.parentId == null) {
      roots.push(c);
    } else {
      const parent = map.get(c.parentId);
      if (parent) {
        parent.children ??= [];
        parent.children.push(c);
      } else {
        roots.push(c);
      }
    }
  }

  return roots;
}
