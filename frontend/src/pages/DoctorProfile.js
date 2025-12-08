import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import Logo from "../components/Logo";

export default function DoctorProfile() {
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const linkClass = (active) =>
    active
      ? "relative px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
      : "relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";
  const [online, setOnline] = useState(() => {
    const uid = localStorage.getItem("userId") || "";
    const byId = uid ? localStorage.getItem(`doctorOnlineById_${uid}`) : null;
    if (byId !== null) return byId === "1";
    const v = localStorage.getItem("doctorOnline");
    return v === null ? true : v === "1";
  });
  const [busy, setBusy] = useState(() => {
    const uid = localStorage.getItem("userId") || "";
    const byId = uid ? localStorage.getItem(`doctorBusyById_${uid}`) : null;
    return byId === "1";
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelItems, setPanelItems] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelUnread, setPanelUnread] = useState(0);
  const [bellCount, setBellCount] = useState(0);
  
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    specializations: "",
    clinicName: "",
    clinicAddress: "",
    clinicCity: "",
    consultationFees: "",
    slotDurationMins: ""
  });

  useEffect(() => {
    const load = async () => {
      const id = localStorage.getItem("userId");
      if (!id) return;
      
      try {
        const { data } = await API.get("/doctors", { params: { user: id } });
        const p = data?.[0] || null;
        setProfile(p);
        const onlineById = localStorage.getItem(`doctorOnlineById_${id}`);
        const busyById = localStorage.getItem(`doctorBusyById_${id}`);
        if (onlineById !== null) setOnline(onlineById === "1");
        else if (typeof p?.isOnline === 'boolean') setOnline(!!p.isOnline);
        if (busyById !== null) setBusy(busyById === "1");
        else if (typeof p?.isBusy === 'boolean') setBusy(!!p.isBusy);
      } catch (e) {}
      
    };
    load();
  }, []);

  useEffect(() => {
    try {
      const chan = new BroadcastChannel('doctorStatus');
      const my = localStorage.getItem('userId') || '';
      chan.onmessage = (e) => {
        const { uid, online: on, busy: bz } = e.data || {};
        if (!uid || uid === my) {
          if (typeof on === 'boolean') {
            setOnline(on);
            localStorage.setItem(`doctorOnlineById_${my}`, on ? '1' : '0');
          }
          if (typeof bz === 'boolean') {
            setBusy(bz);
            localStorage.setItem(`doctorBusyById_${my}`, bz ? '1' : '0');
          }
        }
      };
      return () => { try { chan.close(); } catch(_) {} };
    } catch(_) {}
  }, []);

  useEffect(() => {
    localStorage.setItem("doctorOnline", online ? "1" : "0");
    const id = localStorage.getItem("userId");
    if (id) localStorage.setItem(`doctorOnlineById_${id}`, online ? "1" : "0");
  }, [online]);
  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) localStorage.setItem(`doctorBusyById_${id}`, busy ? "1" : "0");
  }, [busy]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get('/notifications', { params: { unread: 1 } });
        const items = Array.isArray(data) ? data : [];
        const unread = items.filter((x) => !x.read).length;
        setBellCount(unread);
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    const refreshStatus = async () => {
      try {
        const id = localStorage.getItem('userId') || '';
        if (!id) return;
        const onLS = localStorage.getItem(`doctorOnlineById_${id}`);
        const bzLS = localStorage.getItem(`doctorBusyById_${id}`);
        if (onLS !== null) setOnline(onLS === '1');
        if (bzLS !== null) setBusy(bzLS === '1');
        const { data } = await API.get('/doctors', { params: { user: id } });
        const p = Array.isArray(data) ? data[0] : null;
        if (p && typeof p.isOnline === 'boolean') setOnline(!!p.isOnline);
        if (p && typeof p.isBusy === 'boolean') setBusy(!!p.isBusy);
      } catch(_) {}
    };
    const onFocus = () => { refreshStatus(); };
    const onVis = () => { if (document.visibilityState === 'visible') refreshStatus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(refreshStatus, 8000);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, []);

  const setStatus = async (status) => {
    const uid = localStorage.getItem("userId") || "";
    if (status === "online") {
      localStorage.setItem(`doctorOnlineById_${uid}`, "1");
      localStorage.setItem(`doctorBusyById_${uid}`, "0");
      setOnline(true);
      setBusy(false);
      try { await API.put('/doctors/me/status', { isOnline: true, isBusy: false }); } catch (_) {}
      try { const chan = new BroadcastChannel('doctorStatus'); chan.postMessage({ uid, online: true, busy: false }); chan.close(); } catch(_) {}
    } else if (status === "offline") {
      localStorage.setItem(`doctorOnlineById_${uid}`, "0");
      localStorage.setItem(`doctorBusyById_${uid}`, "0");
      setOnline(false);
      setBusy(false);
      try { await API.put('/doctors/me/status', { isOnline: false, isBusy: false }); } catch (_) {}
      try { const chan = new BroadcastChannel('doctorStatus'); chan.postMessage({ uid, online: false, busy: false }); chan.close(); } catch(_) {}
    } else {
      localStorage.setItem(`doctorBusyById_${uid}`, "1");
      localStorage.setItem(`doctorOnlineById_${uid}`, "1");
      setOnline(true);
      setBusy(true);
      try { await API.put('/doctors/me/status', { isOnline: true, isBusy: true }); } catch (_) {}
      try { const chan = new BroadcastChannel('doctorStatus'); chan.postMessage({ uid, online: true, busy: true }); chan.close(); } catch(_) {}
    }
  };

  

  const name = profile?.user?.name || "";
  const specs = (profile?.specializations || []).join(", ");
  const about = profile?.about || "";
  const fee = profile?.consultationFees ?? "";
  const address = profile?.clinic?.address || "";
  const city = profile?.clinic?.city || "";

  const startEdit = () => {
    setError("");
    setForm({
      specializations: (profile?.specializations || []).join(", "),
      clinicName: profile?.clinic?.name || "",
      clinicAddress: profile?.clinic?.address || "",
      clinicCity: profile?.clinic?.city || "",
      consultationFees: String(profile?.consultationFees ?? ""),
      slotDurationMins: String(profile?.slotDurationMins ?? "")
    });
    setEditing(true);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === 'consultationFees' || name === 'slotDurationMins') {
      const digits = String(value || '').replace(/\D/g, '');
      setForm((f) => ({ ...f, [name]: digits }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        specializations: String(form.specializations || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        clinic: {
          name: form.clinicName || "",
          address: form.clinicAddress || "",
          city: form.clinicCity || ""
        },
        consultationFees: form.consultationFees ? Number(form.consultationFees) : undefined,
        slotDurationMins: form.slotDurationMins ? Number(form.slotDurationMins) : undefined
      };
      const { data } = await API.post("/doctors/me", payload);
      setProfile(data);
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-16 page-gradient">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/doctor/dashboard" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-white/20">
                  <div className="text-white">
                    <Logo size={20} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    HospoZen
                  </span>
                </div>
              </Link>
            </div>
            <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center space-x-10">
              {(() => {
                const p = window.location.pathname;
                return (
                  <>
                    <Link to="/doctor/dashboard" className={linkClass(p === "/doctor/dashboard")}>
                      <span className="relative z-10">Dashboard</span>
                      {p === "/doctor/dashboard" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                    <Link to="/doctor/appointments" className={linkClass(p.startsWith("/doctor/appointments"))}>
                      <span className="relative z-10">Appointments</span>
                      {p.startsWith("/doctor/appointments") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                    <Link to="/doctor/profile" className={linkClass(p.startsWith("/doctor/profile"))}>
                      <span className="relative z-10">Profile</span>
                      {p.startsWith("/doctor/profile") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                  </>
                );
              })()}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                onClick={() => setPanelOpen((v) => !v)}
                title="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => { localStorage.removeItem("token"); nav("/doctor/login"); }}
                className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      {panelOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setPanelOpen(false)}>
          <div className="absolute top-16 left-0 right-0">
            <div className="mx-3 bg-white/98 backdrop-blur-md rounded-xl shadow-lg border border-blue-200/50 py-2" onClick={(e) => e.stopPropagation()}>
              <nav className="flex flex-col space-y-2 px-3">
                <Link to="/doctor/dashboard" className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-blue-50">Dashboard</Link>
                <Link to="/doctor/appointments" className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-blue-50">Appointments</Link>
                <Link to="/doctor/profile" className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-blue-50">Profile</Link>
                <button
                  onClick={() => { localStorage.removeItem('token'); nav('/doctor/login'); }}
                  className="px-3 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-blue-500 to-purple-600"
                >Logout</button>
              </nav>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-12 gap-6">
        <main className="col-span-12">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Doctor Profile</h1>
          </div>

          <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-500">
                  {String(profile?.photoBase64 || "").startsWith("data:image") ? (
                    <img src={profile?.photoBase64} alt="Doctor" className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-xl border-2 border-indigo-200 mx-auto" />
                  ) : (
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto">
                      <div className="text-6xl text-slate-400">👤</div>
                    </div>
                  )}
                  <div className="text-center mt-4">
                    <div className="text-2xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-800 bg-clip-text text-transparent">{name}</div>
                    <div className="text-sm text-slate-600">{specs}</div>
                    
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-500">
                  <div className="text-xl font-bold text-slate-800 mb-4">Doctor Information</div>
                  <div className="space-y-3 text-sm">
                    <p className="text-slate-700">{about}</p>
                    {fee !== "" && (<div className="text-slate-700">Appointment Fee: <span className="font-medium">₹{fee}</span></div>)}
                  </div>
                </div>
                <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-500">
                  <div className="text-xl font-bold text-slate-800 mb-4">Clinic Details</div>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div> Address: <div className="whitespace-pre-wrap text-slate-700 font-medium">{address}</div></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 21.5l-7-7a4.95 4.95 0 117-7l7 7a4.95 4.95 0 11-7 7z" />
                      </svg>
                      <div> City: <span className="text-slate-700 font-medium">{city}</span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-center">
                  <button onClick={startEdit} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300">Edit</button>
                </div>
              </div>
            </div>
          </div>

          {editing && (
            <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-8">
              <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
              {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}
              <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Specializations</label>
                  <input name="specializations" value={form.specializations} onChange={onChange} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300" placeholder="e.g., Cardiology, Dermatology" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Clinic Name</label>
                  <input name="clinicName" value={form.clinicName} onChange={onChange} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                  <input name="clinicCity" value={form.clinicCity} onChange={onChange} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                  <input name="clinicAddress" value={form.clinicAddress} onChange={onChange} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Consultation Fees</label>
                  <input inputMode="numeric" name="consultationFees" value={form.consultationFees} onChange={onChange} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Slot Duration (mins)</label>
                  <select name="slotDurationMins" value={form.slotDurationMins} onChange={onChange} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300">
                    <option value="">Select</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex gap-3 mt-2">
                  <button disabled={saving} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all">{saving ? "Saving..." : "Save"}</button>
                  <button type="button" onClick={() => setEditing(false)} className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all">Cancel</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
