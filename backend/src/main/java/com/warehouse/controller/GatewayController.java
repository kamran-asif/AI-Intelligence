package com.warehouse.controller;

import com.warehouse.entity.InventoryItem;
import com.warehouse.entity.Order;
import com.warehouse.entity.Worker;
import com.warehouse.entity.WarehouseEvent;
import com.warehouse.repository.WarehouseEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gateway")
public class GatewayController {

    @Autowired
    private InventoryController inventoryController;

    @Autowired
    private OrderController orderController;

    @Autowired
    private WorkerController workerController;

    @Autowired
    private WarehouseEventRepository eventRepository;

    // Inventory Gateway Routes
    @GetMapping("/inventory")
    public List<InventoryItem> getInventory() {
        return inventoryController.getAllItems();
    }

    @PostMapping("/inventory")
    public ResponseEntity<InventoryItem> createInventory(@RequestBody InventoryItem item) {
        return inventoryController.createItem(item);
    }

    @PutMapping("/inventory/{id}")
    public ResponseEntity<InventoryItem> updateInventory(@PathVariable Long id, @RequestBody InventoryItem item) {
        return inventoryController.updateItem(id, item);
    }

    @DeleteMapping("/inventory/{id}")
    public ResponseEntity<Void> deleteInventory(@PathVariable Long id) {
        return inventoryController.deleteItem(id);
    }

    // Orders Gateway Routes
    @GetMapping("/orders")
    public List<Order> getOrders() {
        return orderController.getAllOrders();
    }

    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody Order order) {
        return orderController.createOrder(order);
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody String status) {
        return orderController.updateStatus(id, status);
    }

    // Workers Gateway Routes
    @GetMapping("/workers")
    public List<Worker> getWorkers() {
        return workerController.getAllWorkers();
    }

    @PostMapping("/workers")
    public ResponseEntity<Worker> createWorker(@RequestBody Worker worker) {
        return workerController.createWorker(worker);
    }

    @PutMapping("/workers/{id}/status")
    public ResponseEntity<?> updateWorkerStatus(@PathVariable Long id, @RequestBody String status) {
        return workerController.updateWorkerStatus(id, status);
    }

    // Event Stream Log Gateway Route
    @GetMapping("/events")
    public List<WarehouseEvent> getEvents() {
        return eventRepository.findTop100ByOrderByTimestampDesc();
    }
}
