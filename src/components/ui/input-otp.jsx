import React, { createContext, useContext, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const OTPContext = createContext();

export function InputOTP({ maxLength, value = "", onChange, autoFocus, children }) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus && refs.current[0]) refs.current[0].focus();
  }, [autoFocus]);

  const setChar = (i, c) => {
    c = (c || "").slice(-1);
    const arr = Array.from({ length: maxLength }, (_, k) => value[k] || "");
    arr[i] = c;
    onChange(arr.join(""));
    if (c && i < maxLength - 1) refs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").slice(0, maxLength);
    onChange(pasted);
    const last = Math.min(pasted.length, maxLength - 1);
    refs.current[last]?.focus();
  };

  return (
    <OTPContext.Provider value={{ value, setChar, handleKey, refs }}>
      <div className="flex items-center gap-2" onPaste={handlePaste}>
        {children}
      </div>
    </OTPContext.Provider>
  );
}

export function InputOTPGroup({ children }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

export function InputOTPSlot({ index }) {
  const { value, setChar, handleKey, refs } = useContext(OTPContext);
  return (
    <input
      ref={(el) => {
        refs.current[index] = el;
      }}
      type="text"
      inputMode="text"
      autoComplete="one-time-code"
      maxLength={1}
      value={value[index] || ""}
      onChange={(e) => setChar(index, e.target.value)}
      onKeyDown={(e) => handleKey(index, e)}
      className="h-14 w-12 rounded-lg border border-input bg-transparent text-center text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}