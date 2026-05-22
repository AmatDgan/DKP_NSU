import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Регистрация" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-2xl font-bold text-brand-ink">Регистрация</h1>
      <p className="text-brand-ink2 mt-2">
        Создайте аккаунт, чтобы подать заявку на участие в программе повышения квалификации.
      </p>
      <div className="mt-6 card">
        <RegisterForm />
      </div>
      <p className="mt-4 text-sm text-brand-ink2">
        Уже зарегистрированы? <Link href="/auth/login" className="text-brand underline">Войти</Link>
      </p>
    </div>
  );
}
