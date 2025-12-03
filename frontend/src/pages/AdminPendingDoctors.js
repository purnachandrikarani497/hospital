import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import Logo from "../components/Logo";

export default function AdminPendingDoctors() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setError("");
      const { data } = await API.get("/admin/pending-doctors");
      setList(data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Network Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    try {
      await API.post(`/admin/doctors/${id}/approve`);
      await load();
    } catch (e) { setError(e.response?.data?.message || e.message || "Network Error"); }
  };

  const reject = async (id) => {
    const reason = prompt("Enter rejection reason");
    try {
      await API.post(`/admin/doctors/${id}/reject`, { reason });
      await load();
    } catch (e) { setError(e.response?.data?.message || e.message || "Network Error"); }
  };

return (
  <div className="max-w-7xl mx-auto mt-8 px-4">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-indigo-700">
          <Logo size={24} />
          <span className="font-semibold">HospoZen</span>
        </Link>
        <nav className="flex items-center gap-6 ml-6 text-slate-700">
          <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/admin/appointments" className="nav-link">Appointments</Link>
          <Link to="/admin/add-doctor" className="nav-link">Add Doctor</Link>
          <Link to="/admin/doctors/pending" className="nav-link text-indigo-700 font-semibold">Approvals</Link>
          <Link to="/admin/doctors" className="nav-link">Doctors List</Link>
        </nav>
      </div>
      <button
        onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
        className="btn-gradient"
      >
        Logout
      </button>
    </div>
    <div className="grid grid-cols-12 gap-6">
      <main className="col-span-12 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-semibold">Pending Doctor Approvals</h2>
        </div>
        {error && <p className="text-red-600 mb-3">{error}</p>}
        {loading && <p className="text-slate-600">Loading...</p>}
        <div className="space-y-4">
          {list.map((row) => (
            <div key={row.user._id} className="glass-card p-4 card-hover">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{row.user.name}</div>
                  <div className="text-sm text-slate-600">{row.user.email}</div>
                </div>
                <div className="text-sm text-slate-700">Clinic: {row.profile?.clinic?.name || "--"}</div>
              </div>
              <div className="text-sm text-slate-700 mt-2">Specializations: {row.profile?.specializations?.join(", ") || "--"}</div>
              <div className="mt-3 flex gap-3">
                <button onClick={() => approve(row.user._id)} className="btn-gradient">Approve</button>
                <button onClick={() => reject(row.user._id)} className="btn-gradient" style={{ backgroundImage: 'linear-gradient(to right, #ef4444, #f97316)' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);
}
