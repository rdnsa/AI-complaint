import { useState, type InputHTMLAttributes } from 'react';
import { useLanguage } from '../lib/i18n';
import { EyeGlyph } from './Marks';

/**
 * A password field with a show/hide button, so a typo can be seen instead of
 * guessed at. Takes every attribute a normal <input> takes, except `type`.
 */
export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const { className = '', ...rest } = props;

  return (
    <div className="relative">
      <input {...rest} type={visible ? 'text' : 'password'} className={`input !pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('password.hide') : t('password.show')}
        title={visible ? t('password.hide') : t('password.show')}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-base text-maroon-600 transition hover:text-bata-600"
      >
        <EyeGlyph off={visible} className="h-5 w-5" />
      </button>
    </div>
  );
}
