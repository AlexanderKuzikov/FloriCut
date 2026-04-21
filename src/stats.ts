export class Stats {
  private latencies:  number[] = [];
  private timestamps: number[] = [];
  private startTime = Date.now();
  ok    = 0;
  skip  = 0;
  tight = 0;
  err   = 0;

  record(latencyMs: number): void {
    this.latencies.push(latencyMs);
    this.timestamps.push(Date.now());
  }

  get rpm(): number {
    const now = Date.now();
    return this.timestamps.filter(t => now - t < 60_000).length;
  }

  get avgLatency(): number {
    if (!this.latencies.length) return 0;
    return Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length);
  }

  get minLatency(): number {
    return this.latencies.length ? Math.min(...this.latencies) : 0;
  }

  get maxLatency(): number {
    return this.latencies.length ? Math.max(...this.latencies) : 0;
  }

  get p95Latency(): number {
    if (!this.latencies.length) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const idx    = Math.floor(sorted.length * 0.95);
    return sorted[idx] ?? sorted[sorted.length - 1];
  }

  get elapsedMs(): number {
    return Date.now() - this.startTime;
  }

  get elapsedStr(): string {
    return formatDuration(this.elapsedMs);
  }

  speedPerMin(): number {
    const elapsedMin = this.elapsedMs / 60_000;
    if (elapsedMin < 0.05 || !this.latencies.length) return 0;
    return Math.round(this.latencies.length / elapsedMin);
  }

  eta(remaining: number): string {
    if (remaining <= 0) return '0s';
    const speed = this.speedPerMin();
    if (speed <= 0) return '—';
    return formatDuration((remaining / speed) * 60_000);
  }

  errPct(done: number): string {
    if (!done) return '0.0';
    return ((this.err / done) * 100).toFixed(1);
  }
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}