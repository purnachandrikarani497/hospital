import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import Logo from "./components/Logo";
import API from "./api";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import DoctorLogin from "./pages/DoctorLogin";
import Register from "./pages/Register";
 
import DoctorDetails from "./pages/DoctorDetails";
import Payment from "./pages/Payment";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorToday from "./pages/DoctorToday";
import DoctorProfile from "./pages/DoctorProfile";
import Prescription from "./pages/Prescription";
import AdminPendingDoctors from "./pages/AdminPendingDoctors";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAppointments from "./pages/AdminAppointments";
import AdminAddDoctor from "./pages/AdminAddDoctor";
import SearchDoctors from "./pages/SearchDoctors";
import Profile from "./pages/Profile";
import Appointments from "./pages/Appointments";


function Header() {
  const location = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(() => {
    try { return Number(localStorage.getItem('patientBellCount') || 0) || 0; } catch(_) { return 0; }
  });
  const [notifs, setNotifs] = useState([]);
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('seenNotifIds') || '[]')); } catch(_) { return new Set(); }
  });
  const [muteUntil, setMuteUntil] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelItems, setPanelItems] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelUnread, setPanelUnread] = useState(0);
  const hideHeader = location.pathname.startsWith('/admin') || location.pathname.startsWith('/doctor') || location.pathname.startsWith('/prescription');
  const token = localStorage.getItem('token');
  const uid = localStorage.getItem('userId');
  const photo = uid ? localStorage.getItem(`userPhotoBase64ById_${uid}`) : '';
  const userName = uid ? localStorage.getItem(`userNameById_${uid}`) || '' : '';
  const showAdminLink = false; // Hide admin button as login is unified
  useEffect(() => {
    (async () => {
      try {
        if (!token) return;
        const { data } = await API.get('/notifications', { params: { unread: 1 } });
        const items = Array.isArray(data) ? data : [];
        const unread = items.filter((x) => !x.read).length;
        setBell(unread);
        try { localStorage.setItem('patientBellCount', String(unread)); } catch(_) {}
      } catch (_) {}
    })();
    try {
      const chan = new BroadcastChannel('chatmsg');
      const onMsg = (e) => {
        try {
          const { apptId, actor } = e.data || {};
          if (String(actor || '').toLowerCase() !== 'doctor') return;
          setBell((c) => {
            const next = c + 1;
            try { localStorage.setItem('patientBellCount', String(next)); } catch(_) {}
            return next;
          });
          try { localStorage.setItem('lastChatApptId', String(apptId || '')); } catch(_) {}
        } catch(_) {}
      };
      chan.onmessage = onMsg;
      return () => { try { chan.close(); } catch(_) {} };
    } catch(_) {}
  }, [token]);
  useEffect(() => {
    const origin = String(API.defaults.baseURL || '').replace(/\/(api)?$/, '');
    const w = window;
    const cleanup = [];
    const onReady = () => {
      try {
        const socket = w.io ? w.io(origin, { transports: ['websocket','polling'], auth: { token: localStorage.getItem('token') || '' } }) : null;
        if (socket) {
          socket.on('notify', (p) => {
            try {
              if (Date.now() < muteUntil) return;
              const id = String(Date.now()) + String(Math.random());
              const text = p?.message || '';
              const link = p?.link || '';
              const type = p?.type || 'general';
              const apptId = p?.apptId ? String(p.apptId) : '';
              try {
                if (p?.type === 'chat' && p?.apptId) localStorage.setItem('lastChatApptId', String(p.apptId));
              } catch(_) {}
              try {
                const sid = String(p?.id || '');
                if (sid) {
                  setSeenIds((prev) => {
                    const next = new Set(prev);
                    next.add(sid);
                    try { localStorage.setItem('seenNotifIds', JSON.stringify(Array.from(next))); } catch(_) {}
                    return next;
                  });
                }
              } catch(_) {}
              setBell((c) => {
                const next = c + 1;
                try { localStorage.setItem('patientBellCount', String(next)); } catch(_) {}
                return next;
              });
              setNotifs((prev) => [{ id, text, link, type, apptId }, ...prev].slice(0, 4));
              setTimeout(() => { setNotifs((prev) => prev.filter((n) => n.id !== id)); }, 6000);
              if (panelOpen) {
                const item = { _id: p?.id || String(Date.now()), id: p?.id || String(Date.now()), message: text, link, type, createdAt: new Date().toISOString(), read: false, apptId };
                setPanelItems((prev) => {
                  const exists = prev.some((x) => String(x._id || x.id) === String(item._id || item.id));
                  if (exists) return prev;
                  return [item, ...prev].slice(0, 100);
                });
                setPanelUnread((c) => c + 1);
              }
            } catch (_) {}
          });
          cleanup.push(() => { try { socket.close(); } catch(_) {} });
        }
      } catch (_) {}
    };
    if (!token) return () => {};
    if (!w.io) {
      const s = document.createElement('script');
      s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
      s.onload = onReady;
      document.body.appendChild(s);
      cleanup.push(() => { try { document.body.removeChild(s); } catch(_) {} });
    } else {
      onReady();
    }
    return () => { cleanup.forEach((fn) => fn()); };
  }, [token]);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        if (!token) return;
        const { data } = await API.get('/notifications', { params: { unread: 1 } });
        const items = Array.isArray(data) ? data : [];
        items.forEach((n) => {
          const sid = String(n._id || n.id || '');
          if (!sid || seenIds.has(sid)) return;
          const id = String(Date.now()) + String(Math.random());
          const text = n.message || '';
          const link = n.link || '';
          const type = n.type || 'general';
          const apptId = n.apptId ? String(n.apptId) : '';
          setNotifs((prev) => [{ id, text, link, type, apptId }, ...prev].slice(0, 4));
          setTimeout(() => { setNotifs((prev) => prev.filter((x) => x.id !== id)); }, 6000);
          setSeenIds((prev) => {
            const next = new Set(prev); next.add(sid);
            try { localStorage.setItem('seenNotifIds', JSON.stringify(Array.from(next))); } catch(_) {}
            return next;
          });
        });
      } catch(_) {}
    }, 15000);
    return () => clearInterval(t);
  }, [token, seenIds]);
  if (hideHeader) return null;
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-indigo-700">
            <Logo size={28} />
            <span className="text-lg font-semibold">HospoZen</span>
          </Link>
          <nav className="flex items-center gap-6 text-slate-700">
            <Link to="/" className="hover:text-indigo-600">Home</Link>
            <Link to="/search" className="hover:text-indigo-600">All Doctors</Link>
            <Link to="/about" className="hover:text-indigo-600">About</Link>
            <Link to="/contact" className="hover:text-indigo-600">Contact</Link>
            {showAdminLink && <Link to="/admin/login" className="hover:text-indigo-600">Admin</Link>}
          </nav>
          {token ? (
            <div className="relative flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    setPanelOpen((v) => !v);
                    if (!panelOpen) {
                      setPanelLoading(true);
                      const { data } = await API.get('/notifications');
                      const items = Array.isArray(data) ? data : [];
                      setPanelItems(items);
                      const unread = items.filter((x) => !x.read).length;
                      setPanelUnread(unread);
                      setBell(unread);
                      try { localStorage.setItem('patientBellCount', String(unread)); } catch(_) {}
                      setPanelLoading(false);
                    }
                  } catch (_) { setPanelLoading(false); }
                }}
                className="relative h-9 w-9 rounded-full border border-slate-300 flex items-center justify-center"
                title="Notifications"
              >
                <span role="img" aria-label="bell">🔔</span>
                {bell > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">{bell}</span>
                )}
              </button>
              {panelOpen && (
                <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
                  <div className="bg-indigo-700 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
                    <div className="font-semibold">Your Notifications</div>
                    <div className="text-xs bg-green-500 text-white rounded-full px-2 py-0.5">{panelUnread} New</div>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-between border-b">
                    <button onClick={() => nav('/appointments?alertChat=1')} className="text-indigo-700 text-sm">View All</button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={async () => {
                          try { await API.delete('/notifications'); setPanelItems([]); setPanelUnread(0); setBell(0); localStorage.setItem('patientBellCount','0'); } catch(_) {}
                        }}
                        className="text-white bg-indigo-700 rounded-md px-2 py-1 text-xs"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {panelLoading ? (
                      <div className="p-4 text-sm text-slate-600">Loading…</div>
                    ) : panelItems.length === 0 ? (
                      <div className="p-4 text-sm text-slate-600">No notifications</div>
                    ) : (
                      panelItems.map((n) => (
                        <div key={n._id || n.id} className="px-4 py-3 border-b hover:bg-slate-50">
                          <div className="flex items-start justify-between">
                            <button
                              onClick={async () => {
                                try {
                                  if (n.type === 'chat' && n.apptId) localStorage.setItem('lastChatApptId', String(n.apptId)); if (n.type === 'chat' && (!n.link || !n.link.includes('alertChat=1'))) {
                                    const msg = String(n.message || n.text || '').toLowerCase();
                                    const extra = msg.includes('report uploaded') ? '&view=reports' : '';
                                    nav(`/appointments?alertChat=1${extra}`);
                                  } else if (n.type === 'meet' && n.apptId) {
                                    nav(`/appointments?joinMeet=${encodeURIComponent(String(n.apptId))}`);
                                  } else if (n.type === 'appointment') {
                                    nav('/appointments');
                                  } else if (n.link) {
                                    nav(n.link);
                                  }
                                  setPanelOpen(false);
                                  try { await API.put(`/notifications/${n._id || n.id}/read`); } catch(_) {}
                                  setPanelItems((prev) => prev.map((x) => (String(x._id || x.id) === String(n._id || n.id) ? { ...x, read: true } : x)));
                                  setPanelUnread((c) => Math.max(0, c - 1));
                                  setBell((c) => Math.max(0, c - 1));
                                  try { localStorage.setItem('patientBellCount', String(Math.max(0, Number(localStorage.getItem('patientBellCount') || '0') - 1))); } catch(_) {}
                                } catch(_) {}
                              }}
                              className="text-left text-sm text-slate-900"
                            >
                              {n.message}
                            </button>
                            {!n.read && (
                              <button onClick={async () => { try { await API.put(`/notifications/${n._id || n.id}/read`); setPanelItems((prev) => prev.map((x) => (String(x._id || x.id) === String(n._id || n.id) ? { ...x, read: true } : x))); setPanelUnread((c) => Math.max(0, c - 1)); } catch(_) {} }} className="text-xs text-slate-600">Mark As Read</button>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              <div className="fixed right-4 top-4 z-50 space-y-2">
                {notifs.map((n) => (
                  <button key={n.id} onClick={() => { try { if (n.type === 'chat' && n.apptId) localStorage.setItem('lastChatApptId', String(n.apptId)); if (n.type === 'chat' && (!n.link || !n.link.includes('alertChat=1'))) { const msg = String(n.text || n.message || '').toLowerCase(); const extra = msg.includes('report uploaded') ? '&view=reports' : ''; nav(`/appointments?alertChat=1${extra}`); } else if (n.type === 'meet' && n.apptId) { nav(`/appointments?joinMeet=${encodeURIComponent(String(n.apptId))}`); } else if (n.type === 'appointment') { nav('/appointments'); } else if (n.link) { nav(n.link); } } catch(_) {} setNotifs((prev) => prev.filter((x) => x.id !== n.id)); }} className="flex items-center gap-2 bg-white shadow-lg border border-amber-200 rounded-lg px-3 py-2 cursor-pointer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2a7 7 0 00-7 7v3l-2 3h18l-2-3V9a7 7 0 00-7-7zm0 20a3 3 0 003-3H9a3 3 0 003 3z" fill="#F59E0B"/>
                    </svg>
                    <div className="text-sm text-slate-900">{n.text}</div>
                  </button>
                ))}
              </div>
              {photo ? (
                <img
                  src={photo}
                  alt="User"
                  className="h-9 w-9 rounded-full object-cover border border-slate-300 cursor-pointer"
                  onClick={() => setOpen((v) => !v)}
                />
              ) : (
                <button
                  className="h-9 w-9 rounded-full border border-slate-300 bg-white cursor-pointer flex items-center justify-center text-slate-700 font-semibold"
                  onClick={() => setOpen((v) => !v)}
                  title={userName || 'Profile'}
                >
                  {(userName || '').trim().slice(0,1).toUpperCase() || 'M'}
                </button>
              )}
              {open && (
                <div className="absolute right-0 top-12 w-48 bg-white border border-slate-200 rounded-lg shadow-lg text-sm z-50">
                  <Link to="/profile" className="block px-3 py-2 hover:bg-slate-50">My Profile</Link>
                  <Link to="/appointments" className="block px-3 py-2 hover:bg-slate-50">My Appointments</Link>
                  <Link to="/appointments?view=prescriptions" className="block px-3 py-2 hover:bg-slate-50">Prescriptions</Link>
                  <button
                    onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('userId'); nav('/login'); }}
                    className="block w-full text-left px-3 py-2 hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full">Create Account</Link>
          )}
        </div>
      </div>
    </header>
  );
}

function App() {
return (
<BrowserRouter>
<Header />


<div className="p-6 bg-slate-50 min-h-screen">
<Routes>
<Route path="/" element={<Home />} />
<Route path="/about" element={<About />} />
<Route path="/contact" element={<Contact />} />
<Route path="/admin/login" element={<Navigate to="/login" />} />
<Route path="/login" element={<Login />} />
<Route path="/doctor/login" element={<Navigate to="/login" />} />
<Route path="/register" element={<Register />} />
<Route path="/search" element={<SearchDoctors />} />
        <Route path="/doctor/:id" element={<DoctorDetails />} />
        <Route path="/admin/doctors/:id" element={<DoctorDetails />} />
        <Route path="/book/:id" element={<Navigate to="/search" />} />
        <Route path="/pay/:id" element={<Payment />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/appointments" element={<DoctorToday />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/prescription/:id" element={<Prescription />} />
        <Route path="/admin/doctors/pending" element={<AdminPendingDoctors />} />
        <Route path="/admin" element={<Navigate to="/login" />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />
        <Route path="/admin/add-doctor" element={<AdminAddDoctor />} />
        <Route path="/admin/doctors" element={<SearchDoctors />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/appointments" element={<Appointments />} />
</Routes>
</div>
</BrowserRouter>
);
}
export default App;
