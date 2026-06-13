package com.warehouse.controller;

import com.warehouse.entity.Worker;
import com.warehouse.repository.WorkerRepository;
import com.warehouse.service.EventBrokerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/workers")
public class WorkerController {

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private EventBrokerService eventBroker;

    @GetMapping
    public List<Worker> getAllWorkers() {
        return workerRepository.findAll();
    }

    @GetMapping("/zone/{zone}")
    public List<Worker> getWorkersByZone(@PathVariable String zone) {
        return workerRepository.findByZone(zone);
    }

    @PostMapping
    public ResponseEntity<Worker> createWorker(@RequestBody Worker worker) {
        if (worker.getName() == null || worker.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (worker.getStatus() == null) worker.setStatus("ACTIVE");
        if (worker.getZone() == null) worker.setZone("Zone A");
        
        Worker saved = workerRepository.save(worker);
        eventBroker.publishEvent("WORKER_ASSIGNED", "Worker " + saved.getName() + " assigned to " + saved.getZone() + " (Status: " + saved.getStatus() + ")");
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateWorkerStatus(@PathVariable Long id, @RequestBody String status) {
        String cleanStatus = status.replaceAll("^\"|\"$", "").trim().toUpperCase();
        return workerRepository.findById(id).map(worker -> {
            String oldStatus = worker.getStatus();
            worker.setStatus(cleanStatus);
            Worker saved = workerRepository.save(worker);
            eventBroker.publishEvent("WORKER_ASSIGNED", "Worker " + worker.getName() + " status changed from " + oldStatus + " to " + cleanStatus);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
