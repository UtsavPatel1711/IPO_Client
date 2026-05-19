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
};

const retailAmount = (maxPrice, shareCount) => Number(maxPrice || 0) * Number(shareCount || 0);
const shniAmount = (maxPrice, shareCount) => retailAmount(maxPrice, shareCount) * 14;
const validatePAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan || "").trim().toUpperCase());
const clientInitials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL";

export default function LightIPO() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("ipo_light_user") || "null"));
  const [view, setView] = useState("dashboard");
  const [ipos, setIpos] = useState(() => JSON.parse(localStorage.getItem("ipo_light_ipos") || "[]"));
  const [clients, setClients] = useState(() => JSON.parse(localStorage.getItem("ipo_light_clients") || "null") || sampleClients);
  const [upis, setUpis] = useState(() => JSON.parse(localStorage.getItem("ipo_light_upis") || "null") || defaultUpis);
  const [applications, setApplications] = useState(() => JSON.parse(localStorage.getItem("ipo_light_applications") || "[]"));
  const [ipoQuery, setIpoQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    localStorage.setItem("ipo_light_ipos", JSON.stringify(ipos));
    localStorage.setItem("ipo_light_clients", JSON.stringify(clients));
    localStorage.setItem("ipo_light_upis", JSON.stringify(upis));
    localStorage.setItem("ipo_light_applications", JSON.stringify(applications));
    if (user?.email) {
      saveWorkspace({ email: user.email, ipos, clients, upis, applications }).catch(() => {});
    }
  }, [applications, clients, ipos, upis, user?.email]);

  async function handleAuth(authUser) {
    try {
      const workspace = await loadWorkspace(authUser.email);
      setIpos(Array.isArray(workspace.ipos) ? workspace.ipos : emptyWorkspace.ipos);
      setClients(Array.isArray(workspace.clients) ? workspace.clients : emptyWorkspace.clients);
      setUpis(Array.isArray(workspace.upis) ? workspace.upis : emptyWorkspace.upis);
      setApplications(Array.isArray(workspace.applications) ? workspace.applications : emptyWorkspace.applications);
    } catch {
      setIpos(emptyWorkspace.ipos);
      setClients(emptyWorkspace.clients);
      setUpis(emptyWorkspace.upis);
      setApplications(emptyWorkspace.applications);
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
    setIpos(emptyWorkspace.ipos);
    setClients(emptyWorkspace.clients);
    setUpis(emptyWorkspace.upis);
    setApplications(emptyWorkspace.applications);
    setUser(null);
  }

  function deleteApplication(applicationId) {
    setApplications((items) => items.filter((item) => item.id !== applicationId));
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
    setIpos((items) => items.filter((item) => item.id !== ipoId));
    setApplications((items) => items.filter((item) => item.ipoId !== ipoId));
  }

  function deleteClient(clientId) {
    setClients((items) => items.filter((item) => item.id !== clientId));
    setApplications((items) => items.filter((item) => item.clientId !== clientId));
  }

  function saveIpoRecord(ipoRecord) {
    setIpos((items) => {
      const exists = items.some((item) => item.id === ipoRecord.id);
      return exists ? items.map((item) => item.id === ipoRecord.id ? ipoRecord : item) : [ipoRecord, ...items];
    });
    setApplications((items) =>
      items.map((item) => item.ipoId === ipoRecord.id ? { ...item, ipoName: ipoRecord.name } : item)
    );
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
            onToggleAllotment={toggleApplicationAllotment}
          />
        )}
        {view === "clients" && <Clients clients={clients} setClients={setClients} upis={upis} setUpis={setUpis} />}
        {view === "analytics" && <Analytics applications={applications} clients={clients} upis={upis} ipos={ipos} />}
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
    analytics: "Analytics",
  };
  const subtitles = {
    dashboard: "Portfolio overview",
    ipos: "Manual IPO workspace",
    clientBook: "Client book workspace",
    clients: "Client and payment setup",
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
  const [form, setForm] = useState({ name: "", minPrice: "", maxPrice: "", shareCount: "" });
  const [editingIpoId, setEditingIpoId] = useState("");
  const [formError, setFormError] = useState("");

  const filtered = ipos.filter((ipo) => `${ipo.name} ${ipo.priceBand} ${ipo.shareCount}`.toLowerCase().includes(query.toLowerCase()));
  const previewRetail = retailAmount(form.maxPrice, form.shareCount);
  const previewShni = shniAmount(form.maxPrice, form.shareCount);

  function resetIpoForm() {
    setForm({ name: "", minPrice: "", maxPrice: "", shareCount: "" });
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
        <div className="table-row" key={ipo.id}>
          <div className="table-main">
          <span><strong>{ipo.name}</strong><small>{ipo.sector} · {ipo.exchange}</small></span>
          <span>Rs {ipo.priceBand}<small>{ipo.shareCount || ipo.lotSize} shares</small></span>
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
  const appliedClients = applications.filter((item) => item.ipoId === ipo.id);
  const appliedByUpi = appliedClients.reduce((groups, application) => {
    const key = application.upi || "No UPI";
    groups[key] = groups[key] ? [...groups[key], application] : [application];
    return groups;
  }, {});

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <h3>Applied clients - {ipo.name}</h3>
          <button className="icon-button" onClick={onClose}>x</button>
        </div>
        <div className="applied-list only-list">
          {appliedClients.length ? Object.entries(appliedByUpi).map(([upi, rows]) => (
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
          )) : <EmptyLine text="No client applied for this IPO yet." />}
        </div>
      </div>
    </div>
  );
}

function ClientBook({ clients, ipos, upis, applications, clientQuery, onApplyApplication, onDeleteApplication, onDeleteClient, onToggleAllotment }) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedIpoId, setSelectedIpoId] = useState("");
  const [selectedUpi, setSelectedUpi] = useState("");
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
            <select value={selectedIpoId} onChange={(event) => setSelectedIpoId(event.target.value)}>
              <option value="">Select IPO</option>
              {ipos.map((ipo) => <option key={ipo.id} value={ipo.id}>{ipo.name}</option>)}
            </select>
          </div>
          <div>
            <label>UPI ID</label>
            <select value={selectedUpi} onChange={(event) => setSelectedUpi(event.target.value)}>
              <option value="">Select UPI</option>
              {upis.map((upi) => <option key={upi} value={upi}>{upi}</option>)}
            </select>
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
    </section>
  );
}

function Clients({ clients, setClients, upis, setUpis }) {
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
              <button aria-label={`Delete ${item}`} onClick={() => setUpis((items) => items.filter((x) => x !== item))}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
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
