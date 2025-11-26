import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import DoctorLogin from "./pages/DoctorLogin";
import Register from "./pages/Register";
 
import DoctorDetails from "./pages/DoctorDetails";
import Payment from "./pages/Payment";
import DoctorToday from "./pages/DoctorToday";
import DoctorDashboard from "./pages/DoctorDashboard";
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
  const hideHeader = location.pathname.startsWith('/admin') || location.pathname.startsWith('/doctor') || location.pathname.startsWith('/prescription');
  const token = localStorage.getItem('token');
  const uid = localStorage.getItem('userId');
  const photo = uid ? localStorage.getItem(`userPhotoBase64ById_${uid}`) : '';
  const showAdminLink = !token && !location.pathname.startsWith('/login');
  if (hideHeader) return null;
  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-indigo-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="#0EA5E9"/>
              <path d="M12 7v10M7 12h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
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
            <div className="relative">
              {photo ? (
                <img
                  src={photo}
                  alt="User"
                  className="h-9 w-9 rounded-full object-cover border border-slate-300 cursor-pointer"
                  onClick={() => setOpen((v) => !v)}
                />
              ) : (
                <div
                  className="h-9 w-9 rounded-full border border-slate-300 bg-white cursor-pointer"
                  onClick={() => setOpen((v) => !v)}
                />
              )}
              {open && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-md shadow-md text-sm">
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
<Route path="/admin/login" element={<AdminLogin />} />
<Route path="/login" element={<Login />} />
<Route path="/doctor/login" element={<DoctorLogin />} />
<Route path="/register" element={<Register />} />
<Route path="/search" element={<SearchDoctors />} />
<Route path="/doctor/:id" element={<DoctorDetails />} />
        <Route path="/book/:id" element={<Navigate to="/search" />} />
        <Route path="/pay/:id" element={<Payment />} />
        <Route path="/doctor/today" element={<DoctorToday />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/prescription/:id" element={<Prescription />} />
        <Route path="/admin/doctors/pending" element={<AdminPendingDoctors />} />
        <Route path="/admin" element={<AdminLogin />} />
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
