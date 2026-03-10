import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import AdminHeader from "../components/AdminHeader";

export default function AdminDashboard() {
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

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="pt-24 px-4 sm:px-6 page-gradient">
        <div className="relative max-w-7xl mx-auto">
          <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
          
          <div className="relative mb-10 text-center">
            <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
              Admin Dashboard
              <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h2>
          </div>
          <div className="flex flex-wrap gap-4 mb-6">
            <Link to="/admin/doctors" className="relative flex-1 min-w-[160px] glass-card p-6 rounded-2xl card-hover">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <span className="text-2xl">👨‍⚕️</span>
                </div>
                <div>
                  <div className="text-slate-500 text-sm">Doctors</div>
                  <div className="text-2xl font-bold text-slate-900">{doctorCount || 0}</div>
                </div>
              </div>
            </Link>
            <Link to="/admin/appointments" className="relative flex-1 min-w-[160px] glass-card p-6 rounded-2xl card-hover">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <div className="text-slate-500 text-sm">Appointments</div>
                  <div className="text-2xl font-bold text-slate-900">{appointmentCount || 0}</div>
                </div>
              </div>
            </Link>
            <Link to="/admin/dashboard" className="relative flex-1 min-w-[160px] glass-card p-6 rounded-2xl card-hover">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <div className="text-slate-500 text-sm">Patients</div>
                  <div className="text-2xl font-bold text-slate-900">{patientCount || 0}</div>
                </div>
              </div>
            </Link>
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
