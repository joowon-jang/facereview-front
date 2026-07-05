import { useAuthStorage } from 'store/authStore';
import { useSignInPromptStore } from 'store/signInPromptStore';

/**
 * Returns a function that opens the global "sign-in required" modal when the
 * user is not signed in. Use it as a gate before authenticated actions:
 *
 *   const requireSignIn = useRequireSignIn();
 *   if (!requireSignIn()) return;
 *
 * Returns `true` when signed in (caller may proceed), `false` otherwise
 * (the prompt modal has been opened — caller should abort the action).
 */
export const useRequireSignIn = () => {
  const is_sign_in = useAuthStorage((s) => s.is_sign_in);
  const open = useSignInPromptStore((s) => s.open);

  return () => {
    if (is_sign_in) return true;
    open();
    return false;
  };
};
