import AdminNav from "@/components/admin/AdminNav";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["ADMIN", "REGISTRAR", "REKTOR", "OWNER"]);

  return (
    <div>
      <AdminNav role={user.role} />
      {children}
    </div>
  );
}
