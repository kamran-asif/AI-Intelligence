package com.warehouse.config;

import com.warehouse.entity.InventoryItem;
import com.warehouse.entity.Order;
import com.warehouse.entity.OrderItem;
import com.warehouse.entity.Worker;
import com.warehouse.repository.InventoryItemRepository;
import com.warehouse.repository.OrderRepository;
import com.warehouse.repository.WorkerRepository;
import com.warehouse.service.EventBrokerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private EventBrokerService eventBroker;

    @Override
    public void run(String... args) throws Exception {
        if (inventoryItemRepository.count() == 0) {
            // Seed Inventory Items
            List<InventoryItem> items = Arrays.asList(
                InventoryItem.builder().name("Industrial Gears (Class A)").sku("GEAR-001").quantity(150).price(45.0).location("Zone A-Shelf 1").reorderPoint(50).build(),
                InventoryItem.builder().name("Hydraulic Valves (Class A)").sku("VALVE-002").quantity(80).price(120.0).location("Zone A-Shelf 2").reorderPoint(30).build(),
                InventoryItem.builder().name("Copper Wiring (Class B)").sku("WIRE-003").quantity(350).price(15.0).location("Zone B-Shelf 4").reorderPoint(100).build(),
                InventoryItem.builder().name("Rubber Seals (Class C)").sku("SEAL-004").quantity(15).price(5.0).location("Zone C-Shelf 1").reorderPoint(40).build(),
                InventoryItem.builder().name("Control Panels (Class A)").sku("PANEL-005").quantity(120).price(350.0).location("Zone D-Shelf 3").reorderPoint(25).build()
            );
            inventoryItemRepository.saveAll(items);
            System.out.println("Seeded initial inventory items!");
            
            for (InventoryItem item : items) {
                eventBroker.publishEvent("STOCK_ADJUSTMENT", "Seeded inventory item: " + item.getName() + " (SKU: " + item.getSku() + ") with " + item.getQuantity() + " units.");
            }
        }

        if (workerRepository.count() == 0) {
            // Seed Workers
            List<Worker> workers = Arrays.asList(
                Worker.builder().name("Alex Johnson").status("ACTIVE").zone("Zone A").build(),
                Worker.builder().name("Sara Smith").status("ACTIVE").zone("Zone B").build(),
                Worker.builder().name("David Miller").status("ON_BREAK").zone("Zone C").build(),
                Worker.builder().name("Jessica Davis").status("ACTIVE").zone("Zone D").build()
            );
            workerRepository.saveAll(workers);
            System.out.println("Seeded initial worker profiles!");
            
            for (Worker worker : workers) {
                eventBroker.publishEvent("WORKER_ASSIGNED", "Worker " + worker.getName() + " registered and assigned to " + worker.getZone() + ".");
            }
        }

        if (orderRepository.count() == 0) {
            // Fetch seeded items to associate
            List<InventoryItem> items = inventoryItemRepository.findAll();
            InventoryItem gear = items.stream().filter(i -> i.getSku().equals("GEAR-001")).findFirst().get();
            InventoryItem valve = items.stream().filter(i -> i.getSku().equals("VALVE-002")).findFirst().get();
            InventoryItem wire = items.stream().filter(i -> i.getSku().equals("WIRE-003")).findFirst().get();
            InventoryItem seal = items.stream().filter(i -> i.getSku().equals("SEAL-004")).findFirst().get();

            List<Order> orders = new ArrayList<>();
            LocalDateTime baseTime = LocalDateTime.now().minusDays(15);

            for (int i = 0; i < 15; i++) {
                LocalDateTime orderDate = baseTime.plusDays(i).plusHours(2 * i % 12);
                int gearQty = 5 + (i % 4);
                int wireQty = 10 + (2 * i % 7);
                
                // Add an anomaly spike on day 10
                if (i == 10) {
                    gearQty = 85; 
                    wireQty = 150; 
                }

                List<OrderItem> orderItems = new ArrayList<>();
                orderItems.add(OrderItem.builder().inventoryItem(gear).quantity(gearQty).price(gear.getPrice()).build());
                orderItems.add(OrderItem.builder().inventoryItem(wire).quantity(wireQty).price(wire.getPrice()).build());

                double total = (gear.getPrice() * gearQty) + (wire.getPrice() * wireQty);

                if (i % 3 == 0) {
                    orderItems.add(OrderItem.builder().inventoryItem(valve).quantity(2).price(valve.getPrice()).build());
                    total += valve.getPrice() * 2;
                }

                Order order = Order.builder()
                        .customerName("Client-" + (i + 1))
                        .orderDate(orderDate)
                        .status(i < 12 ? "DELIVERED" : (i == 12 ? "SHIPPED" : "PENDING"))
                        .totalAmount(total)
                        .items(orderItems)
                        .build();
                        
                orders.add(order);
            }

            orderRepository.saveAll(orders);
            System.out.println("Seeded historical orders!");
            
            for (Order o : orders) {
                eventBroker.publishEvent("ORDER_PLACED", "Seeded historical order #" + o.getId() + " placed by " + o.getCustomerName() + " (Total: $" + o.getTotalAmount() + ").");
            }
        }
    }
}
