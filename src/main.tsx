import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import { AuthProvider } from "./lib/auth";
import { convexClient } from "./lib/convex";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Builder from "./pages/Builder";
import "./index.css";

const App = (
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename="/nexusai-app">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/builder" element={<Builder />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);

// Si Convex está configurado, lo envolvemos
const root = createRoot(document.getElementById("root")!);
if (convexClient) {
  root.render(<ConvexProvider client={convexClient}>{App}</ConvexProvider>);
} else {
  root.render(App);
}