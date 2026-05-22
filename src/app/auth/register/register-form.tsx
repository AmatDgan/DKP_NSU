"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerAction, type RegisterState } from "@/lib/actions/register";

const initial: RegisterState = {};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        {fe.email && <div className="error">{fe.email[0]}</div>}
      </div>
      <div>
        <label className="label" htmlFor="password">Пароль</label>
        <input className="input" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        {fe.password && <div className="error">{fe.password[0]}</div>}
      </div>
      <div>
        <label className="label" htmlFor="confirm">Повторите пароль</label>
        <input className="input" id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        {fe.confirm && <div className="error">{fe.confirm[0]}</div>}
      </div>
      {state.error && <div className="error">{state.error}</div>}
      <SubmitBtn />
      <p className="text-xs text-brand-ink3 leading-relaxed">
        Регистрируясь, вы создаёте учётную запись. Перед загрузкой персональных данных потребуется отдельно подтвердить
        согласие на их обработку.
      </p>
    </form>
  );
}
