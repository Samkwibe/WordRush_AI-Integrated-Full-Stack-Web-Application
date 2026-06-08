import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import Nav from "@/components/Nav";
import Home from "@/pages/Home";
import FlashMode from "@/pages/FlashMode";
import SpeedRead from "@/pages/SpeedRead";
import MemoryMatch from "@/pages/MemoryMatch";
import SpeedCode from "@/pages/SpeedCode";
import WordLists from "@/pages/WordLists";
import Stats from "@/pages/Stats";
import Leaderboard from "@/pages/Leaderboard";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import Settings from "@/pages/Settings";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

function AppRouter() {
  const location = useLocation();
  // Handle OAuth callback fragment synchronously during render to avoid races
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flash" element={<FlashMode />} />
        <Route path="/speed-read" element={<SpeedRead />} />
        <Route path="/match" element={<MemoryMatch />} />
        <Route path="/code" element={<SpeedCode />} />
        <Route path="/lists" element={<WordLists />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
      <footer className="border-t-[3px] border-[var(--ink)] bg-[var(--surface)] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 flex items-center justify-between text-sm flex-wrap gap-2 text-[var(--ink)]">
          <div className="font-display font-bold">WordRush — train fast, remember more.</div>
          <div className="text-[var(--muted)]">Progress saved on this device. Cloud sync when logged in.</div>
        </div>
      </footer>
    </>
  );
}

function App() {
  return (
    <div className="App min-h-screen">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </div>
  );
}

export default App;
