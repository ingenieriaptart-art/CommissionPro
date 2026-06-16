"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { User } from "@/types";

const schema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setPermissions } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }: FormData) => {
    setServerError("");
    const supabase = createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !authData.user) {
      setServerError("Credenciales incorrectas. Verifica tu correo y contraseña.");
      return;
    }

    // Cargar perfil de usuario con rol y permisos
    const { data: userData } = await supabase
      .from("users")
      .select("*, role:roles(*, role_permissions(permission:permissions(*)))")
      .eq("auth_user_id", authData.user.id)
      .single();

    if (userData) {
      const perms = (userData.role?.role_permissions ?? [])
        .map((rp: { permission: { key: string } }) => rp.permission.key);
      setUser(userData as User);
      setPermissions(perms);

      if (userData.must_change_password) {
        router.push("/reset-password?first=true");
      } else {
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-40 mx-auto mb-4 bg-white rounded-2xl p-3 shadow-lg shadow-black/30">
            <Image
              src="/logo-biotec.png"
              alt="Biotec"
              width={160}
              height={72}
              className="object-contain w-full h-auto"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">CommissionPro</h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma de Comisionamiento Industrial</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">
            Inicia sesión en tu cuenta
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              {...register("email")}
              type="email"
              label="Correo electrónico"
              placeholder="usuario@empresa.com"
              icon={<Mail size={16} />}
              error={errors.email?.message}
              autoComplete="email"
            />

            <div>
              <Input
                {...register("password")}
                type={showPwd ? "text" : "password"}
                label="Contraseña"
                placeholder="••••••••"
                icon={<Lock size={16} />}
                error={errors.password?.message}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="mt-1 text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1">
                {showPwd ? <EyeOff size={12} /> : <Eye size={12} />}
                {showPwd ? "Ocultar" : "Mostrar"} contraseña
              </button>
            </div>

            {serverError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serverError}</p>
            )}

            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              Ingresar
            </Button>
          </form>

          <div className="mt-4 text-center">
            <a href="/reset-password" className="text-xs text-blue-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          CommissionPro © 2025 — Plataforma Industrial Empresarial
        </p>
      </div>
    </div>
  );
}
