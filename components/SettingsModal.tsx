
import React, { useState, useRef } from 'react';
import { X, Camera, Lock, Save, Loader2, AlertTriangle } from 'lucide-react';
import { auth, db } from '../firebase';
import { updatePassword, User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser;
  currentUsername: string;
  currentProfilePic?: string;
  onUpdate: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  currentUsername,
  currentProfilePic,
  onUpdate
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize image logic to keep Firestore happy (max 1MB doc size, target < 50KB)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress heavily
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPreviewImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Update Profile Picture
      if (previewImage) {
        await updateDoc(doc(db!, 'users', currentUser.uid), {
          profilePicture: previewImage
        });
      }

      // 2. Update Password
      if (newPassword) {
        if (newPassword.length < 6) {
            alert("La password deve essere di almeno 6 caratteri.");
            setLoading(false);
            return;
        }
        await updatePassword(currentUser, newPassword);
      }

      onUpdate(); // Refresh parent data
      onClose();
      setNewPassword('');
      setPreviewImage(null);
      alert("Profilo aggiornato con successo!");

    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        alert("Per sicurezza, devi effettuare nuovamente il login prima di cambiare la password.");
      } else {
        alert("Errore durante l'aggiornamento: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`bg-slate-900 w-full max-w-sm rounded-2xl p-6 relative z-10 border border-slate-700 shadow-2xl transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Modifica Profilo</h3>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-brand-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800">
              <img 
                src={previewImage || currentProfilePic || `https://ui-avatars.com/api/?name=${currentUsername}&background=random&color=fff&size=128`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" size={24} />
            </div>
            <div className="absolute bottom-0 right-0 bg-brand-accent p-1.5 rounded-full border-2 border-slate-900">
               <Camera size={14} className="text-brand-dark" />
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleImageChange}
          />
          <p className="text-[10px] text-brand-muted mt-2 uppercase font-bold tracking-widest">Tocca per cambiare foto</p>
        </div>

        {/* Password Reset */}
        <div className="space-y-4 mb-6">
          <label className="block">
            <span className="text-xs font-bold text-brand-muted uppercase mb-1 block">Nuova Password</span>
            <div className="relative">
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Lascia vuoto per non cambiare"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-accent transition-colors"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            </div>
          </label>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-2 items-start mb-6">
            <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-200/80 leading-tight">
               Se cambi la password, potresti dover effettuare nuovamente l'accesso su altri dispositivi.
            </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-brand-accent text-brand-dark font-bold py-3.5 rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          Salva Modifiche
        </button>

      </div>
    </div>
  );
};
