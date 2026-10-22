const messages: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos. Confira os dados e tente de novo.",
  "auth/wrong-password": "E-mail ou senha incorretos. Confira os dados e tente de novo.",
  "auth/user-not-found": "E-mail ou senha incorretos. Confira os dados e tente de novo.",
  "auth/invalid-email": "Digite um e-mail válido, como nome@exemplo.com.",
  "auth/missing-password": "Digite sua senha.",
  "auth/email-already-in-use": "Já existe uma conta com este e-mail. Tente entrar em vez de criar uma conta.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet. Verifique sua rede e tente de novo.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.",
  "auth/account-exists-with-different-credential":
    "Este e-mail já está cadastrado com outro método de login. Entre com e-mail e senha.",
  "auth/user-disabled": "Esta conta foi desativada. Fale com o suporte.",
};

const silentCodes = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

export const GENERIC_AUTH_ERROR = "Não foi possível entrar agora. Tente de novo em instantes.";

function errorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };
    return typeof code === "string" ? code : null;
  }
  return null;
}

export function authErrorMessage(error: unknown): string | null {
  const code = errorCode(error);
  if (code && silentCodes.has(code)) return null;
  return (code && messages[code]) || GENERIC_AUTH_ERROR;
}
