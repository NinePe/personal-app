import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CinemaService, CinemaItem, CinemaSeason } from '@app/services/cinema.service';

@Component({
  selector: 'app-cinema-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './cinema-detail.html',
  styleUrl: './cinema-detail.scss',
})
export class CinemaDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(CinemaService);

  item = signal<CinemaItem | null>(null);
  loading = signal(true);
  expandedSeason = signal<string | null>(null);
  isTv = computed(() => this.item()?.media_type === 'tv');
  epComment = signal<Record<string, string>>({});

  ratedEpisodes = computed(() => {
    const item = this.item();
    if (!item?.seasons) return [];
    const rated: any[] = [];
    for (const s of item.seasons) {
      for (const ep of s.episodes || []) {
        if (ep.rating || ep.comments) rated.push({ ...ep, season_number: s.season_number });
      }
    }
    return rated.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.refresh();
  }

  refresh() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.svc.getItem(id).subscribe(item => { this.item.set(item); this.loading.set(false); });
  }

  toggleSeason(seasonId: string) {
    this.expandedSeason.set(this.expandedSeason() === seasonId ? null : seasonId);
  }

  toggleEpisode(ep: any) {
    this.svc.toggleEpisode(ep.id, !ep.watched).subscribe(() => this.refresh());
  }

  setEpisodeRating(ep: any, rating: number) {
    this.svc.rateEpisode(ep.id, { rating }).subscribe(() => this.refresh());
  }

  changeWatchedDate(ep: any, dateStr: string) {
    if (!dateStr) return;
    this.svc.setEpisodeDate(ep.id, dateStr).subscribe(() => this.refresh());
  }

  setEpComment(epId: string, value: string) {
    this.epComment.update(r => ({ ...r, [epId]: value }));
  }

  saveEpisodeComment(ep: any) {
    const comment = this.epComment()[ep.id]?.trim();
    if (!comment) return;
    this.svc.rateEpisode(ep.id, { comments: comment }).subscribe(() => {
      this.epComment.update(r => { const c = { ...r }; delete c[ep.id]; return c; });
      this.refresh();
    });
  }

  watchAll(season: CinemaSeason) {
    this.svc.watchAllSeason(season.id).subscribe(() => this.refresh());
  }

  updateStatus(status: string) {
    const id = this.item()?.id;
    if (!id) return;
    this.svc.updateItem(id, { status }).subscribe(() => {
      const current = this.item();
      if (current) this.item.set({ ...current, status });
    });
  }

  updateRating(rating: number) {
    const id = this.item()?.id;
    if (!id) return;
    this.svc.updateItem(id, { rating }).subscribe(() => {
      const current = this.item();
      if (current) this.item.set({ ...current, rating });
    });
  }

  saveComments() {
    const id = this.item()?.id;
    const comments = this.item()?.comments;
    if (!id) return;
    this.svc.updateItem(id, { comments }).subscribe();
  }

  deleteItem() {
    const id = this.item()?.id;
    if (!id || !confirm('Eliminar de la biblioteca?')) return;
    this.svc.deleteItem(id).subscribe(() => this.router.navigate(['/cinema/library']));
  }

  pct(part: number, total: number) { return total ? Math.round(part / total * 100) : 0; }
}
