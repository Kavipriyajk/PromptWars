import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldAlert, 
  Shield, 
  ShieldCheck, 
  Activity, 
  Upload, 
  Mic, 
  Send, 
  Copy, 
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

interface TriageResult {
  severity: string;
  assessment: string;
  recommended_actions: string[];
  confidence_score: number;
  reasoning_trace: string;
  dispatch_alerted: boolean;
}

interface CaseRecord extends TriageResult {
  id: number;
  timestamp: number;
  input_text: string;
}

function App() {
  const [inputText, setInputText] = useState('');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<TriageResult | null>(null);
  const [caseHistory, setCaseHistory] = useState<CaseRecord[]>([]);
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/cases`);
      setCaseHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
  });

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const b64 = await toBase64(e.target.files[0]);
      setAudioBase64(b64.split(',')[1]); // remove data:audio/mp3;base64,
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const b64 = await toBase64(e.target.files[0]);
      setImageBase64(b64.split(',')[1]);
    }
  };

  const analyzeEmergency = async () => {
    if (!inputText) return;
    setIsLoading(true);
    setCurrentResult(null);
    try {
      const res = await axios.post(`${API_BASE}/analyze`, {
        text: inputText,
        audio_base64: audioBase64,
        image_base64: imageBase64
      });
      setCurrentResult(res.data);
      fetchHistory(); // refresh sidebar
    } catch (err) {
      console.error(err);
      alert("Error analyzing emergency");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getShieldIcon = (severity: string) => {
    switch(severity.toLowerCase()) {
      case 'red': return <ShieldAlert size={40} />;
      case 'yellow': return <Shield size={40} />;
      case 'green': return <ShieldCheck size={40} />;
      default: return <Shield size={40} />;
    }
  };

  const getShieldClass = (severity: string) => {
    switch(severity.toLowerCase()) {
      case 'red': return 'shield-red';
      case 'yellow': return 'shield-yellow';
      case 'green': return 'shield-green';
      default: return '';
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="app-container">
      {/* Sidebar: Case History */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title"><Activity color="#ef4444" /> HQ Logs</h2>
        </div>
        <div className="case-list">
          {caseHistory.map((c) => (
            <div key={c.id} className="case-item" onClick={() => setCurrentResult(c)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="case-time"><Clock size={12} style={{display:'inline', marginRight:4}}/>{formatTime(c.timestamp)}</span>
                <span className={`tag-badge tag-${c.severity.toLowerCase()}`}>{c.severity}</span>
              </div>
              <div className="case-preview">{c.input_text}</div>
            </div>
          ))}
          {caseHistory.length === 0 && (
            <div style={{color:'#64748b', textAlign:'center', fontSize:'0.875rem', marginTop:'2rem'}}>No previous cases</div>
          )}
        </div>
      </div>

      {/* Main Content (War Room Dashboard) */}
      <div className="main-content">
        <div className="war-room-header">
          <h1 style={{margin:0, fontSize:'1.5rem', fontWeight:700, letterSpacing:'-0.5px'}}>
            GOLDEN HOUR <span style={{color:'#64748b', fontWeight:400}}>|</span> Decision Bridge
          </h1>
          <div className="header-status">
            <div className="status-dot"></div> Systems Online
          </div>
        </div>

        <div className="content-grid">
          {/* Left Column: Input */}
          <div className="input-panel">
            <h2 className="panel-title">Incident Intake</h2>
            
            <div className="input-group">
              <label className="input-label">Situation Description *</label>
              <textarea 
                placeholder="E.g., 45yo male, severe chest pain, shortness of breath, history of heart disease..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Multimodal Datastreams <span style={{color:'#64748b', fontSize:'0.75rem'}}>Optional</span></label>
              <div className="multimodal-row">
                <label className="file-btn">
                  <Mic size={24} color={audioBase64 ? "#3b82f6" : undefined} />
                  <span>{audioBase64 ? "Audio Attached" : "Upload Audio (Voice)"}</span>
                  <input type="file" accept="audio/*" onChange={handleAudioUpload} />
                </label>
                
                <label className="file-btn">
                  <Upload size={24} color={imageBase64 ? "#3b82f6" : undefined} />
                  <span>{imageBase64 ? "Image Attached" : "Upload Image (Scene)"}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            <button 
              className="analyze-btn" 
              onClick={analyzeEmergency} 
              disabled={isLoading || !inputText}
            >
              {isLoading ? 'Processing Signal...' : 'ANALYZE EMERGENCY'}
              <Send size={20} />
            </button>
          </div>

          {/* Right Column: Output / Dashboard */}
          <div className="output-panel">
            {!isLoading && !currentResult && (
              <div className="empty-state">
                <Activity size={48} className="empty-icon" />
                <p>Awaiting incoming civilian signal.</p>
                <p style={{fontSize: '0.875rem', marginTop: '0.5rem'}}>Enter text or upload media to begin processing.</p>
              </div>
            )}

            {isLoading && (
              <div className="thinking-state">
                <div className="radar-container">
                  <Activity size={48} color="#3b82f6" />
                  <div className="radar-sweep"></div>
                </div>
                <div className="animate-pulse thinking-text">
                  <span style={{color: '#94a3b8'}}>»</span> DECODING SIGNAL TRACE
                  <br />
                  <span style={{color: '#94a3b8'}}>»</span> APPLYING CHAIN-OF-THOUGHT
                  <br />
                  <span style={{color: '#94a3b8'}}>»</span> ASSESSING SEVERITY
                </div>
              </div>
            )}

            {!isLoading && currentResult && (
              <div style={{animation: 'fade-in 0.5s ease-out', display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                
                {/* Shield Card */}
                <div className={`shield-container`}>
                  <div className={`shield-icon ${getShieldClass(currentResult.severity)}`}>
                    {getShieldIcon(currentResult.severity)}
                  </div>
                  <div className="shield-info">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <div>
                        <h2 style={{color: '#f8fafc'}}>Critical Assessment</h2>
                        <div style={{color: '#94a3b8', fontSize:'0.875rem', lineHeight:'1.4'}}>
                          {currentResult.assessment}
                        </div>
                      </div>
                      <div className="confidence-badge">
                        AI CONFIDENCE: {(currentResult.confidence_score * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dispatch Alert */}
                {currentResult.dispatch_alerted && (
                  <div className="dispatch-alert">
                    <div className="dispatch-icon">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <strong>DISPATCH ALERT TRIGGERED</strong>
                      <div style={{fontSize: '0.875rem'}}>Emergency medical services have been requested to the location.</div>
                    </div>
                  </div>
                )}

                {/* Checklist */}
                <div className="actions-list">
                  <h3 style={{fontSize:'1rem', color:'#cbd5e1', margin:0, marginBottom:'0.5rem'}}>Required Actions</h3>
                  {currentResult.recommended_actions.map((action, idx) => (
                    <div key={idx} className="action-card">
                      <div className="action-text">
                        <div className="action-number">{idx + 1}</div>
                        {action}
                      </div>
                      <button className="copy-btn" onClick={() => handleCopy(action, idx)} title="Copy to clipboard">
                        {copiedIndex === idx ? <CheckCircle2 size={18} color="#22c55e" /> : <Copy size={18} />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Reasoning Trace */}
                <div className="reasoning-box">
                  <strong style={{color:'#64748b'}}>INTERNAL REASONING TRACE:</strong><br/><br/>
                  {currentResult.reasoning_trace}
                </div>

              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
