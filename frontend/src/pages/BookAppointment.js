import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

export default function BookAppointment() {
  const { id } = useParams();  // doctorId
  const nav = useNavigate();
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [type, setType] = useState("offline");
  const [beneficiaryType, setBeneficiaryType] = useState("self");
  const [beneficiaryName, setBeneficiaryName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) nav("/login");
  }, [nav]);

  // Load available time slots
  const loadSlots = async () => {
    if (!date) {
      alert("Select date first");
      return;
    }

    const res = await API.get(`/appointments/slots/${id}`, {
      params: { date },
    });

    setSlots(res.data || []);
  };

  // Book appointment
  const bookSlot = async (slot) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { nav("/login"); return; }
      const { data } = await API.post("/appointments", {
        doctorId: id,
        date,
        startTime: slot.start,
        endTime: slot.end,
        type,
        beneficiaryType,
        beneficiaryName: beneficiaryType === "family" ? beneficiaryName : undefined,
      });

      nav(`/pay/${data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-20 px-4">
      <div className="max-w-xl w-full bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/40 animate-fade-in">
        <div className="relative mb-10 text-center">
          <h1 className="inline-block px-8 py-3 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
            Book Appointment
            <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
          </h1>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Select Date</label>
            <input
              type="date"
              className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 outline-none text-slate-700 font-medium"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Consultation Type</label>
            <select
              className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 outline-none text-slate-700 font-medium cursor-pointer"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="offline">Clinic Visit</option>
              <option value="online">Online Consultation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Who is this for?</label>
            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="beneficiary"
                  className="w-5 h-5 text-indigo-600 border-2 border-slate-300 focus:ring-indigo-500 transition-all duration-300"
                  checked={beneficiaryType === "self"}
                  onChange={() => setBeneficiaryType("self")}
                />
                <span className="text-slate-700 font-semibold group-hover:text-indigo-600 transition-colors">Self</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="beneficiary"
                  className="w-5 h-5 text-indigo-600 border-2 border-slate-300 focus:ring-indigo-500 transition-all duration-300"
                  checked={beneficiaryType === "family"}
                  onChange={() => setBeneficiaryType("family")}
                />
                <span className="text-slate-700 font-semibold group-hover:text-indigo-600 transition-colors">Family Member</span>
              </label>
            </div>
            {beneficiaryType === "family" && (
              <input
                className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50/50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 outline-none text-slate-700 font-medium animate-slide-in-up"
                placeholder="Enter family member's full name"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
              />
            )}
          </div>

          <button
            onClick={loadSlots}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] transform active:scale-95"
          >
            Show Available Slots
          </button>

          <div className="mt-8">
            {slots.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <span className="text-4xl block mb-2">📅</span>
                <p className="text-slate-500 font-medium">Select a date to see available time slots</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 animate-fade-in">
                {slots.map((slot) => (
                  <button
                    key={`${slot.start}-${slot.end}`}
                    onClick={() => bookSlot(slot)}
                    className="p-4 border-2 border-slate-100 rounded-2xl bg-white hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 font-bold transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                  >
                    {slot.start} - {slot.end}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
