import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Quill from 'quill';

@Component({
  selector: 'app-comment-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comment-editor.component.html',
  styleUrl: './comment-editor.component.css',
})
export class CommentEditorComponent implements AfterViewInit, OnDestroy {
  @Input() initialHtml = '';
  @Input() submitLabel = 'Post';
  @Input() placeholder = 'Write a comment…';

  @Output() submitted  = new EventEmitter<string>();
  @Output() cancelled  = new EventEmitter<void>();

  @ViewChild('editorEl') editorEl!: ElementRef<HTMLDivElement>;

  private quill!: Quill;

  ngAfterViewInit() {
    this.quill = new Quill(this.editorEl.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder,
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          ['code-block', 'blockquote'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean'],
        ],
      },
    });

    if (this.initialHtml) {
      this.quill.clipboard.dangerouslyPasteHTML(this.initialHtml);
    }
  }

  ngOnDestroy() {
    // Quill doesn't need explicit teardown but we clear the ref
    (this.quill as any) = null;
  }

  submit() {
    const html = this.editorEl.nativeElement.querySelector('.ql-editor')?.innerHTML ?? '';
    const text = this.quill.getText().trim();
    if (!text) return;
    this.submitted.emit(html);
    this.quill.setContents([]);
  }

  cancel() {
    this.cancelled.emit();
  }
}
