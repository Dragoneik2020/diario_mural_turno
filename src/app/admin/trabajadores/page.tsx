import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TrabajadoresRedirect() {
  redirect("/admin/cuentas");
}
