import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SpendingService } from '../../services/spending.service';

const RELATIONSHIPS = [
  { value: 'friend',       label: 'Friend',       icon: 'people' },
  { value: 'family',       label: 'Family',        icon: 'family_restroom' },
  { value: 'coworker',     label: 'Coworker',      icon: 'work' },
  { value: 'organization', label: 'Organization',  icon: 'corporate_fare' },
  { value: 'other',        label: 'Other',         icon: 'person' },
] as const;

@Component({
  selector: 'app-new-person',
  imports: [RouterLink],
  templateUrl: './new-person.html',
  styleUrl: './new-person.scss',
})
export class NewPerson implements OnInit {
  private svc    = inject(SpendingService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  readonly RELATIONSHIPS = RELATIONSHIPS;

  editId = signal<string | null>(null);
  isEdit = computed(() => !!this.editId());

  name         = signal('');
  relationship = signal<string>('friend');
  email        = signal('');
  phone        = signal('');
  notes        = signal('');
  saving       = signal(false);
  errorMsg     = signal('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.svc.getPeople().subscribe(people => {
        const p = people.find(p => p.id === id);
        if (!p) return;
        this.name.set(p.name);
        this.relationship.set(p.relationship);
        this.email.set(p.email ?? '');
        this.phone.set(p.phone ?? '');
        this.notes.set(p.notes ?? '');
      });
    }
  }

  isValid = computed(() => this.name().trim().length > 0 && this.relationship().length > 0);

  save() {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    this.errorMsg.set('');
    const body = {
      name:         this.name().trim(),
      relationship: this.relationship() as any,
      email:        this.email().trim() || undefined,
      phone:        this.phone().trim() || undefined,
      notes:        this.notes().trim() || undefined,
    };
    const req$ = this.isEdit()
      ? this.svc.updatePerson(this.editId()!, body)
      : this.svc.createPerson(body);
    req$.subscribe({
      next: () => this.router.navigateByUrl('/people'),
      error: (e) => {
        this.errorMsg.set(e?.error?.error ?? 'Failed to save. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
