import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import Logo from "../components/Logo";

export default function AdminSpecializations() {
  const nav = useNavigate();
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/specializations/all");
      setSpecialties(data);
    } catch (e) {
      console.error("Failed to fetch specializations", e);
      alert("Failed to load specializations");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await API.post("/specializations", { name: newName.trim() });
      setNewName("");
      fetchSpecialties();
      alert("Specialization added successfully");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to add specialization");
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      await API.put(`/specializations/${id}`, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      fetchSpecialties();
      alert("Specialization updated successfully");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update specialization");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this specialization? This may affect doctors currently assigned to it.")) return;
    try {
      await API.delete(`/specializations/${id}`);
      fetchSpecialties();
      alert("Specialization deleted successfully");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete specialization");
    }
  };

  const linkClass = (active) =>
    active
      ? "relative px-4 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm"
      : "relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105";

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center justify-between h-16">
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

            <nav className="hidden lg:flex items-center space-x-10">
              <Link to="/admin/dashboard" className={linkClass(false)}>Dashboard</Link>
              <Link to="/admin/appointments" className={linkClass(false)}>Appointments</Link>
              <Link to="/admin/add-doctor" className={linkClass(false)}>Add Doctor</Link>
              <Link to="/admin/specializations" className={linkClass(true)}>Specializations</Link>
              <Link to="/admin/doctors" className={linkClass(false)}>Doctors List</Link>
            </nav>

            <div className="flex items-center space-x-4">
              <button
                className="lg:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
                className="hidden lg:inline-flex bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
              >
                Logout
              </button>
            </div>
          </div>
          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
              <div className="absolute top-16 left-0 right-0">
                <div className="mx-3 bg-white/98 backdrop-blur-md rounded-xl shadow-lg border border-blue-200/50 py-2" onClick={(e) => e.stopPropagation()}>
                  <nav className="flex flex-col space-y-2 px-3">
                    <Link to="/admin/dashboard" className="px-3 py-2 rounded-lg font-medium text-sm text-gray-700 hover:bg-blue-50">Dashboard</Link>
                    <Link to="/admin/appointments" className="px-3 py-2 rounded-lg font-medium text-sm text-gray-700 hover:bg-blue-50">Appointments</Link>
                    <Link to="/admin/add-doctor" className="px-3 py-2 rounded-lg font-medium text-sm text-gray-700 hover:bg-blue-50">Add Doctor</Link>
                    <Link to="/admin/specializations" className="px-3 py-2 rounded-lg font-medium text-sm bg-blue-50 text-blue-700">Specializations</Link>
                    <Link to="/admin/doctors" className="px-3 py-2 rounded-lg font-medium text-sm text-gray-700 hover:bg-blue-50">Doctors List</Link>
                    <button onClick={() => { localStorage.removeItem('token'); nav('/admin/login'); }} className="px-3 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-blue-500 to-purple-600">Logout</button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="pt-10 pb-12 px-4 max-w-4xl mx-auto animate-fade-in">
        <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
        <div className="relative mb-10 text-center">
          <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
            Manage Specializations
            <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
          </h2>
        </div>

        {/* Add New Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6 mb-8 hover:shadow-2xl transition-all duration-500">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Specialization</h2>
          <form onSubmit={handleAdd} className="flex gap-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter specialization name..."
              className="flex-1 p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition-all active:scale-95"
            >
              Add
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden transition-all duration-500">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Existing Specializations</h2>
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {specialties.length} Total
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
              {specialties.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No specializations found.</div>
              ) : (
                specialties.map((spec) => (
                  <div key={spec._id} className="p-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors group">
                    {editingId === spec._id ? (
                      <div className="flex-1 flex gap-3 animate-slide-in-right">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 p-2 border-2 border-blue-400 rounded-lg focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdate(spec._id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditName(""); }}
                          className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-lg font-medium text-slate-700">{spec.name}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          <button
                            onClick={() => { setEditingId(spec._id); setEditName(spec.name); }}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(spec._id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}