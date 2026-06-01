import { Component, inject, ElementRef, NgZone, OnDestroy, OnInit } from '@angular/core';
declare const hljs: any;
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SettingsService } from '../../services/settings.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { CommentSectionComponent } from '../../shared/comment-section/comment-section.component';

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
  imports: [CommonModule, FooterComponent, CommentSectionComponent],
  templateUrl: './gof.component.html',
  styleUrl: './gof.component.css'
})
export class GofComponent implements OnInit, OnDestroy {

  private http      = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private el        = inject(ElementRef);
  private ngZone    = inject(NgZone);
  readonly settings  = inject(SettingsService);
  private route     = inject(ActivatedRoute);

  private scrollAfterLoad = false;

  ngOnInit(): void {
    const name = this.route.snapshot.queryParamMap.get('p');
    if (name) {
      const pattern = this.groups.flatMap(g => g.patterns).find(p => p.name === name);
      if (pattern) {
        this.scrollAfterLoad = true;
        this.selectPattern(pattern);
      }
    }
  }

  readonly langs = ['typescript', 'java', 'csharp', 'python', 'ruby', 'cpp'] as const;

  readonly langLabels: Record<string, string> = {
    typescript: 'TypeScript',
    java:       'Java',
    csharp:     'C#',
    python:     'Python',
    ruby:       'Ruby',
    cpp:        'C++',
  };

