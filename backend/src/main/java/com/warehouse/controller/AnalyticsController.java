package com.warehouse.controller;

import com.warehouse.entity.InventoryItem;
import com.warehouse.entity.Order;
import com.warehouse.repository.InventoryItemRepository;
import com.warehouse.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private OrderRepository orderRepository;

    @GetMapping("/summary")
    public Map<String, Object> getDashboardSummary() {
        List<InventoryItem> items = inventoryItemRepository.findAll();
        List<Order> orders = orderRepository.findAll();

        int totalStock = items.stream().mapToInt(InventoryItem::getQuantity).sum();
        long lowStockCount = items.stream().filter(item -> item.getQuantity() <= item.getReorderPoint()).count();

        double totalRevenue = orders.stream().mapToDouble(Order::getTotalAmount).sum();
        long totalOrders = orders.size();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalStock", totalStock);
        summary.put("lowStockCount", lowStockCount);
        summary.put("totalOrders", totalOrders);
        summary.put("totalRevenue", totalRevenue);
        summary.put("itemsCount", items.size());

        return summary;
    }
}
