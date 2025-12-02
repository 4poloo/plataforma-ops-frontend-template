import CuentaHeader from "../components/CuentaHeader";
import CuentaPerfilForm from "../components/CuentaPerfilForm";
import CuentaPasswordForm from "../components/CuentaPasswordForm";

export default function ConfiguracionMiCuenta() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <CuentaHeader />

      <div className="space-y-6">
        <div className="rounded-2xl bg-white shadow p-4 md:p-6 border-1">
          <h3 className="text-sm font-semibold mb-3">Perfil</h3>
          <CuentaPerfilForm />
        </div>

        <div className="rounded-2xl bg-white shadow p-4 md:p-6 border-1">
          <h3 className="text-sm font-semibold mb-3">Seguridad</h3>
          <CuentaPasswordForm />
        </div>
      </div>
    </div>
  );
}
