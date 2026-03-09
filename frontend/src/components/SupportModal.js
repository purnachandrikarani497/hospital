import { useState } from "react";
import API from "../api";

export default function SupportModal({ isOpen, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/support", { name, phone });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setName("");
        setPhone("");
      }, 2000);
    } catch (error) {
      alert("Failed to send support request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full relative animate-zoom-in transform transition-all sm:my-8">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10 p-2 rounded-full hover:bg-gray-100"
          aria-label="Close modal"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left Side: Content */}
          <div className="flex-1 p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight mb-4">
              Have Questions?
            </h2>
            <p className="text-slate-600 mb-8 text-lg">
              Share your details and our team will reach out to you shortly.
            </p>

            {success ? (
              <div className="bg-green-100 text-green-700 p-6 rounded-2xl font-bold text-center animate-bounce text-xl">
                Request sent! We'll call you soon.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name*"
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 text-slate-800 font-semibold text-lg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number*"
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 text-slate-800 font-semibold text-lg"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                >
                  {loading ? "Sending..." : "Submit"}
                </button>
              </form>
            )}
          </div>

          {/* Right Side: Image */}
          <div className="hidden md:block w-2/5 bg-indigo-600 relative overflow-hidden rounded-l-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-600/30"></div>
            <img
              src="https://img.freepik.com/free-photo/smiling-doctor-with-strethoscope-isolated-on-grey_651396-974.jpg"
              alt="Support Doctor"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute top-6 right-6 bg-white/90 p-3 rounded-xl shadow-lg">
                <div className="w-8 h-8 text-indigo-600">
                    <svg fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/></svg>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
