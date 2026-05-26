import { Component, inject, ElementRef, NgZone, OnDestroy } from '@angular/core';
declare const hljs: any;
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface PatternDef {
  name:     string;
  slug:     string;           // folder name inside CreationalPatterns/ etc.
  category: string;           // 'CreationalPatterns' | 'StructuralPatterns' | 'BehavioralPatterns'
  done:     boolean;
}

interface PatternGroup {
  label:    string;
  cls:      string;           // 'creational' | 'structural' | 'behavioral'
  category: string;
  patterns: PatternDef[];
}

interface PatternFile {
  exists:  boolean;
  content: string | null;
  lang:    string;
  output:  string | null;
}

interface PatternAvailable {
  available: string[];
}

@Component({
  selector: 'app-gof',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gof.component.html',
  styleUrl: './gof.component.css'
})
export class GofComponent implements OnDestroy {

  private http      = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private el        = inject(ElementRef);
  private ngZone    = inject(NgZone);

  readonly langs = ['typescript', 'java', 'csharp', 'python', 'ruby'] as const;

  readonly langLabels: Record<string, string> = {
    typescript: 'TypeScript',
    java:       'Java',
    csharp:     'C#',
    python:     'Python',
    ruby:       'Ruby',
  };

  readonly langExts: Record<string, string> = {
    typescript: 'ts',
    java:       'java',
    csharp:     'cs',
    python:     'py',
    ruby:       'rb',
  };

  langExt(tab: string): string {
    return this.langExts[tab] ?? tab;
  }

  readonly groups: PatternGroup[] = [
    {
      label: 'Creational', cls: 'creational', category: 'CreationalPatterns',
      patterns: [
        { name: 'Abstract Factory', slug: 'AbstractFactory', category: 'CreationalPatterns', done: true },
        { name: 'Builder',          slug: 'Builder',          category: 'CreationalPatterns', done: false },
        { name: 'Factory Method',   slug: 'FactoryMethod',    category: 'CreationalPatterns', done: false },
        { name: 'Prototype',        slug: 'Prototype',        category: 'CreationalPatterns', done: false },
        { name: 'Singleton',        slug: 'Singleton',        category: 'CreationalPatterns', done: false },
      ]
    },
    {
      label: 'Structural', cls: 'structural', category: 'StructuralPatterns',
      patterns: [
        { name: 'Adapter',   slug: 'Adapter',   category: 'StructuralPatterns', done: false },
        { name: 'Bridge',    slug: 'Bridge',    category: 'StructuralPatterns', done: false },
        { name: 'Composite', slug: 'Composite', category: 'StructuralPatterns', done: false },
        { name: 'Decorator', slug: 'Decorator', category: 'StructuralPatterns', done: false },
        { name: 'Facade',    slug: 'Facade',    category: 'StructuralPatterns', done: false },
        { name: 'Flyweight', slug: 'Flyweight', category: 'StructuralPatterns', done: false },
        { name: 'Proxy',     slug: 'Proxy',     category: 'StructuralPatterns', done: false },
      ]
    },
    {
      label: 'Behavioral', cls: 'behavioral', category: 'BehavioralPatterns',
      patterns: [
        { name: 'Chain of Resp.',  slug: 'ChainOfResponsibility', category: 'BehavioralPatterns', done: false },
        { name: 'Command',         slug: 'Command',               category: 'BehavioralPatterns', done: false },
        { name: 'Iterator',        slug: 'Iterator',              category: 'BehavioralPatterns', done: false },
        { name: 'Mediator',        slug: 'Mediator',              category: 'BehavioralPatterns', done: false },
        { name: 'Memento',         slug: 'Memento',               category: 'BehavioralPatterns', done: false },
        { name: 'Observer',        slug: 'Observer',              category: 'BehavioralPatterns', done: false },
        { name: 'State',           slug: 'State',                 category: 'BehavioralPatterns', done: false },
        { name: 'Strategy',        slug: 'Strategy',              category: 'BehavioralPatterns', done: false },
        { name: 'Template Method', slug: 'TemplateMethod',        category: 'BehavioralPatterns', done: false },
        { name: 'Visitor',         slug: 'Visitor',               category: 'BehavioralPatterns', done: false },
        { name: 'Interpreter',     slug: 'Interpreter',           category: 'BehavioralPatterns', done: false },
      ]
    }
  ];

  // ── Viewer state ─────────────────────────────────────────────────────────────
  selected:       PatternDef | null = null;
  activeLang:     string            = 'readme';
  zoomLevel:      1 | 2 | 3        = 2;
  availableLangs: string[]          = [];
  hasReadme:      boolean           = false;
  readme:         string | null     = null;
  renderedReadme: SafeHtml | null   = null;
  code:             string | null     = null;
  highlightedCode:  SafeHtml | null  = null;
  output:           string | null     = null;
  loading:          boolean           = false;
  notFound:         boolean           = false;
  tocSections:      { label: string; index: number }[] = [];
  activeTocIndex:   number            = 0;

  private scrollListener: (() => void) | null = null;

  private hljsLang(tab: string): string {
    return tab === 'csharp' ? 'csharp' : tab;
  }

  private applyHighlight(code: string, lang: string): SafeHtml {
    try {
      const result = hljs.highlight(code, { language: this.hljsLang(lang) });
      return this.sanitizer.bypassSecurityTrustHtml(result.value);
    } catch {
      return this.sanitizer.bypassSecurityTrustHtml(
        code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      );
    }
  }

