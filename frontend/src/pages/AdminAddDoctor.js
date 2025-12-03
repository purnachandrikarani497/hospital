import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import Logo from "../components/Logo";

export default function AdminAddDoctor() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specializations: "",
    clinic: "",
    city: "",
    address: "",
    fees: "",
    slotDurationMins: "15",
    experienceYears: "",
    about: "",
    password: "",
    photoBase64: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const onChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === "phone") v = String(value).replace(/\D/g, "").slice(0, 10);
    if (name === "fees" || name === "slotDurationMins" || name === "experienceYears") v = String(value).replace(/\D/g, "");
    setForm((f) => ({ ...f, [name]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || ""))) errs.email = "Enter a valid email";
    if (!/^[6-9]\d{9}$/.test(String(form.phone || ""))) errs.phone = "Phone must start 6-9 and be 10 digits";
    if (form.fees && !/^\d+$/.test(String(form.fees))) errs.fees = "Fees must be digits";
    if (form.slotDurationMins && !/^\d+$/.test(String(form.slotDurationMins))) errs.slot = "Slot must be digits";
    if (form.experienceYears && !/^\d+$/.test(String(form.experienceYears))) errs.exp = "Experience must be digits";
    const passOk = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/.test(String(form.password || ""));
    if (!passOk) errs.password = "Password 6-12 chars, letters & numbers";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        specializations: form.specializations,
        clinic: form.clinic,
        city: form.city,
        address: form.address,
        fees: form.fees,
        slotDurationMins: form.slotDurationMins,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        about: form.about,
        password: form.password,
        photoBase64: form.photoBase64,
      };
      await API.post("/admin/doctors", payload);
      alert("Doctor created successfully.");
      setForm({ name: "", email: "", phone: "", specializations: "", clinic: "", city: "", address: "", fees: "", slotDurationMins: "15", experienceYears: "", about: "", password: "", photoBase64: "" });
      nav("/admin/doctors");
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to create doctor");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-indigo-700">
            <Logo size={24} />
            <span className="font-semibold">HospoZen</span>
          </Link>
          <nav className="flex items-center gap-6 ml-6 text-slate-700">
            <Link to="/admin/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/admin/appointments" className="nav-link">Appointments</Link>
            <Link to="/admin/add-doctor" className="nav-link text-indigo-700 font-semibold">Add Doctor</Link>
            <Link to="/admin/doctors" className="nav-link">Doctors List</Link>
          </nav>
        </div>
        <button
          onClick={() => { localStorage.removeItem("token"); nav("/admin/login"); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full"
        >
          Logout
        </button>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <main className="col-span-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold">Add Doctor</h1>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-xl">
            <form onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input name="name" value={form.name} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-3" placeholder="Dr. John Doe" />

          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" name="email" value={form.email} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-1" placeholder="doctor@example.com" />
          {errors.email ? (<div className="text-red-600 text-xs mb-3">{errors.email}</div>) : (<div className="mb-3" />)}

          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input name="phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-1" placeholder="XXXXXXXXXX" />
          {errors.phone ? (<div className="text-red-600 text-xs mb-3">{errors.phone}</div>) : (<div className="mb-3" />)}

          <label className="block text-sm font-medium text-slate-700 mb-1">Specializations</label>
          {(() => {
            const SPECIALTIES = Array.from(new Set([
              "General Physician",
              "Gynecologist",
              "Dermatologist",
              "Pediatrician",
              "Neurologist",
              "Cardiologist",
              "Orthopedic Surgeon",
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
              "Physiotherapist"
            ]));
            return (
              <select
                defaultValue=""
                onChange={(e) => {
                  const val = e.target.value || "";
                  if (!val) return;
                  setForm((f) => ({
                    ...f,
                    specializations: f.specializations ? `${f.specializations}, ${val}` : val,
                  }));
                }}
                className="border border-slate-300 rounded-md p-2 w-full mb-2"
              >
                <option value="">Select specialization</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            );
          })()}
          <input name="specializations" value={form.specializations} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-3" placeholder="e.g., Cardiology, Dermatology" />

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clinic</label>
              <input name="clinic" value={form.clinic} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-3" placeholder="Clinic name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input name="city" value={form.city} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-3" placeholder="City" />
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea name="address" value={form.address} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-3" placeholder="Clinic address" rows={3} />

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Fees</label>
              <input name="fees" inputMode="numeric" value={form.fees} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-1" placeholder="e.g., 500" />
              {errors.fees ? (<div className="text-red-600 text-xs mb-3">{errors.fees}</div>) : (<div className="mb-3" />)}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slot Duration (mins)</label>
              <select
                name="slotDurationMins"
                value={form.slotDurationMins}
                onChange={onChange}
                className="border border-slate-300 rounded-md p-2 w-full mb-1"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
              </select>
              {errors.slot ? (<div className="text-red-600 text-xs mb-3">{errors.slot}</div>) : (<div className="mb-3" />)}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience (years)</label>
              <input name="experienceYears" inputMode="numeric" value={form.experienceYears} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-1" placeholder="e.g., 5" />
              {errors.exp ? (<div className="text-red-600 text-xs mb-3">{errors.exp}</div>) : (<div className="mb-3" />)}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative mb-1">
                <input name="password" type={showPass ? "text" : "password"} value={form.password} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full pr-10" placeholder="Set doctor password" />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600">{showPass ? "🙈" : "👁"}</button>
              </div>
              {errors.password ? (<div className="text-red-600 text-xs mb-3">{errors.password}</div>) : (<div className="mb-3" />)}
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-1">About</label>
          <textarea name="about" value={form.about} onChange={onChange} className="border border-slate-300 rounded-md p-2 w-full mb-3" placeholder="Short bio" rows={4} />

          <label className="block text-sm font-medium text-slate-700 mb-1">Upload Image</label>
          <input type="file" accept="image/*" className="border border-slate-300 rounded-md p-2 w-full mb-3" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              setForm((f) => ({ ...f, photoBase64: String(reader.result || "") }));
            };
            reader.readAsDataURL(file);
          }} />
          {form.photoBase64 && (
            <div className="mb-3">
              <img src={form.photoBase64} alt="Selected" className="w-full h-40 object-cover rounded-md border border-slate-200" />
            </div>
          )}

          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md">Create Doctor</button>
        </form>
          </div>
        </main>
      </div>
    </div>
  );
}
