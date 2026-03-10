import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Helmet } from "react-helmet-async";

export default function Contact() {
  const OG_FALLBACK = (process.env.PUBLIC_URL || '') + '/logo512.png';
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Helmet>
        <title>Contact HospoZen | Support</title>
        <meta name="description" content="Get support and contact the HospoZen team." />
        <meta property="og:title" content="Contact HospoZen | Support" />
        <meta property="og:description" content="Get support and contact the HospoZen team." />
        <meta property="og:image" content={OG_FALLBACK} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Contact HospoZen | Support" />
        <meta name="twitter:description" content="Get support and contact the HospoZen team." />
        <meta name="twitter:image" content={OG_FALLBACK} />
      </Helmet>
      <div className="max-w-7xl mx-auto pt-24 px-4 animate-fade-in">
        <div className="relative mb-10 text-center">
          <h1 className="inline-block px-8 py-3 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10 pb-4">
            Contact Information
            <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
          </h1>
        </div>
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-6 mb-8 animate-slide-in-left opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
          <div className="text-center text-slate-600 tracking-widest font-semibold mb-6 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>CONTACT US</div>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="animate-zoom-in opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              <img
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1200&auto=format&fit=crop"
                alt="Clinic"
                className="rounded-2xl shadow-xl w-full h-80 md:h-[360px] object-cover hover:scale-110 transition-transform duration-700"
                onError={(e) => {
                  const fb = "https://images.unsplash.com/photo-1588771930293-719d3d7da06a?q=80&w=1200&auto=format&fit=crop";
                  if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                }}
              />
            </div>
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 transition-all duration-300">
                <h3 className="text-lg font-bold text-slate-900 mb-3">OUR OFFICE</h3>
                <p className="text-slate-700 mb-1">Chennai, Tamilnadu</p>
                <p className="text-slate-700 mb-3">Ennore, Chennai–600057</p>
                <p className="text-slate-700 font-semibold">+91-9999-00770</p>
                <p className="text-slate-700">admin@hms.local</p>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 transition-all duration-300">
                <p className="text-slate-700">Available time 10:00 AM to 6:00 PM</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl p-6 animate-fade-in opacity-0" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="animate-slide-in-left opacity-0" style={{ animationDelay: '1.2s', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                  <div className="text-white">
                    <Logo size={20} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent pb-1">
                    HospoZen
                  </span>
                  <span className="text-xs text-blue-600 font-medium tracking-wider uppercase">Healthcare Platform</span>
                </div>
              </div>
              <p className="text-slate-600">We make it easy to find and book appointments quickly.</p>
            </div>
            <div className="animate-zoom-in opacity-0" style={{ animationDelay: '1.4s', animationFillMode: 'forwards' }}>
              <div className="text-slate-900 font-bold text-lg mb-3">COMPANY</div>
              <ul className="space-y-2 text-slate-700">
                <li><Link to="/about" className="hover:text-indigo-700 transition-colors duration-300 hover:scale-105 inline-block">About Us</Link></li>
                <li><Link to="/search" className="hover:text-indigo-700 transition-colors duration-300 hover:scale-105 inline-block">All Doctors</Link></li>
                <li><Link to="/" className="hover:text-indigo-700 transition-colors duration-300 hover:scale-105 inline-block">Home</Link></li>
              </ul>
            </div>
            <div className="animate-slide-in-left opacity-0" style={{ animationDelay: '1.6s', animationFillMode: 'forwards' }}>
              <div className="text-slate-900 font-bold text-lg mb-3">GET IN TOUCH</div>
              <p className="text-slate-700 font-semibold mb-1">+91-9999-00770</p>
              <p className="text-slate-700">admin@hms.local</p>
            </div>
          </div>
          <div className="mt-10 text-center text-slate-500 animate-fade-in" style={{ animationDelay: '1.8s', animationFillMode: 'forwards' }}>Copyright © 2025 HospoZen — All Rights Reserved.</div>
        </section>
      </div>
    </div>
  );
}
