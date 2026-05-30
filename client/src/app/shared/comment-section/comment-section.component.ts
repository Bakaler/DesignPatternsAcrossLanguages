import {
  Component, Input, OnChanges, SimpleChanges, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommentService, Comment } from '../../services/comment.service';
import { AuthService } from '../../services/auth.service';
import { CommentThreadComponent, CommentAction } from '../comment-thread/comment-thread.component';
import { CommentEditorComponent } from '../comment-editor/comment-editor.component';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [CommonModule, CommentThreadComponent, CommentEditorComponent],
  templateUrl: './comment-section.component.html',
  styleUrl: './comment-section.component.css',
})
export class CommentSectionComponent implements OnChanges {
  @Input() patternKey = '';

  private commentSvc = inject(CommentService);
  readonly auth      = inject(AuthService);

  comments  = signal<Comment[]>([]);
  loading   = signal(false);
  showEditor = signal(false);

  readonly isLoggedIn  = computed(() => this.auth.user() !== null);
  readonly currentUserId = computed(() => this.auth.user()?.id ?? null);

  // Resizing
  panelHeight = 640;
  private dragging = false;
  private dragStartY = 0;
  private dragStartH = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['patternKey'] && this.patternKey) {
      this.load();
      this.showEditor.set(false);
    }
  }

  private async load() {
    this.loading.set(true);
    try {
      const data = await this.commentSvc.getComments(this.patternKey);
      this.comments.set(data);
    } catch {
      this.comments.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async onAction(action: CommentAction) {
    const { type, comment, value, bodyHtml } = action;
    try {
      if (type === 'reply' && bodyHtml) {
        await this.commentSvc.postComment(this.patternKey, bodyHtml, comment.id);
      } else if (type === 'edit' && bodyHtml) {
        await this.commentSvc.editComment(comment.id, bodyHtml);
      } else if (type === 'delete') {
        await this.commentSvc.deleteComment(comment.id);
      } else if (type === 'vote' && value) {
        await this.commentSvc.vote(comment.id, value);
      }
    } catch { /* errors are silent to user */ }
    await this.load();
  }

  async postTop(bodyHtml: string) {
    try {
      await this.commentSvc.postComment(this.patternKey, bodyHtml);
    } catch { /* silent */ }
    this.showEditor.set(false);
    await this.load();
  }

  signInGitHub()  { this.auth.signInGitHub(); }
  signInLinkedIn() { this.auth.signInLinkedIn(); }
  async signOut() { await this.auth.signOut(); await this.load(); }

  // ── Resize drag ──────────────────────────────────────────────────────────────
  onDragStart(e: MouseEvent) {
    this.dragging    = true;
    this.dragStartY  = e.clientY;
    this.dragStartH  = this.panelHeight;
    const onMove = (ev: MouseEvent) => {
      if (!this.dragging) return;
      this.panelHeight = Math.max(160, this.dragStartH - (ev.clientY - this.dragStartY));
    };
    const onUp = () => {
      this.dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
}
