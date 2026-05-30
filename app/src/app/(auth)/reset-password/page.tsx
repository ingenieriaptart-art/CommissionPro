"use client";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
    .regex(/[0-9]/, "Debe tener al menos un número"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Las contraseñas no coinciden", path: ["confirm"],
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const isFirst = params.get("first") === "true";
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: FormData) => {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); return; }

    // Marcar must_change_password = false
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("users")
        .update({ must_change_password: false })
        .eq("auth_user_id", user.id);
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl">
        {done ? (
          <div className="text-center py-8">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">¡Contraseña actualizada!</h2>
            <p className="text-slate-500 mt-2">Redirigiendo al panel...</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">
              {isFirst ? "Crea tu contraseña" : "Restablecer contraseña"}
            </h2>
            {isFirst && (
              <p className="text-slate-500 text-sm mb-6">
                Este es tu primer acceso. Por seguridad debes crear una nueva contraseña.
              </p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
              <Input {...register("password")} type="password" label="Nueva contraseña"
                icon={<Lock size={16} />} error={errors.password?.message} />
              <Input {...register("confirm")} type="password" label="Confirmar contraseña"
                icon={<Lock size={16} />} error={errors.confirm?.message} />
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
                Guardar contraseña
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
