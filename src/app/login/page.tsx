import { LoginForm } from "@/components/login-form";

// Força renderização dinâmica (sem cache de página estática) para que os
// headers de segurança por-requisição do middleware (CSP com nonce) sempre
// sejam aplicados nesta rota — é a porta de entrada da aplicação.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
