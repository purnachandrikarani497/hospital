import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import API from "../api";

const SPECIALTIES = [
  "General Physician",
  "Dermatologist",
  "Gynecologist",
  "Pediatrician",
  "Orthopedic Surgeon",
  "Cardiologist",
  "Neurologist",
  "Gastroenterologist",
  "ENT Specialist",
  "Dentist",
  "Psychiatrist",
  "Diabetologist",
  "Endocrinologist",
  "Pulmonologist",
  "Nephrologist",
  "Urologist",
  "Ophthalmologist",
  "Oncologist",
  "Rheumatologist",
  "Physiotherapist",
];

export default function SearchDoctors() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState("");
  const CARD_FALLBACK = "";

  const getOnlineStatus = (id) => {
    const v = localStorage.getItem(`doctorOnlineById_${id}`);
    return v === "1";
  };
  const getBusyStatus = (id) => {
    const v = localStorage.getItem(`doctorBusyById_${id}`);
    return v === "1";
  };

  const photoOf = (d) => {
    let s = String(d?.photoBase64 || "").trim();
    if (!s) return "";
    if (s.startsWith("data:")) return s;
    if (s.startsWith("http")) return s;
    return `data:image/png;base64,${s}`;
  };

  const search = async () => {
    setError("");
    try {
      const { data } = await API.get("/doctors", { params: { q, specialization } });
      let items = Array.isArray(data) ? data : [];

      if (q && String(q).trim().length > 0) {
        const norm = String(q).trim().toLowerCase();
        items = items.filter((d) => {
          const name = String(d.user?.name || "").toLowerCase();
          const clinic = String(d.clinic?.name || "").toLowerCase();
          const specs = (d.specializations || []).map((s) => String(s).toLowerCase());
          return name.includes(norm) || clinic.includes(norm) || specs.some((s) => s.includes(norm));
        });
      }

      if (specialization) {
        const norm = specialization.trim().toLowerCase();
        const hasMatches = items.some((d) => (d.specializations || []).some((s) => String(s).toLowerCase().includes(norm)));
        if (!hasMatches) {
          const all = await API.get("/doctors");
          const arr = Array.isArray(all.data) ? all.data : [];
          items = arr.filter((d) => (d.specializations || []).some((s) => String(s).toLowerCase().includes(norm)));
        } else {
          items = items.filter((d) => (d.specializations || []).some((s) => String(s).toLowerCase().includes(norm)));
        }
      }

      setList(items);
    } catch (e) {
      setList([]);
      setError(e.response?.data?.message || e.message || "Network Error");
    }
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialization]);

  useEffect(() => {
    const t = setTimeout(() => { search(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const iv = setInterval(() => { search(); }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, specialization]);

  useEffect(() => {
    const cleanup = [];
    const initSocket = () => {
      const origin = String(API.defaults.baseURL || "").replace(/\/(api)?$/, "");
      const w = window;
      const onReady = () => {
        try {
          const socket = w.io ? w.io(origin, { transports: ["websocket", "polling"] }) : null;
          if (socket) {
            socket.on('doctor:status', (p) => {
              const did = String(p?.doctorId || "");
              if (!did) return;
              setList((prev) => prev.map((d) => (
                String(d?.user?._id || "") === did ? { ...d, isOnline: !!p.isOnline, isBusy: !!p.isBusy } : d
              )));
            });
            cleanup.push(() => { try { socket.close(); } catch(_) {} });
          }
        } catch (_) {}
      };
      if (!w.io) {
        const s = document.createElement('script');
        s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        s.onload = onReady;
        document.body.appendChild(s);
        cleanup.push(() => { try { document.body.removeChild(s); } catch(_) {} });
      } else {
        onReady();
      }
    };
    initSocket();
    return () => { cleanup.forEach((fn) => fn()); };
  }, []);

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto pt-8 px-4 animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link to="/admin/dashboard" className="flex items-center gap-2 text-indigo-700">
                <Logo size={28} />
                <span className="font-semibold">HospoZen</span>
              </Link>
              <nav className="flex items-center gap-6 ml-6 text-slate-700">
                <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/admin/appointments" className="nav-link">Appointments</Link>
                <Link to="/admin/add-doctor" className="nav-link">Add Doctor</Link>
                <Link to="/admin/doctors" className="nav-link text-indigo-700 font-semibold">Doctors List</Link>
              </nav>
            </div>
            <button
              onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
              className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Logout
            </button>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Doctors Management</h2>
            </div>
            {error && <div className="mb-6 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in shadow-lg">{error}</div>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {list.map((d, index) => (
                <div key={d._id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-zoom-in opacity-0" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}>
                  <div className="relative">
                    {photoOf(d) ? (
                      <img src={photoOf(d)} alt="Doctor" className="w-full h-64 object-cover hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center hover:scale-110 transition-transform duration-700">
                        <div className="text-6xl text-slate-400">👨‍⚕️</div>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.3}s`, animationFillMode: 'forwards' }}>
                      {(() => {
                        const online = typeof d.isOnline === 'boolean' ? d.isOnline : null;
                        const busy = typeof d.isBusy === 'boolean' ? d.isBusy : null;
                        if (online === null && busy === null) return null;
                        const cls = busy ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : (online ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-400 to-pink-500 text-white');
                        const txt = busy ? 'Busy' : (online ? 'Online' : 'Offline');
                        return <span className={`inline-block text-xs px-3 py-2 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform duration-300 ${cls}`}>{txt}</span>;
                      })()}
                    </div>
                  </div>
                  <div className="p-6 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.5}s`, animationFillMode: 'forwards' }}>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{`Dr. ${d.user?.name || ''}`}</h3>
                    <p className="text-sm text-indigo-600 font-medium mb-2">{(d.specializations && d.specializations[0]) || ""}</p>
                    {typeof d.consultationFees === 'number' && (
                      <div className="text-sm text-slate-600 font-semibold mb-3">Fee: <span className="text-green-600">₹{d.consultationFees}</span></div>
                    )}
                    <Link to={`/admin/doctors/${d.user._id}`} className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto pt-8 px-4 animate-fade-in">
        <h2 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-slide-in-right">Find Your Perfect Doctor</h2>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-6 mb-8 animate-slide-in-left opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Specialty</label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105"
              >
                <option value="">All Specialties</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Search Doctors</label>
              <div className="flex gap-3">
                <input
                  className="flex-1 p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105"
                  placeholder="Search by name, clinic, or specialization..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                />
                <button onClick={search} className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">Search</button>
                <button
                  onClick={() => { setQ(''); setSpecialization(''); search(); }}
                  className="px-6 py-3 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 font-semibold transition-all duration-300 hover:scale-105"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8">
          <main>
            {error && <div className="mb-6 text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in shadow-lg">{error}</div>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {list.map((d, index) => (
                <div key={d._id} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-500 animate-zoom-in opacity-0" style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}>
                  <div className="relative">
                    {photoOf(d) ? (
                      <img
                        src={photoOf(d)}
                        alt="Doctor"
                        className="w-full h-64 object-cover hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center hover:scale-110 transition-transform duration-700">
                        <div className="text-6xl text-slate-400">👨‍⚕️</div>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.3}s`, animationFillMode: 'forwards' }}>
                      {(() => {
                        const online = typeof d.isOnline === 'boolean' ? d.isOnline : null;
                        const busy = typeof d.isBusy === 'boolean' ? d.isBusy : null;
                        if (online === null && busy === null) return null;
                        const cls = busy ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : (online ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-red-400 to-pink-500 text-white');
                        const txt = busy ? 'Busy' : (online ? 'Online' : 'Offline');
                        return <span className={`inline-block text-xs px-3 py-2 rounded-full font-semibold shadow-lg hover:scale-105 transition-transform duration-300 ${cls}`}>{txt}</span>;
                      })()}
                    </div>
                  </div>
                  <div className="p-6 animate-fade-in" style={{ animationDelay: `${index * 0.1 + 0.5}s`, animationFillMode: 'forwards' }}>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{`Dr. ${d.user?.name || ''}`}</h3>
                    <p className="text-sm text-indigo-600 font-medium mb-2">{(d.specializations && d.specializations[0]) || ""}</p>
                    {typeof d.consultationFees === 'number' && (
                      <div className="text-sm text-slate-600 font-semibold mb-3">Consultation Fee: <span className="text-green-600">₹{d.consultationFees}</span></div>
                    )}
                    <Link to={`/doctor/${d.user._id}`} className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      View Profile
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
