package com.warehouse.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "warehouse_events")
public class WarehouseEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", nullable = false)
    private String eventType; // STOCK_ADJUSTMENT, ORDER_PLACED, STATUS_CHANGED, WORKER_ASSIGNED

    @Column(nullable = false, length = 1000)
    private String payload; // JSON payload details

    @Column(nullable = false)
    private LocalDateTime timestamp;

    // Constructors
    public WarehouseEvent() {}

    public WarehouseEvent(Long id, String eventType, String payload, LocalDateTime timestamp) {
        this.id = id;
        this.eventType = eventType;
        this.payload = payload;
        this.timestamp = timestamp;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getPayload() { return payload; }
    public void setPayload(String payload) { this.payload = payload; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    // Builder
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String eventType;
        private String payload;
        private LocalDateTime timestamp;

        public Builder id(Long id) { this.id = id; return this; }
        public Builder eventType(String eventType) { this.eventType = eventType; return this; }
        public Builder payload(String payload) { this.payload = payload; return this; }
        public Builder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }

        public WarehouseEvent build() {
            return new WarehouseEvent(id, eventType, payload, timestamp);
        }
    }
}
