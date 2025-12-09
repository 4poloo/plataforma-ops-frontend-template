import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../global/components/Button";
import { Input } from "../../../global/components/Input";
import { login, type LoginRequest } from "../services/auth.api";
import { useAuth } from "../hooks/useAuth";
import { FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

type FormValues = LoginRequest & { remember?: boolean };

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ defaultValues: { alias: "", password: "" } });

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const res = await login({
        alias: values.alias.trim(),
        password: values.password,
      });
      setSession({ user: res.user, token: res.token ?? null });
      navigate("/app", { replace: true });
    } catch (e: any) {
      const message =
        typeof e?.message === "string" && e.message.trim()
          ? e.message
          : "Credenciales inválidas";
      setServerError(message);
      setError("alias", { message: " " });
      setError("password", { message: " " });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
        Usa cualquier usuario y contraseña (demo). Ejemplo: Usuario "a" y contraseña "a".
      </div>

      {serverError && (
        <div
          className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          {serverError}
        </div>
      )}

      <Input
        label="Alias"
        placeholder="Alias"
        leftIcon={<FiUser className="h-[18px] w-[18px]" aria-hidden />}
        {...register("alias", { required: "Requerido" })}
        error={errors.alias?.message}
        autoComplete="username"
      />

      <Input
        label="Contraseña"
        type={showPassword ? "text" : "password"}
        placeholder="••••••••"
        leftIcon={<FiLock className="h-[18px] w-[18px]" aria-hidden />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="flex items-center"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <FiEyeOff className="h-[18px] w-[18px]" />
            ) : (
              <FiEye className="h-[18px] w-[18px]" />
            )}
          </button>
        }
        {...register("password", { required: "Requerido" })}
        error={errors.password?.message}
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 ring-ring"
            {...register("remember")}
          />
          Recordarme
        </label>

        <a className="text-sm text-primary hover:underline" href="#">
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <Button type="submit" isLoading={isSubmitting} fullWidth size="lg" className="hover:bg-secondary">
        Ingresar
      </Button>
    </form>
  );
}
