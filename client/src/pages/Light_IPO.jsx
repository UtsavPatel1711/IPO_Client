import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Landmark,
  LineChart,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  UserPlus,
  WalletCards,
} from "lucide-react";
import {
  loginUser,
  loadWorkspace,
  requestEmailOtp,
  saveWorkspace,
  verifyEmailOtp,
} from "../context/api.js";

const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

const defaultUpis = ["primary@okhdfcbank", "applications@okicici"];

const sampleClients = [
  { id: uid(), name: "Utsav Shah", pan: "ABCDE1234F", balance: 275000 },
  { id: uid(), name: "Meera Patel", pan: "BCDEF2345G", balance: 180000 },
];

const emptyWorkspace = {
  ipos: [],
  clients: [],
  upis: [],
  applications: [],
  holdings: [],
};

const retailAmount = (maxPrice, shareCount) => Number(maxPrice || 0) * Number(shareCount || 0);
const shniAmount = (maxPrice, shareCount) => retailAmount(maxPrice, shareCount) * 14;
const validatePAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan || "").trim().toUpperCase());
const clientInitials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL";
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const portfolioStatusLabel = (status = "Holding") => status === "Holding" ? "Active" : status;
const dateInputValue = () => new Date().toISOString().slice(0, 10);
const holdingKey = (clientId, assetId, assetName, assetType = "ipo") =>
  `${clientId}|${assetType}|${assetId || String(assetName || "").trim().toLowerCase()}`;

