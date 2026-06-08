import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { isSoundEnabled, setSoundEnabled } from "../lib/sound";
import { Settings as SettingsIcon, Sun, Moon, Volume2, VolumeX, LogIn, LogOut, Trash2 } from "lucide-react";
import { clearStats } from "../lib/storage";

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [sound, setSound] = useState(isSoundEnabled());
  const navigate = useNavigate();

  return (
    <div data-testid="settings-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-6">
      <div>
        <span className="nb-badge bg-[#FFD3B6]"><SettingsIcon size={12} strokeWidth={3}/> Settings</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2">Tune your experience</h1>
      </div>

      <div className="nb-card p-5 bg-white">
        <h2 className="font-display font-bold text-xl">Account</h2>
        {user ? (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {user.picture
              ? <img src={user.picture} alt="" className="w-12 h-12 rounded-md nb-border object-cover"/>
              : <div className="w-12 h-12 rounded-md nb-border bg-[#A8E6CF] flex items-center justify-center font-display font-black">{(user.name||"?")[0].toUpperCase()}</div>}
            <div>
              <div className="font-bold">{user.name}</div>
              <div className="text-sm text-[#555]">{user.email} · {user.auth_provider}</div>
            </div>
            <button data-testid="settings-logout" onClick={async () => { await logout(); navigate("/"); }} className="nb-btn nb-btn-ghost ml-auto"><LogOut size={16} strokeWidth={3}/> Log out</button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-3 justify-between flex-wrap">
            <div className="text-sm text-[#555]">Guest mode — progress saved locally on this device.</div>
            <button data-testid="settings-login" onClick={() => navigate("/login")} className="nb-btn"><LogIn size={16} strokeWidth={3}/> Log in</button>
          </div>
        )}
      </div>

      <div className="nb-card p-5 bg-white">
        <h2 className="font-display font-bold text-xl">Appearance</h2>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">{theme === "light" ? <Sun strokeWidth={2.5}/> : <Moon strokeWidth={2.5}/>}<div className="font-bold">{theme === "light" ? "Light" : "Dark"} theme</div></div>
          <button data-testid="settings-theme-toggle" onClick={toggle} className="nb-btn">{theme === "light" ? <><Moon size={16} strokeWidth={3}/> Switch to dark</> : <><Sun size={16} strokeWidth={3}/> Switch to light</>}</button>
        </div>
      </div>

      <div className="nb-card p-5 bg-white">
        <h2 className="font-display font-bold text-xl">Sound</h2>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">{sound ? <Volume2 strokeWidth={2.5}/> : <VolumeX strokeWidth={2.5}/>}<div className="font-bold">{sound ? "Sound effects on" : "Sound effects off"}</div></div>
          <button
            data-testid="settings-sound-toggle"
            onClick={() => { const next = !sound; setSound(next); setSoundEnabled(next); }}
            className="nb-btn nb-btn-secondary"
          >
            {sound ? <><VolumeX size={16} strokeWidth={3}/> Mute</> : <><Volume2 size={16} strokeWidth={3}/> Unmute</>}
          </button>
        </div>
      </div>

      <div className="nb-card p-5 bg-[#FFE4EC]">
        <h2 className="font-display font-bold text-xl">Danger zone</h2>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm">Reset local stats (does not affect cloud-synced data if you&apos;re logged in).</div>
          <button data-testid="settings-clear" onClick={() => { clearStats(); }} className="nb-btn"><Trash2 size={16} strokeWidth={3}/> Clear local stats</button>
        </div>
      </div>
    </div>
  );
}
