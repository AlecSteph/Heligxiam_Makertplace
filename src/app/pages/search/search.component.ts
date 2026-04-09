import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { PRODUCTS, CATEGORIES } from '../../data/products.data';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit {
  queryParam = '';
  selectedCategory = '';
  priceRange: [number, number] = [0, 2000];
  minRating = 0;
  sortBy = 'relevance';
  showFilters = false;
  
  products = PRODUCTS;
  categories = CATEGORIES;
  filteredProducts: Product[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.queryParam = params['q'] || '';
      this.filterProducts();
    });
    this.filterProducts();
  }

  filterProducts() {
    let filtered = [...this.products];

    // Search query
    if (this.queryParam) {
      const query = this.queryParam.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    // Price range filter
    filtered = filtered.filter(
      p => p.price >= this.priceRange[0] && p.price <= this.priceRange[1]
    );

    // Rating filter
    filtered = filtered.filter(p => p.rating >= this.minRating);

    // Sort
    switch (this.sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // relevance - keep original order
        break;
    }

    this.filteredProducts = filtered;
  }

  onCategoryChange() {
    this.filterProducts();
  }

  onPriceRangeChange() {
    this.filterProducts();
  }

  onRatingChange() {
    this.filterProducts();
  }

  onSortChange() {
    this.filterProducts();
  }

  resetFilters() {
    this.selectedCategory = '';
    this.priceRange = [0, 2000];
    this.minRating = 0;
    this.filterProducts();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }
}
