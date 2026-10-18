// The sign-in page.
// English is the source; vi has a line for every key in it (lib/i18n.ts).

export const en = {
  "signin.title": "Sign in to {app}",
  "signin.description": "With the account your team gave you.",
  "signin.email": "Email",
  "signin.email.needed": "An email address, please.",
  "signin.password": "Password",
  "signin.password.needed": "A password, please.",
  "signin.submit": "Sign in",
  "signin.failed": "Couldn't sign in",
} as const;

export const vi: Record<keyof typeof en, string> = {
  "signin.title": "Đăng nhập vào {app}",
  "signin.description": "Bằng tài khoản nhóm của bạn đã cấp.",
  "signin.email": "Email",
  "signin.email.needed": "Vui lòng nhập địa chỉ email.",
  "signin.password": "Mật khẩu",
  "signin.password.needed": "Vui lòng nhập mật khẩu.",
  "signin.submit": "Đăng nhập",
  "signin.failed": "Không đăng nhập được",
};
