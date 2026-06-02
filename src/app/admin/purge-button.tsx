"use client";

// Кнопка необратимого удаления из архива.
// Перед отправкой формы показывает подтверждение в браузере, чтобы случайный
// клик не стёр учётную запись со всеми данными. Само действие выполняет
// серверный экшен purgeUserAction (передаётся через проп action).

export default function PurgeButton({
  action,
  userId,
  email,
}: {
  action: (formData: FormData) => void | Promise<void>;
  userId: string;
  email: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Удалить НАВСЕГДА пользователя ${email}?\n\n` +
            "Будут безвозвратно стёрты: учётная запись, анкета, профиль и " +
            "переписка поддержки. Это действие нельзя отменить.",
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="confirm" value="ПОЛНОСТЬЮ" />
      <button
        type="submit"
        className="text-xs text-red-600 underline"
        title="Необратимо удалит учётную запись, анкету, профиль и переписку поддержки."
      >
        Удалить навсегда
      </button>
    </form>
  );
}
