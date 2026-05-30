import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Comment } from '../../services/comment.service';
import { CommentEditorComponent } from '../comment-editor/comment-editor.component';

export interface CommentAction {
  type: 'reply' | 'edit' | 'delete' | 'vote';
  comment: Comment;
  value?: 1 | -1;
  bodyHtml?: string;
}

const MAX_DEPTH = 4;

@Component({
  selector: 'app-comment-thread',
  standalone: true,
  imports: [CommonModule, CommentEditorComponent],
  templateUrl: './comment-thread.component.html',
  styleUrl: './comment-thread.component.css',
})
export class CommentThreadComponent implements OnChanges {
  @Input() comments:  Comment[] = [];
  @Input() depth:     number    = 0;
  @Input() isLoggedIn: boolean  = false;
  @Input() currentUserId: string | null = null;

  @Output() action = new EventEmitter<CommentAction>();

  private sanitizer = inject(DomSanitizer);

  safeHtml(html: string | null): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }

  replyingTo:  number | null = null;
  editingId:   number | null = null;
  expandedIds  = new Set<number>();
  expandedComments = new Set<number>();

  readonly maxDepth = MAX_DEPTH;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['comments']) {
      this.replyingTo = null;
      this.editingId  = null;
    }
  }

  ratio(c: Comment): number {
    const total = c.upvotes + c.downvotes;
    return total ? c.upvotes / total : 0;
  }

  ratioLabel(c: Comment): string {
    const total = c.upvotes + c.downvotes;
    if (!total) return 'No votes';
    return `${Math.round(this.ratio(c) * 100)}% helpful`;
  }

  toggleReply(id: number) {
    this.replyingTo = this.replyingTo === id ? null : id;
    this.editingId  = null;
  }

  toggleEdit(id: number) {
    this.editingId  = this.editingId === id ? null : id;
    this.replyingTo = null;
  }

  submitReply(c: Comment, bodyHtml: string) {
    this.action.emit({ type: 'reply', comment: c, bodyHtml });
    this.replyingTo = null;
  }

  submitEdit(c: Comment, bodyHtml: string) {
    this.action.emit({ type: 'edit', comment: c, bodyHtml });
    this.editingId = null;
  }

  onDelete(c: Comment) {
    this.action.emit({ type: 'delete', comment: c });
  }

  onVote(c: Comment, value: 1 | -1) {
    this.action.emit({ type: 'vote', comment: c, value });
  }

  onChildAction(a: CommentAction) {
    this.action.emit(a);
  }

  toggleExpand(id: number) {
    this.expandedIds.has(id) ? this.expandedIds.delete(id) : this.expandedIds.add(id);
  }

  toggleReadMore(id: number) {
    this.expandedComments.has(id) ? this.expandedComments.delete(id) : this.expandedComments.add(id);
  }

  isLong(c: Comment): boolean {
    if (!c.bodyHtml) return false;
    const text = c.bodyHtml.replace(/<[^>]*>/g, '');
    const lines = c.bodyHtml.split(/<br|<\/p|<\/div|<\/li/i).length;
    return text.length > 350 || lines > 6;
  }
}
