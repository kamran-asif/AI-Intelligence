import os
import re
import glob
import requests
import numpy as np
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
BACKEND_GATEWAY_URL = "http://localhost:8080/api/gateway"

# ----------------------------------------------------
# 1. RAG VECTOR EMBEDDING ENGINE (NumPy FAISS-Like)
# ----------------------------------------------------
# We construct a TF-IDF term vector matrix to calculate cosine similarities
class LocalVectorStore:
    def __init__(self):
        self.documents = []
        self.vocabulary = {}
        self.tfidf_matrix = None
        self.idf = None

    def fit_and_populate(self):
        docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "documents")
        raw_chunks = []
        
        if not os.path.exists(docs_dir):
            return
            
        for file_path in glob.glob(os.path.join(docs_dir, "*.md")):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    filename = os.path.basename(file_path)
                    # Chunk by sub-headings
                    chunks = re.split(r'\n(?=## )', content)
                    for i, chunk in enumerate(chunks):
                        raw_chunks.append({
                            "source": filename,
                            "text": chunk.strip()
                        })
            except Exception as e:
                print(f"Error loading {file_path} for vector store: {e}")

        self.documents = raw_chunks
        if not self.documents:
            return

        # Simple TF-IDF Vectorizer Builder
        # Tokenize
        all_tokens = []
        doc_tokens_list = []
        for doc in self.documents:
            tokens = re.findall(r'\w+', doc["text"].lower())
            doc_tokens_list.append(tokens)
            all_tokens.extend(tokens)

        unique_tokens = list(set(all_tokens))
        self.vocabulary = {token: idx for idx, token in enumerate(unique_tokens)}
        
        N = len(self.documents)
        df = np.zeros(len(unique_tokens))
        tf = np.zeros((N, len(unique_tokens)))

        for i, doc_tokens in enumerate(doc_tokens_list):
            for token in doc_tokens:
                if token in self.vocabulary:
                    tf[i, self.vocabulary[token]] += 1
            # Mark DF
            for token in set(doc_tokens):
                if token in self.vocabulary:
                    df[self.vocabulary[token]] += 1

        # Calculate TF-IDF
        self.idf = np.log((1 + N) / (1 + df)) + 1
        self.tfidf_matrix = tf * self.idf
        # Normalize
        norms = np.linalg.norm(self.tfidf_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.tfidf_matrix = self.tfidf_matrix / norms

    def query_similarity(self, query, top_n=3):
        if not self.documents or self.tfidf_matrix is None:
            return []
            
        query_tokens = re.findall(r'\w+', query.lower())
        query_tf = np.zeros(len(self.vocabulary))
        for token in query_tokens:
            if token in self.vocabulary:
                query_tf[self.vocabulary[token]] += 1
                
        query_tfidf = query_tf * self.idf
        q_norm = np.linalg.norm(query_tfidf)
        if q_norm == 0:
            return []
            
        query_tfidf = query_tfidf / q_norm
        
        # Cosine similarity (dot product of normalized matrices)
        scores = np.dot(self.tfidf_matrix, query_tfidf)
        
        results = []
        for idx, score in enumerate(scores):
            if score > 0:
                results.append((score, self.documents[idx]))
                
        results.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in results[:top_n]]

# Initialize vector store
vector_store = LocalVectorStore()
vector_store.fit_and_populate()

# ----------------------------------------------------
# 2. SUB-AGENTS DEFINITIONS
# ----------------------------------------------------

# Agent A: Inventory & Worker Agent
class InventoryAgent:
    def execute(self, query):
        output = []
        # Check if they are asking about stock
        if any(w in query.lower() for w in ["stock", "quantity", "left", "inventory", "available", "reorder", "gear", "valve", "wire", "seal", "panel"]):
            try:
                res = requests.get(f"{BACKEND_GATEWAY_URL}/inventory", timeout=3)
                if res.status_code == 200:
                    items = res.json()
                    output.append("### Current Stock Levels:")
                    for item in items:
                        status = "OK"
                        if item.get("quantity", 0) <= item.get("reorderPoint", 0):
                            status = "LOW STOCK 🚨"
                        output.append(f"- **{item.get('name')}** (SKU: `{item.get('sku')}`): {item.get('quantity')} units in {item.get('location')} ({status})")
            except Exception as e:
                output.append("Error querying inventory microservice: " + str(e))

        # Check if they are asking about staff / workers
        if any(w in query.lower() for w in ["worker", "staff", "who is", "person", "active", "zone"]):
            try:
                res = requests.get(f"{BACKEND_GATEWAY_URL}/workers", timeout=3)
                if res.status_code == 200:
                    workers = res.json()
                    output.append("\n### Active Warehouse Personnel:")
                    for w in workers:
                        output.append(f"- **{w.get('name')}**: {w.get('status')} inside {w.get('zone')}")
            except Exception as e:
                output.append("Error querying worker microservice: " + str(e))

        return "\n".join(output) if output else "InventoryAgent found no matching stock or staff context."