  selectPattern(pattern: PatternDef): void {
    this.selected         = pattern;
    this.code             = null;
    this.highlightedCode  = null;
    this.output           = null;
    this.readme           = null;
    this.renderedReadme   = null;
    this.notFound         = false;
    this.availableLangs   = [];
    this.hasReadme        = false;
    this.loading          = true;
    this.tocSections      = [];
    this.activeTocIndex   = 0;
    this.removeScrollListener();

    const available$ = this.http
      .get<PatternAvailable>(`/api/patterns/${pattern.category}/${pattern.slug}/available`)
      .pipe(catchError(() => of({ available: [] as string[] })));

    const readme$ = this.http
      .get(`/assets/patterns/${pattern.category}/${pattern.slug}/README.html`, { responseType: 'text' })
      .pipe(catchError(() => of(null)));

    forkJoin({ available: available$, readme: readme$ }).subscribe(({ available, readme }) => {
      this.loading        = false;
      this.availableLangs = available.available;
      this.hasReadme      = readme !== null;
      this.readme         = readme;
      this.renderedReadme = readme !== null ? this.sanitizer.bypassSecurityTrustHtml(readme) : null;

      if (readme !== null) {
        // README exists — show it first
        this.activeLang = 'readme';
        setTimeout(() => this.buildToc(), 50);
      } else if (available.available.length > 0) {
        // No README — default to best matching code tab
        if (!available.available.includes(this.activeLang)) {
          this.activeLang = available.available[0];
        }
        this.loadCode();
      } else {
        this.notFound = true;
      }
    });
  }

  switchTab(tab: string): void {
    this.activeLang = tab;
    if (tab === 'readme') {
      this.code            = null;
      this.highlightedCode = null;
      this.output          = null;
      this.notFound        = false;
      setTimeout(() => this.buildToc(), 50);
    } else {
      this.tocSections = [];
      this.activeTocIndex = 0;
      this.removeScrollListener();
      this.loadCode();
    }
  }

  private loadCode(): void {
    if (!this.selected) return;
    this.loading         = true;
    this.code            = null;
    this.highlightedCode = null;
    this.output          = null;
    this.notFound        = false;

    this.http
      .get<PatternFile>(
        `/api/patterns/${this.selected.category}/${this.selected.slug}?lang=${this.activeLang}`
      )
      .subscribe({
        next: (res) => {
          this.loading  = false;
          this.code     = res.exists ? res.content : null;
          this.output   = res.output ?? null;
          this.notFound = !res.exists;
          if (this.code) {
            this.highlightedCode = this.applyHighlight(this.code, this.activeLang);
          }
        },
        error: () => { this.loading = false; this.notFound = true; }
      });
  }

  // ── README table of contents ─────────────────────────────────────────────────
  private buildToc(): void {
    const container = this.el.nativeElement.querySelector('.viewer-readme') as HTMLElement;
    if (!container) return;
    const headings = container.querySelectorAll('.rm-h2');
    this.tocSections = Array.from(headings).map((h, i) => ({
      label: (h as HTMLElement).textContent?.trim() ?? `Section ${i + 1}`,
      index: i
    }));
    this.activeTocIndex = 0;
    this.removeScrollListener();
    this.ngZone.runOutsideAngular(() => {
      this.scrollListener = () => {
        const hs = Array.from(container.querySelectorAll('.rm-h2')) as HTMLElement[];
        const containerTop = container.getBoundingClientRect().top;
        let active = 0;
        for (let i = 0; i < hs.length; i++) {
          if (hs[i].getBoundingClientRect().top - containerTop <= 48) active = i;
        }
        if (active !== this.activeTocIndex) {
          this.ngZone.run(() => { this.activeTocIndex = active; });
        }
      };
      container.addEventListener('scroll', this.scrollListener!);
    });
  }

  private removeScrollListener(): void {
    if (!this.scrollListener) return;
    const container = this.el.nativeElement.querySelector('.viewer-readme') as HTMLElement;
    container?.removeEventListener('scroll', this.scrollListener);
    this.scrollListener = null;
  }

  ngOnDestroy(): void {
    this.removeScrollListener();
  }

  scrollToSection(index: number): void {
    const container = this.el.nativeElement.querySelector('.viewer-readme') as HTMLElement;
    const target    = container?.querySelectorAll('.rm-h2')[index] as HTMLElement;
    if (!container || !target) return;
    this.activeTocIndex = index;
    const newTop = container.scrollTop
                 + target.getBoundingClientRect().top
                 - container.getBoundingClientRect().top
                 - 16;
    container.scrollTo({ top: newTop, behavior: 'smooth' });
  }

  setZoom(level: 1 | 2 | 3): void { this.zoomLevel = level; }

  isSelected(pattern: PatternDef): boolean {
    return this.selected?.slug === pattern.slug;
  }

  // Expose 'readme' + lang tabs to template
  get allTabs(): string[] {
    return ['readme', ...this.langs];
  }

  tabLabel(tab: string): string {
    if (tab === 'readme') return 'README';
    return this.langLabels[tab] ?? tab;
  }

  tabAvailable(tab: string): boolean {
    if (tab === 'readme') return this.hasReadme;
    return this.availableLangs.includes(tab);
  }
}
