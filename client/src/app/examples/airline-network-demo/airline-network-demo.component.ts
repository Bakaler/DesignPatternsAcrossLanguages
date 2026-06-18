import { Component, OnInit, OnDestroy, inject, NgZone, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

// SECTION:: AirNetworkComponent (Component Interface)
// The shared interface that both Leaf (Airport) and Composite (AirportNetwork) implement.
// This is the heart of the Composite pattern — callers treat both uniformly.
interface AirNetworkComponent {
  getName(): string;
  getCapacity(): number;
  addConnection(route: Route): void;
  removeConnection(routeId: string): void;
  getOutgoingRoutes(): Route[];
}

// SECTION:: Carrier
class Carrier {
  hub: Airport | null = null;
  constructor(
    public id: string,
    public name: string,
    public code: string,
    public color: string
  ) {}
}

// SECTION:: Route
class Route {
  constructor(
    public id: string,
    public from: Airport,
    public to: Airport,
    public carrier: Carrier
  ) {}
}

// SECTION:: Airport (Leaf)
// A Leaf node in the Composite tree. Implements AirNetworkComponent directly
// and manages its own outgoing connections and 24-hour departure schedule.
class Airport implements AirNetworkComponent {
  connections: Route[] = [];
  // hour (0-23) → set of route IDs scheduled to depart that hour
  schedule: Map<number, Set<string>> = new Map();

  constructor(
    public id: string,
    public name: string,
    public code: string,
    public x: number,
    public y: number,
    public capacity: number,
    public carriers: Carrier[] = []
  ) {
    for (let h = 0; h < 24; h++) {
      this.schedule.set(h, new Set());
    }
  }

  getName(): string { return this.name; }
  getCapacity(): number { return this.capacity; }

  addConnection(route: Route): void {
    if (!this.connections.find(r => r.id === route.id)) {
      this.connections.push(route);
    }
  }

  removeConnection(routeId: string): void {
    this.connections = this.connections.filter(r => r.id !== routeId);
    for (const hourSet of this.schedule.values()) {
      hourSet.delete(routeId);
    }
  }

  getOutgoingRoutes(): Route[] {
    return this.connections.filter(r => r.from === this);
  }

  getScheduledRouteIds(hour: number): string[] {
    return Array.from(this.schedule.get(hour) ?? []);
  }

  toggleSchedule(hour: number, routeId: string): boolean {
    const hourSet = this.schedule.get(hour) ?? new Set<string>();
    if (hourSet.has(routeId)) {
      hourSet.delete(routeId);
      this.schedule.set(hour, hourSet);
      return false;
    } else if (hourSet.size < this.capacity) {
      hourSet.add(routeId);
      this.schedule.set(hour, hourSet);
      return true;
    }
    return false; // at capacity
  }

  getDepartureCount(hour: number): number {
    return (this.schedule.get(hour) ?? new Set()).size;
  }

  isScheduled(hour: number, routeId: string): boolean {
    return this.schedule.get(hour)?.has(routeId) ?? false;
  }
}

// SECTION:: RegionalNetwork (Composite — mid-level)
// A Composite that groups a subset of Airport leaves into a named region.
// Implements the same AirNetworkComponent interface as Airport (Leaf) and
// AirportNetwork (top-level Composite), so callers treat all three uniformly.
class RegionalNetwork implements AirNetworkComponent {
  private airports: Airport[] = [];

  constructor(
    public readonly regionId: string,
    public readonly regionName: string,
    public readonly color: string,   // SVG zone fill color
  ) {}

  getName(): string { return this.regionName; }

  // Recursively sums leaf capacities — same call works on a single Airport
  getCapacity(): number {
    return this.airports.reduce((sum, a) => sum + a.getCapacity(), 0);
  }

  addAirport(airport: Airport): void { this.airports.push(airport); }

  removeAirport(id: string): void {
    this.airports = this.airports.filter(a => a.id !== id);
  }

  getAirports(): Airport[] { return this.airports; }

  // Route connections are owned by the top-level network; region delegates to its leaves
  addConnection(route: Route): void {
    if (this.airports.includes(route.from)) route.from.addConnection(route);
    if (this.airports.includes(route.to))   route.to.addConnection(route);
  }

  removeConnection(routeId: string): void {
    this.airports.forEach(a => a.removeConnection(routeId));
  }

  getOutgoingRoutes(): Route[] {
    return this.airports.flatMap(a => a.getOutgoingRoutes());
  }

  // Bounding box of member airports — used to draw the zone shape on the map
  getBoundingBox(): { x: number; y: number; w: number; h: number } {
    if (!this.airports.length) return { x: 0, y: 0, w: 0, h: 0 };
    const xs = this.airports.map(a => a.x);
    const ys = this.airports.map(a => a.y);
    const pad = 38;
    const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
    return { x, y, w: Math.max(...xs) - x + pad * 2, h: Math.max(...ys) - y + pad * 2 };
  }
}

// SECTION:: AirportNetwork (top-level Composite)
// Owns all routes and delegates every AirNetworkComponent call down through
// RegionalNetwork composites to Airport leaves — two levels of recursion.
class AirportNetwork implements AirNetworkComponent {
  private regions: RegionalNetwork[] = [];
  private routes:  Route[] = [];

  getName(): string { return 'National Air Network'; }

  // Two-level recursion: this → regions → airports
  getCapacity(): number {
    return this.regions.reduce((sum, r) => sum + r.getCapacity(), 0);
  }

  addRegion(region: RegionalNetwork): void { this.regions.push(region); }
  getRegions(): RegionalNetwork[] { return this.regions; }

  // Flatten all leaves across all regions
  getAirports(): Airport[] {
    return this.regions.flatMap(r => r.getAirports());
  }

  addAirport(airport: Airport, regionId?: string): void {
    const region = regionId
      ? this.regions.find(r => r.regionId === regionId)
      : this.regions[this.regions.length - 1];  // default: last region
    region?.addAirport(airport);
  }

  removeAirport(id: string): void {
    this.regions.forEach(r => r.removeAirport(id));
  }

  // Delegates connection management down through regions to leaves
  addConnection(route: Route): void {
    if (!this.routes.find(r => r.id === route.id)) {
      this.routes.push(route);
      route.from.addConnection(route);
      route.to.addConnection(route);
    }
  }

  // Propagates removal down through every region to every leaf
  removeConnection(routeId: string): void {
    this.routes = this.routes.filter(r => r.id !== routeId);
    this.regions.forEach(r => r.removeConnection(routeId));
  }

  getOutgoingRoutes(): Route[] { return this.routes; }

  getDeparturesAtHour(hour: number): { airport: Airport; route: Route }[] {
    const departures: { airport: Airport; route: Route }[] = [];
    for (const airport of this.getAirports()) {
      for (const routeId of airport.getScheduledRouteIds(hour)) {
        const route = this.routes.find(r => r.id === routeId && r.from === airport);
        if (route) departures.push({ airport, route });
      }
    }
    return departures;
  }
}

// SECTION:: ActiveFlight (animation state)
interface ActiveFlight {
  id: string;
  route: Route;
  progress: number;
  startTime: number;
  duration: number;
  accelFrac: number;    // fraction of total time spent accelerating (and decelerating)
  accelPosFrac: number; // fraction of total distance covered during accel (and decel)
}

// SECTION:: Itinerary types
interface ItineraryStep { route: Route; distance: number; }
interface ItineraryResult { steps: ItineraryStep[]; totalDistance: number; carrierSwitches: number; }

// SECTION:: AirlineNetworkDemoComponent
@Component({
  selector: 'app-airline-network-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './airline-network-demo.component.html',
  styleUrls: ['./airline-network-demo.component.css'],
})
export class AirlineNetworkDemoComponent implements OnInit, OnDestroy {
  private ngZone    = inject(NgZone);
  private cdr       = inject(ChangeDetectorRef);
  readonly settings = inject(SettingsService);

  @ViewChild('mapSvg') mapSvgRef!: ElementRef<SVGSVGElement>;

  network = new AirportNetwork();
  carriers: Carrier[] = [];

  // Schedule panel
  selectedAirport: Airport | null = null;
  scheduleHour = 8;
  currentHour = 6;
  activeFlights: ActiveFlight[] = [];
  showAddRoute = false;
  addRouteFrom = '';
  addRouteTo = '';
  addRouteCarrier = '';

  // Itinerary
  itinFrom = '';
  itinTo   = '';
  itinerary: ItineraryResult | null = null;
  itinRouteIds = new Set<string>();
  itinNoPath = false;

  // Airport drag
  private draggingAirport: Airport | null = null;

  // Panel drag
  panelPos = { x: 20, y: 80 };
  private panelDragging = false;
  private panelDragOffset = { x: 0, y: 0 };

  startPanelDrag(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.panelDragging = true;
    // offset = mouse position relative to container, minus current panel position
    const containerRect = this.mapSvgRef?.nativeElement?.parentElement?.getBoundingClientRect();
    const ox = containerRect ? e.clientX - containerRect.left : e.clientX;
    const oy = containerRect ? e.clientY - containerRect.top : e.clientY;
    this.panelDragOffset = { x: ox - this.panelPos.x, y: oy - this.panelPos.y };
  }

  // Add airport
  addingAirport = false;
  newAirportName = '';
  newAirportCode = '';
  newAirportCapacity = 2;
  pendingPos: { x: number; y: number } | null = null;

  soundEnabled = true;
  helpOpen = false;
  helpPos = { top: 0, left: 0 };

  openHelp(btn: HTMLElement): void {
    const r = btn.getBoundingClientRect();
    this.helpPos = { top: r.bottom + 8, left: r.left };
    this.helpOpen = true;
  }

  private ambiLastAt = 0;
  private ambiNextAt = 0;
  soundCooldownPct = 0; // updated each rAF tick — stable between Angular check passes

  private flightCounter = 0;
  private animFrameId: number | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private animationRunning = false;
  private ambiTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAmbiSound: 'chime' | 'gate' | null = null;
  private lastChimeVariant = -1;

  // What will play next — shown in the dropdown, user-overridable
  nextAmbi = 'chime-0';

  readonly ambiOptions = [
    { value: 'gate',     label: 'Gate Beep' },
    { value: 'chime-0',  label: 'G major' },
    { value: 'chime-1',  label: 'C major' },
    { value: 'chime-2',  label: 'Westminster' },
    { value: 'chime-3',  label: 'A pentatonic' },
    { value: 'chime-4',  label: 'F major' },
    { value: 'chime-5',  label: 'D major' },
    { value: 'chime-6',  label: 'Bb major' },
    { value: 'chime-7',  label: 'E minor' },
    { value: 'chime-8',  label: 'G descending' },
    { value: 'chime-9',  label: 'A descending' },
  ];

  readonly hours = Array.from({ length: 24 }, (_, i) => i);

  // Map selection
  readonly mapDefs = [
    { id: 1, name: 'Vel Thara' },
    { id: 2, name: 'Dravorn Straits' },
    { id: 3, name: 'Aethon Basin' },
  ];
  currentMapId = 1;

  get continentPaths(): string[] {
    switch (this.currentMapId) {
      case 2: return [
        'M 50,50 Q 150,20 280,35 Q 420,20 550,55 Q 640,85 670,145 Q 680,200 650,250 Q 620,285 560,295 Q 470,305 370,285 Q 270,270 180,280 Q 100,268 60,220 Q 25,170 50,50 Z',
        'M 80,360 Q 180,325 320,335 Q 470,325 600,360 Q 700,385 750,440 Q 780,490 760,550 Q 730,585 640,592 Q 520,598 380,588 Q 230,578 130,550 Q 40,520 30,460 Q 22,400 80,360 Z',
        'M 800,185 Q 850,162 910,180 Q 950,205 930,255 Q 905,295 850,285 Q 800,268 795,230 Q 792,205 800,185 Z',
      ];
      case 3: return [
        'M 70,90 Q 190,45 370,60 Q 540,48 700,100 Q 800,145 850,230 Q 880,300 860,390 Q 835,465 770,520 Q 690,565 580,578 Q 460,590 340,572 Q 210,552 120,500 Q 45,450 28,360 Q 10,270 30,180 Q 45,125 70,90 Z',
        'M 720,30 Q 762,14 808,28 Q 835,45 815,70 Q 788,88 748,78 Q 715,64 720,30 Z',
        'M 870,480 Q 918,458 960,475 Q 988,498 970,530 Q 944,558 900,545 Q 865,530 868,502 Q 869,488 870,480 Z',
      ];
      default: return [
        'M 92,132 Q 145,82 205,74 Q 275,64 355,76 Q 442,68 524,86 Q 582,76 618,120 Q 642,162 622,218 Q 607,272 628,338 Q 618,392 578,442 Q 532,482 457,500 Q 382,516 296,512 Q 212,510 142,482 Q 80,452 56,392 Q 36,328 50,258 Q 60,196 92,132 Z',
        'M 718,168 Q 768,142 830,160 Q 876,178 878,238 Q 880,298 842,326 Q 802,346 756,336 Q 712,320 696,274 Q 680,232 696,196 Q 706,176 718,168 Z',
        'M 340,532 Q 372,518 418,524 Q 458,530 464,550 Q 462,570 426,577 Q 386,582 356,568 Q 330,554 340,532 Z',
        'M 110,40 Q 136,28 164,40 Q 182,52 170,66 Q 152,76 126,68 Q 102,58 110,40 Z',
      ];
    }
  }

  switchMap(id: number): void {
    if (id === this.currentMapId) return;
    this.currentMapId = id;
    this.selectedAirport = null;
    this.activeFlights   = [];
    this.itinerary       = null;
    this.itinRouteIds.clear();
    this.itinNoPath = false;
    this.itinFrom   = '';
    this.itinTo     = '';
    this.addingAirport   = false;
    this.pendingPos      = null;
    this.draggingAirport = null;
    this.network  = new AirportNetwork();
    this.carriers = [];
    this.buildNetwork();
    this.settings.playUiClick();
    this.cdr.detectChanges();
  }

  // Auto-generate plausible Vel Thara–style names for new airports
  private readonly namePool: [string, string][] = [
    ['Arvenmoor','AVM'],['Belthrax','BLX'],['Cindport','CDP'],['Duskwall','DSK'],
    ['Eldenmere','ELD'],['Forthaven','FTH'],['Greyspire','GRS'],['Halvenmere','HVM'],
    ['Jethmark','JTM'],['Keldrath','KLD'],['Lornhaven','LRH'],['Mistport','MSP'],
    ['Northwall','NTW'],['Overwatch','OVW'],['Peakford','PKF'],['Quelmar','QLM'],
    ['Riftmere','RFM'],['Stonegate','STG'],['Thornwall','THW'],['Umberfeld','UMB'],
    ['Vanthorpe','VTP'],['Whitmore','WTM'],['Xerrath','XRT'],['Yeldmere','YLD'],['Zathport','ZTP'],
  ];

  private pickNewAirportName(): { name: string; code: string } {
    const used = new Set(this.network.getAirports().map(a => a.code));
    const avail = this.namePool.filter(([, c]) => !used.has(c));
    if (!avail.length) return { name: 'New Airport', code: 'NEW' };
    const [name, code] = avail[Math.floor(Math.random() * avail.length)];
    return { name, code };
  }

  // Alphabetical sort for Itinerary dropdowns
  getSortedAirports(): Airport[] {
    return [...this.network.getAirports()].sort((a, b) => a.name.localeCompare(b.name));
  }

  ngOnInit(): void {
    this.buildNetwork();
    this.startAnimationLoop();
    this.dispatchHour(this.currentHour);
    this.clockTimer = setInterval(() => {
      this.advanceHour();
      this.cdr.detectChanges();
    }, 2500);
    this.scheduleAmbientSounds();
  }

  // SECTION:: Network Initialization
  private buildNetwork(): void {
    switch (this.currentMapId) {
      case 2: this.buildMap2(); break;
      case 3: this.buildMap3(); break;
      default: this.buildMap1();
    }
  }

  private buildMap1(): void {
    // Fake carriers — each operates a strict hub-and-spoke network
    const khorrath   = new Carrier('khorrath',   'Khorrath Air',       'KA', '#e63946');
    const caldenmere = new Carrier('caldenmere', 'Caldenmere Express', 'CX', '#06d6a0');
    const ostmere    = new Carrier('ostmere',    'Ostmere Wings',      'OW', '#ffd166');
    const brexhal    = new Carrier('brexhal',    'Brexhal Lines',      'BL', '#b5179e');
    this.carriers = [khorrath, caldenmere, ostmere, brexhal];

    // Positions are SVG coords in the 1000×600 viewport of the fictional country Vel Thara.
    const khr = new Airport('khr', 'Khorrath',   'KHR', 210, 190, 4, [khorrath]);
    const vds = new Airport('vds', 'Veldspar',   'VDS', 460, 128, 3, [khorrath, ostmere]);
    const cdm = new Airport('cdm', 'Caldenmere', 'CDM', 335, 360, 4, [khorrath, caldenmere]);
    const trv = new Airport('trv', 'Thurvane',   'TRV', 152, 422, 3, [khorrath, caldenmere, brexhal]);
    const prt = new Airport('prt', 'Perithos',   'PRT', 548, 402, 3, [caldenmere, brexhal]);
    const azp = new Airport('azp', 'Azenport',   'AZP', 578, 228, 3, [caldenmere, ostmere]);
    const ost = new Airport('ost', 'Ostmere',    'OST', 775, 232, 3, [khorrath, ostmere]);
    const qrr = new Airport('qrr', 'Quarrath',   'QRR', 825, 296, 2, [ostmere]);
    const brx = new Airport('brx', 'Brexhal',    'BRX', 393, 548, 2, [caldenmere, brexhal]);
    const nlf = new Airport('nlf', 'Nulfoss',    'NLF', 138,  50, 2, [khorrath]);
    // 4 new airports
    const vrx = new Airport('vrx', 'Vraxton',    'VRX', 375, 245, 2, [khorrath, caldenmere]);
    const mld = new Airport('mld', 'Meldport',   'MLD', 272, 455, 2, [khorrath, brexhal]);
    const thn = new Airport('thn', 'Thennock',   'THN', 728, 295, 2, [ostmere]);
    const cvr = new Airport('cvr', 'Corvath',    'CVR', 498, 305, 2, [caldenmere, ostmere]);

    const northern = new RegionalNetwork('north', 'Northern Reaches', '#6366f1');
    const central  = new RegionalNetwork('central', 'Central Plains',   '#f97316');
    const eastern  = new RegionalNetwork('eastern', 'Ostmere Isle',     '#06b6d4');
    [northern, central, eastern].forEach(r => this.network.addRegion(r));

    northern.addAirport(khr); northern.addAirport(vds); northern.addAirport(nlf);
    northern.addAirport(vrx); northern.addAirport(azp);
    central.addAirport(cdm);  central.addAirport(trv);  central.addAirport(prt);
    central.addAirport(brx);  central.addAirport(mld);  central.addAirport(cvr);
    eastern.addAirport(ost);  eastern.addAirport(qrr);  eastern.addAirport(thn);

    khorrath.hub   = khr;
    caldenmere.hub = cdm;
    ostmere.hub    = ost;
    brexhal.hub    = brx;

    // Every carrier uses pure hub-and-spoke: all routes go to/from the hub.
    // Bidirectional routes are added as separate Route objects so both
    // airports can schedule outgoing departures.
    const routes: [string, Airport, Airport, Carrier][] = [
      // Khorrath Air — hub KHR
      ['ka-khr-vds', khr, vds, khorrath], ['ka-vds-khr', vds, khr, khorrath],
      ['ka-khr-cdm', khr, cdm, khorrath], ['ka-cdm-khr', cdm, khr, khorrath],
      ['ka-khr-trv', khr, trv, khorrath], ['ka-trv-khr', trv, khr, khorrath],
      ['ka-khr-nlf', khr, nlf, khorrath], ['ka-nlf-khr', nlf, khr, khorrath],
      ['ka-khr-ost', khr, ost, khorrath], ['ka-ost-khr', ost, khr, khorrath],
      // Caldenmere Express — hub CDM
      ['cx-cdm-azp', cdm, azp, caldenmere], ['cx-azp-cdm', azp, cdm, caldenmere],
      ['cx-cdm-prt', cdm, prt, caldenmere], ['cx-prt-cdm', prt, cdm, caldenmere],
      ['cx-cdm-trv', cdm, trv, caldenmere], ['cx-trv-cdm', trv, cdm, caldenmere],
      ['cx-cdm-brx', cdm, brx, caldenmere], ['cx-brx-cdm', brx, cdm, caldenmere],
      // Ostmere Wings — hub OST
      ['ow-ost-qrr', ost, qrr, ostmere], ['ow-qrr-ost', qrr, ost, ostmere],
      ['ow-ost-azp', ost, azp, ostmere], ['ow-azp-ost', azp, ost, ostmere],
      ['ow-ost-vds', ost, vds, ostmere], ['ow-vds-ost', vds, ost, ostmere],
      // Brexhal Lines — hub BRX
      ['bl-brx-prt', brx, prt, brexhal], ['bl-prt-brx', prt, brx, brexhal],
      ['bl-brx-trv', brx, trv, brexhal], ['bl-trv-brx', trv, brx, brexhal],
      ['bl-brx-mld', brx, mld, brexhal], ['bl-mld-brx', mld, brx, brexhal],
      // New airports — extend existing hubs
      ['ka-khr-vrx', khr, vrx, khorrath], ['ka-vrx-khr', vrx, khr, khorrath],
      ['ka-khr-mld', khr, mld, khorrath], ['ka-mld-khr', mld, khr, khorrath],
      ['cx-cdm-vrx', cdm, vrx, caldenmere], ['cx-vrx-cdm', vrx, cdm, caldenmere],
      ['cx-cdm-cvr', cdm, cvr, caldenmere], ['cx-cvr-cdm', cvr, cdm, caldenmere],
      ['ow-ost-thn', ost, thn, ostmere],  ['ow-thn-ost', thn, ost, ostmere],
      ['ow-ost-cvr', ost, cvr, ostmere],  ['ow-cvr-ost', cvr, ost, ostmere],
    ];

    routes.forEach(([id, from, to, carrier]) =>
      this.network.addConnection(new Route(id, from, to, carrier))
    );

    this.seedDefaultSchedule();
  }

  // SECTION:: Map 2 — Dravorn Straits
  private buildMap2(): void {
    const ha = new Carrier('ha', 'Halvorn Air',       'HA', '#e63946');
    const cx = new Carrier('cx', 'Coldmere Lines',    'CX', '#06d6a0');
    const sx = new Carrier('sx', 'Southbray Express', 'SX', '#ffd166');
    const mw = new Carrier('mw', 'Malthorn Wings',    'MW', '#b5179e');
    this.carriers = [ha, cx, sx, mw];

    const hvn = new Airport('hvn', 'Halvorn',    'HVN', 200, 145, 4, [ha, cx]);
    const drv = new Airport('drv', 'Dravorn',    'DRV', 400,  75, 3, [ha]);
    const nmr = new Airport('nmr', 'Nordmere',   'NMR', 110, 185, 3, [ha, mw]);
    const skl = new Airport('skl', 'Skelport',   'SKL', 310, 200, 2, [ha, cx]);
    const cld = new Airport('cld', 'Coldmere',   'CLD', 540, 165, 4, [cx]);
    const wst = new Airport('wst', 'Westholt',   'WST', 450, 240, 2, [cx]);
    const ern = new Airport('ern', 'Ernost',     'ERN', 855, 230, 3, [cx, sx]);
    const sbr = new Airport('sbr', 'Southbray',  'SBR', 320, 415, 4, [sx, mw]);
    const grv = new Airport('grv', 'Gravelton',  'GRV', 500, 375, 3, [sx]);
    const vel = new Airport('vel', 'Velmouth',   'VEL', 660, 440, 2, [sx]);
    const mlt = new Airport('mlt', 'Malthorn',   'MLT', 170, 480, 4, [mw]);
    const str = new Airport('str', 'Strathmore', 'STR', 210, 540, 2, [mw]);
    const esk = new Airport('esk', 'Eskwall',    'ESK', 430, 510, 2, [mw]);

    const north2  = new RegionalNetwork('north2',  'Northern Straits', '#6366f1');
    const south2  = new RegionalNetwork('south2',  'Southern Coast',   '#f97316');
    const eastern2 = new RegionalNetwork('eastern2', 'Eastern Isle',   '#06b6d4');
    [north2, south2, eastern2].forEach(r => this.network.addRegion(r));

    north2.addAirport(hvn);  north2.addAirport(drv);  north2.addAirport(nmr);
    north2.addAirport(skl);  north2.addAirport(cld);  north2.addAirport(wst);
    south2.addAirport(sbr);  south2.addAirport(grv);  south2.addAirport(vel);
    south2.addAirport(mlt);  south2.addAirport(str);  south2.addAirport(esk);
    eastern2.addAirport(ern);

    ha.hub = hvn; cx.hub = cld; sx.hub = sbr; mw.hub = mlt;

    const routes: [string, Airport, Airport, Carrier][] = [
      ['ha-hvn-drv', hvn, drv, ha], ['ha-drv-hvn', drv, hvn, ha],
      ['ha-hvn-nmr', hvn, nmr, ha], ['ha-nmr-hvn', nmr, hvn, ha],
      ['ha-hvn-skl', hvn, skl, ha], ['ha-skl-hvn', skl, hvn, ha],
      ['cx-cld-hvn', cld, hvn, cx], ['cx-hvn-cld', hvn, cld, cx],
      ['cx-cld-skl', cld, skl, cx], ['cx-skl-cld', skl, cld, cx],
      ['cx-cld-wst', cld, wst, cx], ['cx-wst-cld', wst, cld, cx],
      ['cx-cld-ern', cld, ern, cx], ['cx-ern-cld', ern, cld, cx],
      ['sx-sbr-grv', sbr, grv, sx], ['sx-grv-sbr', grv, sbr, sx],
      ['sx-sbr-vel', sbr, vel, sx], ['sx-vel-sbr', vel, sbr, sx],
      ['sx-sbr-ern', sbr, ern, sx], ['sx-ern-sbr', ern, sbr, sx],
      ['mw-mlt-sbr', mlt, sbr, mw], ['mw-sbr-mlt', sbr, mlt, mw],
      ['mw-mlt-str', mlt, str, mw], ['mw-str-mlt', str, mlt, mw],
      ['mw-mlt-esk', mlt, esk, mw], ['mw-esk-mlt', esk, mlt, mw],
      ['mw-mlt-nmr', mlt, nmr, mw], ['mw-nmr-mlt', nmr, mlt, mw],
    ];
    routes.forEach(([id, from, to, carrier]) =>
      this.network.addConnection(new Route(id, from, to, carrier))
    );
    this.seedDefaultSchedule();
  }

  // SECTION:: Map 3 — Aethon Basin
  private buildMap3(): void {
    const aa = new Carrier('aa', 'Aethon Air',         'AA', '#e63946');
    const be = new Carrier('be', 'Blackridge Express', 'BE', '#06d6a0');
    const cl = new Carrier('cl', 'Cithrex Lines',      'CL', '#ffd166');
    const iw = new Carrier('iw', 'Irongate Wings',     'IW', '#b5179e');
    this.carriers = [aa, be, cl, iw];

    const ath = new Airport('ath', 'Aethon',     'ATH', 480, 300, 4, [aa, be, cl, iw]);
    const blk = new Airport('blk', 'Blackridge', 'BLK', 200, 180, 4, [aa, be, iw]);
    const ctr = new Airport('ctr', 'Cithrex',    'CTR', 700, 200, 4, [aa, cl]);
    const dwn = new Airport('dwn', 'Dawnspire',  'DWN', 280, 440, 3, [aa, be, iw]);
    const esk = new Airport('esk', 'Eskwall',    'ESK', 620, 420, 3, [aa, cl]);
    const frk = new Airport('frk', 'Forkhaven',  'FRK', 110, 320, 3, [be, iw]);
    const gnt = new Airport('gnt', 'Grantley',   'GNT', 790, 320, 2, [cl]);
    const hrb = new Airport('hrb', 'Harborgate', 'HRB', 450, 510, 3, [aa, cl]);
    const irg = new Airport('irg', 'Irongate',   'IRG', 340, 250, 4, [aa, be, iw]);
    const jrn = new Airport('jrn', 'Jornmere',   'JRN', 670, 490, 2, [cl]);
    const nli = new Airport('nli', 'Nollith',    'NLI', 760,  52, 2, [aa]);
    const shr = new Airport('shr', 'Shornhaven', 'SHR', 925, 505, 2, [cl]);

    const west3    = new RegionalNetwork('west3',  'Western Highlands', '#6366f1');
    const central3 = new RegionalNetwork('central3','Aethon Basin',     '#f97316');
    const east3    = new RegionalNetwork('east3',  'Eastern Shores',    '#06b6d4');
    [west3, central3, east3].forEach(r => this.network.addRegion(r));

    west3.addAirport(blk);    west3.addAirport(frk);   west3.addAirport(irg);
    central3.addAirport(ath); central3.addAirport(dwn); central3.addAirport(hrb);
    central3.addAirport(nli);
    east3.addAirport(ctr);    east3.addAirport(esk);   east3.addAirport(gnt);
    east3.addAirport(jrn);    east3.addAirport(shr);

    aa.hub = ath; be.hub = blk; cl.hub = ctr; iw.hub = irg;

    const routes: [string, Airport, Airport, Carrier][] = [
      ['aa-ath-blk', ath, blk, aa], ['aa-blk-ath', blk, ath, aa],
      ['aa-ath-ctr', ath, ctr, aa], ['aa-ctr-ath', ctr, ath, aa],
      ['aa-ath-dwn', ath, dwn, aa], ['aa-dwn-ath', dwn, ath, aa],
      ['aa-ath-esk', ath, esk, aa], ['aa-esk-ath', esk, ath, aa],
      ['aa-ath-hrb', ath, hrb, aa], ['aa-hrb-ath', hrb, ath, aa],
      ['aa-ath-nli', ath, nli, aa], ['aa-nli-ath', nli, ath, aa],
      ['aa-ath-irg', ath, irg, aa], ['aa-irg-ath', irg, ath, aa],
      ['be-blk-frk', blk, frk, be], ['be-frk-blk', frk, blk, be],
      ['be-blk-irg', blk, irg, be], ['be-irg-blk', irg, blk, be],
      ['be-blk-dwn', blk, dwn, be], ['be-dwn-blk', dwn, blk, be],
      ['cl-ctr-gnt', ctr, gnt, cl], ['cl-gnt-ctr', gnt, ctr, cl],
      ['cl-ctr-esk', ctr, esk, cl], ['cl-esk-ctr', esk, ctr, cl],
      ['cl-ctr-jrn', ctr, jrn, cl], ['cl-jrn-ctr', jrn, ctr, cl],
      ['cl-ctr-shr', ctr, shr, cl], ['cl-shr-ctr', shr, ctr, cl],
      ['cl-ctr-hrb', ctr, hrb, cl], ['cl-hrb-ctr', hrb, ctr, cl],
      ['iw-irg-frk', irg, frk, iw], ['iw-frk-irg', frk, irg, iw],
      ['iw-irg-dwn', irg, dwn, iw], ['iw-dwn-irg', dwn, irg, iw],
      ['iw-irg-blk', irg, blk, iw], ['iw-blk-irg', blk, irg, iw],
    ];
    routes.forEach(([id, from, to, carrier]) =>
      this.network.addConnection(new Route(id, from, to, carrier))
    );
    this.seedDefaultSchedule();
  }

  private seedDefaultSchedule(): void {
    const airports = this.network.getAirports();
    const allRoutes = this.network.getOutgoingRoutes();

    // Give each airport a spread of departures across the day
    for (const airport of airports) {
      const outgoing = airport.getOutgoingRoutes();
      if (!outgoing.length) continue;
      let routeIdx = 0;
      for (let h = 0; h < 24; h++) {
        const slots = Math.floor(Math.random() * airport.getCapacity()) + 1;
        for (let s = 0; s < slots && s < outgoing.length; s++) {
          airport.toggleSchedule(h, outgoing[(routeIdx + s) % outgoing.length].id);
        }
        routeIdx++;
      }
    }

    // Guarantee at least 1 departure every hour somewhere in the network
    for (let h = 0; h < 24; h++) {
      const hasDep = airports.some(a => a.getDepartureCount(h) > 0);
      if (!hasDep) {
        // Pick a random route and schedule it from its origin airport
        const route = allRoutes[h % allRoutes.length];
        route.from.toggleSchedule(h, route.id);
      }
    }
  }

  // SECTION:: Animation Loop
  private startAnimationLoop(): void {
    this.animationRunning = true;
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        if (!this.animationRunning) return;
        const now = performance.now();

        this.activeFlights.forEach(f => {
          const elapsed = now - f.startTime;
          f.progress = elapsed < 0 ? 0 : Math.min(elapsed / f.duration, 1);
        });
        this.activeFlights = this.activeFlights.filter(f => f.progress < 1);

        // Compute cooldown as a stable field before detectChanges
        if (this.ambiNextAt > 0) {
          const total = this.ambiNextAt - this.ambiLastAt;
          this.soundCooldownPct = total > 0
            ? Math.min(1, Math.max(0, (now - this.ambiLastAt) / total))
            : 1;
        }

        this.cdr.detectChanges();
        this.animFrameId = requestAnimationFrame(loop);
      };
      this.animFrameId = requestAnimationFrame(loop);
    });
  }

  private readonly MAX_FLIGHT_SPEED = 120; // SVG units/s — cruise speed
  private readonly ACCEL_DIST       = 80;  // SVG units — fixed accel/decel distance for every flight

  private launchFlight(route: Route, delayMs = 0): void {
    const dx = route.to.x - route.from.x;
    const dy = route.to.y - route.from.y;
    const distSvg = Math.sqrt(dx * dx + dy * dy);

    const S = this.MAX_FLIGHT_SPEED;
    const D = Math.min(this.ACCEL_DIST, distSvg / 2); // cap so accel+decel never exceed total dist

    // Trapezoidal velocity profile:
    //   accel phase: 0→S over distance D  (avg speed S/2, time = 2D/S)
    //   cruise phase: constant S           (time = (dist-2D)/S)
    //   decel phase: symmetric to accel
    const t_a = (2 * D) / S;                          // seconds per accel/decel phase
    const t_c = (distSvg - 2 * D) / S;               // cruise time
    const totalSec = 2 * t_a + t_c;
    const duration = Math.max(1200, totalSec * 1000); // ms, 1.2s floor

    // Fractions used in getFlightPos to drive the piecewise easing
    const accelFrac    = t_a / totalSec;        // portion of progress range spent in accel/decel
    const accelPosFrac = D  / distSvg;          // portion of route distance covered in accel/decel

    this.activeFlights.push({
      id: `f${this.flightCounter++}`,
      route,
      progress: 0,
      startTime: performance.now() + delayMs,
      duration,
      accelFrac,
      accelPosFrac,
    });
  }

  // Uses live airport coordinates so positions update while dragging
  getFlightPos(flight: ActiveFlight): { x: number; y: number } {
    const p  = flight.progress;
    const a  = flight.accelFrac;
    const ap = flight.accelPosFrac;

    // Piecewise trapezoidal easing — same physical accel rate for every flight:
    //   accel  (p: 0→a)     quadratic ease-in  covering fraction ap of the route
    //   cruise (p: a→1-a)   linear             covering the middle stretch
    //   decel  (p: 1-a→1)   quadratic ease-out covering the final ap fraction
    let t: number;
    if (p <= a) {
      const lp = p / a;                             // 0→1 within accel phase
      t = lp * lp * ap;
    } else if (p <= 1 - a) {
      t = ap + ((p - a) / (1 - 2 * a)) * (1 - 2 * ap);
    } else {
      const lp = (p - (1 - a)) / a;                // 0→1 within decel phase
      t = (1 - ap) + (2 * lp - lp * lp) * ap;
    }

    const { x: x1, y: y1 } = flight.route.from;
    const { x: x2, y: y2 } = flight.route.to;
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  }

  routeDistance(route: Route): number {
    const dx = route.to.x - route.from.x;
    const dy = route.to.y - route.from.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  routeMidpoint(route: Route): { x: number; y: number } {
    return {
      x: (route.from.x + route.to.x) / 2,
      y: (route.from.y + route.to.y) / 2 - 8,
    };
  }

  getRouteId(route: Route): string { return route.id; }

  // SECTION:: Ambient Sounds
  // Single merged timer so the cooldown bar reflects exactly one countdown.
  // 60 % → PA chime (longer, more atmospheric), 40 % → gate beep (shorter, subtle).
  private pickAndPlayAmbi(): void {
    // Play whatever is queued (dropdown value, possibly user-overridden)
    if (this.nextAmbi === 'gate') {
      this.settings.playGateBeep();
      this.lastAmbiSound = 'gate';
    } else {
      const v = parseInt(this.nextAmbi.split('-')[1] ?? '0', 10);
      this.settings.playPaChime(v);
      this.lastChimeVariant = v;
      this.lastAmbiSound = 'chime';
    }
    // Pre-select the next sound so the dropdown updates immediately after play
    this.queueNextAmbi();
  }

  private queueNextAmbi(): void {
    if (this.lastAmbiSound === 'chime') {
      this.nextAmbi = 'gate';
    } else {
      let v: number;
      do { v = Math.floor(Math.random() * 10); } while (v === this.lastChimeVariant);
      this.lastChimeVariant = v;
      this.nextAmbi = `chime-${v}`;
    }
  }

  private scheduleAmbientSounds(): void {
    const loop = () => {
      if (!this.animationRunning) return;
      const delay = 10000 + Math.random() * 14000; // 10–24 s
      this.ambiLastAt = performance.now();
      this.ambiNextAt = this.ambiLastAt + delay;
      this.ambiTimer  = setTimeout(() => {
        if (this.soundEnabled) this.pickAndPlayAmbi();
        loop();
      }, delay);
    };
    // Seed the first queued sound before the first timer fires
    this.queueNextAmbi();
    this.ambiLastAt = performance.now();
    this.ambiNextAt = this.ambiLastAt + 6000;
    this.ambiTimer  = setTimeout(() => {
      if (!this.animationRunning) return;
      if (this.soundEnabled) this.pickAndPlayAmbi();
      loop();
    }, 6000);
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
  }

  playNextAmbient(): void {
    if (this.ambiTimer) clearTimeout(this.ambiTimer);
    if (this.soundEnabled) this.pickAndPlayAmbi();
    this.scheduleAmbientSounds();
  }

  // SECTION:: Clock Controls
  dispatchHour(hour: number): void {
    const departures = this.network.getDeparturesAtHour(hour);
    for (const { route } of departures) {
      this.launchFlight(route, Math.random() * 125);
    }
  }

  advanceHour(): void {
    this.currentHour = (this.currentHour + 1) % 24;
    this.dispatchHour(this.currentHour);
  }

  resetClock(): void {
    if (this.clockTimer) { clearInterval(this.clockTimer); this.clockTimer = null; }
    this.currentHour = 6;
    this.activeFlights = [];
    this.dispatchHour(this.currentHour);
    this.clockTimer = setInterval(() => {
      this.advanceHour();
      this.cdr.detectChanges();
    }, 2500);
  }

  formatHour(h: number): string {
    const ampm = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${ampm}`;
  }

  // SECTION:: Airport Selection & Schedule Editing
  selectAirport(airport: Airport): void {
    if (this.dragMoved) return; // drag just ended — don't open panel
    this.settings.playUiClick();
    if (this.selectedAirport !== airport) this.panelPos = this.choosePanelPos(airport);
    this.selectedAirport = airport;
    this.scheduleHour = this.currentHour;
    this.showAddRoute = false;
  }

  private choosePanelPos(airport: Airport): { x: number; y: number } {
    const containerEl = this.mapSvgRef?.nativeElement?.parentElement;
    const containerW = containerEl?.clientWidth ?? 1000;
    const containerH = containerEl?.clientHeight ?? 600;

    // Convert SVG coords (viewBox 0 0 1000 600, xMidYMid meet) to container pixels
    const scaleX = containerW / 1000;
    const scaleY = containerH / 600;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (containerW - 1000 * scale) / 2;
    const offsetY = (containerH - 600 * scale) / 2;
    const apx = airport.x * scale + offsetX;
    const apy = airport.y * scale + offsetY;

    const panelW = 280; // panel width + margin
    const panelH = 180; // rough top portion of panel
    const margin = 20;

    // Prefer top-left; fall back to top-right if airport is in that zone
    const topLeftX = margin;
    const topLeftY = margin;
    const airportInTopLeft = apx < topLeftX + panelW && apy < topLeftY + panelH;

    if (!airportInTopLeft) return { x: topLeftX, y: topLeftY };

    // Top-right
    const topRightX = containerW - panelW - margin;
    return { x: Math.max(margin, topRightX), y: topLeftY };
  }

  closePanel(): void {
    this.selectedAirport = null;
    this.showAddRoute = false;
  }

  toggleSchedule(hour: number, routeId: string): void {
    this.selectedAirport?.toggleSchedule(hour, routeId);
  }

  isScheduled(hour: number, routeId: string): boolean {
    return this.selectedAirport?.isScheduled(hour, routeId) ?? false;
  }

  departureCount(hour: number): number {
    return this.selectedAirport?.getDepartureCount(hour) ?? 0;
  }

  atCapacity(hour: number): boolean {
    if (!this.selectedAirport) return false;
    return this.selectedAirport.getDepartureCount(hour) >= this.selectedAirport.getCapacity();
  }

  setCapacity(airport: Airport, value: number): void {
    const clamped = Math.max(1, Math.min(10, value));
    airport.capacity = clamped;
    // drop any scheduled departures that now exceed the new cap
    for (const [hour, slots] of airport.schedule.entries()) {
      const routes = [...slots];
      while (routes.length > clamped) {
        slots.delete(routes.pop()!);
      }
    }
    this.settings.playUiClick();
  }

  getSelectedOutgoing(): Route[] {
    return this.selectedAirport?.getOutgoingRoutes() ?? [];
  }

  // SECTION:: Drag Nodes
  private dragMoved = false;

  startDrag(e: MouseEvent, airport: Airport): void {
    e.stopPropagation();
    if (this.addingAirport) return;
    this.settings.playUiClick();
    this.draggingAirport = airport;
    this.dragMoved = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.panelDragging) {
      const containerRect = this.mapSvgRef?.nativeElement?.parentElement?.getBoundingClientRect();
      const mx = containerRect ? e.clientX - containerRect.left : e.clientX;
      const my = containerRect ? e.clientY - containerRect.top : e.clientY;
      this.panelPos = { x: mx - this.panelDragOffset.x, y: my - this.panelDragOffset.y };
      this.cdr.detectChanges();
      return;
    }
    if (!this.draggingAirport) return;
    const pos = this.svgCoords(e);
    if (!pos) return;
    this.dragMoved = true;
    this.draggingAirport.x = pos.x;
    this.draggingAirport.y = pos.y;
    if (this.itinerary) this.computeItinerary();
    this.cdr.detectChanges();
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.panelDragging = false;
    this.draggingAirport = null;
  }

  private svgCoords(e: MouseEvent): { x: number; y: number } | null {
    const svg = this.mapSvgRef?.nativeElement;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vb   = svg.viewBox.baseVal;
    return {
      x: Math.round(Math.max(0, Math.min(vb.width,  ((e.clientX - rect.left) / rect.width)  * vb.width))),
      y: Math.round(Math.max(0, Math.min(vb.height, ((e.clientY - rect.top)  / rect.height) * vb.height))),
    };
  }

  // SECTION:: Add / Remove Airport Nodes
  startAddAirport(): void {
    this.addingAirport = true;
    this.pendingPos = null;
    this.selectedAirport = null;
    const { name, code } = this.pickNewAirportName();
    this.newAirportName = name;
    this.newAirportCode = code;
  }

  onMapClick(e: MouseEvent): void {
    if (!this.addingAirport) return;
    const pos = this.svgCoords(e);
    if (pos) this.pendingPos = pos;
  }

  confirmAddAirport(): void {
    if (!this.pendingPos || !this.newAirportCode.trim() || !this.newAirportName.trim()) return;
    const code = this.newAirportCode.toUpperCase().slice(0, 3);
    const id   = code.toLowerCase() + Date.now();
    const airport = new Airport(id, this.newAirportName.trim(), code,
      this.pendingPos.x, this.pendingPos.y, this.newAirportCapacity);
    this.network.addAirport(airport);
    this.addingAirport   = false;
    this.pendingPos      = null;
    this.newAirportName  = '';
    this.newAirportCode  = '';
    this.newAirportCapacity = 2;
    this.selectedAirport = airport;
  }

  cancelAddAirport(): void {
    this.addingAirport = false;
    this.pendingPos    = null;
  }

  canRemoveAirport(airport: Airport): { ok: boolean; reason?: string } {
    const asHub = this.carriers.find(c => c.hub === airport);
    if (asHub) return { ok: false, reason: `${airport.code} is ${asHub.name}'s hub` };

    for (const carrier of this.carriers) {
      if (!carrier.hub) continue;
      const remaining = this.network.getOutgoingRoutes().filter(
        r => r.carrier === carrier && r.from !== airport && r.to !== airport
      );
      const allForCarrier = this.network.getOutgoingRoutes().filter(r => r.carrier === carrier);
      const carrierIds = new Set<string>();
      allForCarrier.forEach(r => { carrierIds.add(r.from.id); carrierIds.add(r.to.id); });
      carrierIds.delete(airport.id);
      if (carrierIds.size === 0) continue;

      const reachable = new Set<string>([carrier.hub.id]);
      const queue     = [carrier.hub];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const r of remaining) {
          if (r.from === cur && !reachable.has(r.to.id))   { reachable.add(r.to.id);   queue.push(r.to); }
          if (r.to   === cur && !reachable.has(r.from.id)) { reachable.add(r.from.id); queue.push(r.from); }
        }
      }
      for (const id of carrierIds) {
        if (!reachable.has(id)) return { ok: false, reason: `Removing ${airport.code} disconnects ${carrier.name}` };
      }
    }
    return { ok: true };
  }

  removeAirport(airport: Airport): void {
    const check = this.canRemoveAirport(airport);
    if (!check.ok) return;
    // Remove all routes involving this airport
    const toRemove = this.network.getOutgoingRoutes()
      .filter(r => r.from === airport || r.to === airport)
      .map(r => r.id);
    toRemove.forEach(id => this.network.removeConnection(id));
    this.network.removeAirport(airport.id);
    this.activeFlights = this.activeFlights.filter(
      f => f.route.from !== airport && f.route.to !== airport
    );
    if (this.selectedAirport === airport) this.selectedAirport = null;
    if (this.itinerary) this.computeItinerary();
  }

  // SECTION:: Itinerary Pathfinding
  computeItinerary(): void {
    this.itinerary   = null;
    this.itinRouteIds.clear();
    this.itinNoPath  = false;

    const airports = this.network.getAirports();
    const from = airports.find(a => a.id === this.itinFrom);
    const to   = airports.find(a => a.id === this.itinTo);
    if (!from || !to || from === to) return;

    // Modified Dijkstra: primary key = carrier switches, secondary = distance
    type State = { airport: Airport; lastCarrier: Carrier | null };
    type Item  = { state: State; switches: number; dist: number; steps: ItineraryStep[] };

    const visited = new Set<string>();
    const key = (s: State) => `${s.airport.id}:${s.lastCarrier?.id ?? ''}`;

    const queue: Item[] = [{ state: { airport: from, lastCarrier: null }, switches: 0, dist: 0, steps: [] }];

    while (queue.length) {
      queue.sort((a, b) => a.switches !== b.switches ? a.switches - b.switches : a.dist - b.dist);
      const { state, switches, dist, steps } = queue.shift()!;
      const k = key(state);
      if (visited.has(k)) continue;
      visited.add(k);

      if (state.airport === to) {
        this.itinerary = { steps, totalDistance: dist, carrierSwitches: switches };
        steps.forEach(s => this.itinRouteIds.add(s.route.id));
        return;
      }

      for (const route of state.airport.getOutgoingRoutes()) {
        const nk = `${route.to.id}:${route.carrier.id}`;
        if (visited.has(nk)) continue;
        const d  = this.routeDistance(route);
        const sw = switches + (state.lastCarrier && state.lastCarrier !== route.carrier ? 1 : 0);
        queue.push({ state: { airport: route.to, lastCarrier: route.carrier }, switches: sw, dist: dist + d, steps: [...steps, { route, distance: d }] });
      }
    }
    this.itinNoPath = true;
  }

  clearItinerary(): void {
    this.itinerary = null;
    this.itinRouteIds.clear();
    this.itinNoPath = false;
    this.itinFrom = '';
    this.itinTo   = '';
  }

  isItinRoute(routeId: string): boolean { return this.itinRouteIds.has(routeId); }

  // SECTION:: Add / Remove Routes
  submitAddRoute(): void {
    if (!this.addRouteFrom || !this.addRouteTo || !this.addRouteCarrier) return;
    if (this.addRouteFrom === this.addRouteTo) return;

    const airports = this.network.getAirports();
    const from = airports.find(a => a.id === this.addRouteFrom);
    const to   = airports.find(a => a.id === this.addRouteTo);
    const carrier = this.carriers.find(c => c.id === this.addRouteCarrier);
    if (!from || !to || !carrier) return;

    const id = `custom-${from.id}-${to.id}-${carrier.id}-${Date.now()}`;
    this.network.addConnection(new Route(id, from, to, carrier));
    if (!from.carriers.includes(carrier)) from.carriers.push(carrier);
    this.showAddRoute = false;
    this.addRouteFrom = this.addRouteTo = this.addRouteCarrier = '';
  }

  removeRoute(routeId: string): void {
    this.network.removeConnection(routeId);
  }

  // SECTION:: Template Helpers
  getAirports(): Airport[]          { return this.network.getAirports(); }
  getRoutes(): Route[]              { return this.network.getOutgoingRoutes(); }
  getRegions(): RegionalNetwork[]   { return this.network.getRegions(); }

  hoveredRegion: RegionalNetwork | null = null;
  regionTooltipPos = { top: 0, left: 0 };
  infightTooltipOpen = false;
  infightTooltipPos  = { top: 0, left: 0 };

  private tooltipCloseTimer: ReturnType<typeof setTimeout> | null = null;

  scheduleTooltipClose(fn: () => void, delay = 120): void {
    this.cancelTooltipClose();
    this.tooltipCloseTimer = setTimeout(() => fn(), delay);
  }

  cancelTooltipClose(): void {
    if (this.tooltipCloseTimer !== null) {
      clearTimeout(this.tooltipCloseTimer);
      this.tooltipCloseTimer = null;
    }
  }

  setInflightTooltipPos(e: MouseEvent): void {
    this.cancelTooltipClose();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.infightTooltipPos = { top: rect.top - 6, left: rect.left };
    this.infightTooltipOpen = true;
  }

  closeInflightTooltip(): void {
    this.scheduleTooltipClose(() => { this.infightTooltipOpen = false; });
  }

  hoverRegion(r: RegionalNetwork | null, e?: MouseEvent): void {
    if (r) {
      this.cancelTooltipClose();
      const rect = (e!.currentTarget as HTMLElement).getBoundingClientRect();
      this.regionTooltipPos = { top: rect.top - 6, left: rect.left };
      this.hoveredRegion = r;
    } else {
      this.scheduleTooltipClose(() => { this.hoveredRegion = null; });
    }
  }

  isRegionHovered(airport: Airport): boolean {
    return !!this.hoveredRegion && this.hoveredRegion.getAirports().includes(airport);
  }

  getRegionBoundingBox(r: RegionalNetwork): { x: number; y: number; w: number; h: number } | null {
    const airports = r.getAirports();
    if (airports.length === 0) return null;
    const pad = 28;
    const xs = airports.map(a => a.x);
    const ys = airports.map(a => a.y);
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad;
    return { x, y, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  }

  getAirportRegion(airport: Airport): RegionalNetwork | null {
    return this.network.getRegions().find(r => r.getAirports().includes(airport)) ?? null;
  }

  moveAirportToRegion(airport: Airport, regionId: string): void {
    this.network.getRegions().forEach(r => r.removeAirport(airport.id));
    const target = this.network.getRegions().find(r => r.regionId === regionId);
    target?.addAirport(airport);
    this.settings.playUiClick();
  }

  isRegionPeer(airport: Airport): boolean {
    if (!this.selectedAirport || airport === this.selectedAirport) return false;
    const selRegion = this.getAirportRegion(this.selectedAirport);
    return !!selRegion && selRegion.getAirports().includes(airport);
  }

  airportNodeRadius(airport: Airport): number {
    return (8 + airport.getCapacity() * 3) * 0.75;
  }

  isHubFor(airport: Airport): Carrier[] {
    return this.carriers.filter(c => c.hub === airport);
  }

  getCarrierArcs(airport: Airport): { color: string; dasharray: string; dashoffset: string }[] {
    const n = airport.carriers.length;
    if (n === 0) return [];
    const r = this.airportNodeRadius(airport) + 7;
    const C = 2 * Math.PI * r;
    const arcLen = C / n;
    const gap = Math.min(3, arcLen * 0.12);
    return airport.carriers.map((carrier, i) => ({
      color: carrier.color,
      dasharray: `${arcLen - gap} ${C - arcLen + gap}`,
      dashoffset: `${-(i / n) * C - C / 4}`,
    }));
  }

  networkHovered = false;

  getNetworkBoundingBox(): { x: number; y: number; w: number; h: number } | null {
    const airports = this.network.getAirports();
    if (airports.length === 0) return null;
    const pad = 44;
    const xs = airports.map(a => a.x);
    const ys = airports.map(a => a.y);
    return {
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }

  networkCapacity(): number { return this.network.getCapacity(); }

  networkRouteCount(): number { return this.network.getOutgoingRoutes().length; }

  // Scheduled departures this hour — always ≤ capacity by construction.
  // activeFlights.length would exceed capacity because mid-animation flights
  // from the previous hour are still alive when the next hour dispatches.
  departuresThisHour(): number { return this.network.getDeparturesAtHour(this.currentHour).length; }

  // Carrier stats — composite-assisted but not pure composite.
  // Uses getOutgoingRoutes() from the tree, then filters by carrier outside it.
  carrierActiveFlights(carrier: Carrier): number {
    return this.network.getDeparturesAtHour(this.currentHour)
      .filter(d => d.route.carrier.id === carrier.id).length;
  }

  carrierCapacity(carrier: Carrier): number {
    // getAirports() recurses through the composite tree — but the carrier filter is external
    return this.network.getAirports()
      .filter(a => a.carriers.includes(carrier))
      .reduce((sum, a) => sum + a.getCapacity(), 0);
  }

  carrierTooltipOpen: Carrier | null = null;
  carrierTooltipPos = { top: 0, left: 0 };

  setCarrierTooltip(carrier: Carrier | null, e?: MouseEvent): void {
    if (carrier) {
      this.cancelTooltipClose();
      const rect = (e!.currentTarget as HTMLElement).getBoundingClientRect();
      this.carrierTooltipPos = { top: rect.top - 6, left: rect.left };
      this.carrierTooltipOpen = carrier;
    } else {
      this.scheduleTooltipClose(() => { this.carrierTooltipOpen = null; });
    }
  }

  // Departures scheduled THIS hour from a region — uses region.getOutgoingRoutes()
  // (Composite → flatMaps to Leaf airports). Bounded by capacity since the schedule
  // editor enforces the per-airport cap, so current ≤ capacity is always true.
  regionActiveFlights(region: RegionalNetwork): number {
    const regionRouteIds = new Set(region.getOutgoingRoutes().map(r => r.id));
    return this.network.getDeparturesAtHour(this.currentHour)
      .filter(d => regionRouteIds.has(d.route.id)).length;
  }

  ngOnDestroy(): void {
    this.animationRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.clockTimer)  clearInterval(this.clockTimer);
    if (this.ambiTimer)   clearTimeout(this.ambiTimer);
  }

  trackFlight(_: number, f: ActiveFlight) { return f.id; }
  trackRoute(_: number, r: Route)         { return r.id; }
  trackAirport(_: number, a: Airport)     { return a.id; }
}
