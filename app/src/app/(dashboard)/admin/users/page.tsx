"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { fmtDate } from "@/lib/utils";
import { Plus, Users, Search, Mail, Building } from "lucide-react";
import type { User } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("*, role:roles(name,key), company:companies(name)")
        .is("deleted_at", null)
        .order("full_name");
      setUsers((data ?? []) as User[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusVariant = (s: string) =>
    s === "active" ? "success" : s === "blocked" ? "danger" : "default";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} usuario(s)</p>
        </div>
        <Button icon={<Plus size={16} />}>Nuevo usuario</Button>
      </div>

      <Input
        placeholder="Buscar por nombre o correo..."
        icon={<Search size={16} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Users size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay usuarios registrados</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((u) => (
            <Card key={u.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{u.full_name}</p>
                    <Badge variant={statusVariant(u.status) as "success"|"danger"|"default"}>
                      {u.status === "active" ? "Activo" : u.status === "blocked" ? "Bloqueado" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail size={11} />{u.email}
                  </p>
                  {u.position && (
                    <p className="text-xs text-slate-500 mt-0.5">{u.position}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {u.role && <Badge variant="info">{(u.role as { name: string }).name}</Badge>}
                    {u.company && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Building size={11} />{(u.company as { name: string }).name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
