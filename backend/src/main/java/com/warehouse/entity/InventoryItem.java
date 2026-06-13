package com.warehouse.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String sku;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double price;

    @Column(nullable = false)
    private String location;

    @Column(name = "reorder_point", nullable = false)
    private Integer reorderPoint;

    // Constructors
    public InventoryItem() {}

    public InventoryItem(Long id, String name, String sku, Integer quantity, Double price, String location, Integer reorderPoint) {
        this.id = id;
        this.name = name;
        this.sku = sku;
        this.quantity = quantity;
        this.price = price;
        this.location = location;
        this.reorderPoint = reorderPoint;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Integer getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(Integer reorderPoint) { this.reorderPoint = reorderPoint; }

    // Manual Builder
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String name;
        private String sku;
        private Integer quantity;
        private Double price;
        private String location;
        private Integer reorderPoint;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder sku(String sku) { this.sku = sku; return this; }
        public Builder quantity(Integer quantity) { this.quantity = quantity; return this; }
        public Builder price(Double price) { this.price = price; return this; }
        public Builder location(String location) { this.location = location; return this; }
        public Builder reorderPoint(Integer reorderPoint) { this.reorderPoint = reorderPoint; return this; }

        public InventoryItem build() {
            return new InventoryItem(id, name, sku, quantity, price, location, reorderPoint);
        }
    }
}
