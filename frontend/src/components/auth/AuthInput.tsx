import React, { useState } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  type = "text",
  id,
  error,
  required,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";
  const inputType = isPasswordType
    ? showPassword
      ? "text"
      : "password"
    : type;
  const inputId =
    id || `auth-input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wider text-[#1F1E1E]"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>

      <div className="relative w-full">
        <input
          id={inputId}
          type={inputType}
          required={required}
          className={`w-full px-4 py-3 bg-[#D9D9D9] text-[#1F1E1E] placeholder:text-[#1F1E1E]/50 rounded-none border border-transparent focus:border-[#1F1E1E] focus:bg-white focus:outline-none transition-colors duration-150 text-sm font-medium ${
            error ? "border-red-500 bg-red-50" : ""
          }`}
          {...props}
        />

        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-[#1F1E1E]/60 hover:text-[#1F1E1E] px-1 py-0.5 rounded-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {error && (
        <span className="text-xs font-medium text-red-600 mt-0.5" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
