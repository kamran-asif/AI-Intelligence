package com.warehouse.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "workers")
public class Worker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String status; // ACTIVE, ON_BREAK, OFF_DUTY

    @Column(nullable = false)
    private String zone; // Zone A, Zone B, Zone C, Zone D

    // Constructors
    public Worker() {}

    public Worker(Long id, String name, String status, String zone) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.zone = zone;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }

    // Builder
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String name;
        private String status;
        private String zone;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder zone(String zone) { this.zone = zone; return this; }

        public Worker build() {
            return new Worker(id, name, status, zone);
        }
    }
}
