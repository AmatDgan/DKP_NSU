"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/lib/actions/login";

const initial: LoginState = {};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Входим…" : "Войти"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initial);
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
        <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        {fe.password && <div className="error">{fe.password[0]}</div>}
      </div>
      {state.error && <div className="error">{state.error}</div>}
      <SubmitBtn />
    </form>
  );
}
