import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { PRODUCTS } from '../../data/products.data';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-category',
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent implements OnInit {
  categoryName = '';
  categoryProducts: Product[] = [];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const category = params.get('category');
      if (category) {
        this.categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        this.filterProducts();
      }
    });
  }

  filterProducts() {
    this.categoryProducts = PRODUCTS.filter(
      p => p.category.toLowerCase() === this.categoryName.toLowerCase()
    );
  }
}
