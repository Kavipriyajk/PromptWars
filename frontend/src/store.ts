import { create } from 'zustand';
import axios from 'axios';

const API_BASE = '';

export interface DispatchAction {
  dispatched: boolean;
  priority: string;
  units: string[];
  medical_summary: string;
  location: { raw_text: string; latitude: number; longitude: number; formatted_address: string };
  hospital?: { name: string; address: string; distance_km: number; eta_mins: number };
}

export interface TriageResult {
  severity: string;
  assessment: string;
  recommended_actions: string[];
  confidence_score: number;
  reasoning_trace: string;
  dispatch: DispatchAction;
  input_modalities: string[];
  fhir_condition_code: string;
  action_code: string;
}

export interface CaseRecord {
  id: number;
  timestamp: number;
  input_text: string;
  severity: string;
  assessment: string;
  confidence: number;
  reasoning: string;
  dispatch_status: string;
  modalities: string;
  action_code: string;
}

interface AppState {
  inputText: string;
  setInputText: (text: string) => void;
  audioFile: string | null;
  audioName: string;
  setAudio: (base64: string | null, name: string) => void;
  imageFile: string | null;
  imageName: string;
  setImage: (base64: string | null, name: string) => void;
  documentFile: string | null;
  documentName: string;
  setDocument: (base64: string | null, name: string) => void;

  isLoading: boolean;
  currentResult: TriageResult | null;
  caseHistory: CaseRecord[];
  
  fetchHistory: () => Promise<void>;
  analyzeEmergency: () => Promise<void>;
  setCurrentResult: (result: TriageResult | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  inputText: '',
  setInputText: (text) => set({ inputText: text }),
  
  audioFile: null,
  audioName: '',
  setAudio: (base64, name) => set({ audioFile: base64, audioName: name }),
  
  imageFile: null,
  imageName: '',
  setImage: (base64, name) => set({ imageFile: base64, imageName: name }),

  documentFile: null,
  documentName: '',
  setDocument: (base64, name) => set({ documentFile: base64, documentName: name }),

  isLoading: false,
  currentResult: null,
  caseHistory: [],

  setCurrentResult: (result) => set({ currentResult: result }),

  fetchHistory: async () => {
    try {
      const res = await axios.get(`${API_BASE}/cases`);
      set({ caseHistory: res.data });
    } catch (err) {
      console.error('History fetch failed', err);
    }
  },

  analyzeEmergency: async () => {
    const { inputText, audioFile, imageFile, documentFile, fetchHistory } = get();
    if (!inputText.trim()) return;

    set({ isLoading: true, currentResult: null });
    
    try {
      // Background Task implementation: POST -> polling
      const startRes = await axios.post(`${API_BASE}/analyze/async`, {
        text: inputText,
        audio_base64: audioFile,
        image_base64: imageFile,
        document_base64: documentFile,
      });

      const jobId = startRes.data.job_id;

      // Poll until complete
      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API_BASE}/analyze/status/${jobId}`);
          if (statusRes.data.status === 'COMPLETED') {
            clearInterval(pollTimer);
            set({ currentResult: statusRes.data.result, isLoading: false });
            fetchHistory();
          } else if (statusRes.data.status === 'FAILED') {
            clearInterval(pollTimer);
            set({ isLoading: false });
            alert("Analysis failed. Please try again.");
          }
        } catch (err) {
          clearInterval(pollTimer);
          set({ isLoading: false });
          console.error("Polling error", err);
        }
      }, 2000); // poll every 2 seconds

    } catch (err) {
      console.error(err);
      set({ isLoading: false });
      alert('Error initiating analysis.');
    }
  }
}));
