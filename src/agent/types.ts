// ============================================================
// Tipos del SuperAgente Constructor
// ============================================================

export type AppCategory =
  | "content"      // Blogs, noticias, recetas, tips
  | "tool"         // Calculadoras, conversores, checklists
  | "game"         // Juegos, quizzes, trivia
  | "social"       // Comunidad, foros, citas
  | "ecommerce"    // Tiendas, catálogos, afiliados
  | "education"    // Cursos, tutoriales, flashcards
  | "health"       // Fitness, dieta, meditación
  | "entertainment"// Música, vídeos, galerías
  | "productivity" // Notas, tareas, hábitos
  | "ai"           // Chatbots, generadores, asistentes
  | "hybrid";      // Mixto

export type MonetizationLayer = {
  admob: {
    enabled: boolean;
    banner: boolean;
    interstitial: boolean;
    rewarded: boolean;
    appId: string;     // ca-app-pub-xxx
    bannerId: string;
    interstitialId: string;
    rewardedId: string;
  };
  amazon: {
    enabled: boolean;
    trackingId: string;  // r3dm01-21
    autoLink: boolean;   // enlazar productos relacionados automáticamente
    category: string;    // categoría Amazon a afiliar
  };
  freellm: {
    enabled: boolean;
    apiKey: string;      // la del usuario no, la de R3DMOON
    features: string[];  // qué funcionalidades usa de freellm
  };
};

export type AppBlueprint = {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  features: string[];
  pages: string[];
  monetization: MonetizationLayer;
  prompt: string;        // El prompt original del usuario
  structure: "spa" | "multi-page" | "single-page";
  targetPlatform: "web" | "pwa" | "apk";
  techStack: string[];   // HTML, CSS, JS, etc.
  estimatedSize: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    darkMode: boolean;
  };
};

export type BuildStep = {
  step: number;
  name: string;
  status: "pending" | "running" | "done" | "error";
  progress: number; // 0-100
  detail: string;
};

export type BuildResult = {
  success: boolean;
  appId: string;
  appName: string;
  files: BuildFile[];
  apkUrl?: string;
  previewUrl?: string;
  monetizationSummary: string[];
  errors?: string[];
};

export type BuildFile = {
  name: string;
  path: string;
  content: string;
  size: number;
};

export type BuildProgress = {
  steps: BuildStep[];
  currentStep: number;
  totalSteps: number;
  progress: number; // 0-100 overall
  status: "idle" | "building" | "done" | "error";
};