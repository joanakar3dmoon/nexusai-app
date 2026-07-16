import React from "react";
import { StrictMode, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Builder from "./pages/Builder";
import "./index.css";

class ErrorBoundary extends Component<{children: ReactNode}, {error: string|null}> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{color:"#ff4444",padding:"2rem",fontFamily:"monospace",background:"#000",minHeight:"100vh"}}>
          <h2>⚠️ Error de carga</h2>
          <pre style={{whiteSpace:"pre-wrap",fontSize:"12px"}}>{this.state.error}</pre>
          <button onClick={()=>window.location.reload()} style={{marginTop:"1rem",padding:"0.5rem 1rem",background:"#ff2222",color:"#fff",border:"none",borderRadius:"6px",cursor:"pointer"}}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/builder" element={<Builder />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
