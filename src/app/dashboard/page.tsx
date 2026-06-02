import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";
import { SupportChat } from "./support-chat";

export const metadata = { title: "Личный кабинет" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="font-serif text-3xl font-bold text-brand-ink">Личный кабинет</h1>
        <p className="text-brand-ink2 mt-1">
          {user.email} · {user.role === "ADMIN" ? "Администратор" : "Участник"}
        </p>
      </header>

      {!user.consentGiven ? (
        <div className="card border border-brand bg-[#fff7f8]">
          <h2 className="font-serif text-lg font-bold text-brand-ink">
            Подтвердите согласие на обработку персональных данных
          </h2>
          <p className="mt-2 text-brand-ink2">
            Заполнение анкеты возможно только после явного согласия на обработку
            персональных данных (152-ФЗ). Перейдите на страницу согласия и поставьте флажок.
          </p>
          <Link href="/consent" className="btn-primary mt-4">Перейти к согласию</Link>
        </div>
      ) : (
        <>
          <div className="card bg-[#f3f7f3] text-brand-ink2 text-sm">
            Согласие на обработку персональных данных подтверждено
            {user.consentAt && (
              <> · {new Date(user.consentAt).toLocaleString("ru-RU")}</>
            )}.{" "}
            <Link href="/consent" className="underline">Управление согласием</Link>
          </div>
          <section className="card">
            <h2 className="font-serif text-xl font-bold text-brand-ink mb-4">
              Анкета участника
            </h2>
            <ProfileForm
              defaults={{
                fullName: user.profile?.fullName ?? "",
                university: user.profile?.university ?? "",
                city: user.profile?.city ?? "",
                department: user.profile?.department ?? "",
                position: user.profile?.position ?? "",
                phone: user.profile?.phone ?? "",
                contactEmail: user.profile?.contactEmail ?? user.email,
              }}
            />
          </section>
        </>
      )}

      <SupportChat />
    </div>
  );
}
