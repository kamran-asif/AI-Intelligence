# Standard Operating Procedure (SOP): Shipping & Packing Operations

**SOP Reference ID:** SOP-WH-SHI-02  
**Version:** 1.8  
**Effective Date:** February 1, 2026  
**Owner:** Shipping Coordinator Manager  

## 1. Purpose & Scope
This procedure establishes the guidelines for picking, quality checks, packing, and dispatching customer orders from the warehouse. Compliance ensures correct order delivery and prevents shipping anomalies.

## 2. Order Fulfillment Workflow
1. **Order Retrieval**:
   - Access the "Orders" module on the backend dashboard.
   - Review incoming orders marked as `PENDING`.
   - Print the Pick List, which lists items sorted by warehouse shelf locations to optimize picking routes.
2. **Item Picking**:
   - Pick items from designated zones (Zone A, B, C, D) using mobile scanners.
   - Scan each barcode to verify SKU matches the Pick List.
   - Transport picked items to the Packing Station.
3. **Quality Control (QC)**:
   - Before packing, verify that:
     - The item count matches the invoice.
     - Product condition is pristine (no scratches, tears, or broken seals).
     - Serial numbers match if tracking is required.
4. **Packing**:
   - Select the appropriate box size relative to item dimensions to avoid wasted space.
   - Add sufficient protective packing materials (bubble wrap, air pillows, or kraft paper) to fill all void space.
   - Secure the box with reinforced packaging tape.
   - Print and apply the shipping label on the top surface of the box. Ensure the label barcode is flat and readable.
5. **Carrier Handoff & Dispatch**:
   - Place completed packages in the designated dispatch lane for the selected courier service.
   - Once the carrier scans the parcel, update the order status in the system to `SHIPPED`.

## 3. Shipping Security & Escalations
- **High-Value Orders**: Orders exceeding $1,000 must be verified by a warehouse supervisor and double-sealed with security tape.
- **Incorrect Pickings**: If an item is out of stock during picking, notify the inventory controller immediately to check for database mismatch. Do not ship partial orders without prior authorization.
- **Hazardous Materials**: Follow specialized packing protocols and attach safety data sheets to the shipping exterior for hazmat items.
