import { motion } from "motion/react";
import { BrainCircuit, Users, DollarSign, CreditCard, TrendingUp, Settings, LogOut, Menu, X, Download, ChevronRight, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

type WithdrawalRequest = {
  id: string;
  userEmail: string;
  amount: number;
  paypalEmail: string;
  status: "pending" | "processing" | "completed" | "rejected";
  createdAt: string;
};

export default function Admin() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock data for admin view
  const [withdrawals] = useState<WithdrawalRequest[]>([
    {
      id: "1",
      userEmail: "usuario@ejemplo.com",
      amount: 150,
      paypalEmail: "usuario@paypal.com",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ]);

  const stats = [
    { label: "Usuarios totales", value: "47", icon: Users, change: "+12 esta semana" },
    { label: "Apps generadas", value: "128", icon: Download, change: "+34 hoy" },
    { label: "Ingresos totales", value: "€2,847", icon: TrendingUp, change: "€847 esta semana" },
    { label: "Retiros pendientes", value: "€150", icon: DollarSign, change: "1 solicitud" },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">Acceso denegado</h2>
            <p className="text-sm text-muted-foreground mb-4">Solo el administrador puede acceder a este panel.</p>
            <Button onClick={() => navigate("/dashboard")} className="cursor-pointer">Volver al Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <BrainCircuit className="text-primary w-6 h-6" />
          <span className="font-bold">NexusAI</span>
          <Badge className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">Admin</Badge>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-primary/10 text-primary cursor-pointer">
            <DollarSign className="w-4 h-4" />
            Finanzas
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <Users className="w-4 h-4" />
            Usuarios
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <CreditCard className="w-4 h-4" />
            Retiros
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <Settings className="w-4 h-4" />
            Configuración
          </button>
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="text-xs text-muted-foreground px-3">
            <span className="block">{user?.email}</span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
            Ir al Dashboard
          </button>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 cursor-pointer">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <button className="md:hidden cursor-pointer" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-sm">Panel de Administración</h1>
            <Badge variant="outline" className="text-xs">Admin</Badge>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-[10px] text-emerald-400 mt-1">{stat.change}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Payouts Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Solicitudes de Retiro (PayPal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay solicitudes de retiro pendientes.</p>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">€{w.amount}</span>
                          <Badge className={
                            w.status === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            w.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          }>
                            {w.status === "pending" && "Pendiente"}
                            {w.status === "processing" && "Procesando"}
                            {w.status === "completed" && "Completado"}
                            {w.status === "rejected" && "Rechazado"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          PayPal: {w.paypalEmail} — {new Date(w.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {w.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-500">
                            <Check className="w-3 h-3 mr-1" /> Pagar
                          </Button>
                          <Button size="sm" variant="destructive" className="cursor-pointer">
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configuración de Monetización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">Amazon Afiliados</p>
                  <p className="text-xs text-muted-foreground">Tracking ID: r3dm01-21 (ES, IT, DE, FR, UK)</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Activo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium">Retiros a PayPal</p>
                  <p className="text-xs text-muted-foreground">Email: joanlazaro83@gmail.com</p>
                </div>
                <Badge variant="outline">Configurado</Badge>
              </div>
              <div className="p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
                <p className="text-xs text-muted-foreground">
                  💡 Los retiros se procesan manualmente. Cada solicitud se revisa y se paga desde el panel de administración.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}