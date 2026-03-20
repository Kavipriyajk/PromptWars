import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Shield, ShieldCheck, Activity, Upload, Mic,
  Send, Copy, CheckCircle2, Clock, Wifi,
  MapPin, Radio, Zap, FileText, Navigation, PhoneCall
} from 'lucide-react';
import { useStore, TriageResult, CaseRecord } from './store';

/* ------------------------------------------------------------------ */
/*  ANIMATION VARIANTS (Efficiency: Framer Motion)                     */
/* ------------------------------------------------------------------ */
const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };
const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
/*  MAIN APPLICATION: Crisis Command Center                            */
/* ------------------------------------------------------------------ */
export default function App() {
  const store = useStore();
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  // Focus ref for Accessibility (WCAG AAA)
  const dispatchBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    store.fetchHistory();
  }, []);

  // Autofocus dispatch button on critical result
  useEffect(() => {
    if (store.currentResult?.severity === 'Red' && dispatchBtnRef.current) {
      dispatchBtnRef.current.focus();
    }
  }, [store.currentResult]);

  /* --- File Helpers --- */
  const toBase64 = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      }),
    [],
  );

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: 'audio'|'image'|'document') => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const b64 = (await toBase64(file)).split(',')[1];
      if (type === 'audio') store.setAudio(b64, file.name);
      if (type === 'image') store.setImage(b64, file.name);
      if (type === 'document') store.setDocument(b64, file.name);
    }
  }, [toBase64, store]);

  const handleCopy = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  /* --- Severity Utils --- */
  const severityConfig = useMemo(() => ({
    red:    { label: 'CRITICAL', icon: <ShieldAlert size={36} aria-hidden="true" />, cls: 'border-severity-red bg-red-950/60 animate-pulse-red', badgeCls: 'bg-red-900 text-red-300' },
    yellow: { label: 'URGENT',   icon: <Shield size={36} aria-hidden="true" />,      cls: 'border-severity-yellow bg-yellow-950/60 animate-pulse-yellow', badgeCls: 'bg-yellow-900 text-yellow-300' },
    green:  { label: 'STABLE',   icon: <ShieldCheck size={36} aria-hidden="true" />,  cls: 'border-severity-green bg-green-950/60', badgeCls: 'bg-green-900 text-green-300' },
  }), []);

  const getSev = (s: string) => severityConfig[s.toLowerCase() as keyof typeof severityConfig] || severityConfig.green;
  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  /* ---------------------------------------------------------------- */
  return (
    <div className="flex w-full h-screen overflow-hidden bg-war-room-950 text-slate-100 font-sans">
      
      {/* ========== SIDEBAR ========== */}
      <aside className="w-[340px] bg-war-room-900 border-r border-war-room-800 flex flex-col shadow-2xl z-10" aria-label="HQ Case Logs">
        <div className="p-5 border-b border-war-room-800 bg-black/20">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Radio size={20} className="text-severity-red animate-pulse" aria-hidden="true" /> HQ Case Logs
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-2">
          {store.caseHistory.map((c: CaseRecord) => (
            <button
              key={c.id}
              className="w-full text-left bg-war-room-800 hover:bg-war-room-700 border border-transparent hover:border-blue-500 rounded-lg p-3 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => store.setCurrentResult({
                severity: c.severity, assessment: c.assessment,
                confidence_score: c.confidence,
                reasoning_trace: c.reasoning,
                dispatch: JSON.parse(c.dispatch_status || '{}'),
                input_modalities: JSON.parse(c.modalities || '[]'),
                fhir_condition_code: '', action_code: c.action_code,
              } as TriageResult)}
              aria-label={`View case ${c.id}: ${c.input_text.substring(0, 40)}, severity ${c.severity}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-war-room-400 flex items-center gap-1">
                  <Clock size={10} aria-hidden="true" /><time>{formatTime(c.timestamp)}</time>
                </span>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getSev(c.severity).badgeCls}`}>
                  {c.severity}
                </span>
              </div>
              <div className="text-sm truncate">{c.input_text}</div>
            </button>
          ))}
          {store.caseHistory.length === 0 && (
            <p className="text-war-room-500 text-center text-sm mt-8">No previous cases</p>
          )}
        </nav>
      </aside>

      {/* ========== MAIN CONTENT (Command Center) ========== */}
      <main className="flex-1 flex flex-col bg-war-room-950 relative" id="main-content">
        
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center border-b border-war-room-800 bg-war-room-900/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Zap className="text-severity-yellow" fill="currentColor" />
              GOLDEN HOUR <span className="text-war-room-500 font-normal">|</span> Command Center
              <span className="ml-2 text-[10px] bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase hidden sm:inline-block">v4.0 Advanced</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-war-room-300 bg-black/40 px-3 py-1.5 rounded-full border border-war-room-700" role="status" aria-label="System status">
            <Wifi size={14} className="text-severity-green" aria-hidden="true" />
            <span>Systems Online</span>
          </div>
        </header>

        {/* --- GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 flex-1 overflow-y-auto">
          
          {/* ----- LEFT: INTAKE PANEL (Col span 5) ----- */}
          <section className="col-span-1 lg:col-span-5 flex flex-col gap-4" aria-label="Incident Intake">
            
            <div className="bg-war-room-900 rounded-xl border border-war-room-800 p-5 shadow-lg flex flex-col h-full gap-5 relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] pointer-events-none" />

              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Radio size={20} className="text-blue-400" aria-hidden="true" /> 
                Incoming Signal Analysis
              </h2>

              <div className="flex flex-col gap-1.5 flex-1 w-full relative group">
                <label htmlFor="situation-input" className="text-sm font-semibold text-war-room-300 uppercase tracking-wider">
                  Raw Transcript / Notes <span className="text-severity-red">*</span>
                </label>
                <textarea
                  id="situation-input"
                  className="w-full h-full min-h-[160px] bg-black/40 border border-war-room-700 rounded-lg p-4 text-slate-100
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-war-room-600 font-mono text-sm leading-relaxed"
                  placeholder="[Waiting for operator input...]&#10;> Enter 911 caller description here.&#10;> Example: 45yo male, severe chest pain, shortness of breath..."
                  value={store.inputText}
                  onChange={(e) => store.setInputText(e.target.value)}
                  aria-required="true"
                />
              </div>

              {/* Multimodal Ingestion (V4 Feature) */}
              <fieldset className="flex flex-col gap-3 border-t border-war-room-800 pt-4 m-0 p-0">
                <legend className="text-xs font-bold text-war-room-400 uppercase tracking-wider mb-2">
                  Advanced Multimodal Ingestion (Optional)
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  <label htmlFor="audio-upload"
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 bg-black/20 border border-dashed rounded-lg cursor-pointer transition-all hover:bg-war-room-800 ${store.audioFile ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-war-room-600 text-war-room-400'}`}
                    title="VoiceProcessor (STT & Threat Analysis)">
                    <Mic size={18} />
                    <span className="text-[10px] text-center font-medium uppercase leading-tight">{store.audioFile ? 'Audio Loaded' : 'Voice Signal'}</span>
                    <input type="file" id="audio-upload" accept="audio/*" onChange={(e) => handleUpload(e,'audio')} className="hidden" />
                  </label>

                  <label htmlFor="image-upload"
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 bg-black/20 border border-dashed rounded-lg cursor-pointer transition-all hover:bg-war-room-800 ${store.imageFile ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-war-room-600 text-war-room-400'}`}
                    title="ImageAnalyzer (Signal Extraction)">
                    <Upload size={18} />
                    <span className="text-[10px] text-center font-medium uppercase leading-tight">{store.imageFile ? 'Image Loaded' : 'Visual Feeds'}</span>
                    <input type="file" id="image-upload" accept="image/*" onChange={(e) => handleUpload(e,'image')} className="hidden" />
                  </label>

                  <label htmlFor="doc-upload"
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 bg-black/20 border border-dashed rounded-lg cursor-pointer transition-all hover:bg-war-room-800 ${store.documentFile ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-war-room-600 text-war-room-400'}`}
                    title="DocumentParser (Medical History)">
                    <FileText size={18} />
                    <span className="text-[10px] text-center font-medium uppercase leading-tight">{store.documentFile ? 'Doc Loaded' : 'Med History'}</span>
                    <input type="file" id="doc-upload" accept=".pdf,.txt" onChange={(e) => handleUpload(e,'document')} className="hidden" />
                  </label>
                </div>
              </fieldset>

              <button
                className={`w-full py-4 rounded-lg flex items-center justify-center gap-2 font-black uppercase tracking-wider transition-all duration-300 shadow-xl
                           ${store.isLoading || !store.inputText.trim() 
                              ? 'bg-war-room-800 text-war-room-500 cursor-not-allowed shadow-none' 
                              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white hover:-translate-y-1 hover:shadow-blue-500/25'}`}
                onClick={store.analyzeEmergency}
                disabled={store.isLoading || !store.inputText.trim()}
                aria-label={store.isLoading ? 'Initiating Background Analysis' : 'Engage Processing Engine'}
              >
                {store.isLoading ? (
                  <><Activity className="animate-spin" size={20} /> INITIATING BACKGROUND TASK...</>
                ) : (
                  <><Send size={20} /> ENGAGE PROCESSING ENGINE</>
                )}
              </button>
            </div>
          </section>

          {/* ----- RIGHT: COMMAND OUTPUT (Col span 7) ----- */}
          <section className="col-span-1 lg:col-span-7 flex flex-col gap-4 overflow-y-auto" aria-live="polite">
            <AnimatePresence mode="wait">
              
              {/* === EMPTY STATE === */}
              {!store.isLoading && !store.currentResult && (
                <motion.div key="empty" {...fadeIn} className="h-full flex flex-col items-center justify-center bg-black/20 rounded-xl border border-dashed border-war-room-700 text-war-room-500 text-center p-8 backdrop-blur-sm">
                  <Activity size={56} className="mb-6 opacity-30" />
                  <p className="font-bold text-lg tracking-wide uppercase">Command Console Standby</p>
                  <p className="text-sm mt-2 max-w-sm leading-relaxed">System awaits incoming emergency signals. Ready for multimodal decryption and routing.</p>
                </motion.div>
              )}

              {/* === LOADING / BACKGROUND TASK STATE === */}
              {store.isLoading && (
                <motion.div key="loading" {...fadeIn} className="h-full flex flex-col items-center justify-center bg-war-room-900 rounded-xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
                  
                  <div className="w-32 h-32 rounded-full border border-blue-500/50 relative flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(59,130,246,0.3)] bg-black/40">
                    <Activity size={48} className="text-blue-400" />
                    <div className="absolute inset-0 rounded-full radar-sweep" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  
                  <div className="font-mono text-blue-400 text-sm space-y-2 uppercase tracking-widest text-center" aria-live="assertive">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>[1] Connecting to background task node...</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}>[2] Polling Gemini 1.5 Flash via Server...</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>[3] Live Thinking Transcript Stream Active...</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }} className="text-blue-300 font-bold">[4] Calculating ETA via Google Places API...</motion.div>
                  </div>
                </motion.div>
              )}

              {/* === RESULTS === */}
              {!store.isLoading && store.currentResult && (
                <motion.div key="results" variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-4">

                  {/* 1. SEVERITY SHIELD (Top) */}
                  <motion.article variants={fadeIn} className={`relative overflow-hidden rounded-xl p-6 border-l-[6px] shadow-xl ${getSev(store.currentResult.severity).cls.replace('border-', 'border-l-')}`}>
                     {/* Floating icon background */}
                     <div className="absolute -right-8 -top-8 opacity-10 blur-sm mix-blend-overlay" style={{ transform: 'scale(4)' }}>
                        {getSev(store.currentResult.severity).icon}
                     </div>

                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <span className="px-2.5 py-1 rounded bg-black/40 border border-white/20 text-xs font-bold tracking-widest uppercase">
                             Protocol: {getSev(store.currentResult.severity).label}
                           </span>
                           <span className="px-2 text-xs font-mono text-white/70">
                             Confidence: {(store.currentResult.confidence_score * 100).toFixed(1)}%
                           </span>
                        </div>
                        <h2 className="text-2xl font-black text-white leading-tight mb-2 uppercase tracking-wide">
                          {store.currentResult.assessment.split('.')[0]}.
                        </h2>
                        <p className="text-sm font-medium text-white/80 leading-relaxed max-w-2xl">
                          {store.currentResult.assessment.substring(store.currentResult.assessment.indexOf('.') + 1).trim() || store.currentResult.assessment}
                        </p>
                      </div>
                      <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center shrink-0 shadow-inner">
                        {getSev(store.currentResult.severity).icon}
                      </div>
                    </div>
                  </motion.article>

                  {/* 2. THE LIFE-SAVING BRIDGE (Google Maps Integration Mock) */}
                  {store.currentResult.severity === 'Red' && store.currentResult.dispatch?.hospital && (
                    <motion.div variants={fadeIn} className="col-span-12 bg-black rounded-xl border border-red-500/30 overflow-hidden shadow-2xl relative" role="alert" aria-live="assertive">
                       
                       {/* Maps Mock UI Header */}
                       <div className="bg-red-950 px-4 py-3 border-b border-red-900/50 flex justify-between items-center">
                          <div className="flex items-center gap-2 text-red-400 font-bold text-sm tracking-wider uppercase">
                            <Navigation size={18} className="animate-pulse-red" /> 
                            Automated Hospital Routing
                          </div>
                          <div className="text-xs bg-red-900 px-2 py-1 rounded text-red-200">
                             Via Google Places API (Mock)
                          </div>
                       </div>

                       {/* Maps Content Area */}
                       <div className="p-5 flex flex-col md:flex-row gap-6 relative">
                          
                          {/* Left: Info */}
                          <div className="flex-1 flex flex-col justify-center">
                             <h3 className="text-xl font-bold text-slate-100 mb-1 leading-tight">{store.currentResult.dispatch.hospital.name}</h3>
                             <p className="text-sm text-slate-400 flex items-center gap-1.5 mb-4">
                               <MapPin size={14} /> {store.currentResult.dispatch.hospital.address}
                             </p>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-war-room-900 border border-war-room-800 rounded-lg p-3">
                                   <div className="text-xs text-war-room-500 uppercase tracking-wider mb-1">Distance</div>
                                   <div className="text-xl font-mono text-blue-400">{store.currentResult.dispatch.hospital.distance_km} KM</div>
                                </div>
                                <div className="bg-war-room-900 border border-war-room-800 rounded-lg p-3">
                                   <div className="text-xs text-war-room-500 uppercase tracking-wider mb-1">Live ETA</div>
                                   <div className="text-xl font-bold text-severity-red">{store.currentResult.dispatch.hospital.eta_mins} MINS</div>
                                </div>
                             </div>

                             {/* ACCESSIBILITY: Autofocus Button */}
                             <button 
                               ref={dispatchBtnRef}
                               className="mt-5 bg-severity-red hover:bg-red-400 text-white font-black uppercase tracking-wider py-4 px-6 rounded-lg w-full flex items-center justify-center gap-3 transition-transform hover:-translate-y-1 shadow-lg shadow-red-500/20 focus-visible:ring-4 focus-visible:ring-white outline-none focus:outline-none ring-offset-2 ring-offset-black"
                               aria-label={`Dispatch ${store.currentResult.dispatch.units.join(', ')} to ${store.currentResult.dispatch.hospital.name}`}
                             >
                               <PhoneCall size={20} className="animate-bounce" /> 
                               CONFIRM DISPATCH ({store.currentResult.dispatch.units.join(', ')})
                             </button>
                          </div>

                          {/* Right: Map Visual Mock */}
                          <div className="w-full md:w-[280px] h-[200px] bg-war-room-900 rounded-xl border border-war-room-800 overflow-hidden relative">
                             {/* Mock Map Background Grid */}
                             <div className="absolute inset-0 bg-[#0a0a0a]" style={{ backgroundImage: 'linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(90deg, #1f2937 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                             
                             {/* Route Line Mock */}
                             <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                               <path d="M 40,160 Q 100,140 140,80 T 240,40" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" className="animate-[dash_10s_linear_infinite]" />
                               <circle cx="40" cy="160" r="6" fill="#ef4444" /> {/* Caller */}
                               <circle cx="240" cy="40" r="8" fill="#22c55e" /> {/* Hospital */}
                             </svg>
                             {/* Map Labels */}
                             <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 rounded text-[9px] font-mono text-red-400 border border-red-900">INCIDENT</div>
                             <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[9px] font-mono text-green-400 border border-green-900">DESTINATION</div>
                          </div>
                       </div>
                    </motion.div>
                  )}

                  {/* 3. TRANSCRIPT & ACTIONS (Side by Side) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Action Checklist */}
                    <motion.section variants={fadeIn} className="bg-war-room-900 rounded-xl border border-war-room-800 p-5 flex flex-col h-full">
                      <h3 className="text-sm font-bold text-war-room-300 uppercase tracking-widest mb-4">Tactical Checklist</h3>
                      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {store.currentResult.recommended_actions.map((action, idx) => (
                          <div key={idx} className="bg-black/20 border border-war-room-800 rounded-lg p-3 flex justify-between items-start gap-3 group hover:border-blue-500/50 transition-colors">
                            <span className="w-5 h-5 bg-war-room-800 text-war-room-400 text-[10px] font-bold rounded flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                            <span className="text-sm font-medium leading-relaxed flex-1">{action}</span>
                            <button className="text-war-room-600 hover:text-white shrink-0 mt-0.5" onClick={() => handleCopy(action, idx)} aria-label="Copy">
                              {copiedIndex === idx ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.section>

                    {/* Live Thinking Transcript */}
                    <motion.section variants={fadeIn} className="bg-black rounded-xl border border-war-room-800 p-5 flex flex-col h-full font-mono relative overflow-hidden group">
                      <div className="absolute top-0 right-4 w-1 h-12 bg-blue-500/20 blur-xl" />
                      <h3 className="text-xs font-bold text-blue-500/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> AI Thinking Transcript
                      </h3>
                      <div className="text-xs text-war-room-400 leading-relaxed overflow-y-auto pr-2 custom-scrollbar flex-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {store.currentResult.reasoning_trace.split('\n').map((line, i) => (
                           <div key={i} className="mb-2 last:mb-0 break-words">{line}</div>
                        ))}
                      </div>
                      
                      {/* Meta Tags Footer */}
                      <div className="mt-4 pt-3 border-t border-war-room-800/50 flex flex-wrap gap-2 text-[10px]">
                         <span className="bg-war-room-900 text-war-room-500 px-2 py-1 rounded">FHIR: {store.currentResult.fhir_condition_code}</span>
                         <span className="bg-war-room-900 text-war-room-500 px-2 py-1 rounded">ACT: {store.currentResult.action_code}</span>
                         <span className="bg-war-room-900 text-war-room-500 px-2 py-1 rounded">MODALITY: {store.currentResult.input_modalities.join('|')}</span>
                      </div>
                    </motion.section>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>
    </div>
  );
}
