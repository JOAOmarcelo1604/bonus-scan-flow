import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import PrivateRoute from "@/components/PrivateRoute";
import Login from "./pages/Login.tsx";
import Index from "./pages/Index.tsx";
import RecebimentoBonusLista from "./pages/RecebimentoBonusLista.tsx";
import RecebimentoBonusBipagem from "./pages/RecebimentoBonusBipagem.tsx";
import Auditoria from "./pages/Auditoria.tsx";
import AprovacaoBonus from "./pages/AprovacaoBonus.tsx";
import SolicitacoesEtiqueta from "./pages/SolicitacoesEtiqueta.tsx";

import DobraMateriaisBipagem from "./pages/DobraMateriaisBipagem.tsx";
import AberturaMaterialBipagem from "./pages/AberturaMaterialBipagem.tsx";
import Inventario from "./pages/Inventario.tsx";
import InventarioRegistro from "./pages/InventarioRegistro.tsx";
import InventarioAprovacao from "./pages/InventarioAprovacao.tsx";
import ControleAcesso from "./pages/ControleAcesso.tsx";
import SeparacaoPage from "./pages/SeparacaoPage.tsx";
import RelatorioInventarioBitola from "./pages/relatorio/RelatorioInventarioBitola.tsx";
import RelatorioAuditoriaEstoque from "./pages/relatorio/RelatorioAuditoriaEstoque.tsx";
import RelatorioEstoqueFisico from "./pages/relatorio/RelatorioEstoqueFisico.tsx";
import ReimpressaoEtiqueta from "./pages/ReimpressaoEtiqueta.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rota pública */}
            <Route path="/login" element={<Login />} />

            {/* Rotas protegidas */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/recebimento-bonus" element={<RecebimentoBonusLista />} />
              <Route path="/recebimento-bonus/:numBonus" element={<RecebimentoBonusBipagem />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/aprovacao-bonus" element={<AprovacaoBonus />} />
              <Route path="/solicitacoes-etiqueta" element={<SolicitacoesEtiqueta />} />
              <Route path="/dobra-materiais" element={<DobraMateriaisBipagem />} />
              <Route path="/abertura-material" element={<AberturaMaterialBipagem />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/inventario/registro" element={<InventarioRegistro />} />
              <Route path="/inventario/aprovacao" element={<InventarioAprovacao />} />
              <Route path="/controle-acesso" element={<ControleAcesso />} />
              <Route path="/separacao" element={<SeparacaoPage />} />
              <Route path="/relatorio/inventario-bitola" element={<RelatorioInventarioBitola />} />
              <Route path="/relatorio/auditoria-estoque" element={<RelatorioAuditoriaEstoque />} />
              <Route path="/relatorio/estoque-fisico" element={<RelatorioEstoqueFisico />} />
              <Route path="/reimpressao-etiqueta" element={<ReimpressaoEtiqueta />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
