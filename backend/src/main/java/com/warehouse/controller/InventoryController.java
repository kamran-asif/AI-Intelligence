package com.warehouse.controller;

import com.warehouse.entity.InventoryItem;
import com.warehouse.repository.InventoryItemRepository;
import com.warehouse.service.EventBrokerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private EventBrokerService eventBroker;

    @GetMapping
    public List<InventoryItem> getAllItems() {
        return inventoryItemRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryItem> getItemById(@PathVariable Long id) {
        Optional<InventoryItem> item = inventoryItemRepository.findById(id);
        return item.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<InventoryItem> createItem(@RequestBody InventoryItem item) {
        if (item.getSku() == null || item.getSku().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Optional<InventoryItem> existing = inventoryItemRepository.findBySku(item.getSku());
        InventoryItem saved;
        if (existing.isPresent()) {
            InventoryItem exItem = existing.get();
            exItem.setQuantity(exItem.getQuantity() + item.getQuantity());
            saved = inventoryItemRepository.save(exItem);
            eventBroker.publishEvent("STOCK_ADJUSTMENT", "Replenished " + item.getQuantity() + " units for SKU: " + item.getSku() + ". New total: " + exItem.getQuantity());
        } else {
            saved = inventoryItemRepository.save(item);
            eventBroker.publishEvent("STOCK_ADJUSTMENT", "Created new inventory item " + item.getName() + " with SKU: " + item.getSku() + " and qty: " + item.getQuantity());
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItem> updateItem(@PathVariable Long id, @RequestBody InventoryItem itemDetails) {
        return inventoryItemRepository.findById(id).map(item -> {
            int oldQty = item.getQuantity();
            item.setName(itemDetails.getName());
            item.setSku(itemDetails.getSku());
            item.setQuantity(itemDetails.getQuantity());
            item.setPrice(itemDetails.getPrice());
            item.setLocation(itemDetails.getLocation());
            item.setReorderPoint(itemDetails.getReorderPoint());
            InventoryItem saved = inventoryItemRepository.save(item);
            
            eventBroker.publishEvent("STOCK_ADJUSTMENT", "Updated stock details for SKU: " + item.getSku() + ". Qty changed from " + oldQty + " to " + item.getQuantity());
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        return inventoryItemRepository.findById(id).map(item -> {
            inventoryItemRepository.delete(item);
            eventBroker.publishEvent("STOCK_ADJUSTMENT", "Deleted SKU: " + item.getSku() + " from catalog");
            return ResponseEntity.ok().<Void>build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