  readonly langExts: Record<string, string> = {
    typescript: 'ts',
    java:       'java',
    csharp:     'cs',
    python:     'py',
    ruby:       'rb',
    cpp:        'cpp',
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
        { name: 'Facade',    slug: 'Facade',    category: 'StructuralPatterns', done: true  },
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
        { name: 'Template Method', slug: 'TemplateMethod',        category: 'BehavioralPatterns', done: true  },
        { name: 'Visitor',         slug: 'Visitor',               category: 'BehavioralPatterns', done: false },
        { name: 'Interpreter',     slug: 'Interpreter',           category: 'BehavioralPatterns', done: true  },
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

  // ── Code sections TOC ────────────────────────────────────────────────────────
  codeSections:      { label: string; line: number }[] = [];
  activeCodeSection: number  = 0;
  codeCopied:        boolean = false;
  outputCopied:      boolean = false;

  // ── Test mode ────────────────────────────────────────────────────────────────
  viewMode:           'code' | 'unit' | 'integration' = 'code';
  testCode:           string | null   = null;
  highlightedTestCode: SafeHtml | null = null;
  testOutput:         string | null   = null;
  testLoading:        boolean         = false;
  testNotFound:       boolean         = false;
  testAvailable:      { unit: boolean; integration: boolean } = { unit: false, integration: false };

  // ── Active-mode getters (code vs test) ───────────────────────────────────────
  get activeHighlightedCode(): SafeHtml | null {
    return this.viewMode === 'code' ? this.highlightedCode : this.highlightedTestCode;
  }
  get activeRawCode(): string | null {
    return this.viewMode === 'code' ? this.code : this.testCode;
  }
  get activeOutput(): string | null {
    return this.viewMode === 'code' ? this.output : this.testOutput;
  }
  get activeLoading(): boolean { return this.loading || this.testLoading; }
  get activeNotFound(): boolean {
    return this.viewMode === 'code' ? this.notFound : this.testNotFound;
  }
  get activeCodeFile(): string {
    if (!this.selected) return '';
    const ext = this.langExt(this.activeLang);
    if (this.viewMode === 'code') return `${this.selected.slug}/${this.activeLang}.${ext}`;
    return `_tests/${this.selected.slug}/${this.activeLang}/${this.viewMode}.test.${ext}`;
  }
  get isTestMode(): boolean { return this.viewMode !== 'code'; }

  private scrollListener:     (() => void) | null = null;
  private codeScrollListener: (() => void) | null = null;
  private loadingTimer:       ReturnType<typeof setTimeout> | null = null;

  keepReadme = false;   // holds README visible while first code fetch is in flight

  private hljsLang(tab: string): string {
    return tab === 'csharp' ? 'csharp' : tab;
  }

  // Parse // SECTION:: XYZ  or  # SECTION:: XYZ  (and -- ; variants)
  private parseCodeSections(code: string): { label: string; line: number }[] {
    const regex = /^\s*(?:\/\/|#|--|;)\s*SECTION::\s*(.+)$/;
    const sections: { label: string; line: number }[] = [];
    code.split('\n').forEach((ln, i) => {
      const m = ln.match(regex);
      if (m) sections.push({ label: m[1].trim(), line: i });
    });
    return sections;
  }

  // Inject invisible anchor spans at section lines into the highlighted HTML
  private injectSectionAnchors(html: string, sections: { line: number }[]): string {
    if (!sections.length) return html;
    const lines = html.split('\n');
    sections.forEach(({ line }, idx) => {
      if (line < lines.length) {
        lines[line] = `<span class="code-section-anchor" id="code-section-${idx}"></span>` + lines[line];
      }
    });
    return lines.join('\n');
  }

  private applyHighlight(code: string, lang: string, sections?: { line: number }[]): SafeHtml {
    const sects = sections ?? this.codeSections;
    try {
      const result = hljs.highlight(code, { language: this.hljsLang(lang) });
      const html   = this.injectSectionAnchors(result.value, sects);
      return this.sanitizer.bypassSecurityTrustHtml(html);
    } catch {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return this.sanitizer.bypassSecurityTrustHtml(
        this.injectSectionAnchors(escaped, sects)
      );
    }
  }

  // ── Test mode controls ───────────────────────────────────────────────────────
  setViewMode(mode: 'code' | 'unit' | 'integration'): void {
    this.settings.playUiClick();
    this.viewMode = mode;
    if (mode !== 'code') {
      this.loadTest();
    }
  }

  private checkTestAvailability(): void {
    if (!this.selected || this.activeLang === 'readme') return;
    this.http
      .get<{ unit: boolean; integration: boolean }>(
        `/api/tests/${this.selected.category}/${this.selected.slug}/available?lang=${this.activeLang}`
      )
      .pipe(catchError(() => of({ unit: false, integration: false })))
      .subscribe(avail => { this.testAvailable = avail; });
  }

  private loadTest(): void {
    if (!this.selected || this.viewMode === 'code') return;
    this.testNotFound = false;

    // Only blank the content if the request takes longer than 180ms —
    // fast local responses swap without any visible flash
    if (this.loadingTimer) { clearTimeout(this.loadingTimer); this.loadingTimer = null; }
    this.loadingTimer = setTimeout(() => {
      this.testLoading         = true;
      this.testCode            = null;
      this.highlightedTestCode = null;
      this.testOutput          = null;
    }, 180);

    this.http
      .get<PatternFile>(
        `/api/tests/${this.selected.category}/${this.selected.slug}?lang=${this.activeLang}&type=${this.viewMode}`
      )
      .subscribe({
        next: (res) => {
          if (this.loadingTimer) { clearTimeout(this.loadingTimer); this.loadingTimer = null; }
          this.testLoading  = false;
          this.testCode     = res.exists ? res.content : null;
          this.testOutput   = res.output ?? null;
          this.testNotFound = !res.exists;
          const testSections = this.testCode ? this.parseCodeSections(this.testCode) : [];
          this.highlightedTestCode = this.testCode
            ? this.applyHighlight(this.testCode, this.activeLang, testSections)
            : null;
        },
        error: () => {
          this.testLoading  = false;
          this.testNotFound = true;
        }
      });
  }

  private resetTestState(): void {
    this.viewMode            = 'code';
    this.testCode            = null;
    this.highlightedTestCode = null;
    this.testOutput          = null;
    this.testLoading         = false;
    this.testNotFound        = false;
    this.testAvailable       = { unit: false, integration: false };
  }

  selectPattern(pattern: PatternDef): void {
    this.settings.playUiClick();
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
    this.tocSections        = [];
    this.activeTocIndex     = 0;
    this.codeSections       = [];
    this.activeCodeSection  = 0;
    this.codeCopied         = false;
    this.outputCopied       = false;
    this.resetTestState();
    this.removeScrollListener();
    this.removeCodeScrollListener();

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
        this.checkTestAvailability();
      } else {
        this.notFound = true;
      }

      if (this.scrollAfterLoad) {
        this.scrollAfterLoad = false;
        setTimeout(() => {
          (this.el.nativeElement.querySelector('.viewer-section') as HTMLElement)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    });
  }

  switchTab(tab: string): void {
    this.settings.playUiClick();
    // If leaving README, keep it visible until the code response arrives
    if (this.activeLang === 'readme' && tab !== 'readme') {
      this.keepReadme = true;
    }
    this.activeLang = tab;
    if (tab === 'readme') {
      this.keepReadme        = false;
      this.code              = null;
      this.highlightedCode   = null;
      this.output            = null;
      this.notFound          = false;
      this.codeSections      = [];
      this.activeCodeSection = 0;
      this.resetTestState();
      this.removeCodeScrollListener();
      setTimeout(() => this.buildToc(), 50);
    } else {
      this.resetTestState();
      this.tocSections    = [];
      this.activeTocIndex = 0;
      this.removeScrollListener();
      this.loadCode();
      this.checkTestAvailability();
    }
  }

  private loadCode(): void {
    if (!this.selected) return;

    // Cancel any pending loading indicator
    if (this.loadingTimer) { clearTimeout(this.loadingTimer); this.loadingTimer = null; }

    this.notFound = false;

    // Only blank the content if the request takes longer than 180ms —
    // fast local responses swap without any visible flash
    this.loadingTimer = setTimeout(() => {
      this.loading         = true;
      this.code            = null;
      this.highlightedCode = null;
      this.output          = null;
    }, 180);

    this.http
      .get<PatternFile>(
        `/api/patterns/${this.selected.category}/${this.selected.slug}?lang=${this.activeLang}`
      )
      .subscribe({
        next: (res) => {
          if (this.loadingTimer) { clearTimeout(this.loadingTimer); this.loadingTimer = null; }
          this.keepReadme        = false;
          this.loading           = false;
          this.code              = res.exists ? res.content : null;
          this.codeSections      = this.code ? this.parseCodeSections(this.code) : [];
          this.activeCodeSection = 0;
          this.output            = res.output ?? null;
          this.notFound          = !res.exists;
          this.highlightedCode   = this.code
            ? this.applyHighlight(this.code, this.activeLang)
            : null;
          if (this.codeSections.length) setTimeout(() => this.buildCodeToc(), 50);
        },
        error: () => {
          if (this.loadingTimer) { clearTimeout(this.loadingTimer); this.loadingTimer = null; }
          this.keepReadme = false;
          this.loading    = false;
          this.notFound   = true;
        }
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

  // ── Code sections TOC ─────────────────────────────────────────────────────────
  private buildCodeToc(): void {
    const pre = this.el.nativeElement.querySelector('.viewer-pre') as HTMLElement;
    if (!pre || !this.codeSections.length) return;
    this.removeCodeScrollListener();
    this.ngZone.runOutsideAngular(() => {
      this.codeScrollListener = () => {
        const anchors = Array.from(pre.querySelectorAll('.code-section-anchor')) as HTMLElement[];
        const preTop  = pre.getBoundingClientRect().top;
        let active    = 0;
        for (let i = 0; i < anchors.length; i++) {
          if (anchors[i].getBoundingClientRect().top - preTop <= 32) active = i;
        }
        if (active !== this.activeCodeSection) {
          this.ngZone.run(() => { this.activeCodeSection = active; });
        }
      };
      pre.addEventListener('scroll', this.codeScrollListener!);
    });
  }

  private removeCodeScrollListener(): void {
    if (!this.codeScrollListener) return;
    const pre = this.el.nativeElement.querySelector('.viewer-pre') as HTMLElement;
    pre?.removeEventListener('scroll', this.codeScrollListener);
    this.codeScrollListener = null;
  }

  scrollToCodeSection(index: number): void {
    const pre    = this.el.nativeElement.querySelector('.viewer-pre') as HTMLElement;
    const anchor = pre?.querySelector(`#code-section-${index}`) as HTMLElement;
    if (!pre || !anchor) return;
    this.activeCodeSection = index;
    const newTop = pre.scrollTop + anchor.getBoundingClientRect().top - pre.getBoundingClientRect().top - 16;
    pre.scrollTo({ top: newTop, behavior: 'smooth' });
  }

  async copyCode(): Promise<void> {
    const raw = this.activeRawCode;
    if (!raw) return;
    try { await navigator.clipboard.writeText(raw); } catch { return; }
    this.codeCopied = true;
    setTimeout(() => { this.codeCopied = false; }, 2000);
  }

  async copyOutput(): Promise<void> {
    const out = this.activeOutput;
    if (!out) return;
    try { await navigator.clipboard.writeText(out); } catch { return; }
    this.outputCopied = true;
    setTimeout(() => { this.outputCopied = false; }, 2000);
  }

  ngOnDestroy(): void {
    this.removeScrollListener();
    this.removeCodeScrollListener();
    if (this.loadingTimer) clearTimeout(this.loadingTimer);
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

  setZoom(level: 1 | 2 | 3): void { this.settings.playUiClick(); this.zoomLevel = level; }

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
