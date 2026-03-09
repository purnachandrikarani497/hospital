import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import API from "../api";

export default function AdminDashboard() {
  const nav = useNavigate();
  const [doctorCount, setDoctorCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [supportRequests, setSupportRequests] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: stats } = await API.get("/stats");
        setDoctorCount(stats.doctors || 0);
        setAppointmentCount(stats.appointments || 0);
        setPatientCount(stats.patients || 0);

        try {
          const s = await API.get("/support/admin");
          setSupportRequests(Array.isArray(s.data) ? s.data : []);
        } catch (_) {}
      } catch (e) {}
    };
    load();
  }, []);

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
                    <Link to="/admin/support" className={linkClass(p.startsWith("/admin/support"))}>
                      <span className="relative z-10">Support</span>
                      {p.startsWith("/admin/support") && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
                    </Link>
                  </>
                );
              })()}
            </nav>

            {/* Enhanced User Actions */}
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
                      { path: '/admin/doctors', label: 'Doctors List' },
                      { path: '/admin/support', label: 'Support' }
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
              Admin Dashboard
              <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h2>
          </div>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[160px] glass-card p-6 rounded-2xl card-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center animate-pulse">👨‍⚕️</div>
                  <div className="text-sm text-slate-600">Doctors</div>
                </div>
                <div className="text-2xl font-semibold animate-pulse">{doctorCount}</div>
              </div>
            </div>
            <div className="relative flex-1 min-w-[160px] glass-card p-6 rounded-2xl card-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center animate-pulse">📅</div>
                  <div className="text-sm text-slate-600">Appointments</div>
                </div>
                <div className="text-2xl font-semibold animate-pulse">{appointmentCount}</div>
              </div>
            </div>
            <div className="relative flex-1 min-w-[160px] glass-card p-6 rounded-2xl card-hover">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center animate-pulse">👥</div>
                  <div className="text-sm text-slate-600">Patients</div>
                </div>
                <div className="text-2xl font-semibold animate-pulse">{patientCount}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-10">
            {/* Support Requests */}
            <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-900 font-bold">Support Requests</div>
                <div className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">NEW</div>
              </div>
              {supportRequests && supportRequests.length ? (
                <div className="divide-y divide-slate-100">
                  {supportRequests.map((s) => (
                    <div key={s._id} className="flex items-center justify-between py-3 transition-all duration-300 hover:bg-slate-50/50 rounded-xl px-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-slate-900 text-sm font-bold">{s.name}</div>
                          <div className="text-indigo-600 text-xs font-bold">{s.phone}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-500 text-[10px] mb-1">{new Date(s.createdAt).toLocaleDateString()}</div>
                        <select
                          value={s.status}
                          onChange={async (e) => {
                            try {
                              const newStatus = e.target.value;
                              await API.put(`/support/admin/${s._id}`, { status: newStatus });
                              setSupportRequests(prev => prev.map(item => item._id === s._id ? { ...item, status: newStatus } : item));
                            } catch (_) {}
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full outline-none appearance-none cursor-pointer text-center ${
                            s.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            s.status === 'contacted' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          <option value="pending">PENDING</option>
                          <option value="contacted">CONTACTED</option>
                          <option value="resolved">RESOLVED</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-sm py-8 text-center">No support requests</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
