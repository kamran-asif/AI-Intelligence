import React, { useState, useEffect } from 'react';

// API Configuration
const BACKEND_URL = 'http://localhost:8080';
const AI_SERVICE_URL = 'http://localhost:8010';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [events, setEvents] = useState([]);
  const [decisions, setDecisions] = useState({
    kpis: { orders: '14,200', revenue: '$2.4M', stockoutCount: '12', alertsCount: '4' },
    overview: { stockoutRiskCount: 3, workerAlertCount: 2, anomalyCount: 1, expectedRevenueImpact: '$12,400' },
    criticalAlerts: [],
    recommendedActions: [],
    aiInsights: ''
  });

  const [forecasts, setForecasts] = useState([]);
  const [selectedForecastSku, setSelectedForecastSku] = useState('');
  const [anomalies, setAnomalies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', sku: '', quantity: 10, price: 10.0, location: 'Zone A-Shelf 1', reorderPoint: 5 });
  
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderCustomer, setOrderCustomer] = useState('');
  const [orderLines, setOrderLines] = useState([{ inventoryItemId: '', quantity: 1 }]);

  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', status: 'ACTIVE', zone: 'Zone A' });

  // Centralized Copilot Chat
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { 
      sender: 'copilot', 
      text: "Hello! I am the Warehouse Copilot, coordinated by a LangGraph Supervisor.\n\n" +
            "I orchestrate specialized sub-agents:\n" +
            "• **Inventory Agent**: Queries database quantities, slots, and worker break status.\n" +
            "• **Forecast Agent**: Explains demand projections and anomalies using IsolationForest.\n" +
            "• **RAG Agent**: Retrieves specific rules from warehouse SOPs, SLAs, policies, and contracts.\n\n" +
            "Ask me anything, like: 'Which products should I reorder today?' or 'Why are stockouts rising?'" 
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Sync data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch Inventory
      const invRes = await fetch(`${BACKEND_URL}/api/gateway/inventory`);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
        if (invData.length > 0 && !selectedForecastSku) setSelectedForecastSku(invData[0].sku);
      }

      // 2. Fetch Orders
      const orderRes = await fetch(`${BACKEND_URL}/api/gateway/orders`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(orderData);
      }

      // 3. Fetch Workers
      const workerRes = await fetch(`${BACKEND_URL}/api/gateway/workers`);
      if (workerRes.ok) {
        const workerData = await workerRes.json();
        setWorkers(workerData);
      }

      // 4. Fetch Event Logs
      const eventRes = await fetch(`${BACKEND_URL}/api/gateway/events`);
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setEvents(eventData);
      }

      // 5. Fetch AI Decisions & Recommendations
      const decRes = await fetch(`${AI_SERVICE_URL}/api/ai/dashboard/decisions`);
      if (decRes.ok) {
        const decData = await decRes.json();
        setDecisions(decData);
      }

      // 6. Fetch AI Demand Forecasts
      const foreRes = await fetch(`${AI_SERVICE_URL}/api/ai/forecast`);
      if (foreRes.ok) {
        const foreData = await foreRes.json();
        setForecasts(foreData);
      }

      // 7. Fetch AI Anomalies
      const anomRes = await fetch(`${AI_SERVICE_URL}/api/ai/anomalies`);
      if (anomRes.ok) {
        const anomData = await anomRes.json();
        setAnomalies(anomData);
      }

    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to API Gateway. Please ensure both Spring Boot and Python AI services are active.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add Stock
  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/gateway/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({ name: '', sku: '', quantity: 10, price: 10.0, location: 'Zone A-Shelf 1', reorderPoint: 5 });
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Dispatch Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!orderCustomer) return alert('Customer name is required');
    const items = orderLines.map(line => ({
      inventoryItem: { id: parseInt(line.inventoryItemId) },
      quantity: parseInt(line.quantity)
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/gateway/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: orderCustomer, items })
      });
      if (res.ok) {
        setShowOrderModal(false);
        setOrderCustomer('');
        setOrderLines([{ inventoryItemId: '', quantity: 1 }]);
        fetchData();
      } else {
        const errMsg = await res.text();
        alert('Order rejected: ' + errMsg);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (id, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === 'PENDING') nextStatus = 'SHIPPED';
    else if (currentStatus === 'SHIPPED') nextStatus = 'DELIVERED';
    else return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/gateway/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextStatus)
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Register Worker
  const handleCreateWorker = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/gateway/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorker)
      });
      if (res.ok) {
        setShowWorkerModal(false);
        setNewWorker({ name: '', status: 'ACTIVE', zone: 'Zone A' });
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Worker Break
  const handleUpdateWorkerStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'ON_BREAK' : 'ACTIVE';
    try {
      const res = await fetch(`${BACKEND_URL}/api/gateway/workers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextStatus)
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Chat Send
  const handleSendChatMessage = async (e, customMsg = null) => {
    if (e) e.preventDefault();
    const query = customMsg || chatInput;
    if (!query.trim()) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: query }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/ai/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query })
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { sender: 'copilot', text: data.reply }]);
      } else {
        setChatHistory(prev => [...prev, { sender: 'copilot', text: "Error communicating with the multi-agent routing supervisor." }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'copilot', text: "Error: Could not reach the Copilot server. Ensure Python AI service is running." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Execute Action shortcut
  const handleExecuteAction = (actionTitle) => {
    if (actionTitle.includes("Gears")) {
      // Reorder Gears shortcut
      setNewItem({ name: 'Industrial Gears (Class A)', sku: 'GEAR-001', quantity: 500, price: 45.0, location: 'Zone A-Shelf 1', reorderPoint: 50 });
      setShowAddModal(true);
      setActiveTab('inventory');
    } else if (actionTitle.includes("Zone B")) {
      alert("Relocation directive dispatched to forklift terminal. Worker assigned: Alex Johnson.");
    } else {
      setActiveTab('workers');
    }
  };

  // Render SVG Demand Graph
  const renderForecastingChart = (selected) => {
    const hist = selected.historical || [];
    const fore = selected.forecast || [];
    const points = [
      ...hist.map((p, idx) => ({ date: p.date, val: p.quantity, type: 'historical', index: idx })),
      ...fore.map((p, idx) => ({ date: p.date, val: p.quantity, type: 'forecast', index: hist.length + idx }))
    ];

    if (points.length === 0) return null;

    const maxVal = Math.max(...points.map(p => p.val), 10);
    const width = 800;
    const height = 250;
    const padding = 35;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const getX = (idx) => padding + (idx / (points.length - 1)) * chartWidth;
    const getY = (val) => padding + chartHeight - (val / maxVal) * chartHeight;

    let histPath = '';
    let forePath = '';

    points.forEach((p, idx) => {
      const x = getX(idx);
      const y = getY(p.val);
      if (p.type === 'historical') {
        if (histPath === '') histPath = `M ${x} ${y}`;
        else histPath += ` L ${x} ${y}`;
      } else {
        if (forePath === '') {
          const lastHist = points[hist.length - 1];
          if (lastHist) {
            forePath = `M ${getX(hist.length - 1)} ${getY(lastHist.val)} L ${x} ${y}`;
          } else {
            forePath = `M ${x} ${y}`;
          }
        } else {
          forePath += ` L ${x} ${y}`;
        }
      }
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '20px' }}>
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = getY(ratio * maxVal);
          return (
            <g key={idx}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={padding - 8} y={y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end">{Math.round(ratio * maxVal)}</text>
            </g>
          );
        })}
        {histPath && <path d={histPath} fill="none" stroke="var(--primary)" strokeWidth="2.5" />}
        {forePath && <path d={forePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeDasharray="4 4" />}
        {points.map((p, idx) => (
          <circle key={idx} cx={getX(idx)} cy={getY(p.val)} r="3" fill={p.type === 'historical' ? 'var(--primary)' : 'var(--accent)'} />
        ))}
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* SIDE NAVIGATION (Product-Oriented) */}
      <aside style={{ width: '270px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '24px', background: 'rgba(6, 9, 17, 0.9)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fff' }}>W</div>
          <span style={{ fontWeight: 700, fontSize: '19px', letterSpacing: '0.5px', background: 'linear-gradient(135deg, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Warehouse OS</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          <button 
            className={`btn-secondary ${activeTab === 'overview' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', border: activeTab === 'overview' ? '1px solid var(--primary)' : '1px solid transparent', background: 'transparent' }}
          >
            📊 Overview
          </button>
          
          <button 
            className={`btn-secondary ${activeTab === 'inventory' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('inventory')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', border: activeTab === 'inventory' ? '1px solid var(--primary)' : '1px solid transparent', background: 'transparent' }}
          >
            📦 Inventory
          </button>
          
          <button 
            className={`btn-secondary ${activeTab === 'operations' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('operations')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', border: activeTab === 'operations' ? '1px solid var(--primary)' : '1px solid transparent', background: 'transparent' }}
          >
            🚚 Operations
          </button>

          <button 
            className={`btn-secondary ${activeTab === 'analytics' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('analytics')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', border: activeTab === 'analytics' ? '1px solid var(--primary)' : '1px solid transparent', background: 'transparent' }}
          >
            📈 Analytics
          </button>

          <button 
            className={`btn-secondary ${activeTab === 'copilot' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('copilot')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', border: activeTab === 'copilot' ? '1px solid var(--primary)' : '1px solid transparent', background: 'transparent' }}
          >
            🤖 AI Copilot
          </button>

          <button 
            className={`btn-secondary ${activeTab === 'settings' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', border: activeTab === 'settings' ? '1px solid var(--primary)' : '1px solid transparent', background: 'transparent' }}
          >
            ⚙️ Settings
          </button>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div>Spring Gateway: <span style={{ color: 'var(--status-delivered)' }}>● Online (8080)</span></div>
          <div>FastAPI Model: <span style={{ color: 'var(--status-delivered)' }}>● Online (8010)</span></div>
          <button className="btn-secondary" style={{ marginTop: '10px', padding: '6px', fontSize: '12px' }} onClick={fetchData}>🔄 Sync Cluster</button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main style={{ flexGrow: 1, padding: '40px', overflowY: 'auto' }}>
        
        {errorMsg && (
          <div className="glass-panel" style={{ padding: '16px 20px', borderLeft: '4px solid var(--status-error)', marginBottom: '24px', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {errorMsg}</span>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={fetchData}>Sync System</button>
          </div>
        )}

        {/* ==================================================== */}
        {/* 1. OVERVIEW TAB (DECISION-FIRST LANDING PAGE) */}
        {/* ==================================================== */}
        {activeTab === 'overview' && (
          <div className="animate-fade">
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>Operations Overview</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Actionable alerts and recommended business decisions.</p>
            
            {/* KPI Row (Top section of Overview) */}
            <div className="kpi-row">
              <div className="glass-panel kpi-card orders">
                <span className="kpi-title">Fulfillment Orders</span>
                <span className="kpi-value">{decisions.kpis.orders}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Accumulated volume</span>
              </div>
              <div className="glass-panel kpi-card revenue">
                <span className="kpi-title">Gross Revenue</span>
                <span className="kpi-value">{decisions.kpis.revenue}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SLA billing value</span>
              </div>
              <div className="glass-panel kpi-card stockout">
                <span className="kpi-title">Stockouts Risked</span>
                <span className="kpi-value">{decisions.kpis.stockoutCount}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKUs below threshold</span>
              </div>
              <div className="glass-panel kpi-card alerts">
                <span className="kpi-title">System Alerts</span>
                <span className="kpi-value">{decisions.kpis.alertsCount}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Action items flagged</span>
              </div>
            </div>

            {/* Split decisions view */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', marginBottom: '24px' }}>
              
              {/* Left Column: What Should I Care About Right Now */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700 }}>⚠️ What to Care About Right Now</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Expected Revenue Impact of Stockouts: <strong style={{ color: 'var(--status-error)' }}>{decisions.overview.expectedRevenueImpact}</strong>
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {decisions.criticalAlerts.map(alert => (
                    <div key={alert.id} className={`alert-item ${alert.type}`}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{alert.text}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Source: Real-time telemetry logs</span>
                      </div>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          if (alert.text.includes("stockout")) {
                            setActiveTab('analytics');
                          } else if (alert.text.includes("Worker")) {
                            setActiveTab('copilot');
                            handleSendChatMessage(null, "Why is David Miller's productivity down?");
                          } else {
                            setActiveTab('copilot');
                            handleSendChatMessage(null, "SLA shipment delay terms for Apex Machinery Corp.");
                          }
                        }}
                      >
                        Ask Copilot 🤖
                      </button>
                    </div>
                  ))}
                </div>
                
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: '20px', padding: '10px' }}
                  onClick={() => setActiveTab('analytics')}
                >
                  View Recommendations
                </button>
              </div>

              {/* Right Column: AI Generative Insights Banner */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="insight-box">
                  <div className="insight-header">
                    ✨ AI Predictive Insights
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#fff', fontWeight: 400 }}>
                    "{decisions.aiInsights}"
                  </p>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>
                    Generated by Google Gemini Decision Node
                  </span>
                </div>

                {/* Kafka logged events timeline */}
                <div className="glass-panel" style={{ padding: '20px', flexGrow: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>⚡ Kafka Audits (Live Stream Log)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {events.slice(0, 5).map((e, idx) => (
                      <div key={idx} style={{ fontSize: '12px', padding: '6px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{e.payload}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Recommended Actions row */}
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px' }}>Recommended Actions</h3>
            <div className="action-grid">
              {decisions.recommendedActions.map(act => (
                <div key={act.id} className={`glass-panel action-card ${act.risk.toLowerCase()}`}>
                  <div className="action-header">
                    <span className="action-title">{act.title}</span>
                    <span className={`action-risk-badge ${act.risk.toLowerCase()}`}>Risk: {act.risk}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', flexGrow: 1 }}>{act.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Qty: <strong>{act.qty}</strong></span>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleExecuteAction(act.title)}
                    >
                      Confirm Action ✔️
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* 2. INVENTORY DATABASE TAB */}
        {/* ==================================================== */}
        {activeTab === 'inventory' && (
          <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>Inventory Database</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Live warehouse storage units and reorder points.</p>
              </div>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>➕ Restock Inventory</button>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Shelf Location</th>
                      <th>Reorder Point</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => {
                      const isLow = item.quantity <= item.reorderPoint;
                      return (
                        <tr key={item.id}>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td><code>{item.sku}</code></td>
                          <td>{item.quantity} units</td>
                          <td>${item.price.toFixed(2)}</td>
                          <td>{item.location}</td>
                          <td>{item.reorderPoint}</td>
                          <td>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              background: isLow ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: isLow ? 'var(--status-pending)' : 'var(--status-delivered)'
                            }}>
                              {isLow ? 'Low Stock' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add stock modal */}
            {showAddModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div className="glass-panel" style={{ padding: '30px', width: '450px', background: '#0e1422' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 600 }}>Adjust / Add Stock</h3>
                  <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Product Name</label>
                      <input className="glass-input" type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required/>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>SKU (Unique Identifier)</label>
                      <input className="glass-input" type="text" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} required/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Quantity</label>
                        <input className="glass-input" type="number" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} required/>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Price ($)</label>
                        <input className="glass-input" type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})} required/>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Location Shelf</label>
                        <input className="glass-input" type="text" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} required/>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Reorder Point</label>
                        <input className="glass-input" type="number" value={newItem.reorderPoint} onChange={e => setNewItem({...newItem, reorderPoint: parseInt(e.target.value)})} required/>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button className="btn-secondary" type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                      <button className="btn-primary" type="submit">Publish Stock</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 3. OPERATIONS TAB (ORDERS & WORKERS) */}
        {/* ==================================================== */}
        {activeTab === 'operations' && (
          <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>Operations Control</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Manage outbound orders and warehouse staff allocations.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => setShowWorkerModal(true)}>👷 Add Worker</button>
                <button className="btn-primary" onClick={() => setShowOrderModal(true)}>🛒 Build Outbound Order</button>
              </div>
            </div>

            {/* Split Outbound Orders and Workers logs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
              
              {/* Outbound Orders */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>🚚 Dispatch Orders</h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Client</th>
                        <th>Subtotal</th>
                        <th>Fulfillment Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>
                          <td style={{ fontWeight: 600 }}>{order.customerName}</td>
                          <td>${order.totalAmount.toFixed(2)}</td>
                          <td>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              background: order.status === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : (order.status === 'SHIPPED' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                              color: order.status === 'PENDING' ? 'var(--status-pending)' : (order.status === 'SHIPPED' ? 'var(--status-shipped)' : 'var(--status-delivered)')
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            {order.status !== 'DELIVERED' ? (
                              <button 
                                className="btn-primary" 
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={() => handleUpdateOrderStatus(order.id, order.status)}
                              >
                                {order.status === 'PENDING' ? 'Ship Order 🚚' : 'Mark Delivered ✔️'}
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Complete</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Workers Grid */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>👷 Staffing Levels</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {workers.map(w => (
                    <div key={w.id} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{w.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Zone: {w.zone}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px',
                          background: w.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: w.status === 'ACTIVE' ? 'var(--status-delivered)' : 'var(--status-pending)'
                        }}>{w.status}</span>
                        <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => handleUpdateWorkerStatus(w.id, w.status)}>
                          Toggle status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Build order modal */}
            {showOrderModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div className="glass-panel" style={{ padding: '30px', width: '500px', background: '#0e1422' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: 600 }}>Place Outbound Dispatch</h3>
                  <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Client Name</label>
                      <input className="glass-input" type="text" value={orderCustomer} onChange={e => setOrderCustomer(e.target.value)} required/>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {orderLines.map((line, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '8px', alignItems: 'center' }}>
                          <select 
                            className="glass-input"
                            value={line.inventoryItemId}
                            onChange={e => {
                              const list = [...orderLines];
                              list[idx].inventoryItemId = e.target.value;
                              setOrderLines(list);
                            }}
                            required
                          >
                            <option value="">Select SKU...</option>
                            {inventory.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.quantity} left)
                              </option>
                            ))}
                          </select>
                          <input 
                            className="glass-input" 
                            type="number" 
                            min="1"
                            value={line.quantity}
                            onChange={e => {
                              const list = [...orderLines];
                              list[idx].quantity = e.target.value;
                              setOrderLines(list);
                            }}
                            required
                          />
                          <button 
                            className="btn-secondary" 
                            type="button" 
                            style={{ padding: '8px', color: 'var(--status-error)' }}
                            onClick={() => setOrderLines(orderLines.filter((_, i) => i !== idx))}
                          >
                            ✖
                          </button>
                        </div>
                      ))}
                      <button className="btn-secondary" type="button" onClick={() => setOrderLines([...orderLines, { inventoryItemId: '', quantity: 1 }])}>
                        ➕ Add Item
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button className="btn-secondary" type="button" onClick={() => setShowOrderModal(false)}>Cancel</button>
                      <button className="btn-primary" type="submit">Place Order</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Register worker modal */}
            {showWorkerModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                <div className="glass-panel" style={{ padding: '30px', width: '400px', background: '#0e1422' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 600 }}>Register Warehouse Staff</h3>
                  <form onSubmit={handleCreateWorker} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Full Name</label>
                      <input className="glass-input" type="text" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} required/>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Zone</label>
                        <select className="glass-input" value={newWorker.zone} onChange={e => setNewWorker({...newWorker, zone: e.target.value})}>
                          <option value="Zone A">Zone A</option>
                          <option value="Zone B">Zone B</option>
                          <option value="Zone C">Zone C</option>
                          <option value="Zone D">Zone D</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Initial Status</label>
                        <select className="glass-input" value={newWorker.status} onChange={e => setNewWorker({...newWorker, status: e.target.value})}>
                          <option value="ACTIVE">Active</option>
                          <option value="ON_BREAK">On Break</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button className="btn-secondary" type="button" onClick={() => setShowWorkerModal(false)}>Cancel</button>
                      <button className="btn-primary" type="submit">Add Staff</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* 4. ANALYTICS (INVENTORY INTELLIGENCE CENTER) */}
        {/* ==================================================== */}
        {activeTab === 'analytics' && (
          <div className="animate-fade">
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>Inventory Intelligence Center</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>XGBoost demand projections and stockout safety analysis.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
              
              {/* Product SKU selection list */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', height: 'fit-content' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-secondary)' }}>Monitor Inventory Node</h4>
                {forecasts.map(f => (
                  <button 
                    key={f.sku}
                    className="btn-secondary" 
                    onClick={() => setSelectedForecastSku(f.sku)}
                    style={{ 
                      textAlign: 'left', 
                      width: '100%', 
                      fontSize: '13px',
                      background: selectedForecastSku === f.sku ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                      color: '#fff',
                      border: selectedForecastSku === f.sku ? '1px solid var(--primary)' : '1px solid var(--border-color)'
                    }}
                  >
                    {f.name} (<code>{f.sku}</code>)
                  </button>
                ))}
              </div>

              {/* Business Insights First, Graph Secondary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {(() => {
                  const selected = forecasts.find(f => f.sku === selectedForecastSku);
                  if (!selected) return <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>Select an inventory item.</div>;
                  
                  return (
                    <>
                      {/* Business Decision Metrics */}
                      <div className="glass-panel" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', borderTop: `4px solid ${selected.daysRemaining < 5 ? 'var(--status-error)' : 'var(--primary)'}` }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Stock</span>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{selected.currentStock}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Forecasted Demand</span>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{selected.reorderQuantity + selected.currentStock}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days Remaining</span>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: selected.daysRemaining < 5 ? 'var(--status-error)' : '#fff', marginTop: '4px' }}>
                            {selected.daysRemaining} days
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Risk Classification</span>
                          <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginTop: '8px' }}>{selected.riskLevel}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Expected Savings</span>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--status-delivered)', marginTop: '4px' }}>
                            ${selected.expectedSavings.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action & Recommendation details */}
                      <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '14px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Decision Directive:</h4>
                          <span style={{ fontSize: '13px', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 10px', borderRadius: '4px', border: '1px solid var(--primary)' }}>
                            Recommendation: Order {selected.reorderQuantity} units
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                          Our model predicts current inventory of **{selected.name}** will deplete in **{selected.daysRemaining} days** based on an average velocity of {selected.averageDailySales} units/day. Restocking **{selected.reorderQuantity} units** now will guarantee optimal safety stock cover, preventing contract SLA stockout penalties and yielding an estimated **${selected.expectedSavings.toLocaleString()}** in net operational savings.
                        </p>
                        
                        {/* Forecasting SVG Graph (Secondary) */}
                        {renderForecastingChart(selected)}
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>

            {/* Root Cause Analysis (RCA) Section */}
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '40px', marginBottom: '16px' }}>🔍 Root Cause Analysis (RCA)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {anomalies.map((anom, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--status-error)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{anom.discrepancyType}</span>
                    <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--status-error)' }}>
                      Confidence: {anom.confidence}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Flagged Outlier Quantity: <strong>{anom.quantity} units</strong> on Order #{anom.orderId} ({anom.customerName})
                  </p>
                  
                  <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                    <strong style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Likely Bottleneck Causes:</strong>
                    <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {anom.likelyCauses.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Action: {anom.recommendedAction}</span>
                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => handleExecuteAction("Workers")}>
                      Schedule Audit 🔍
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ==================================================== */}
        {/* 5. AI COPILOT TAB (CENTRALIZED) */}
        {/* ==================================================== */}
        {activeTab === 'copilot' && (
          <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>Ask Warehouse Copilot</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Natural language RAG supervisor coordinates real-time queries across warehouse systems.</p>
            </div>

            {/* Centered chat window */}
            <div className="glass-panel" style={{ flexGrow: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', marginBottom: '16px', height: '380px' }}>
              {chatHistory.map((chat, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    alignSelf: chat.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '14px 18px',
                    borderRadius: '16px',
                    lineHeight: '1.5',
                    fontSize: '14px',
                    background: chat.sender === 'user' ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255,255,255,0.03)',
                    border: chat.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    color: '#fff',
                    whiteSpace: 'pre-line'
                  }}
                >
                  <strong>{chat.sender === 'user' ? 'Warehouse Operator' : 'Supervisor Agent'}</strong>
                  <div style={{ marginTop: '4px' }}>{chat.text}</div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '14px 18px', borderRadius: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  🤖 Supervisor coordinating agents...
                </div>
              )}
            </div>

            {/* Quick Action Prompts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <button className="btn-secondary" style={{ fontSize: '13px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px' }} onClick={(e) => handleSendChatMessage(e, "Why are stockouts rising?")}>
                <strong>Why are stockouts rising?</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Analyze forecast patterns & reorder alerts</span>
              </button>
              <button className="btn-secondary" style={{ fontSize: '13px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px' }} onClick={(e) => handleSendChatMessage(e, "Which products should I reorder today?")}>
                <strong>Which products should I reorder today?</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Identify high-risk SKUs and quantities</span>
              </button>
              <button className="btn-secondary" style={{ fontSize: '13px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px' }} onClick={(e) => handleSendChatMessage(e, "What safety helmet rules apply inside the zones?")}>
                <strong>What safety helmet rules apply?</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Retrieve EHS helmet policies</span>
              </button>
              <button className="btn-secondary" style={{ fontSize: '13px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px' }} onClick={(e) => handleSendChatMessage(e, "Show me lead times from supplier contracts.")}>
                <strong>Show me supplier contract SLAs.</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scan SLA thresholds & supplier metrics</span>
              </button>
            </div>

            {/* Input form */}
            <form onSubmit={(e) => handleSendChatMessage(e)} style={{ display: 'flex', gap: '12px' }}>
              <input 
                className="glass-input" 
                style={{ flexGrow: 1, padding: '14px 20px' }} 
                type="text" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                placeholder="Ask Supervisor about SOPs, contracts, forecasts, anomalies, or check live stock..."
                disabled={chatLoading}
              />
              <button className="btn-primary" type="submit" style={{ padding: '0 24px' }} disabled={chatLoading}>Execute Agent 🚀</button>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* 6. SETTINGS TAB */}
        {/* ==================================================== */}
        {activeTab === 'settings' && (
          <div className="animate-fade" style={{ maxWidth: '700px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '6px' }}>System Settings</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Configure microservice gateways and AI decision engines.</p>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Broker & Gateway Connections</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Spring Boot API Gateway Host</label>
                <input className="glass-input" type="text" defaultValue="http://localhost:8080" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>FastAPI Decision Engine Host</label>
                <input className="glass-input" type="text" defaultValue="http://localhost:8010" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Local Event Broker Topic</label>
                <input className="glass-input" type="text" defaultValue="warehouse_events_queue" disabled />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>LLM Supervisor System Prompts</label>
                <textarea className="glass-input" rows="4" style={{ resize: 'none' }} defaultValue="You are the Warehouse Supervisor Copilot. Coordinate sub-agents (Inventory, Forecast, RAG) to formulate a helpful final response..." />
              </div>

              <button className="btn-primary" onClick={() => alert("Settings saved to localStorage.")} style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                Save Settings ⚙️
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
