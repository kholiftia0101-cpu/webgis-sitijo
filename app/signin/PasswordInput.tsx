
"use client";

import { useState } from "react";

export default function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-wrapper">
      <input
        type={showPassword ? "text" : "password"}
        id="password"
        name="password"
        placeholder="Masukkan password"
        autoComplete="current-password"
        required
      />

      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        aria-label={
          showPassword ? "Sembunyikan password" : "Tampilkan password"
        }
      >
        {showPassword ? "Sembunyikan" : "Lihat"}
      </button>
    </div>
  );
}
