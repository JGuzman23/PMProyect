import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  HostListener,
  ElementRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-combobox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combobox.component.html'
})
export class ComboboxComponent<T> implements OnChanges {

  constructor(private elRef: ElementRef) {}

  @Input() label = '';
  @Input() placeholder = 'Seleccionar';
  @Input() items: T[] = [];
  @Input() display!: (item: T) => string;
  @Input() searchable = true;
  @Input() multiple = false;
  @Input() required = false;
  @Input() value: T | T[] | null = null;
  @Input() compareFn?: (a: T, b: T) => boolean;

  @Output() selectionChange = new EventEmitter<T | T[]>();

  isOpen = signal(false);
  search = signal('');
  selected = signal<T[]>([]);

  filteredItems = computed(() => {
    const term = this.search().toLowerCase();
    return this.items.filter(i =>
      this.display(i).toLowerCase().includes(term)
    );
  });

  labelText = computed(() =>
    this.selected().length
      ? this.selected().map(this.display).join(', ')
      : this.placeholder
  );

  toggle(): void {
    this.isOpen.update(v => !v);
    this.search.set('');
  }

  select(item: T): void {
    if (this.multiple) {
      const arr = this.selected();
      const exists = this.isSelected(item);

      this.selected.set(
        exists
          ? arr.filter(i => !this.compareItems(i, item))
          : [...arr, item]
      );

      this.selectionChange.emit(this.selected());
    } else {
      this.selected.set([item]);
      this.selectionChange.emit(item);
      this.isOpen.set(false);
    }
  }

  isSelected(item: T): boolean {
    return this.selected().some(s => this.compareItems(s, item));
  }

  compareItems(a: T, b: T): boolean {
    if (this.compareFn) return this.compareFn(a, b);

    if (typeof a === 'object' && typeof b === 'object') {
      const aId = (a as any)?._id;
      const bId = (b as any)?._id;
      if (aId !== undefined && bId !== undefined) {
        return aId === bId;
      }
    }
    return a === b;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['items']) {
      this.updateSelectedFromValue();
    }
  }

  updateSelectedFromValue(): void {
    if (!this.value) {
      this.selected.set([]);
      return;
    }

    if (Array.isArray(this.value)) {
      this.selected.set(
        this.value.filter(v =>
          this.items.some(i => this.compareItems(i, v))
        )
      );
    } else {
      const found = this.items.find(i =>
        this.compareItems(i, this.value as T)
      );
      this.selected.set(found ? [found] : []);
    }
  }

  // 🔥 CLAVE: detecta clic fuera incluso dentro de modales
  @HostListener('window:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    const clickedInside =
      this.elRef.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.isOpen.set(false);
    }
  }
}
