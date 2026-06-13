package com.warehouse.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem inventoryItem;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double price;

    // Constructors
    public OrderItem() {}

    public OrderItem(Long id, InventoryItem inventoryItem, Integer quantity, Double price) {
        this.id = id;
        this.inventoryItem = inventoryItem;
        this.quantity = quantity;
        this.price = price;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public InventoryItem getInventoryItem() { return inventoryItem; }
    public void setInventoryItem(InventoryItem inventoryItem) { this.inventoryItem = inventoryItem; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    // Manual Builder
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private InventoryItem inventoryItem;
        private Integer quantity;
        private Double price;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder inventoryItem(InventoryItem inventoryItem) { this.inventoryItem = inventoryItem; return this; }
        public Builder quantity(Integer quantity) { this.quantity = quantity; return this; }
        public Builder price(Double price) { this.price = price; return this; }

        public OrderItem build() {
            return new OrderItem(id, inventoryItem, quantity, price);
        }
    }
}
