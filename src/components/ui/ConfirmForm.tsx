"use client";

import { useRef } from "react";

interface ConfirmFormProps {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
  hiddenFields?: Record<string, string>;
}

export default function ConfirmForm({
  action,
  message,
  children,
  hiddenFields,
}: ConfirmFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    if (!confirm(message)) {
      e.preventDefault();
    }
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit}>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {children}
    </form>
  );
}
