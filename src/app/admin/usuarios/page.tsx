import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import UserForm from "./UserForm";

export const metadata = { title: "Usuários do painel | Perfumio" };

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session || session.mustChangePassword) redirect("/admin");

  const users = await prisma.adminUser.findMany({
    select: { id: true, username: true, name: true, email: true, active: true, mustChangePassword: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  const canEmail = Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_MAIL_FROM);

  return (
    <main className="min-h-screen bg-brand-cream text-brand-chocolate">
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-8">
        <Link href="/admin" className="text-sm font-semibold underline">Voltar ao painel</Link>
        <h1 className="text-2xl font-bold">Usuários do painel</h1>
        {!canEmail && <p className="text-sm text-brand-muted">O envio por e-mail ainda precisa ser configurado. Você já pode gerar um link para compartilhar em particular.</p>}
        <details className="rounded-xl border border-brand-line bg-brand-card p-4">
          <summary className="cursor-pointer font-semibold">Adicionar usuário</summary>
          <UserForm />
        </details>
        <section aria-label="Contas administrativas" className="space-y-3">
          {users.map(user => (
            <UserForm key={user.id} user={user} isSelf={user.id === session.id} canEmail={canEmail} />
          ))}
        </section>
      </div>
    </main>
  );
}
