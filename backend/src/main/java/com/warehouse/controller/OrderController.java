package com.warehouse.controller;

import com.warehouse.entity.InventoryItem;
import com.warehouse.entity.Order;
import com.warehouse.entity.OrderItem;
import com.warehouse.repository.InventoryItemRepository;
import com.warehouse.repository.OrderRepository;
import com.warehouse.service.EventBrokerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private EventBrokerService eventBroker;

    @GetMapping
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createOrder(@RequestBody Order orderRequest) {
        if (orderRequest.getCustomerName() == null || orderRequest.getCustomerName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Customer name is required");
        }
        if (orderRequest.getItems() == null || orderRequest.getItems().isEmpty()) {
            return ResponseEntity.badRequest().body("Order items cannot be empty");
        }

        double totalAmount = 0.0;
        List<OrderItem> verifiedItems = new ArrayList<>();

        for (OrderItem itemRequest : orderRequest.getItems()) {
            if (itemRequest.getInventoryItem() == null || itemRequest.getInventoryItem().getId() == null) {
                return ResponseEntity.badRequest().body("Valid inventory item ID is required for all line items");
            }
            Long itemId = itemRequest.getInventoryItem().getId();
            Optional<InventoryItem> inventoryOpt = inventoryItemRepository.findById(itemId);
            if (inventoryOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Inventory item not found with ID: " + itemId);
            }

            InventoryItem inventoryItem = inventoryOpt.get();
            int orderedQty = itemRequest.getQuantity();

            if (inventoryItem.getQuantity() < orderedQty) {
                return ResponseEntity.badRequest().body("Insufficient stock for item: " + inventoryItem.getName() + 
                       ". Available: " + inventoryItem.getQuantity() + ", Ordered: " + orderedQty);
            }

            // Decrement quantity
            inventoryItem.setQuantity(inventoryItem.getQuantity() - orderedQty);
            inventoryItemRepository.save(inventoryItem);

            // Populate unit price and compute subtotal
            OrderItem verifiedItem = OrderItem.builder()
                    .inventoryItem(inventoryItem)
                    .quantity(orderedQty)
                    .price(inventoryItem.getPrice())
                    .build();

            verifiedItems.add(verifiedItem);
            totalAmount += inventoryItem.getPrice() * orderedQty;
        }

        Order order = Order.builder()
                .customerName(orderRequest.getCustomerName())
                .orderDate(LocalDateTime.now())
                .status("PENDING")
                .totalAmount(totalAmount)
                .items(verifiedItems)
                .build();

        Order savedOrder = orderRepository.save(order);
        
        // Publish Event
        eventBroker.publishEvent("ORDER_PLACED", "Order #" + savedOrder.getId() + " placed by " + savedOrder.getCustomerName() + " for total: $" + savedOrder.getTotalAmount());
        
        return ResponseEntity.ok(savedOrder);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody String status) {
        String cleanStatus = status.replaceAll("^\"|\"$", "").trim().toUpperCase();
        if (!cleanStatus.equals("PENDING") && !cleanStatus.equals("SHIPPED") && !cleanStatus.equals("DELIVERED")) {
            return ResponseEntity.badRequest().body("Invalid status value. Must be PENDING, SHIPPED, or DELIVERED");
        }

        return orderRepository.findById(id).map(order -> {
            String oldStatus = order.getStatus();
            order.setStatus(cleanStatus);
            Order updatedOrder = orderRepository.save(order);
            
            // Publish Event
            eventBroker.publishEvent("STATUS_CHANGED", "Order #" + order.getId() + " status transitioned from " + oldStatus + " to " + cleanStatus);
            
            return ResponseEntity.ok(updatedOrder);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
