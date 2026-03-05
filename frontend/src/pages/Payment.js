import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";

export default function Payment() {
  const { id } = useParams();
  const nav = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [includeServiceFee, setIncludeServiceFee] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await API.get("/appointments/mine");
      const found = (data || []).find(a => String(a._id || a.id) === String(id));
      setAppt(found || null);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (window.Razorpay) { setSdkReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => setSdkReady(true);
    s.onerror = () => setSdkReady(false);
    document.body.appendChild(s);
  }, []);

  const pay = async () => {
    if (!appt) return;
    setLoading(true);

    const base = Number(appt.fee || 0);
    const extra = includeServiceFee ? 20 : 0;
    const totalAmount = base + extra;

    // Handle 0 amount payment
    if (totalAmount <= 0) {
      try {
        await API.post(`/appointments/${id}/pay`, { razorpayPaymentId: "free_appointment" });
        alert("Appointment confirmed.");
        nav("/appointments");
      } catch (err) {
        alert(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    const key = (localStorage.getItem('razorpay_key_id') || process.env.REACT_APP_RAZORPAY_KEY_ID || process.env.REACT_APP_RAZORPAY_KEY || "").trim() || "rzp_test_1DP5mmOlF5G5ag";
    if (!sdkReady || !window.Razorpay) {
      alert("Payment system not ready. Please try again.");
      setLoading(false);
      return;
    }
    const amount = totalAmount * 100;
    const options = {
      key,
      amount,
      currency: "INR",
      name: "HospoZen",
      description: `Appointment with ${appt.doctor?.name || "Doctor"}`,
      handler: async (response) => {
        try {
          await API.post(`/appointments/${id}/pay`, { razorpayPaymentId: response.razorpay_payment_id });
          alert("Payment successful. Appointment confirmed.");
          nav("/appointments");
        } catch (err) {
          alert(err.response?.data?.message || err.message);
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: localStorage.getItem(`userNameById_${localStorage.getItem("userId")}`) || "",
        email: localStorage.getItem(`userEmailById_${localStorage.getItem("userId")}`) || "",
        contact: localStorage.getItem(`userPhoneById_${localStorage.getItem("userId")}`) || "",
      },
      theme: { color: "#4F46E5" },
      modal: { ondismiss: () => setLoading(false) }
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => {
      alert("Payment failed. Please try again.");
      setLoading(false);
    });
    rzp.open();
  };

  return (
  <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-8">
    <div className="relative mb-10 text-center">
      <h1 className="inline-block px-8 py-3 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
        Complete Payment
        <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
      </h1>
    </div>
      {!appt && <p>Loading appointment...</p>}
      {appt && (
        <div className="mb-4 text-slate-700">
          <p className="mb-1">Doctor: {appt.doctor?.name || "--"}</p>
          <p className="mb-1">Date: {appt.date}</p>
          <p className="mb-1">Time: {appt.startTime}-{appt.endTime}</p>
          <p className="mb-1">Type: {appt.type}</p>
          <div className="mt-2 border border-slate-200 rounded-md p-3">
            <div className="flex items-center justify-between">
              <span>Consultation fee</span>
              <span>₹{Number(appt.fee || 0)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeServiceFee} onChange={(e) => setIncludeServiceFee(e.target.checked)} />
                <span>Service fee (optional)</span>
              </label>
              <span>₹{includeServiceFee ? 20 : 0}</span>
            </div>
            <hr className="my-2" />
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>₹{Number(appt.fee || 0) + (includeServiceFee ? 20 : 0)}</span>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={pay}
        disabled={loading || !sdkReady}
        className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2 rounded-md disabled:opacity-50"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>
      <div className="text-xs text-slate-500 mt-3">
        Test Mode: use card 4111 1111 1111 1111, future expiry, any CVV; or UPI ID success@razorpay.
      </div>
    </div>
  );
}
