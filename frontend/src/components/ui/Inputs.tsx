import { forwardRef, useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, required, error, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`crew-field ${className}`}>
      {label && (
        <label className="crew-label">
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="crew-error-text" role="alert">
          <AlertCircle size={13} aria-hidden /> {error}
        </span>
      )}
      {!error && hint && <span className="crew-helper">{hint}</span>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  monospace?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, monospace, className = '', ...rest },
  ref,
) {
  const cls = [
    'crew-input',
    invalid ? 'crew-input--error' : '',
    monospace ? 'crew-input--mono' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <input ref={ref} className={cls} {...rest} />;
});

interface PasswordInputProps extends Omit<InputProps, 'type'> {
  invalid?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className = '', invalid, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} invalid={invalid} className={`pr-10 ${className}`} {...rest} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded crew-focusable text-muted hover:text-ink"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
});

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { invalid, className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} className={`crew-textarea ${invalid ? 'crew-input--error' : ''} ${className}`} {...rest} />;
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={`crew-input appearance-none pr-8 ${invalid ? 'crew-input--error' : ''} ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%235B6270' stroke-width='2'><path d='M3.5 5.5L7 9l3.5-3.5'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
      {...rest}
    >
      {children}
    </select>
  );
});