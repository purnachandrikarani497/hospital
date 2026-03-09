import { useEffect, useState } from "react";
import API from "../api";
import { Helmet } from "react-helmet-async";

export default function About() {
  const OG_FALLBACK = (process.env.PUBLIC_URL || '') + '/logo512.png';
  const [stats, setStats] = useState({ appointments: 0, doctors: 0, specialties: 0 });
  const [specs, setSpecs] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await API.get('/stats');
        if (alive) setStats({
          appointments: Number(data?.appointments || 0),
          doctors: Number(data?.doctors || 0),
          specialties: Number(data?.specialties || 0)
        });
      } catch (_) {}
      try {
        const { data } = await API.get('/doctors');
        const list = Array.isArray(data) ? data : [];
        const dcount = list.length;
        const uniq = new Set();
        list.forEach((d) => {
          const arr = Array.isArray(d?.specializations) ? d.specializations : [];
          arr.forEach((s) => { const x = String(s || '').trim(); if (x) uniq.add(x); });
        });
        const names = Array.from(uniq).sort((a, b) => String(a).localeCompare(String(b)));
        if (alive) {
          setStats((prev) => ({
            appointments: prev.appointments,
            doctors: Math.max(prev.doctors, dcount),
            specialties: Math.max(prev.specialties, uniq.size)
          }));
          setSpecs(names);
        }
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="page-gradient">
      <Helmet>
        <title>About HospoZen | Healthcare Platform</title>
        <meta name="description" content="Learn about HospoZen and our mission to modernize healthcare." />
        <meta property="og:title" content="About HospoZen | Healthcare Platform" />
        <meta property="og:description" content="Learn about HospoZen and our mission to modernize healthcare." />
        <meta property="og:image" content={OG_FALLBACK} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="About HospoZen | Healthcare Platform" />
        <meta name="twitter:description" content="Learn about HospoZen and our mission to modernize healthcare." />
        <meta name="twitter:image" content={OG_FALLBACK} />
      </Helmet>
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-indigo-300/40 to-purple-300/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-300/40 to-cyan-300/40 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 pt-12 md:pt-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="animate-slide-in-left">
              <div className="relative mb-10 text-center">
                <h1 className="inline-block px-8 py-3 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10 pb-4">
                  Your Trusted Healthcare Partner
                  <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
                </h1>
              </div>
              <p className="mt-4 text-slate-600 max-w-xl">Discover verified doctors, book appointments in seconds, and get secure online consultations with e‑prescriptions.</p>
              <div className="mt-6 flex items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>HIPAA‑style privacy</span>
                <span className="inline-flex items-center gap-1"><svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Secure payments</span>
                <span className="inline-flex items-center gap-1"><svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>24×7 support</span>
              </div>
            </div>
            <div className="animate-fade-in">
              <div className="glass-card p-6 md:p-8 rounded-2xl">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22a2 2 0 002-2H10a2 2 0 002 2z" fill="currentColor"/><path d="M12 2a7 7 0 00-7 7v3l-2 3h18l-2-3V9a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                      <div className="text-2xl font-bold text-indigo-700">{stats.appointments}+</div>
                    </div>
                    <div className="text-slate-600 text-sm mt-1">Appointments</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/><path d="M6 20a6 6 0 0112 0H6z" stroke="currentColor" strokeWidth="2"/></svg>
                      <div className="text-2xl font-bold text-purple-700">{stats.doctors}+</div>
                    </div>
                    <div className="text-slate-600 text-sm mt-1">Doctors</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-6 h-6 text-cyan-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7z" stroke="currentColor" strokeWidth="2"/></svg>
                      <div className="text-2xl font-bold text-cyan-700">{stats.specialties}+</div>
                    </div>
                    <div className="text-slate-600 text-sm mt-1">Specializations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="max-w-7xl mx-auto px-4 mt-12 animate-fade-in">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2"/><path d="M6 20a6 6 0 0112 0H6z" stroke="currentColor" strokeWidth="2"/></svg>
              </div>
              <div className="font-semibold text-slate-900">Verified Doctors</div>
            </div>
            <div className="text-slate-600 text-sm mt-2">Profiles are reviewed for trust and quality.</div>
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4" stroke="currentColor" strokeWidth="2"/><path d="M9 11h6M12 14v7" stroke="currentColor" strokeWidth="2"/></svg>
              </div>
              <div className="font-semibold text-slate-900">Easy Booking</div>
            </div>
            <div className="text-slate-600 text-sm mt-2">Book online with instant confirmations.</div>
          </div>
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10l-4 3 4 3V10z" fill="currentColor"/><path d="M6 4h8a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3z" stroke="currentColor" strokeWidth="2"/></svg>
              </div>
              <div className="font-semibold text-slate-900">Secure Consultations</div>
            </div>
            <div className="text-slate-600 text-sm mt-2">Private video calls with encrypted links.</div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-12 pb-16 animate-fade-in">
        <div className="rounded-2xl p-6 md:p-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold">Ready to get started?</div>
            <div className="text-indigo-100 mt-2">Search a specialist and book your appointment now.</div>
          </div>
          <div className="flex items-center gap-4">Book an appoinment
            <a href="/search" className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition"></a>
            <a href="/contact" className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition">Contact Us</a>
          </div>
        </div>
      </section>
    </div>
  );
}
