import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import AdminHeader from "../components/AdminHeader";

export default function AdminPendingDoctors() {
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
      if (e.message === 'canceled') return;
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
    } catch (e) {
      if (e.message === 'canceled') return;
      setError(e.response?.data?.message || e.message || "Network Error");
    }
  };

  const reject = async (id) => {
    const reason = prompt("Enter rejection reason");
    try {
      await API.post(`/admin/doctors/${id}/reject`, { reason });
      await load();
    } catch (e) {
      if (e.message === 'canceled') return;
      setError(e.response?.data?.message || e.message || "Network Error");
    }
  };

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="pt-24 px-4 sm:px-6 page-gradient">
        <div className="max-w-7xl mx-auto relative">
          <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
          <div className="relative mb-10 text-center">
            <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
              Pending Doctor Approvals
              <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h2>
          </div>
          {error && <p className="text-red-600 mb-3">{error}</p>}
          {loading && <p className="text-slate-600">Loading...</p>}
          <div className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
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
        </div>
      </div>
    </div>
);
}
