import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../api";
import AdminHeader from "../components/AdminHeader";

export default function AdminEditDoctor() {
  const { id } = useParams();
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
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpecialties();
    fetchDoctor();
  }, [id]);

  const fetchSpecialties = async () => {
    try {
      const { data } = await API.get("/specializations");
      setSpecialties(data);
    } catch (e) {
      console.error("Failed to fetch specializations", e);
    }
  };

  const fetchDoctor = async () => {
    try {
      const { data } = await API.get(`/doctors`, { params: { user: id } });
      const doctor = data[0];
      if (doctor) {
        setForm({
          name: doctor.user.name || "",
          email: doctor.user.email || "",
          phone: doctor.user.phone || "",
          specializations: Array.isArray(doctor.specializations) ? doctor.specializations.join(", ") : doctor.specializations || "",
          clinic: doctor.clinic?.name || "",
          city: doctor.clinic?.city || "",
          address: doctor.clinic?.address || "",
          fees: doctor.consultationFees?.toString() || "",
          slotDurationMins: doctor.slotDurationMins?.toString() || "15",
          experienceYears: doctor.experienceYears?.toString() || "",
          about: doctor.about || "",
          password: "", // Don't fetch password
          photoBase64: doctor.photoBase64 || "",
        });
      }
    } catch (e) {
      console.error("Failed to fetch doctor details", e);
      alert("Failed to load doctor details");
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "email") {
      processedValue = value.replace(/\s/g, "").toLowerCase();
    } else if (name === "name" || name === "clinic" || name === "city") {
      if (processedValue.startsWith(" ")) processedValue = processedValue.trimStart();
      const regex = /^[a-zA-Z\s_]*$/;
      if (!regex.test(processedValue)) {
        processedValue = processedValue.replace(/[^a-zA-Z\s_]/g, "");
      }
    } else if (name !== "address" && name !== "about") {
      if (processedValue.startsWith(" ")) processedValue = processedValue.trimStart();
    }

    if (name === "phone") processedValue = String(processedValue).replace(/\D/g, "").slice(0, 10);
    if (name === "fees") processedValue = String(processedValue).replace(/\D/g, "").slice(0, 4);
    if (name === "experienceYears") processedValue = String(processedValue).replace(/\D/g, "").slice(0, 2);
    if (name === "slotDurationMins") processedValue = String(processedValue).replace(/\D/g, "");
    
    setForm((f) => ({ ...f, [name]: processedValue }));
  };

  const onBlur = (e) => {
    const { name, value } = e.target;
    if (value.endsWith(" ")) {
      setForm((f) => ({ ...f, [name]: value.trim() }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    const trimmedForm = {};
    Object.keys(form).forEach(key => {
      trimmedForm[key] = typeof form[key] === 'string' ? form[key].trim() : form[key];
    });

    if (!trimmedForm.name) { alert("Please enter Full Name"); return; }
    if (!trimmedForm.email) { alert("Please enter Email"); return; }
    const emailRegex = /^[a-z0-9._%+-]+@(gmail\.com|hms\.com)$/;
    if (!emailRegex.test(trimmedForm.email)) {
      alert("Please enter a valid lowercase email ending with @gmail.com or @hms.com");
      return;
    }

    if (!trimmedForm.phone) { alert("Please enter Phone Number"); return; }
    if (!trimmedForm.specializations) { alert("Please enter Specializations"); return; }

    const enteredSpecs = trimmedForm.specializations.split(",").map(s => s.trim()).filter(s => s !== "");
    const invalidSpecs = enteredSpecs.filter(s => !specialties.includes(s));
    if (invalidSpecs.length > 0) {
      alert(`Specialization is not in the list: ${invalidSpecs.join(", ")}`);
      return;
    }

    if (!trimmedForm.clinic) { alert("Please enter Clinic Name"); return; }
    if (!trimmedForm.city) { alert("Please enter City"); return; }
    if (!trimmedForm.address) { alert("Please enter Clinic Address"); return; }
    if (!trimmedForm.fees) { alert("Please enter Consultation Fees"); return; }
    if (!trimmedForm.experienceYears) { alert("Please enter Experience (years)"); return; }

    if (!/^[6-9]\d{9}$/.test(String(trimmedForm.phone))) errs.phone = "Phone must start 6-9 and be 10 digits";
    if (trimmedForm.password && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/.test(String(trimmedForm.password))) {
      errs.password = "Password 6-12 chars, letters & numbers";
    }

    setErrors(errs);
    if (Object.keys(errs).length) {
      alert(Object.values(errs)[0]);
      return;
    }

    try {
      await API.put(`/admin/doctors/${id}`, trimmedForm);
      alert("Doctor updated successfully.");
      nav(`/admin/doctors/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to update doctor");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="pt-24 page-gradient">
        <div className="relative max-w-7xl mx-auto px-4 animate-fade-in">
          <div className="absolute inset-x-0 -top-6 h-20 bg-gradient-to-r from-indigo-100 via-purple-100 to-blue-100 blur-xl opacity-70 rounded-full pointer-events-none"></div>
          
          <div className="relative mb-10 text-center">
            <button 
              onClick={() => nav(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/90 backdrop-blur-sm border-2 border-slate-100 text-slate-600 hover:text-indigo-600 hover:border-indigo-500 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 group"
              aria-label="Go Back"
            >
              <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h2 className="inline-block px-8 py-3 text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
              Edit Doctor
              <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
            </h2>
          </div>
          <div className="mx-auto max-w-2xl bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-6 animate-slide-in-left opacity-0 hover:scale-105 hover:shadow-2xl transition-all duration-500" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            <form onSubmit={submit}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input name="name" maxLength={50} value={form.name} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-3" placeholder="Dr. John Doe" />

              <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" maxLength={100} value={form.email} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-1" placeholder="doctor@example.com" />
              {errors.email ? (<div className="text-red-600 text-xs mb-3">{errors.email}</div>) : (<div className="mb-3" />)}

              <label className="block text-sm font-medium text-slate-700 mb-1">Phone <span className="text-red-500">*</span></label>
              <input name="phone" inputMode="numeric" maxLength={10} value={form.phone} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-1" placeholder="XXXXXXXXXX" />
              {errors.phone ? (<div className="text-red-600 text-xs mb-3">{errors.phone}</div>) : (<div className="mb-3" />)}

              <label className="block text-sm font-medium text-slate-700 mb-1">Specializations <span className="text-red-500">*</span></label>
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const currentSpecs = form.specializations ? form.specializations.split(",").map(s => s.trim()) : [];
                  if (currentSpecs.includes(val)) {
                    alert("This specialization is already added to the doctor.");
                    return;
                  }
                  setForm((f) => ({
                    ...f,
                    specializations: f.specializations ? `${f.specializations}, ${val}` : val,
                  }));
                }}
                className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-2"
              >
                <option value="">Select specialization</option>
                {specialties.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input name="specializations" maxLength={100} value={form.specializations} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-3" placeholder="e.g., Cardiology, Dermatology" />

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Clinic <span className="text-red-500">*</span></label>
                  <input name="clinic" maxLength={100} value={form.clinic} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-3" placeholder="Clinic name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
                  <input name="city" maxLength={50} value={form.city} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-3" placeholder="City" />
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-red-500">*</span></label>
              <textarea name="address" maxLength={150} value={form.address} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-3" placeholder="Clinic address" rows={3} />

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Fees <span className="text-red-500">*</span></label>
                  <input name="fees" inputMode="numeric" maxLength={4} value={form.fees} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-1" placeholder="e.g., 500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slot Duration (mins) <span className="text-red-500">*</span></label>
                  <select name="slotDurationMins" value={form.slotDurationMins} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-1">
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Experience (years) <span className="text-red-500">*</span></label>
                  <input name="experienceYears" inputMode="numeric" maxLength={2} value={form.experienceYears} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-3" placeholder="e.g., 5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password (Leave blank to keep same)</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.976 9.976 0 012.146-3.581M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-1 mt-3">About</label>
              <textarea name="about" maxLength={350} value={form.about} onChange={onChange} onBlur={onBlur} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 mb-3" placeholder="Tell us about the doctor..." rows={4} />

              <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Base64)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setForm((f) => ({ ...f, photoBase64: reader.result }));
                    reader.readAsDataURL(file);
                  }
                }}
                className="w-full p-2 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mb-6"
              />

              <button type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                Update Doctor Profile
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
