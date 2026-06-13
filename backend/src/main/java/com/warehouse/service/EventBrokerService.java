package com.warehouse.service;

import com.warehouse.entity.WarehouseEvent;
import com.warehouse.repository.WarehouseEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class EventBrokerService {

    @Autowired
    private WarehouseEventRepository eventRepository;

    public void publishEvent(String eventType, String payload) {
        WarehouseEvent event = WarehouseEvent.builder()
                .eventType(eventType)
                .payload(payload)
                .timestamp(LocalDateTime.now())
                .build();
        eventRepository.save(event);
        System.out.println("Published event to log: [" + eventType + "] " + payload);
    }
}
