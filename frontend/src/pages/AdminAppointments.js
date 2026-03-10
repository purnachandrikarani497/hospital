import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import API from "../api";

export default function AdminAppointments() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setError("");
        const { data } = await API.get("/admin/appointments");
        setList(data || []);
      } catch (e) {
        if (e.message === 'canceled') return;
        setList([]);
        setError(e.response?.data?.message || e.message || "Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ordered = list.slice().sort((a, b) => {
      const d1 = new Date(`${a.date}T${a.startTime || '00:00'}:00`);
      const d2 = new Date(`${b.date}T${b.startTime || '00:00'}:00`);
      return d2 - d1;
    });
  const rows = ordered.length
    ? ordered.map((a, i) => (
        <tr key={a._id} className="border-t hover:bg-blue-50/40 transition-all duration-200 group">
          <td className="px-6 py-4 text-center text-slate-600 font-medium">{i + 1}</td>
          <td className="px-6 py-4">
            <span className="font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{a.patient?.name || "User"}</span>
          </td>
          <td className="px-6 py-4 text-capitalize font-medium text-slate-700">{a.patient?.gender || "--"}</td>
          <td className="px-6 py-4 text-center font-medium text-slate-700">{(() => {
            const p = a.patient || {};
            if (p.age !== undefined && p.age !== null && p.age !== "") return p.age;
            const pid = String(p._id || a.patient || "");
            const locAge = localStorage.getItem(`userAgeById_${pid}`) || "";
            if (locAge) return String(locAge);
            const dob = p.birthday || p.dob || p.dateOfBirth || localStorage.getItem(`userDobById_${pid}`) || "";
            if (!dob) return "";
            const b = new Date(dob);
            if (Number.isNaN(b.getTime())) return "";
            const today = new Date();
            let age = today.getFullYear() - b.getFullYear();
            const m = today.getMonth() - b.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
            return String(age);
          })()}</td>
          <td className="px-6 py-4 font-medium text-slate-700">{a.date} {a.startTime}</td>
          <td className="px-6 py-4 font-medium text-slate-700">
              {a.doctor && typeof a.doctor === 'object' ? a.doctor.name : (a.doctorName || "--")}
            </td>
          <td className="px-6 py-4 font-medium text-slate-700">₹{a.fee || 0}</td>
          <td className="px-6 py-4 text-center">
            <span className={`badge ${(() => {
              const s = String(a.status || '').toUpperCase();
              if (s === 'COMPLETED') return 'badge-completed';
              if (s === 'PENDING') return 'badge-busy';
              if (s === 'CANCELLED' || s === 'CANCELED') return 'badge-offline';
              if (s === 'CONFIRMED') return 'badge-confirmed';
              return 'badge-online';
            })()}`}>
              {a.status}
            </span>
          </td>
        </tr>
      ))
    : (
        <tr>
          <td colSpan={8} className="px-4 py-6 text-center text-slate-600">No appointments found</td>
        </tr>
      );

  const linkClass = (active) =>
    active
      ? "relative px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
      : "relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";

  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center justify-between h-16">
            {/* Enhanced Logo Section */}
            <Link to="/admin/dashboard" className="flex items-center gap-4 group hover:scale-105 transition-all duration-300">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-white/20">
                <div className="text-white">
                  <Logo size={20} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                  HospoZen
                </span>
              </div>
            </Link>

            {/* Enhanced Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-10">
              {(() => {
                const p = window.location.pathname;
                return (
                  <>
                    <Link to="/admin/dashboard" className={linkClass(p === "/admin/dashboard")}>
                      <span className="relative z-10">Dashboard</span>
                      {p === "/admin/dashboard" && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                    <Link to="/admin/appointments" className={linkClass(p.startsWith("/admin/appointments"))}>
                      <span className="relative z-10">Appointments</span>
                      {p.startsWith("/admin/appointments") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                    <Link to="/admin/add-doctor" className={linkClass(p.startsWith("/admin/add-doctor"))}>
                      <span className="relative z-10">Add Doctor</span>
                      {p.startsWith("/admin/add-doctor") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>

                    <Link to="/admin/specializations" className={linkClass(p.startsWith("/admin/specializations"))}>
                      <span className="relative z-10">Specializations</span>
                      {p.startsWith("/admin/specializations") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>

                    <Link to="/admin/doctors" className={linkClass(p.startsWith("/admin/doctors") && !p.startsWith("/admin/doctors/pending"))}>
                      <span className="relative z-10">Doctors List</span>
                      {(p.startsWith("/admin/doctors") && !p.startsWith("/admin/doctors/pending")) && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                  </>
                );
              })()}
            </nav>
            <div className="flex items-center space-x-4">
              {/* Enhanced Mobile Menu Button */}
              <button
                className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Logout Button */}
              <button
                onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
                className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
              >
                Logout
              </button>
            </div>
          </div>

              {/* Enhanced Mobile Menu */}
          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
              <div className="absolute top-16 left-0 right-0">
                <div className="mx-3 bg-white/98 backdrop-blur-md rounded-xl shadow-lg border border-blue-200/50 py-2" onClick={(e) => e.stopPropagation()}>
                  <nav className="flex flex-col space-y-2 px-3">
                    {[
                      { path: '/admin/dashboard', label: 'Dashboard' },
                      { path: '/admin/appointments', label: 'Appointments' },
                      { path: '/admin/add-doctor', label: 'Add Doctor' },
                      { path: '/admin/specializations', label: 'Specializations' },
                      { path: '/admin/doctors', label: 'Doctors List' }
                    ].map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                          window.location.pathname === item.path
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm'
                            : 'text-gray-700 hover:bg-blue-50/50 hover:text-blue-600'
                        }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      onClick={() => { localStorage.removeItem('token'); nav('/admin/login'); setMobileOpen(false); }}
                      className="px-3 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-blue-500 to-purple-600"
                    >Logout</button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
      <div className="pt-10 px-4 sm:px-6 page-gradient">
        <div className="relative max-w-7xl mx-auto">
          <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
          
          <div className="relative mb-10 text-center">
            <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
              All Appointments
              <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h2>
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="hidden sm:block overflow-x-auto max-h-[70vh] custom-scrollbar pr-1">
              <table className="min-w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-50 to-blue-50/50 text-slate-700 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-5 text-center font-bold uppercase tracking-wider text-[11px]">S.NO</th>
                    <th className="px-6 py-5 text-left font-bold uppercase tracking-wider text-[11px]">Patient Name</th>
                    <th className="px-6 py-5 text-left font-bold uppercase tracking-wider text-[11px]">Gender</th>
                    <th className="px-6 py-5 text-center font-bold uppercase tracking-wider text-[11px]">Age</th>
                    <th className="px-6 py-5 text-left font-bold uppercase tracking-wider text-[11px]">Date & Time</th>
                    <th className="px-6 py-5 text-left font-bold uppercase tracking-wider text-[11px]">Doctor</th>
                    <th className="px-6 py-5 text-left font-bold uppercase tracking-wider text-[11px]">Fee</th>
                    <th className="px-6 py-5 text-center font-bold uppercase tracking-wider text-[11px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-600">Loading...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-red-600">{error}</td>
                    </tr>
                  ) : (
                    rows
                  )}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-500 font-medium">Loading appointments...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500 font-medium bg-red-50/50">{error}</div>
              ) : (list.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-medium">No appointments found</div>
              ) : (
                list.map((a, i) => (
                  <div key={a._id || a.id} className="p-5 space-y-4 hover:bg-blue-50/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-bold text-base">{a.patient?.name || 'User'}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">S.NO: {i + 1}</span>
                      </div>
                      {(() => {
                        const s = String(a.status || "").toUpperCase();
                        let cls = "badge-online";
                        if (s === "COMPLETED") cls = "badge-completed";
                        else if (s === "PENDING") cls = "badge-busy";
                        else if (s === "CANCELLED" || s === "CANCELED") cls = "badge-offline";
                        else if (s === "CONFIRMED") cls = "badge-confirmed";
                        return <span className={`badge ${cls} scale-90`}>{a.status}</span>;
                      })()}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender / Age</div>
                        <div className="text-sm text-slate-700 font-semibold flex items-center gap-2">
                          <span className="text-capitalize">{a.patient?.gender || '--'}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span>{(() => {
                            const p = a.patient || {};
                            if (p.age !== undefined && p.age !== null && p.age !== "") return p.age;
                            const pid = String(p._id || a.patient || "");
                            const locAge = localStorage.getItem(`userAgeById_${pid}`) || "";
                            if (locAge) return String(locAge);
                            const dob = p.birthday || p.dob || p.dateOfBirth || localStorage.getItem(`userDobById_${pid}`) || "";
                            if (!dob) return "";
                            const b = new Date(dob);
                            if (Number.isNaN(b.getTime())) return "";
                            const today = new Date();
                            let age = today.getFullYear() - b.getFullYear();
                            const m = today.getMonth() - b.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
                            return String(age);
                          })()} Years</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fee</div>
                        <div className="text-sm text-blue-700 font-black">₹{a.fee || 0}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</div>
                        <div className="text-sm text-slate-700 font-semibold">{a.date} at {a.startTime}</div>
                      </div>
                      <div className="space-y-1 text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor</div>
                        <div className="text-sm text-slate-700 font-semibold truncate">{a.doctor?.name || '--'}</div>
                      </div>
                    </div>
                  </div>
                ))
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
