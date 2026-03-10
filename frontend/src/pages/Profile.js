 import { useEffect, useState } from "react";
 import API from "../api";
 import { Helmet } from "react-helmet-async";
 
 export default function Profile() {
   const OG_FALLBACK = (process.env.PUBLIC_URL || '') + '/logo512.png';
   const DEFAULT_PHOTO = "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=256&auto=format&fit=crop";
   const [editing, setEditing] = useState(false);
   const [photo, setPhoto] = useState("");
   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [phone, setPhone] = useState("");
   const [address, setAddress] = useState("");
   const [gender, setGender] = useState("");
   const [birthday, setBirthday] = useState("");
   const [age, setAge] = useState("");
   const ageFromBirthday = (d) => {
     if (!d) return "--";
     const b = new Date(d);
     const today = new Date();
     if (Number.isNaN(b.getTime()) || b > today) return "--"; // Check for invalid date or future date
     let age = today.getFullYear() - b.getFullYear();
     const m = today.getMonth() - b.getMonth();
     if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
     return String(age);
   };
 
   useEffect(() => {
     const tryGetUid = () => {
       const direct = localStorage.getItem("userId");
       if (direct) return direct;
       try {
         for (let i = 0; i < localStorage.length; i++) {
           const key = localStorage.key(i) || "";
           if (key.startsWith("userNameById_")) return key.replace("userNameById_", "");
           if (key.startsWith("userEmailById_")) return key.replace("userEmailById_", "");
           if (key.startsWith("userPhoneById_")) return key.replace("userPhoneById_", "");
         }
       } catch (e) {
         console.error("Failed to fetch profile data:", e);
       }
       return null;
     };
 
     const uid = tryGetUid();
     const n = uid ? localStorage.getItem(`userNameById_${uid}`) : null;
     const e = uid ? localStorage.getItem(`userEmailById_${uid}`) : null;
     const p = uid ? localStorage.getItem(`userPhoneById_${uid}`) : null;
     const p2 = uid ? localStorage.getItem(`userMobileById_${uid}`) : null;
     const a = uid ? localStorage.getItem(`userAddressById_${uid}`) : null;
     const g = uid ? localStorage.getItem(`userGenderById_${uid}`) : null;
     const b1 = uid ? localStorage.getItem(`userBirthdayById_${uid}`) : null;
     const b2 = uid ? localStorage.getItem(`userDobById_${uid}`) : null;
     const ag = uid ? localStorage.getItem(`userAgeById_${uid}`) : null;
 
     setName(n || "");
     setEmail(e || "");
     setPhoto("");
     try { if (uid) localStorage.removeItem(`userPhotoBase64ById_${uid}`); } catch (e) {
       console.error("Failed to remove user photo from localStorage:", e);
     }
 
     (async () => {
       try {
         const { data } = await API.get('/auth/me');
         if (data) {
             setName(String(data.name || ""));
             setEmail(String(data.email || ""));
             const ph = String(data.phone || data.mobile || data.contactNumber || data.phoneNumber || data?.user?.phone || data?.user?.mobile || data?.user?.contactNumber || "");
             setPhone(ph);
             setAddress(String(data.address || ""));
             setGender(String(data.gender || ""));
             const d = String(data.birthday || "");
             setBirthday(d);
             setAge(ageFromBirthday(d));
             if (data.photoBase64) setPhoto(String(data.photoBase64));
           }
       } catch (_) {}
     })();
   }, []);
 
   const save = async () => {
     try {
       const emailRegex = /^[a-z0-9._%+-]+@(gmail\.com|hms\.com)$/;
      if (!email || !emailRegex.test(email)) { alert('Please enter a valid lowercase email ending with @gmail.com or @hms.com'); return; }
       const phoneSan = String(phone || "").replace(/\D/g, "");
       if (!/^[6-9]\d{9}$/.test(phoneSan)) { alert('Phone must start 6-9 and be 10 digits'); return; }
      if (address && address.length > 150) { alert('Address cannot exceed 150 characters'); return; }
       {
         const exp = ageFromBirthday(birthday);
         const norm = String(age).trim() === '' ? '' : String(Math.max(0, Math.min(120, Number(String(age).replace(/\D/g, '')))));
         if (exp !== '--' && norm !== '' && norm !== exp) { alert('Age must match the date of birth'); return; }
       }
       await API.put('/auth/me', { name, email, phone, address, gender, birthday, photoBase64: photo });
      const uid = localStorage.getItem("userId");
      if (uid) {
        localStorage.setItem(`userNameById_${uid}`, name || "");
        localStorage.setItem(`userEmailById_${uid}`, email || "");
        localStorage.setItem(`userPhoneById_${uid}`, phone || "");
        localStorage.setItem(`userMobileById_${uid}`, phone || "");
        localStorage.setItem(`userAddressById_${uid}`, address || "");
        localStorage.setItem(`userGenderById_${uid}`, gender || "");
        localStorage.setItem(`userBirthdayById_${uid}`, birthday || "");
        localStorage.setItem(`userDobById_${uid}`, birthday || "");
        localStorage.setItem(`userAgeById_${uid}`, ageFromBirthday(birthday) || age || "");
        localStorage.setItem(`userPhotoBase64ById_${uid}`, photo || "");
      }
      try {
        const bc = new BroadcastChannel('profile_update');
        bc.postMessage({ type: 'UPDATE', name, photo });
        bc.close();
      } catch (e) {}
      setEditing(false);
     } catch (e) {
       alert(e.response?.data?.message || e.message || 'Failed to save');
     }
   };
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
       <Helmet>
         <title>Profile | HospoZen</title>
         <meta name="description" content="View and update your profile, contact info, and preferences for secure healthcare consultations." />
         <meta property="og:title" content="Profile | HospoZen" />
         <meta property="og:description" content="Manage personal details and preferences for better appointments and consultations." />
         <meta property="og:image" content={OG_FALLBACK} />
         <meta property="og:type" content="website" />
         <meta name="twitter:card" content="summary" />
         <meta name="twitter:title" content="Profile | HospoZen" />
         <meta name="twitter:description" content="Manage personal details and preferences for better appointments and consultations." />
         <meta name="twitter:image" content={OG_FALLBACK} />
       </Helmet>
       <div className="max-w-7xl mx-auto pt-24 px-4 animate-fade-in">
         <div className="relative mb-10 text-center">
           <h1 className="inline-block px-8 py-3 text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 bg-clip-text text-transparent relative z-10">
             Your Profile
             <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-sm"></div>
           </h1>
         </div>
         <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-8 mb-8 animate-slide-in-left opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
           <div className="grid md:grid-cols-3 gap-8">
             <div className="animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
               <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-500">
                {photo && photo !== 'null' ? (
                  <img
                    src={photo.startsWith('data:') || photo.startsWith('http') ? photo : `data:image/jpeg;base64,${photo}`}
                    alt="User"
                    className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-xl border-2 border-indigo-200 mx-auto hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                   <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto hover:scale-110 transition-transform duration-700">
                     <div className="text-6xl text-slate-400">👤</div>
                   </div>
                 )}
                 <div className="text-center mt-4">
                   <div className="text-2xl font-bold text-slate-800">{name}</div>
                 </div>
               </div>
             </div>
             <div className="md:col-span-2 animate-fade-in" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
               <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-500">
                 <div className="text-xl font-bold text-slate-800 mb-4">Contact Information</div>
                 {!editing ? (
                   <div className="space-y-4">
                     <div className="flex items-center gap-3">
                       <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                       </svg>
                       <div> Email: <a className="text-indigo-600 hover:text-indigo-700 font-medium" href={`mailto:${email}`}>{email}</a></div>
                     </div>
                     <div className="flex items-center gap-3">
                       <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                       </svg>
                       <div> Phone: <span className="text-slate-700 font-medium">{phone}</span></div>
                     </div>
                     <div className="flex items-start gap-3">
                       <svg className="w-5 h-5 text-indigo-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                       </svg>
                       <div className="flex-1"> Address: <span className="whitespace-pre-wrap text-slate-700 font-medium">{address}</span></div>
                     </div>
                   </div>
                 ) : (
                   <div className="grid sm:grid-cols-2 gap-4">
                     <div className="sm:col-span-2">
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Image</label>
                       <input type="file" accept="image/*" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (!file) return;
                         const reader = new FileReader();
                         reader.onload = () => setPhoto(String(reader.result || ""));
                         reader.readAsDataURL(file);
                       }} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105" />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                       <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105" />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
                       <input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(String(e.target.value).replace(/\D/g, "").slice(0, 10))} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105" />
                     </div>
                     <div className="sm:col-span-2">
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                       <textarea rows={3} maxLength={150} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105" />
                     </div>
                   </div>
                 )}
               </div>
 
               <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
                 <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl p-6 hover:scale-105 hover:shadow-2xl transition-all duration-500">
                   <div className="text-xl font-bold text-slate-800 mb-4">Basic Information</div>
                   {!editing ? (
                     <div className="space-y-4">
                       <div className="flex items-center gap-3">
                         <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10m0 0l-2-2m2 2l2-2m6-6v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2h8a2 2 0 012 2z" />
                         </svg>
                         <div> Date of Birth: <span className="text-slate-700 font-medium">{birthday}</span></div>
                       </div>
                       <div className="flex items-center gap-3">
                         <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <div> Age: <span className="text-slate-700 font-medium">{age}</span></div>
                       </div>
                     </div>
                   ) : (
                     <div className="grid sm:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                         <input type="date" max={new Date().toISOString().split('T')[0]} value={birthday} onChange={(e) => { const d = e.target.value; setBirthday(d); setAge(ageFromBirthday(d)); }} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105" />
                       </div>
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
                         <input type="number" min="0" max="120" value={age} onChange={(e) => { const v = String(e.target.value).replace(/\D/g, ""); if (v === "") { setAge(""); return; } const n = Math.max(0, Math.min(120, Number(v))); setAge(String(n)); }} className="w-full p-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-300 hover:scale-105" />
                       </div>
                     </div>
                   )}
                 </div>
               </div>
 
               <div className="mt-6 animate-fade-in flex gap-4" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                 {!editing ? (
                   <button onClick={() => setEditing(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                     Edit Profile
                   </button>
                 ) : (
                   <>
                     <button onClick={save} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                       Save Changes
                     </button>
                     <button onClick={() => setEditing(false)} className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                       Cancel
                     </button>
                   </>
                 )}
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }