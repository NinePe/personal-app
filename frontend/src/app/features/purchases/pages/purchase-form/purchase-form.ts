import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PurchasesService, PurchaseCategory, PurchaseSubcategory } from '@app/services/purchases.service';

@Component({
  selector: 'app-purchase-form',
  imports: [RouterLink, FormsModule],
  templateUrl: './purchase-form.html',
  styleUrl: './purchase-form.scss',
})
export class PurchaseForm implements OnInit {
  private svc = inject(PurchasesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  categories = signal<PurchaseCategory[]>([]);
  subcategories = signal<PurchaseSubcategory[]>([]);
  filteredSubs = signal<PurchaseSubcategory[]>([]);
  saving = signal(false);
  saved = signal(false);
  error = signal('');

  // Form
  name = ''; brand = ''; sizeLabel = '';
  selectedCat = signal<PurchaseCategory | null>(null);
  selectedSub = signal<PurchaseSubcategory | null>(null);
  price = ''; quantity = '1';
  unit = 'unit'; unitSize = '';
  store = ''; purchaseDate = new Date().toISOString().split('T')[0];
  notes = '';
  showNewSub = false; newSubName = '';

  ngOnInit() {
    this.svc.getCategories().subscribe(c => this.categories.set(c));
    this.svc.getSubcategories().subscribe(s => { this.subcategories.set(s); this.filteredSubs.set(s); });
  }

  onCatChange() {
    const cat = this.selectedCat();
    if (cat) {
      this.filteredSubs.set(this.subcategories().filter(s => s.category_id === cat.id));
    } else {
      this.filteredSubs.set(this.subcategories());
    }
    this.selectedSub.set(null);
  }

  addSubcategory() {
    if (!this.newSubName.trim() || !this.selectedCat()) return;
    this.svc.createSubcategory({ category_id: this.selectedCat()!.id, name: this.newSubName.trim() }).subscribe(sub => {
      this.subcategories.update(s => [...s, sub]);
      this.filteredSubs.update(s => [...s, sub]);
      this.selectedSub.set(sub);
      this.newSubName = ''; this.showNewSub = false;
    });
  }

  save() {
    if (!this.name || !this.price || !this.selectedSub()) {
      this.error.set('Name, category, and price are required'); return;
    }
    this.saving.set(true); this.error.set('');
    const payload: any = {
      subcategory_id: this.selectedSub()!.id,
      name: this.name, brand: this.brand || undefined,
      size_label: this.sizeLabel || undefined,
      quantity: parseFloat(this.quantity) || 1,
      unit: this.unit, unit_size: this.unitSize ? parseFloat(this.unitSize) : undefined,
      price: parseFloat(this.price), store: this.store || undefined,
      purchase_date: this.purchaseDate, notes: this.notes || undefined,
    };
    this.svc.createItem(payload).subscribe({
      next: () => {
        this.saving.set(false); this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2500);
        // Reset form
        this.name = ''; this.brand = ''; this.sizeLabel = ''; this.price = ''; this.quantity = '1'; this.unitSize = ''; this.store = ''; this.notes = '';
      },
      error: (e) => { this.saving.set(false); this.error.set(e.error?.error ?? 'Error saving'); },
    });
  }
}
