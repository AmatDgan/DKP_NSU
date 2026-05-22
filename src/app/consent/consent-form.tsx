"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { giveConsentAction, type ConsentState } from "@/lib/actions/consent";

const initial: ConsentState = {};

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || disabled}>
      {pending ? "Сохраняем…" : "Подтвердить согласие"}
    </button>
  );
}

export function ConsentForm() {
  const [state, formAction] = useFormState(giveConsentAction, initial);
  const [agreed, setAgreed] = useState(false);
  return (
    <form action={formAction} className="card space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="agree"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[color:var(--brand)]"
          required
        />
        <span className="text-brand-ink2">
          Я ознакомлен(а) с целями и условиями обработки персональных данных и даю
          согласие на их обработку в порядке, указанном выше (152-ФЗ).
        </span>
      </label>
      {state.error && <div className="error">{state.error}</div>}
      <Submit disabled={!agreed} />
    </form>
  );
}
