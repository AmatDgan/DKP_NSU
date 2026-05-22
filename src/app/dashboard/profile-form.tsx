"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveProfileAction, type ProfileState } from "@/lib/actions/profile";

type Defaults = {
  fullName: string;
  university: string;
  city: string;
  department: string;
  position: string;
  phone: string;
  contactEmail: string;
};

const initial: ProfileState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Сохраняем…" : "Сохранить анкету"}
    </button>
  );
}

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction] = useFormState(saveProfileAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="fullName">ФИО полностью</label>
        <input className="input" id="fullName" name="fullName" defaultValue={defaults.fullName} required />
        {fe.fullName && <div className="error">{fe.fullName[0]}</div>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="university">Наименование вуза</label>
          <input className="input" id="university" name="university" defaultValue={defaults.university} required />
          {fe.university && <div className="error">{fe.university[0]}</div>}
        </div>
        <div>
          <label className="label" htmlFor="city">Город</label>
          <input className="input" id="city" name="city" defaultValue={defaults.city} required />
          {fe.city && <div className="error">{fe.city[0]}</div>}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="department">Подразделение вуза (институт, факультет)</label>
        <input className="input" id="department" name="department" defaultValue={defaults.department} required />
        {fe.department && <div className="error">{fe.department[0]}</div>}
      </div>
      <div>
        <label className="label" htmlFor="position">Должность</label>
        <input className="input" id="position" name="position" defaultValue={defaults.position} required />
        {fe.position && <div className="error">{fe.position[0]}</div>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="phone">Контактный телефон</label>
          <input className="input" id="phone" name="phone" type="tel" defaultValue={defaults.phone} required />
          {fe.phone && <div className="error">{fe.phone[0]}</div>}
        </div>
        <div>
          <label className="label" htmlFor="contactEmail">E-mail для связи</label>
          <input className="input" id="contactEmail" name="contactEmail" type="email" defaultValue={defaults.contactEmail} required />
          {fe.contactEmail && <div className="error">{fe.contactEmail[0]}</div>}
        </div>
      </div>
      {state.error && <div className="error">{state.error}</div>}
      {state.ok && <div className="text-green-700 text-sm">Анкета сохранена.</div>}
      <Submit />
    </form>
  );
}
