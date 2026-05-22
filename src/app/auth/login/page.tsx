import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-2xl font-bold text-brand-ink">Вход</h1>
      <p className="text-brand-ink2 mt-2">Введите e-mail и пароль, указанные при регистрации.</p>
      <div className="mt-6 card">
        <LoginForm />
      </div>
      <p className="mt-4 text-sm text-brand-ink2">
        Ещё нет аккаунта? <Link href="/auth/register" className="text-brand underline">Зарегистрироваться</Link>
      </p>
    </div>
  );
}
