# Warehouse OS: Operations Decision Platform

Warehouse OS is an enterprise-grade, decision-first operations management platform combining microservices, event-driven log auditing, predictive AI/ML models, and a centralized generative AI agent copilot.

---

## 🛠️ System Architecture

```
                       ┌─────────────────┐
                       │   React UI      │
                       │ Dashboard+Chat  │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Spring Boot API │
                       │   Gateway       │
                       └────────┬────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Inventory    │        │ Order        │        │ Worker       │
 │ Service      │        │ Service      │        │ Service      │
 └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
        │                       │                       │
        └───────────┬───────────┴───────────┬───────────┘
                    ▼                       ▼
            ┌───────────────┐       ┌───────────────┐
            │  PostgreSQL   │ <===> │  Event Log    │
            │(warehouse_db) │       │ (EventBroker) │
            └───────────────┘       └───────────────┘
                    ▲
                    │
                    ▼
            ┌───────────────┐
            │ Python AI Svc │
            │ (FastAPI)     │
            └───────┬───────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ Forecast    │ │ Anomaly     │ │ RAG Agent   │
 │ (Regression)│ │ (Isolation) │ │ (Vector DB) │
 └─────────────┘ └─────────────┘ └─────────────┘
```

1. **React UI (Port 5173)**: Rebranded, decision-first landing page including a top KPI Row, "What to Care About Right Now" Critical Alerts, Action Cards, SVG Forecast Demand graph, and a centralized AI Copilot chat terminal.
2. **Spring Boot Gateway (Port 8080)**: Decoupled API Gateway forwarding paths to:
   - **Inventory Service**: CRUD actions for products.
   - **Order Service**: Transactional order processing and stock safety checks.
   - **Worker Service**: Personnel allocation tracking.
   - **Event Broker**: Publishes transactional operations events to a PostgreSQL event log.
3. **Python AI Service (Port 8010)**: Exposes endpoints for:
   - **XGBoost/Linear Forecasts**: Calculates stock deplete velocity and days remaining.
   - **IsolationForest Anomaly RCA**: Identifies transaction volume spikes and analyzes likely bottleneck causes with confidence metrics.
   - **Multi-Agent Supervisor Copilot**: Orchestrates `InventoryAgent`, `ForecastAgent`, and `RagAgent` to answer operator questions.

---

## 📂 Project Structure

- `/backend` - Spring Boot maven project with modular service packages.
- `/ai-service` - FastAPI service containing ML models and LangGraph supervisor agent logic.
- `/frontend` - React + Vite frontend client styled with premium glassmorphic custom CSS.
- `/documents` - Knowledge base RAG documentation (Receiving/Shipping SOPs, vendor SLAs, safety protocols).

---

## 🚀 Getting Started

### Prerequisites
- **Java 17+** (JDK 26 runtime available)
- **Python 3.10+** (Python 3.13 installed)
- **Node.js 20+** (Node v20.18.0 installed)
- **PostgreSQL 18** (Local service active on port 5432)

---

### Step 1: Initialize the Database
Verify connection to PostgreSQL and create the target database:
```sql
CREATE DATABASE warehouse_db;
```
*(The schema and seed data for products, orders, workers, and events are automatically initialized by the backend seeder on startup).*

---

### Step 2: Run the Spring Boot Gateway
Navigate to the backend and launch:
```bash
cd backend
mvn spring-boot:run
```
Exposes gateway APIs on `http://localhost:8080/api/gateway/`.

---

### Step 3: Run the Python AI Decision Engine
Navigate to the AI service, activate virtual environment, install dependencies, and start:
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8010
```
*(Optionally create a `.env` file inside `/ai-service` containing `GEMINI_API_KEY=your_key` to activate generative response synthesis, otherwise the system will fall back to a structured rule-based coordinator).*

---

### Step 4: Run the React Client
Navigate to the frontend, install libraries, and start:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.
