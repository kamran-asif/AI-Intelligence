package com.warehouse.repository;

import com.warehouse.entity.WarehouseEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WarehouseEventRepository extends JpaRepository<WarehouseEvent, Long> {
    List<WarehouseEvent> findTop100ByOrderByTimestampDesc();
}
