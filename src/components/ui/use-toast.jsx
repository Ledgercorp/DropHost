import React, { useEffect, useState } from "react";

let listeners = [];
let toasts = [];
let id = 0;

export function toast(props) {
  const tid = ++id;
  toasts = [...toasts, { id: tid, ...props }];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== tid);
    listeners.forEach((l) => l(toasts));
  }, 5000);
}

export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-border bg-card p-4 shadow-lg"
        >
          {t.title && <p className="font-semibold text-foreground text-sm">{t.title}</p>}
          {t.description && (
            <p className="text-muted-foreground text-sm mt-1">{t.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}