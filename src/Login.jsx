import React, { useState } from 'react'
import { supabase } from './../supabaseClient' // App.jsx'teki yolun aynısı

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // Giriş mi Kayıt mı?
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (isSignUp) {
      // --- KAYIT OL ---
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) alert(error.message)
      else alert("Kayıt başarılı! Lütfen mail kutunu onayla. 🚀")
    } else {
      // --- GİRİŞ YAP ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) alert(error.message)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
  }

  return (
    // Arka Plan: App.jsx ile uyumlu Dark Gradient
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Kart: Kompakt, Glassmorphism */}
      <div className="w-full max-w-[360px] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[32px] p-8 shadow-2xl shadow-black/50 relative overflow-hidden group hover:border-slate-600/80 transition-all duration-500">
        
        {/* Neon Üst Çizgi */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Başlık Alanı */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">
            {isSignUp ? 'Aramıza Katıl' : 'Hoş Geldin'}
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            {isSignUp ? 'Süreçlerini yönetmeye başla.' : 'Kaldığın yerden devam et.'}
          </p>
        </div>

        {/* Toggle (Giriş / Kayıt Geçişi) */}
        <div className="flex bg-slate-950/50 p-1 rounded-xl mb-6 border border-slate-800/50 relative">
          {/* Animasyonlu Arka Plan Slider */}
          <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-700/80 rounded-[10px] shadow-sm transition-all duration-300 ${isSignUp ? 'left-[calc(50%+2px)]' : 'left-1'}`} />
          
          <button 
            onClick={() => setIsSignUp(false)} 
            className={`flex-1 py-2 text-xs font-bold z-10 transition-colors ${!isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Giriş Yap
          </button>
          <button 
            onClick={() => setIsSignUp(true)} 
            className={`flex-1 py-2 text-xs font-bold z-10 transition-colors ${isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Üye Ol
          </button>
        </div>

        {/* Form (Email/Pass) */}
        <form onSubmit={handleAuth} className="space-y-4 mb-6">
          <div className="space-y-1">
            <input 
              type="email" 
              required
              placeholder="E-posta adresi"
              className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <input 
              type="password" 
              required
              placeholder="Şifre"
              className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'İşleniyor...' : (isSignUp ? 'Hemen Kayıt Ol' : 'Giriş Yap')}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-[1px] flex-1 bg-slate-800" />
          <span className="text-[10px] font-bold text-slate-600 uppercase">veya</span>
          <div className="h-[1px] flex-1 bg-slate-800" />
        </div>

        {/* Google Butonu */}
        <button 
          onClick={handleGoogleLogin}
          type="button"
          className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-3.5 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg shadow-white/5"
        >
           <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm">Google ile Devam Et</span>
        </button>

      </div>
    </div>
  )
}