export default function LightIPO() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("ipo_light_user") || "null"));
  const [view, setView] = useState("dashboard");
  const [ipos, setIpos] = useState(() => JSON.parse(localStorage.getItem("ipo_light_ipos") || "[]"));
  const [clients, setClients] = useState(() => JSON.parse(localStorage.getItem("ipo_light_clients") || "null") || sampleClients);
  const [upis, setUpis] = useState(() => JSON.parse(localStorage.getItem("ipo_light_upis") || "null") || defaultUpis);
  const [applications, setApplications] = useState(() => JSON.parse(localStorage.getItem("ipo_light_applications") || "[]"));
  const [holdings, setHoldings] = useState(() => JSON.parse(localStorage.getItem("ipo_light_holdings") || "[]"));
  const [ipoQuery, setIpoQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem("ipo_light_ipos", JSON.stringify(ipos));
    localStorage.setItem("ipo_light_clients", JSON.stringify(clients));
    localStorage.setItem("ipo_light_upis", JSON.stringify(upis));
    localStorage.setItem("ipo_light_applications", JSON.stringify(applications));
    localStorage.setItem("ipo_light_holdings", JSON.stringify(holdings));
    if (user?.email) {
      saveWorkspace({ email: user.email, ipos, clients, upis, applications, holdings }).catch(() => {});
    }
  }, [applications, clients, holdings, ipos, upis, user?.email]);

  async function handleAuth(authUser) {
    try {
      const workspace = await loadWorkspace(authUser.email);
      setIpos(Array.isArray(workspace.ipos) ? workspace.ipos : emptyWorkspace.ipos);
      setClients(Array.isArray(workspace.clients) ? workspace.clients : emptyWorkspace.clients);
      setUpis(Array.isArray(workspace.upis) ? workspace.upis : emptyWorkspace.upis);
      setApplications(Array.isArray(workspace.applications) ? workspace.applications : emptyWorkspace.applications);
      setHoldings(Array.isArray(workspace.holdings) ? workspace.holdings : emptyWorkspace.holdings);
    } catch {
      setIpos(emptyWorkspace.ipos);
      setClients(emptyWorkspace.clients);
      setUpis(emptyWorkspace.upis);
      setApplications(emptyWorkspace.applications);
      setHoldings(emptyWorkspace.holdings);
      setNotice("Signed in. MongoDB sync will start once backend env values are configured.");
    }
    setUser(authUser);
    localStorage.setItem("ipo_light_user", JSON.stringify(authUser));
  }

  function logout() {
    localStorage.removeItem("ipo_light_user");
    localStorage.removeItem("ipo_light_ipos");
    localStorage.removeItem("ipo_light_clients");
    localStorage.removeItem("ipo_light_upis");
    localStorage.removeItem("ipo_light_applications");
    localStorage.removeItem("ipo_light_holdings");
    setIpos(emptyWorkspace.ipos);
    setClients(emptyWorkspace.clients);
    setUpis(emptyWorkspace.upis);
    setApplications(emptyWorkspace.applications);
    setHoldings(emptyWorkspace.holdings);
    setUser(null);
  }

  function deleteApplication(applicationId) {
    const application = applications.find((item) => item.id === applicationId);
    const name = application ? `${application.clientName}'s ${application.ipoName} application` : "this application";
    requestDeleteConfirmation(name, () => {
      setApplications((items) => items.filter((item) => item.id !== applicationId));
    });
  }

  function applyApplication(ipo, client, upi) {
    let applied = false;
    setApplications((items) => {
      const alreadyApplied = items.some((item) => item.ipoId === ipo.id && item.clientId === client.id);
      if (alreadyApplied) return items;

      applied = true;
      return [{
        id: uid(),
        ipoId: ipo.id,
        ipoName: ipo.name,
        clientId: client.id,
        clientName: client.name,
        upi,
        status: "Submitted",
        isAllotted: false,
        allottedAt: "",
        appliedAt: new Date().toISOString(),
      },
      ...items];
    });
    return applied;
  }

  function toggleApplicationAllotment(applicationId) {
    setApplications((items) =>
      items.map((item) => {
        if (item.id !== applicationId) return item;
        const isAllotted = !item.isAllotted;
        return {
          ...item,
          isAllotted,
          allottedAt: isAllotted ? new Date().toISOString() : "",
        };
      })
    );
  }

  function deleteIpo(ipoId) {
    const ipo = ipos.find((item) => item.id === ipoId);
    requestDeleteConfirmation(ipo?.name || "this IPO", () => {
      setIpos((items) => items.filter((item) => item.id !== ipoId));
      setApplications((items) => items.filter((item) => item.ipoId !== ipoId));
      setHoldings((items) => items.filter((item) => item.ipoId !== ipoId));
    });
  }

  function deleteClient(clientId) {
    const client = clients.find((item) => item.id === clientId);
    requestDeleteConfirmation(client?.name || "this client", () => {
      setClients((items) => items.filter((item) => item.id !== clientId));
      setApplications((items) => items.filter((item) => item.clientId !== clientId));
      setHoldings((items) => items.filter((item) => item.clientId !== clientId));
    });
  }

  function deleteUpi(upi) {
    requestDeleteConfirmation(upi, () => {
      setUpis((items) => items.filter((item) => item !== upi));
    });
  }

  function requestDeleteConfirmation(name, onConfirm) {
    setConfirmDialog({ name, onConfirm });
  }

  function confirmDeleteAction() {
    confirmDialog?.onConfirm?.();
    setConfirmDialog(null);
  }

  function updateClient(updatedClient) {
    const normalizedClient = {
      ...updatedClient,
      name: updatedClient.name.trim(),
      pan: updatedClient.pan.trim().toUpperCase(),
      balance: Number(updatedClient.balance || 0),
    };

    setClients((items) => items.map((item) => item.id === normalizedClient.id ? normalizedClient : item));
    setApplications((items) =>
      items.map((item) => item.clientId === normalizedClient.id ? { ...item, clientName: normalizedClient.name } : item)
    );
    setHoldings((items) =>
      items.map((item) => item.clientId === normalizedClient.id ? { ...item, clientName: normalizedClient.name } : item)
    );
  }

  function saveIpoRecord(ipoRecord) {
    setIpos((items) => {
      const exists = items.some((item) => item.id === ipoRecord.id);
      return exists ? items.map((item) => item.id === ipoRecord.id ? ipoRecord : item) : [ipoRecord, ...items];
    });
    setApplications((items) =>
      items.map((item) => item.ipoId === ipoRecord.id ? { ...item, ipoName: ipoRecord.name } : item)
    );
    setHoldings((items) =>
      items.map((item) => item.ipoId === ipoRecord.id ? { ...item, ipoName: ipoRecord.name } : item)
    );
  }

  function saveHoldingRecord(holdingRecord) {
    setHoldings((items) => {
      const exists = items.some((item) => item.id === holdingRecord.id);
      return exists ? items.map((item) => item.id === holdingRecord.id ? holdingRecord : item) : [holdingRecord, ...items];
    });
  }

  function deleteHolding(holdingId) {
    const holding = holdings.find((item) => item.id === holdingId);
    requestDeleteConfirmation(holding ? `${holding.clientName}'s ${holding.ipoName} portfolio record` : "this portfolio record", () => {
      setHoldings((items) => items.filter((item) => item.id !== holdingId));
    });
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} user={user} logout={logout} />
      <main className="workspace">
        <Topbar view={view} ipoQuery={ipoQuery} setIpoQuery={setIpoQuery} clientQuery={clientQuery} setClientQuery={setClientQuery} />
        {notice && <Notice>{notice}</Notice>}
        {view === "dashboard" && (
          <Dashboard
            ipos={ipos}
            clients={clients}
            upis={upis}
            applications={applications}
            onDeleteApplication={deleteApplication}
          />
        )}
        {view === "ipos" && (
          <IpoDesk
            ipos={ipos}
            clients={clients}
            upis={upis}
            applications={applications}
            query={ipoQuery}
            onSaveIpo={saveIpoRecord}
            onApplyApplication={applyApplication}
            onDeleteApplication={deleteApplication}
            onDeleteIpo={deleteIpo}
          />
        )}
        {view === "clientBook" && (
          <ClientBook
            clients={clients}
            ipos={ipos}
            upis={upis}
            applications={applications}
            clientQuery={clientQuery}
            onApplyApplication={applyApplication}
            onDeleteApplication={deleteApplication}
            onDeleteClient={deleteClient}
            onUpdateClient={updateClient}
            onToggleAllotment={toggleApplicationAllotment}
          />
        )}
        {view === "clients" && <Clients clients={clients} setClients={setClients} upis={upis} setUpis={setUpis} onDeleteUpi={deleteUpi} />}
        {view === "holdings" && (
          <Holdings
            clients={clients}
            ipos={ipos}
            holdings={holdings}
            onSaveHolding={saveHoldingRecord}
            onDeleteHolding={deleteHolding}
          />
        )}
        {view === "analytics" && <Analytics applications={applications} clients={clients} upis={upis} ipos={ipos} />}
        {confirmDialog && (
          <ConfirmDeleteModal
            name={confirmDialog.name}
            onCancel={() => setConfirmDialog(null)}
            onConfirm={confirmDeleteAction}
          />
        )}
      </main>
    </div>
  );
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    setBusy(true);
    setMessage("");
    try {
      if (mode === "signup" && !fullName.trim()) {
        setMessage("Enter your full name to create an account.");
        return;
      }
      if (!userId.trim() || password.length < 6) {
        setMessage("Enter User ID and a password with at least 6 characters.");
        return;
      }
      const response = await requestEmailOtp({ email, fullName, userId, password, mode });
      setStep("otp");
      setMessage(response.demoOtp ? `Demo OTP: ${response.demoOtp}` : "OTP sent to your email.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    setMessage("");
    try {
      const { user } = await verifyEmailOtp({ email, otp });
      onAuth(user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin() {
    setBusy(true);
    setMessage("");
    try {
      const { user } = await loginUser({ userId, password });
      onAuth(user);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-copy">
        <div className="brand-mark"><Landmark size={30} /></div>
        <p className="eyebrow">IPO operations desk</p>
        <h1>Track IPOs, clients, UPI IDs, and applications from one clean workspace.</h1>
      </section>
      <section className="auth-panel">
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setStep("email");
              setMessage("");
              setOtp("");
            }}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setStep("email");
              setMessage("");
              setOtp("");
            }}
          >
            Sign up
          </button>
        </div>
        <h2>{mode === "login" ? "Login" : "Create account"}</h2>
        <p>{mode === "login" ? "Use your User ID and password to continue." : "Create your account with email OTP verification."}</p>
        <label>User ID</label>
        <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="your-user-id" />
        <label>Password</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
        {mode === "signup" && (
          <>
            <label>Full name</label>
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" />
            <label>Email address</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" />
          </>
        )}
        {step === "otp" && (
          <>
            <label>Email OTP</label>
            <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6 digit OTP" inputMode="numeric" />
          </>
        )}
        {message && <div className="inline-message">{message}</div>}
        <button
          className="primary-action"
          onClick={mode === "login" ? handleLogin : step === "email" ? sendOtp : verifyOtp}
          disabled={busy || !userId || !password || (mode === "signup" && !email)}
        >
          {busy ? <Loader2 className="spin" size={18} /> : <Mail size={18} />}
          {mode === "login" ? "Login" : step === "email" ? "Send email OTP" : "Create account"}
        </button>
      </section>
    </div>
  );
}

function Sidebar({ view, setView, user, logout }) {
  const items = [
    ["dashboard", "Dashboard", BarChart3],
    ["ipos", "IPO Desk", Landmark],
    ["clientBook", "Client Book", BookOpen],
    ["clients", "Clients & UPI", WalletCards],
    ["holdings", "Portfolio", Building2],
    ["analytics", "Analytics", LineChart],
  ];

  return (
    <aside className="sidebar">
      <div className="logo"><Landmark size={24} /> IPO Light</div>
      <nav>
        {items.map(([key, label, Icon]) => (
          <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
      <div className="account-card">
        <div>{user.fullName || "Verified user"}</div>
        <small>{user.email}</small>
        <button onClick={logout}><LogOut size={16} /> Logout</button>
      </div>
    </aside>
  );
}

function Topbar({ view, ipoQuery, setIpoQuery, clientQuery, setClientQuery }) {
  const titles = {
    dashboard: "Dashboard",
    ipos: "IPO Desk",
    clientBook: "Client Details",
    clients: "Clients & UPI",
    holdings: "Portfolio",
    analytics: "Analytics",
  };
  const subtitles = {
    dashboard: "Portfolio overview",
    ipos: "Manual IPO workspace",
    clientBook: "Client book workspace",
    clients: "Client and payment setup",
    holdings: "Client IPO portfolio",
    analytics: "Application insights",
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{subtitles[view] || "IPO workspace"}</p>
        <h2>{titles[view] || "IPO Light"}</h2>
      </div>
      {view === "ipos" && (
        <div className="topbar-search searchbox">
          <Search size={18} />
          <input value={ipoQuery} onChange={(event) => setIpoQuery(event.target.value)} placeholder="Search IPOs" />
        </div>
      )}
      {view === "clientBook" && (
        <div className="topbar-search searchbox">
          <Search size={18} />
          <input value={clientQuery} onChange={(event) => setClientQuery(event.target.value)} placeholder="Search client or PAN" />
        </div>
      )}
    </header>
  );
}

function Dashboard({ ipos, clients, upis, applications, onDeleteApplication }) {
  const openCount = ipos.filter((ipo) => String(ipo.status).toLowerCase().includes("open")).length;
  return (
    <>
      <section className="metric-grid">
        <Metric icon={Landmark} label="Manual IPOs" value={ipos.length} />
        <Metric icon={Bell} label="Open issues" value={openCount} />
        <Metric icon={UserPlus} label="Clients" value={clients.length} />
        <Metric icon={WalletCards} label="UPI IDs" value={upis.length} />
      </section>
      <section className="content-grid">
        <div className="panel wide">
          <div className="panel-title">
            <h3>IPO pipeline</h3>
            <span>{ipos.length} records</span>
          </div>
          <IpoTable ipos={ipos.slice(0, 6)} emptyText="No IPO added yet. Add IPO details from the IPO Desk." />
        </div>
        <div className="panel">
          <div className="panel-title">
            <h3>Recent applications</h3>
            <span>{applications.length} total</span>
          </div>
          <div className="stack">
            {applications.slice(0, 5).map((app) => (
              <div className="mini-row" key={app.id}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>{app.ipoName}</strong>
                  <small>{app.clientName} via {app.upi}</small>
                </div>
                <button
                  className="row-delete"
                  aria-label={`Delete ${app.clientName} application`}
                  onClick={() => onDeleteApplication(app.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!applications.length && <EmptyLine text="Applications will appear here after you apply for an IPO." />}
          </div>
        </div>
      </section>
    </>
  );
}

function IpoDesk({ ipos, clients, upis, applications, query, onSaveIpo, onApplyApplication, onDeleteApplication, onDeleteIpo }) {
  const [selectedIpo, setSelectedIpo] = useState(null);
  const [form, setForm] = useState({ name: "", minPrice: "", maxPrice: "", shareCount: "", ipoType: "Mainboard" });
  const [editingIpoId, setEditingIpoId] = useState("");
  const [formError, setFormError] = useState("");

  const filtered = ipos.filter((ipo) => `${ipo.name} ${ipo.priceBand} ${ipo.shareCount} ${ipo.ipoType || "Mainboard"}`.toLowerCase().includes(query.toLowerCase()));
  const previewRetail = retailAmount(form.maxPrice, form.shareCount);
  const previewShni = shniAmount(form.maxPrice, form.shareCount);

  function resetIpoForm() {
    setForm({ name: "", minPrice: "", maxPrice: "", shareCount: "", ipoType: "Mainboard" });
    setEditingIpoId("");
    setFormError("");
  }

  function editIpo(ipo) {
    setEditingIpoId(ipo.id);
    setForm({
      name: ipo.name || "",
      minPrice: String(ipo.minPrice || ""),
      maxPrice: String(ipo.maxPrice || ""),
      shareCount: String(ipo.shareCount || ipo.lotSize || ""),
      ipoType: ipo.ipoType || "Mainboard",
    });
    setFormError("");
  }

  function saveIpo() {
    const minPrice = Number(form.minPrice);
    const maxPrice = Number(form.maxPrice);
    const shareCount = Number(form.shareCount);

    if (!form.name.trim() || !minPrice || !maxPrice || !shareCount) {
      setFormError("IPO name, min price, max price, and number of shares are required.");
      return;
    }
    if (minPrice > maxPrice) {
      setFormError("Min price cannot be greater than max price.");
      return;
    }

    onSaveIpo({
      id: editingIpoId || uid(),
      name: form.name.trim(),
      minPrice,
      maxPrice,
      shareCount,
      priceBand: `${minPrice} - ${maxPrice}`,
      lotSize: shareCount,
      ipoType: form.ipoType || "Mainboard",
      retailAmount: retailAmount(maxPrice, shareCount),
      shniAmount: shniAmount(maxPrice, shareCount),
      status: "Open",
      sector: "Manual",
      exchange: "NSE/BSE",
      gmp: "-",
      openDate: "-",
      closeDate: "-",
    });
    resetIpoForm();
  }

  function apply(ipo, client, upi) {
    onApplyApplication(ipo, client, upi);
    setSelectedIpo(null);
  }

  return (
    <section className="ipo-desk-layout">
      <div className="panel">
        <div className="desk-header ipo-form-header">
          <div>
            <h3>{editingIpoId ? "Edit IPO" : "Add IPO"}</h3>
            <p>Enter IPO terms manually. Retail and SHNI amounts are calculated from max price and number of shares.</p>
          </div>
        </div>
        {formError && <div className="inline-message">{formError}</div>}
        <div className="ipo-form-grid">
          <div>
            <label>IPO name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Company name" />
          </div>
          <div>
            <label>Min price</label>
            <input value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} type="number" placeholder="120" />
          </div>
          <div>
            <label>Max price</label>
            <input value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} type="number" placeholder="126" />
          </div>
          <div>
            <label>No. of shares</label>
            <input value={form.shareCount} onChange={(e) => setForm({ ...form, shareCount: e.target.value })} type="number" placeholder="119" />
          </div>
          <div>
            <label>IPO type</label>
            <WorkspaceSelect
              value={form.ipoType}
              placeholder="Select IPO type"
              options={[
                { value: "Mainboard", label: "Mainboard" },
                { value: "SME", label: "SME" },
              ]}
              onChange={(ipoType) => setForm({ ...form, ipoType })}
            />
          </div>
        </div>
        <div className="price-preview ipo-preview">
          <div>
            <span>Retail</span>
            <strong>Rs {previewRetail.toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>SHNI</span>
            <strong>Rs {previewShni.toLocaleString("en-IN")}</strong>
          </div>
        </div>
        <div className="form-actions">
          <button className="primary-action compact" onClick={saveIpo}>
            {editingIpoId ? <Pencil size={18} /> : <Plus size={18} />}
            {editingIpoId ? "Update IPO" : "Add IPO"}
          </button>
          {editingIpoId && <button className="secondary-action" onClick={resetIpoForm}>Cancel</button>}
        </div>
      </div>

      <div className="panel">
        <div className="desk-header ipo-table-header">
          <div>
            <h3>IPO Desk</h3>
            <p>Apply clients to manually added IPOs and remove applications when needed.</p>
          </div>
          <span className="record-pill">{filtered.length} records</span>
        </div>
        <IpoTable ipos={filtered} onShowApplied={setSelectedIpo} onEdit={editIpo} onDelete={onDeleteIpo} emptyText="No IPOs added yet." />
      </div>

      {selectedIpo && (
        <AppliedClientsModal
          ipo={selectedIpo}
          applications={applications}
          onClose={() => setSelectedIpo(null)}
          onDeleteApplication={onDeleteApplication}
        />
      )}
    </section>
  );
}

function IpoTable({ ipos, onShowApplied, onEdit, onDelete, emptyText }) {
  if (!ipos.length) return <EmptyLine text={emptyText} />;
  const hasActions = Boolean(onShowApplied || onEdit);
  return (
    <div className={`ipo-table ${hasActions ? "has-actions" : "read-only"}`}>
      <div className="table-head">
        <span>Company</span><span>Price / shares</span><span>Retail</span>{hasActions && <span>Actions</span>}
      </div>
      {ipos.map((ipo) => (
        <div className={`table-row ${String(ipo.ipoType).toLowerCase() === "sme" ? "sme-ipo-row" : ""}`} key={ipo.id}>
          <div className="table-main">
          <span><strong>{ipo.name}</strong><small>{ipo.sector} · {ipo.exchange}</small></span>
          <span>Rs {ipo.priceBand}<small>{ipo.shareCount || ipo.lotSize} shares <em className={`ipo-type-badge ${String(ipo.ipoType).toLowerCase() === "sme" ? "sme" : ""}`}>{ipo.ipoType || "Mainboard"}</em></small></span>
          <span><em>Rs {Number(ipo.retailAmount || retailAmount(ipo.maxPrice, ipo.shareCount)).toLocaleString("en-IN")}</em><small>Max price</small></span>
            {hasActions && (
              <span className="ipo-actions">
                {onEdit && (
                  <button className="table-action icon-action" title="Edit IPO" aria-label={`Edit ${ipo.name}`} onClick={() => onEdit(ipo)}>
                    <Pencil size={16} />
                  </button>
                )}
                {onShowApplied && (
                  <button className="table-action" onClick={() => onShowApplied(ipo)}>
                    <Users size={15} /> Applied clients
                  </button>
                )}
              </span>
            )}
          </div>
          {onDelete && (
            <button className="row-delete" aria-label={`Delete ${ipo.name}`} onClick={() => onDelete(ipo.id)}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function AppliedClientsModal({ ipo, applications, onClose, onDeleteApplication }) {
  const [appliedQuery, setAppliedQuery] = useState("");
  const appliedClients = applications.filter((item) => item.ipoId === ipo.id);
  const filteredAppliedClients = appliedClients.filter((application) =>
    `${application.clientName} ${application.upi} ${application.isAllotted ? "allotted" : "not allotted"}`.toLowerCase().includes(appliedQuery.toLowerCase())
  );
  const appliedByUpi = filteredAppliedClients.reduce((groups, application) => {
    const key = application.upi || "No UPI";
    groups[key] = groups[key] ? [...groups[key], application] : [application];
    return groups;
  }, {});

  function exportAppliedClients() {
    const headers = ["No.", "IPO Name", "Client Name", "UPI ID", "Allotment Status", "Applied At"];
    const rows = filteredAppliedClients.map((application, index) => [
      index + 1,
      application.ipoName || ipo.name,
      application.clientName,
      application.upi,
      application.isAllotted ? "Allotted" : "Not allotted",
      application.appliedAt ? new Date(application.appliedAt).toLocaleString("en-IN") : "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${ipo.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-applied-clients.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal applied-clients-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <h3>Applied clients - {ipo.name}</h3>
          <div className="modal-title-actions">
            <button className="secondary-action export-action" onClick={exportAppliedClients} disabled={!filteredAppliedClients.length}>
              Export Excel
            </button>
            <button className="icon-button" onClick={onClose}>x</button>
          </div>
        </div>
        <div className="applied-modal-search searchbox">
          <Search size={18} />
          <input value={appliedQuery} onChange={(event) => setAppliedQuery(event.target.value)} placeholder="Search client, UPI, or status" />
        </div>
        <div className="applied-list only-list applied-scroll-area">
          {filteredAppliedClients.length ? Object.entries(appliedByUpi).map(([upi, rows]) => (
            <div className="upi-application-group" key={upi}>
              <div className="upi-group-title">
                <strong>{upi}</strong>
                <span>{rows.length} clients</span>
              </div>
              {rows.map((application) => (
                <div className={`mini-row ipo-client-status ${application.isAllotted ? "allotted" : "not-allotted"}`} key={application.id}>
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>{application.clientName}</strong>
                    <small>{application.upi} - {application.isAllotted ? "Allotted" : "Not allotted"}</small>
                  </div>
                  <button
                    className="row-delete"
                    aria-label={`Delete ${application.clientName} application`}
                    onClick={() => onDeleteApplication(application.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )) : <EmptyLine text={appliedClients.length ? "No applied client matched your search." : "No client applied for this IPO yet."} />}
        </div>
      </div>
    </div>
  );
}

function ClientBook({ clients, ipos, upis, applications, clientQuery, onApplyApplication, onDeleteApplication, onDeleteClient, onUpdateClient, onToggleAllotment }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedIpoId, setSelectedIpoId] = useState("");
  const [selectedUpi, setSelectedUpi] = useState("");
  const [editingClient, setEditingClient] = useState(null);
  const [editClientError, setEditClientError] = useState("");
  const [message, setMessage] = useState("");

  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.pan} ${client.balance}`.toLowerCase().includes(clientQuery.toLowerCase())
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const selectedIpo = ipos.find((ipo) => ipo.id === selectedIpoId);
  const clientApplications = applications.filter((application) => application.clientId === selectedClientId);
  const requiredAmount = Number(selectedIpo?.retailAmount || retailAmount(selectedIpo?.maxPrice, selectedIpo?.shareCount));
  const availableBalance = Number(selectedClient?.balance || 0);
  const balanceAfterApply = availableBalance - requiredAmount;

  useEffect(() => {
    if (selectedClientId && !filteredClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId("");
      setMessage("");
    }
  }, [filteredClients, selectedClientId]);

  function applyForClient() {
    setMessage("");
    if (!selectedClient || !selectedIpo || !selectedUpi) {
      setMessage("Select client, IPO, and UPI ID first.");
      return;
    }

    const applied = onApplyApplication(selectedIpo, selectedClient, selectedUpi);
    setMessage(applied ? "IPO application added for this client." : "This client is already applied for selected IPO.");
  }

  function openEditClient(client) {
    setEditingClient({ ...client, balance: String(client.balance || "") });
    setEditClientError("");
  }

  function saveEditedClient() {
    const pan = editingClient.pan.trim().toUpperCase();
    if (!editingClient.name.trim() || !pan) {
      setEditClientError("Client name and PAN are required.");
      return;
    }
    if (!validatePAN(pan)) {
      setEditClientError("Enter a valid PAN like ABCDE1234F.");
      return;
    }
    if (clients.some((item) => item.id !== editingClient.id && item.pan === pan)) {
      setEditClientError("A client with this PAN already exists.");
      return;
    }

    onUpdateClient({ ...editingClient, pan });
    setEditingClient(null);
    setEditClientError("");
  }

  return (
    <section className="client-book-simple">
      <div className="client-selector-grid">
          {filteredClients.map((client) => (
            (() => {
              const appliedCount = applications.filter((application) => application.clientId === client.id).length;
              return (
            <button
              key={client.id}
              className={`client-select-card ${selectedClientId === client.id ? "active" : ""}`}
              onClick={() => {
                setSelectedClientId((currentId) => currentId === client.id ? "" : client.id);
                setMessage("");
              }}
            >
              <div className="client-card-top">
                <span className="client-avatar">{clientInitials(client.name)}</span>
                <span className="client-count-pill">{appliedCount} IPOs</span>
              </div>
              <div className="client-card-body">
                <strong>{client.name}</strong>
                <small>{client.pan}</small>
                <em>Rs {Number(client.balance || 0).toLocaleString("en-IN")}</em>
              </div>
              <button
                className="client-card-delete"
                aria-label={`Delete ${client.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteClient(client.id);
                }}
              >
                <Trash2 size={15} />
              </button>
              <button
                className="client-card-edit"
                aria-label={`Edit ${client.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  openEditClient(client);
                }}
              >
                <Pencil size={15} />
              </button>
            </button>
              );
            })()
          ))}
          {!clients.length && <EmptyLine text="No clients yet. Add clients from Clients & UPI." />}
          {clients.length > 0 && !filteredClients.length && <EmptyLine text="No client matched your search." />}
      </div>

      {selectedClient && (
      <div className="panel client-detail-box" key={selectedClient.id}>
        <div className="panel-title client-detail-title">
          <span className="client-avatar large">{clientInitials(selectedClient.name)}</span>
          <div>
            <h3>{selectedClient.name}</h3>
            <p className="client-detail-meta">{selectedClient.pan} - Rs {Number(selectedClient.balance || 0).toLocaleString("en-IN")} balance</p>
          </div>
          <span className="client-applied-pill">{clientApplications.length} IPOs applied</span>
        </div>
        <div className="client-apply-grid">
          <div>
            <label>IPO name</label>
            <WorkspaceSelect
              value={selectedIpoId}
              placeholder="Select IPO"
              options={ipos.map((ipo) => ({ value: ipo.id, label: ipo.name }))}
              onChange={setSelectedIpoId}
            />
          </div>
          <div>
            <label>UPI ID</label>
            <WorkspaceSelect
              value={selectedUpi}
              placeholder="Select UPI"
              options={upis.map((upi) => ({ value: upi, label: upi }))}
              onChange={setSelectedUpi}
            />
          </div>
        </div>

        <div className="balance-grid">
          <div>
            <span>Available balance</span>
            <strong>Rs {availableBalance.toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>Retail required</span>
            <strong>Rs {requiredAmount.toLocaleString("en-IN")}</strong>
          </div>
          <div className={balanceAfterApply < 0 ? "danger-balance" : ""}>
            <span>After apply</span>
            <strong>Rs {balanceAfterApply.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        {message && <div className="inline-message">{message}</div>}
        <button className="primary-action compact" disabled={!selectedClient || !selectedIpo || !selectedUpi} onClick={applyForClient}>
          <CheckCircle2 size={18} /> Apply IPO
        </button>

        <div className="history-panel">
          <div className="panel-title compact-title">
            <h3>Applied IPO history</h3>
            <span>{clientApplications.length} records</span>
          </div>
          <div className="stack">
            {clientApplications.map((application) => (
              <div className={`mini-row application-history-row ${application.isAllotted ? "allotted" : "not-allotted"}`} key={application.id}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>{application.ipoName}</strong>
                  <small>{application.upi}</small>
                </div>
                <span className={`status-chip ${application.isAllotted ? "success" : "danger"}`}>
                  {application.isAllotted ? "Allotted" : "Not allotted"}
                </span>
                <button
                  className={`allotment-toggle ${application.isAllotted ? "active" : ""}`}
                  onClick={() => onToggleAllotment(application.id)}
                >
                  Allotment
                </button>
                <button
                  className="row-delete"
                  aria-label={`Delete ${application.ipoName} application`}
                  onClick={() => onDeleteApplication(application.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!clientApplications.length && <EmptyLine text="No IPOs applied for this client yet." />}
          </div>
        </div>
      </div>
      )}
      {editingClient && (
        <div className="modal-backdrop" onClick={() => setEditingClient(null)}>
          <div className="modal edit-client-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title">
              <div>
                <h3>Edit client</h3>
                <span>Update client details used across this workspace.</span>
              </div>
              <button className="icon-button" onClick={() => setEditingClient(null)}>x</button>
            </div>
            <div className="edit-client-form">
              <div>
                <label>Name</label>
                <input value={editingClient.name} onChange={(event) => setEditingClient({ ...editingClient, name: event.target.value })} />
              </div>
              <div>
                <label>PAN</label>
                <input value={editingClient.pan} onChange={(event) => setEditingClient({ ...editingClient, pan: event.target.value.toUpperCase() })} maxLength={10} />
              </div>
              <div>
                <label>Balance</label>
                <input value={editingClient.balance} onChange={(event) => setEditingClient({ ...editingClient, balance: event.target.value })} type="number" />
              </div>
            </div>
            {editClientError && <div className="inline-message">{editClientError}</div>}
            <div className="modal-actions">
              <button className="secondary-action" onClick={() => setEditingClient(null)}>Cancel</button>
              <button className="primary-action compact" onClick={saveEditedClient}><Pencil size={18} /> Save changes</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Clients({ clients, setClients, upis, setUpis, onDeleteUpi }) {
  const [client, setClient] = useState({ name: "", pan: "", balance: "" });
  const [upi, setUpi] = useState("");
  const [clientError, setClientError] = useState("");

  function addClient() {
    const pan = client.pan.trim().toUpperCase();
    if (!client.name.trim() || !pan) {
      setClientError("Client name and PAN are required.");
      return;
    }
    if (!validatePAN(pan)) {
      setClientError("Enter a valid PAN like ABCDE1234F.");
      return;
    }
    if (clients.some((item) => item.pan === pan)) {
      setClientError("A client with this PAN already exists.");
      return;
    }

    setClients((items) => [{ id: uid(), ...client, name: client.name.trim(), pan, balance: Number(client.balance || 0) }, ...items]);
    setClient({ name: "", pan: "", balance: "" });
    setClientError("");
  }

  return (
    <section className="setup-page">
      <div className="setup-summary">
        <div><strong>{clients.length}</strong><span>Clients saved</span></div>
        <div><strong>{upis.length}</strong><span>UPI IDs</span></div>
        <div><strong>Rs {clients.reduce((sum, row) => sum + Number(row.balance || 0), 0).toLocaleString("en-IN")}</strong><span>Total balance</span></div>
      </div>
      <div className="panel setup-card add-client-card">
        <div className="panel-title">
          <div>
            <h3>Add client</h3>
            <span>Keep client identity and available balance ready for IPO applications.</span>
          </div>
        </div>
        <div className="setup-form-grid">
          <div>
            <label>Name</label>
            <input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} placeholder="Client name" />
          </div>
          <div>
            <label>PAN</label>
            <input value={client.pan} onChange={(e) => setClient({ ...client, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} />
          </div>
          <div className="wide-input">
            <label>Balance</label>
            <input value={client.balance} onChange={(e) => setClient({ ...client, balance: e.target.value })} type="number" placeholder="15000" />
          </div>
        </div>
        {clientError && <div className="inline-message">{clientError}</div>}
        <button className="primary-action" onClick={addClient}><Plus size={18} /> Add client</button>
      </div>
      <div className="panel setup-card upi-card">
        <div className="panel-title">
          <div>
            <h3>UPI IDs</h3>
            <span>Manage payment handles used while applying.</span>
          </div>
        </div>
        <div className="inline-form">
          <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" />
          <button onClick={() => { if (upi) setUpis((items) => [upi, ...items]); setUpi(""); }}><Plus size={18} /></button>
        </div>
        <div className="tag-list">
          {upis.map((item) => (
            <div className="upi-list-row" key={item}>
              <WalletCards size={18} />
              <strong>{item}</strong>
              <button
                aria-label={`Delete ${item}`}
                onClick={() => onDeleteUpi(item)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Holdings({ clients, ipos, holdings, onSaveHolding, onDeleteHolding }) {
  const emptyForm = { clientId: "", assetType: "share", ipoSource: "saved", ipoId: "", existingIpoName: "", shareName: "", amount: "", quantity: "", buyPrice: "", buyDate: dateInputValue(), status: "Holding", note: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const filteredHoldings = holdings.filter((holding) =>
    `${holding.clientName} ${holding.assetName || ""} ${holding.shareName || ""} ${holding.ipoName} ${holding.status} ${holding.note}`.toLowerCase().includes(query.toLowerCase())
  );
  const filteredIpoHoldings = filteredHoldings.filter((holding) => (holding.assetType || "ipo") === "ipo");
  const filteredShareHoldings = filteredHoldings.filter((holding) => holding.assetType === "share");
  const totalAmount = holdings.reduce((sum, holding) => sum + Number(holding.amount || 0), 0);
  const totalShares = holdings.reduce((sum, holding) => sum + Number(holding.quantity || 0), 0);
  const activeHoldings = holdings.filter((holding) => holding.status === "Holding").length;
  const uniqueClients = new Set(holdings.map((holding) => holding.clientId)).size;
  const selectedClient = clients.find((client) => client.id === form.clientId);
  const selectedIpo = ipos.find((ipo) => ipo.id === form.ipoId);
  const isShare = form.assetType === "share";
  const isExistingIpo = form.ipoSource === "existing";
  const isSavedIpo = form.assetType === "ipo" && form.ipoSource === "saved";
  const assetName = isShare ? form.shareName.trim() : (isExistingIpo ? form.existingIpoName.trim() : selectedIpo?.name);
  const assetId = isShare
    ? `share-${assetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    : (isExistingIpo ? `existing-${assetName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : selectedIpo?.id);
  const effectiveQuantity = isSavedIpo ? Number(selectedIpo?.shareCount || selectedIpo?.lotSize || 0) : Number(form.quantity || 0);
  const effectiveBuyPrice = isSavedIpo ? Number(selectedIpo?.maxPrice || 0) : Number(form.buyPrice || 0);
  const calculatedInvestment = effectiveQuantity * effectiveBuyPrice;
  const assetKindLabel = isShare ? "Share" : "IPO";
  const assetPlaceholder = isShare ? "No share selected" : "No IPO selected";

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
    setError("");
  }

  function saveHolding() {
    if (!selectedClient || !assetName) {
      setError("Select client and enter which share or IPO was bought.");
      return;
    }

    const quantity = effectiveQuantity;
    const buyPrice = effectiveBuyPrice;
    const amount = quantity > 0 && buyPrice > 0 ? quantity * buyPrice : Number(form.amount || 0);
    if (amount <= 0) {
      setError("Portfolio amount must be greater than zero.");
      return;
    }

    const existingHolding = !editingId
      ? holdings.find((holding) =>
          holdingKey(holding.clientId, holding.assetId || holding.ipoId, holding.assetName || holding.ipoName, holding.assetType || "ipo") === holdingKey(selectedClient.id, assetId, assetName, form.assetType)
        )
      : null;
    const previousAmount = Number(existingHolding?.amount || 0);
    const previousQuantity = Number(existingHolding?.quantity || 0);
    const totalHoldingAmount = editingId ? amount : previousAmount + amount;
    const totalHoldingQuantity = editingId ? quantity : previousQuantity + quantity;
    const purchase = {
      id: uid(),
      amount,
      quantity,
      buyPrice,
      boughtAt: form.buyDate || dateInputValue(),
      note: form.note.trim(),
    };

    onSaveHolding({
      id: editingId || existingHolding?.id || uid(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      assetType: form.assetType,
      assetId,
      assetName,
      ipoSource: form.ipoSource,
      ipoId: isShare ? "" : assetId,
      ipoName: assetName,
      isExistingIpo: !isShare && isExistingIpo,
      shareName: isShare ? assetName : "",
      amount: totalHoldingAmount,
      quantity: totalHoldingQuantity,
      buyPrice: buyPrice || (totalHoldingQuantity > 0 ? totalHoldingAmount / totalHoldingQuantity : 0),
      averagePrice: totalHoldingQuantity > 0 ? totalHoldingAmount / totalHoldingQuantity : buyPrice,
      status: form.status,
      note: form.note.trim(),
      purchases: editingId ? holdings.find((holding) => holding.id === editingId)?.purchases || [] : [...(existingHolding?.purchases || []), purchase],
      updatedAt: new Date().toISOString(),
      createdAt: editingId ? holdings.find((holding) => holding.id === editingId)?.createdAt : existingHolding?.createdAt || new Date().toISOString(),
    });
    resetForm();
  }

  function editHolding(holding) {
    setEditingId(holding.id);
    setForm({
      clientId: holding.clientId,
      assetType: holding.assetType || (holding.shareName ? "share" : "ipo"),
      ipoSource: holding.isExistingIpo ? "existing" : "saved",
      ipoId: holding.isExistingIpo ? "" : holding.ipoId,
      existingIpoName: holding.isExistingIpo ? holding.ipoName : "",
      shareName: holding.assetType === "share" ? (holding.shareName || holding.assetName || holding.ipoName) : "",
      amount: String(holding.amount || ""),
      quantity: String(holding.quantity || ""),
      buyPrice: String(holding.buyPrice || holding.averagePrice || ""),
      buyDate: holding.purchases?.at?.(-1)?.boughtAt || dateInputValue(),
      status: holding.status || "Holding",
      note: holding.note || "",
    });
    setError("");
  }

  return (
    <section className="holdings-page">
      <div className="holdings-summary">
        <Metric icon={WalletCards} label="Portfolio amount" value={`Rs ${totalAmount.toLocaleString("en-IN")}`} />
        <Metric icon={Building2} label="Active portfolio" value={activeHoldings} />
        <Metric icon={UserPlus} label="Portfolio clients" value={uniqueClients} />
        <Metric icon={BarChart3} label="Total shares" value={totalShares.toLocaleString("en-IN")} />
      </div>

      <div className="panel holdings-form-card">
        <div className="panel-title">
          <div>
            <h3>{editingId ? "Edit portfolio" : "Add portfolio"}</h3>
            <span>Select a client, add the share or IPO bought, and keep future buys in one portfolio.</span>
          </div>
        </div>
        <div className="portfolio-form-shell">
          <div className="portfolio-main-stack">
            <div className="portfolio-form-section client-picker">
              <span className="form-section-kicker">Client</span>
              <label>Client</label>
              <WorkspaceSelect
                value={form.clientId}
                placeholder="Select client"
                options={clients.map((client) => ({ value: client.id, label: `${client.name} (${client.pan})` }))}
                onChange={(clientId) => setForm({ ...form, clientId })}
              />
            </div>

            <div className="portfolio-form-section ipo-picker">
              <span className="form-section-kicker">Bought item</span>
              <div className="portfolio-source-tabs asset-type-tabs" role="tablist" aria-label="Bought item type">
                <button
                  className={form.assetType === "share" ? "active" : ""}
                  onClick={() => setForm({ ...form, assetType: "share", ipoId: "", existingIpoName: "" })}
                  type="button"
                >
                  Share
                </button>
                <button
                  className={form.assetType === "ipo" ? "active" : ""}
                  onClick={() => setForm({ ...form, assetType: "ipo", shareName: "" })}
                  type="button"
                >
                  IPO
                </button>
              </div>
              {isShare ? (
                <>
                  <label>Share / company name</label>
                  <input value={form.shareName} onChange={(event) => setForm({ ...form, shareName: event.target.value })} placeholder="Example: Reliance Industries" />
                </>
              ) : (
                <>
                  <div className="portfolio-source-tabs" role="tablist" aria-label="IPO source">
                    <button
                      className={form.ipoSource === "saved" ? "active" : ""}
                      onClick={() => setForm({ ...form, ipoSource: "saved", ipoId: "", existingIpoName: "", quantity: "", buyPrice: "" })}
                      type="button"
                    >
                      Saved IPO
                    </button>
                    <button
                      className={form.ipoSource === "existing" ? "active" : ""}
                      onClick={() => setForm({ ...form, ipoSource: "existing", ipoId: "", existingIpoName: "" })}
                      type="button"
                    >
                      Existing IPO
                    </button>
                  </div>
                  <label>{isExistingIpo ? "Existing IPO name" : "IPO name"}</label>
                  {isExistingIpo ? (
                    <input value={form.existingIpoName} onChange={(event) => setForm({ ...form, existingIpoName: event.target.value })} placeholder="Enter IPO name" />
                  ) : (
                    <div className="portfolio-ipo-select">
                      <WorkspaceSelect
                        value={form.ipoId}
                        placeholder="Select IPO"
                        options={ipos.map((ipo) => ({ value: ipo.id, label: `${ipo.name} - ${ipo.ipoType || "Mainboard"}` }))}
                        onChange={(ipoId) => setForm({ ...form, ipoId, quantity: "", buyPrice: "" })}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="portfolio-form-section details-picker">
            <span className="form-section-kicker">Buy details</span>
            <div className="portfolio-live-card">
              <div>
                <small>Selected</small>
                <strong>{selectedClient?.name || "No client"} - {assetName || assetPlaceholder}</strong>
              </div>
              <span>{assetKindLabel}</span>
            </div>
            <div className="portfolio-detail-grid">
              <div>
                <label>{isShare ? "Shares bought" : "IPO shares / quantity"}</label>
                <input
                  className={isSavedIpo ? "readonly-input" : ""}
                  value={isSavedIpo ? (selectedIpo?.shareCount || selectedIpo?.lotSize || "") : form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  readOnly={isSavedIpo}
                  type="number"
                  placeholder={isShare ? "70" : "Lot shares"}
                />
              </div>
              <div>
                <label>{isShare ? "Buy price" : "IPO price"}</label>
                <input
                  className={isSavedIpo ? "readonly-input" : ""}
                  value={isSavedIpo ? (selectedIpo?.maxPrice || "") : form.buyPrice}
                  onChange={(event) => setForm({ ...form, buyPrice: event.target.value })}
                  readOnly={isSavedIpo}
                  type="number"
                  placeholder={isShare ? "428" : "Max price"}
                />
              </div>
              <div>
                <label>{isShare ? "Investment amount" : "IPO investment"}</label>
                <input className="readonly-input" value={calculatedInvestment ? calculatedInvestment.toLocaleString("en-IN") : ""} readOnly placeholder="Auto calculated" />
              </div>
              <div>
                <label>{isShare ? "Buy date" : "Apply / buy date"}</label>
                <input value={form.buyDate} onChange={(event) => setForm({ ...form, buyDate: event.target.value })} type="date" />
              </div>
              <div>
                <label>Status</label>
                <WorkspaceSelect
                  value={form.status}
                  placeholder="Select status"
                  options={[
                    { value: "Holding", label: "Active" },
                    { value: "Released", label: "Released" },
                    { value: "Watchlist", label: "Watchlist" },
                  ]}
                  onChange={(status) => setForm({ ...form, status: status || "Holding" })}
                />
              </div>
              <div className="wide-input">
                <label>Note</label>
                <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Optional note" />
              </div>
            </div>
            {error && <div className="inline-message portfolio-error">{error}</div>}
            <div className="form-actions portfolio-actions">
              <button className="primary-action compact" onClick={saveHolding}>
                {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                {editingId ? "Update portfolio" : "Add portfolio"}
              </button>
              {editingId && <button className="secondary-action" onClick={resetForm}>Cancel</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="panel holdings-list-card">
        <div className="panel-title">
          <div>
            <h3>Portfolio records</h3>
            <span>{filteredHoldings.length} records</span>
          </div>
          <div className="holdings-search searchbox">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search portfolio" />
          </div>
        </div>
        <div className="portfolio-record-sections">
          <PortfolioRecordGroup
            title="IPO portfolio"
            count={filteredIpoHoldings.length}
            records={filteredIpoHoldings}
            emptyText="No IPO portfolio records."
            onEdit={editHolding}
            onDelete={onDeleteHolding}
          />
          <PortfolioRecordGroup
            title="Share holdings"
            count={filteredShareHoldings.length}
            records={filteredShareHoldings}
            emptyText="No share holdings."
            onEdit={editHolding}
            onDelete={onDeleteHolding}
          />
          {!filteredHoldings.length && <EmptyLine text={holdings.length ? "No portfolio record matched your search." : "No portfolio records added yet."} />}
        </div>
      </div>
    </section>
  );
}

function PortfolioRecordGroup({ title, count, records, emptyText, onEdit, onDelete }) {
  return (
    <section className="portfolio-record-group">
      <div className="portfolio-record-title">
        <h4>{title}</h4>
        <span>{count} records</span>
      </div>
      <div className="holding-list">
        {records.map((holding) => (
          <div className={`holding-row ${String(holding.status || "Holding").toLowerCase()}`} key={holding.id}>
            <div>
              <strong>{holding.clientName}</strong>
              <small>
                <b>{holding.assetType === "share" ? "Share" : "IPO"}</b> - {holding.assetName || holding.ipoName}
                {holding.isExistingIpo ? " - Existing IPO" : ""} - {holding.quantity ? `${holding.quantity} shares` : "Portfolio amount"}
              </small>
              <small>
                {Number(holding.averagePrice || holding.buyPrice || 0) > 0 ? `Avg Rs ${Number(holding.averagePrice || holding.buyPrice || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Avg price not set"}
                {Array.isArray(holding.purchases) && holding.purchases.length ? ` - ${holding.purchases.length} buy${holding.purchases.length > 1 ? "s" : ""}` : ""}
              </small>
            </div>
            <span className="holding-amount">Rs {Number(holding.amount || 0).toLocaleString("en-IN")}</span>
            <span className={`holding-status ${String(holding.status || "Holding").toLowerCase()}`}>{portfolioStatusLabel(holding.status)}</span>
            <div className="holding-actions">
              <button className="table-action icon-action" aria-label={`Edit ${holding.clientName} portfolio`} onClick={() => onEdit(holding)}>
                <Pencil size={15} />
              </button>
              <button className="row-delete" aria-label={`Delete ${holding.clientName} portfolio`} onClick={() => onDelete(holding.id)}>
                <Trash2 size={15} />
              </button>
            </div>
            {holding.note && <p>{holding.note}</p>}
          </div>
        ))}
        {!records.length && <EmptyLine text={emptyText} />}
      </div>
    </section>
  );
}

function ConfirmDeleteModal({ name, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-icon">
          <Trash2 size={22} />
        </div>
        <h3>Delete confirmation</h3>
        <p>Are you sure you want to delete <strong>{name}</strong>? </p>
        <div className="modal-actions">
          <button className="secondary-action" onClick={onCancel}>Cancel</button>
          <button className="danger-action" onClick={onConfirm}>
            <Trash2 size={17} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Analytics({ applications, clients, upis, ipos }) {
  const [allotmentIpoId, setAllotmentIpoId] = useState("all");
  const submittedByIpo = useMemo(() => {
    return ipos.map((ipo) => ({
      label: ipo.name,
      value: applications.filter((app) => app.ipoId === ipo.id).length,
    })).sort((a, b) => b.value - a.value);
  }, [applications, ipos]);
  const allottedCount = applications.filter((app) => app.isAllotted).length;
  const notAllottedCount = applications.length - allottedCount;
  const allotmentScopeApplications = allotmentIpoId === "all"
    ? applications
    : applications.filter((app) => app.ipoId === allotmentIpoId);
  const scopedAllottedCount = allotmentScopeApplications.filter((app) => app.isAllotted).length;
  const scopedNotAllottedCount = allotmentScopeApplications.length - scopedAllottedCount;
  const appliedClients = new Set(applications.map((app) => app.clientId)).size;
  const inactiveClients = Math.max(clients.length - appliedClients, 0);
  const allotmentRate = allotmentScopeApplications.length ? Math.round((scopedAllottedCount / allotmentScopeApplications.length) * 100) : 0;
  const coverageRate = clients.length ? Math.round((appliedClients / clients.length) * 100) : 0;
  const selectedAllotmentLabel = allotmentIpoId === "all" ? "All IPOs" : ipos.find((ipo) => ipo.id === allotmentIpoId)?.name || "Selected IPO";

  return (
    <section className="analytics-page">
      <div className="analytics-kpi-grid">
        <Metric icon={CheckCircle2} label="Applications" value={applications.length} />
        <Metric icon={ShieldCheck} label="Allotted" value={allottedCount} />
        <Metric icon={AlertCircle} label="Not allotted" value={notAllottedCount} />
        <Metric icon={UserPlus} label="Client coverage" value={`${coverageRate}%`} />
      </div>

      <div className="analytics-grid">
      <div className="panel analytics-main">
        <div className="panel-title"><h3>Applications by IPO</h3><span>{applications.length} submissions</span></div>
        <BarList data={submittedByIpo} />
      </div>

      <div className="panel analytics-side">
        <div className="panel-title"><h3>Allotment status</h3><span>{selectedAllotmentLabel}</span></div>
        <IpoSelect
          ipos={ipos}
          value={allotmentIpoId}
          selectedLabel={selectedAllotmentLabel}
          onChange={setAllotmentIpoId}
        />
        <div className="status-donut" style={{ "--rate": `${allotmentRate}%` }}>
          <div><strong>{allotmentRate}%</strong><span>success rate</span></div>
        </div>
        <div className="split-stats">
          <span><i className="green-dot" /> Allotted <strong>{scopedAllottedCount}</strong></span>
          <span><i className="red-dot" /> Pending / not allotted <strong>{scopedNotAllottedCount}</strong></span>
        </div>
      </div>

      <div className="panel analytics-summary">
        <div className="panel-title"><h3>Portfolio summary</h3><span>Current workspace</span></div>
        <div className="summary-grid">
          <Metric icon={Landmark} label="IPOs" value={ipos.length} slim />
          <Metric icon={UserPlus} label="Clients" value={clients.length} slim />
          <Metric icon={WalletCards} label="UPI IDs" value={upis.length} slim />
          <Metric icon={Building2} label="Inactive clients" value={inactiveClients} slim />
        </div>
      </div>
      </div>
    </section>
  );
}

function IpoSelect({ ipos, value, selectedLabel, onChange }) {
  const [open, setOpen] = useState(false);
  const options = [{ id: "all", name: "All IPOs" }, ...ipos];

  function choose(id) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className="custom-select">
      <button className={`custom-select-trigger ${open ? "open" : ""}`} onClick={() => setOpen((current) => !current)}>
        <span>{selectedLabel}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="custom-select-menu">
          {options.map((option) => (
            <button
              key={option.id}
              className={value === option.id ? "selected" : ""}
              onClick={() => choose(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceSelect({ value, placeholder, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  function choose(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className="custom-select workspace-select">
      <button className={`custom-select-trigger ${open ? "open" : ""}`} onClick={() => setOpen((current) => !current)}>
        <span className={!selected ? "select-placeholder" : ""}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="custom-select-menu workspace-select-menu">
          <button className={!value ? "selected" : ""} onClick={() => choose("")}>{placeholder}</button>
          {options.map((option) => (
            <button
              key={option.value}
              className={value === option.value ? "selected" : ""}
              onClick={() => choose(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BarList({ data, emptyText = "No analytics yet." }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (!data.length) return <EmptyLine text={emptyText} />;
  return (
    <div className="bar-list">
      {data.map((item) => (
        <div key={item.label}>
          <span>{item.label}<strong>{item.value}</strong></span>
          <div><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function Metric({ icon: Icon, label, value, slim }) {
  return (
    <article className={`metric ${slim ? "slim" : ""}`}>
      <Icon size={22} />
      <div><strong>{value}</strong><span>{label}</span></div>
    </article>
  );
}

function Notice({ children }) {
  return <div className="notice"><AlertCircle size={18} /> {children}</div>;
}

function EmptyLine({ text }) {
  return <div className="empty-line">{text}</div>;
}