# Agent B: Forecast & Anomaly Agent
class ForecastAgent:
    def execute(self, query):
        output = []
        try:
            # Query the Local FastAPI Forecast endpoint to fetch linear regression data
            forecast_res = requests.get("http://localhost:8010/api/ai/forecast", timeout=3)
            anomaly_res = requests.get("http://localhost:8010/api/ai/anomalies", timeout=3)
            
            if forecast_res.status_code == 200:
                forecasts = forecast_res.json()
                output.append("### AI Demand Forecast (Next 7 Days):")
                for f in forecasts:
                    f_values = [pt.get("quantity", 0) for pt in f.get("forecast", [])]
                    avg_f = sum(f_values) / len(f_values) if f_values else 0
                    output.append(f"- **{f.get('name')}**: Avg daily projected demand: {round(avg_f, 1)} units")

            if anomaly_res.status_code == 200:
                anoms = anomaly_res.json()
                if anoms:
                    output.append("\n### Detected Transactional Anomalies:")
                    for anom in anoms:
                        output.append(f"- Order #{anom.get('orderId')} by {anom.get('customerName')}: Ordered {anom.get('quantity')} units of {anom.get('name')} (Outlier, Z-Score: {anom.get('zScore')})")
        except Exception as e:
            output.append("Error querying forecast/anomaly models: " + str(e))

        return "\n".join(output) if output else "ForecastAgent found no predictive statistics."

# Agent C: RAG Policy Agent
class RagAgent:
    def execute(self, query):
        vector_store.fit_and_populate() # Refresh context
        chunks = vector_store.query_similarity(query, top_n=3)
        if not chunks:
            return "No matching warehouse SOP policies or contract documents found in the vector store."
            
        output = ["### SOP & Policy Reference Details:"]
        for chunk in chunks:
            output.append(f"*(Source: {chunk['source']})*\n{chunk['text']}\n")
        return "\n".join(output)

# ----------------------------------------------------
# 3. LANGGRAPH SUPERVISOR AGENT
# ----------------------------------------------------
class LangGraphSupervisor:
    def __init__(self):
        self.inventory_agent = InventoryAgent()
        self.forecast_agent = ForecastAgent()
        self.rag_agent = RagAgent()

    def route_and_execute(self, query):
        # 1. Routing Intent Analysis
        agents_to_query = []
        query_lower = query.lower()

        # Route to Inventory Agent
        if any(w in query_lower for w in ["stock", "quantity", "left", "inventory", "available", "reorder", "worker", "staff", "person", "active", "zone", "gear", "valve", "wire", "seal", "panel"]):
            agents_to_query.append(("InventoryAgent", self.inventory_agent))
            
        # Route to Forecast Agent
        if any(w in query_lower for w in ["forecast", "predict", "projection", "anomaly", "anomalous", "outlier", "z-score", "future"]):
            agents_to_query.append(("ForecastAgent", self.forecast_agent))
            
        # Route to RAG Agent (SOPs, Safety, SLAs, policies)
        if any(w in query_lower for w in ["sop", "procedure", "policy", "agreement", "contract", "safety", "helmet", "boots", "ppe", "spill", "forklift", "discrepancy", "lead time", "sla", "supplier", "quarantine"]):
            agents_to_query.append(("RagAgent", self.rag_agent))

        # Default fallback: Ask RAG and Inventory
        if not agents_to_query:
            agents_to_query = [("InventoryAgent", self.inventory_agent), ("RagAgent", self.rag_agent)]

        # 2. Execute Sub-Agents in Parallel/Sequence to collect Context
        collected_context = {}
        for name, agent in agents_to_query:
            try:
                collected_context[name] = agent.execute(query)
            except Exception as e:
                collected_context[name] = f"Error in {name}: {e}"

        # 3. Call Gemini to synthesize final answer or fall back
        merged_context = ""
        for agent_name, agent_output in collected_context.items():
            merged_context += f"--- CONTEXT FROM {agent_name.upper()} ---\n{agent_output}\n\n"

        if GEMINI_API_KEY:
            system_instruction = (
                "You are the Warehouse Supervisor Copilot. "
                "You receive queries from warehouse operators and compile information by merging inputs from specialized sub-agents. "
                "Review the provided Context and formulate a helpful, professional, and definitive final answer. "
                "Quote formulas or exact steps from the context if necessary."
            )
            prompt = (
                f"{system_instruction}\n\n"
                f"Context from Sub-Agents:\n{merged_context}\n"
                f"User Query: {query}\n"
                f"Final Answer:"
            )
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }
                res = requests.post(url, json=payload, timeout=10)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                print(f"Gemini synthesis failed: {e}")

        # Fallback structured merge response
        output_lines = [
            f"🤖 **Supervisor Routing Report**: I queried {', '.join([n for n, _ in agents_to_query])} to resolve your question.\n"
        ]
        for name, data in collected_context.items():
            output_lines.append(data)
            
        return "\n\n".join(output_lines)

# Instantiate supervisor
supervisor = LangGraphSupervisor()

def chat_with_copilot(query, history=None):
    return supervisor.route_and_execute(query)
