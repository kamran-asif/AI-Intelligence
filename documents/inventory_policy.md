# Warehouse Inventory & Safety Stock Policy

**Policy Reference ID:** POL-WH-INV-03  
**Version:** 3.1  
**Effective Date:** March 1, 2026  
**Owner:** Supply Chain Analyst  

## 1. Safety Stock Framework
To avoid stockouts and maintain high customer satisfaction levels, the warehouse establishes safety stock levels for all inventory items. Safety stock acts as a buffer against fluctuations in demand or supplier lead times.

### Safety Stock Formula
$$\text{Safety Stock} = (\text{Max Lead Time} \times \text{Max Daily Sales}) - (\text{Average Lead Time} \times \text{Average Daily Sales})$$

## 2. Reorder Point (ROP) Policy
Every product SKU must have a designated Reorder Point configured in the system. The Reorder Point is calculated as follows:

$$\text{Reorder Point} = (\text{Lead Time} \times \text{Average Daily Sales}) + \text{Safety Stock}$$

### Threshold Rules
- **Low Stock Flag**: When an item's current quantity falls below its configured Reorder Point, the system must trigger an automatic warning flag in the analytics panel.
- **Replenishment Frequency**: Reorder quantity should align with the Economic Order Quantity (EOQ) to minimize holding and ordering costs.

## 3. Stock Audits & Discrepancies
- **Cycle Counting**:
  - High-velocity items (Class A) must undergo cycle counting once every 30 days.
  - Medium-velocity items (Class B) must undergo cycle counting once every 90 days.
  - Low-velocity items (Class C) must undergo cycle counting once every 180 days.
- **Discrepancy Resolution**:
  - Any stock variance less than 1% or $100 can be adjusted directly by the warehouse supervisor with a system note.
  - Variances exceeding $100 or 1% require a double-count audit and management sign-off before database adjustment.
- **Scrap Reporting**: Damaged or expired items must be formally written off by logging a scrap transaction and updating the database quantity to reflect physical stock.
