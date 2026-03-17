import { Link, useNavigate, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { useState } from "react";

export default function AdminHeader() {
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (active) =>
    active
      ? "relative px-3 py-2 text-blue-700 font-bold bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm whitespace-nowrap"
      : "relative px-3 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-xl hover:bg-blue-50/50 transition-all duration-300 hover:scale-105 whitespace-nowrap";

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", active: location.pathname === "/admin/dashboard" },
    { path: "/admin/appointments", label: "Appointments", active: location.pathname.startsWith("/admin/appointments") },
    { path: "/admin/add-doctor", label: "Add Doctor", active: location.pathname.startsWith("/admin/add-doctor") },
    { path: "/admin/specializations", label: "Specializations", active: location.pathname.startsWith("/admin/specializations") },
    { path: "/admin/doctors", label: "Doctors List", active: location.pathname.startsWith("/admin/doctors") && !location.pathname.startsWith("/admin/doctors/pending") },
    { path: "/admin/support", label: "Support", active: location.pathname.startsWith("/admin/support") },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-xl border-b border-blue-200/50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 relative">
        <div className="flex items-center h-16 gap-x-6">
          {/* Enhanced Logo Section */}
          <Link to="/admin/dashboard" className="flex items-center gap-2 group hover:scale-105 transition-all duration-300 flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 border-2 border-white/20">
              <div className="text-white">
                <Logo size={20} />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                HospoZen
              </span>
            </div>
          </Link>

          {/* Enhanced Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className={linkClass(item.active)}>
                <span className="relative z-10">{item.label}</span>
                {item.active && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl"></div>}
              </Link>
            ))}
          </nav>

          {/* Enhanced User Actions */}
          <div className="flex items-center space-x-4 ml-auto mr-2 sm:mr-4">
            {/* Enhanced Mobile Menu Button */}
            <button
              className="xl:hidden p-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 border border-gray-200 hover:border-blue-300"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
              className="hidden sm:inline-flex bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 border-2 border-white/20"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Enhanced Mobile Menu */}
        {mobileOpen && (
          <div className="xl:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
            <div className="absolute top-16 left-0 right-0">
              <div className="mx-3 bg-white/98 backdrop-blur-md rounded-xl shadow-lg border border-blue-200/50 py-2" onClick={(e) => e.stopPropagation()}>
                <nav className="flex flex-col space-y-2 px-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                        item.active
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
  );
}
