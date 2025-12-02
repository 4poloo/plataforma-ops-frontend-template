import LoginForm from "../components/LoginForm";

/** Panel decorativo izquierdo */
function WelcomePanel() {
  return (
    <div className="relative flex h-full w-full flex-col justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary p-8 text-primary-foreground overflow-hidden">
      {/* formas decorativas */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-secondary/30 blur-3xl" />
      </div>

      <div className="relative">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-36 w-36 overflow-hidden rounded-full bg-white ring-4 ring-secondary/95 shadow">
            <img
              src="/tulogo.png"
              alt="Logo Empresa"
              className="h-full w-full object-contain bg-white"
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold leading-tight">¡Bienvenido de vuelta!</h1>
        <p className="mt-2 max-w-sm text-sm/6 text-primary-foreground/90">
          Inicia sesión para acceder a tu cuenta y continuar con tu trabajo.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-t from-gray-300 to-gray-800 px-4 ">
      <div className="w-[min(100%,1000px)] grid grid-cols-1 overflow-hidden rounded-3xl border border-border hover:mb-1.5 hover:shadow-secondary transition-all duration-300 bg-gray-200 shadow-2xl md:grid-cols-2">
        {/* Izquierda: panel de bienvenida */}
        <div className="hidden md:block">
          <WelcomePanel />
        </div>

        {/* Derecha: formulario */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center md:text-left">
              <h3 className="text-2xl font-semibold text-foreground">Inicia sesión</h3>
              <p className="mt-1 text-sm text-foreground/70">
                Usa tus credenciales corporativas
              </p>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-xs text-foreground/60">
              © {new Date().getFullYear()} · Empresa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
