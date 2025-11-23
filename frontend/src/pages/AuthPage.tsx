import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle, Mail } from "lucide-react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msalConfig";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/authStore";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ModeToggle } from "@/components/common/ModeToggle";

export default function AuthPage() {
  const navigate = useNavigate();
  const { sendEmailCode, verifyEmailCode, oauthLogin, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { instance } = useMsal();
  const [email, setEmail] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState(["", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/project");
    }
  }, [isAuthenticated, navigate]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await sendEmailCode(email);
      setShowCodeInput(true);
    } catch (err) {
      // error handled by store
    }
  };

  const handleCodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const fullCode = code.join("");
    if (fullCode.length === 5) {
      try {
        await verifyEmailCode(email, fullCode);
      } catch (err) {}
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (error) clearError();
    if (value && index < 4) inputRefs.current[index + 1]?.focus();
    if (index === 4 && value && newCode.every(d => d)) {
      verifyEmailCode(email, newCode.join("")).catch(() => {});
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 5);
    if (!/^\d+$/.test(pastedData)) return;
    const newCode = pastedData.split("").concat(Array(5).fill("")).slice(0, 5);
    setCode(newCode);
    const nextEmpty = newCode.findIndex(d => !d);
    inputRefs.current[nextEmpty !== -1 ? nextEmpty : 4]?.focus();
    if (newCode.every(d => d)) verifyEmailCode(email, newCode.join("")).catch(() => {});
  };

  const handleResendCode = async () => {
    clearError();
    setCode(["", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    try {
      await sendEmailCode(email);
    } catch (err) {}
  };
  
  const handleInputChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    if (error) clearError();
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;
    try {
      await oauthLogin(credentialResponse.credential, 'google');
    } catch (err) {
      // error handled by store
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      const result = await instance.loginPopup(loginRequest);
      if (result.idToken && result.accessToken) {
        await oauthLogin(`${result.idToken}|${result.accessToken}`, 'microsoft');
      }
    } catch (err) {
      // error handled by store
    }
  };

  const handleBackToEmail = () => {
    setShowCodeInput(false);
    setCode(["", "", "", "", ""]);
    clearError();
  };

  return (
    <div className="relative min-h-screen flex">
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <ModeToggle />
        <LanguageSwitcher />
      </div>
      <div className="w-full md:w-[520px] flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-background relative z-10">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              Q
            </div>
            <span className="text-xl font-semibold">QubitKit</span>
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {showCodeInput ? "Check your email" : "Welcome to QubitKit"}
            </h1>
            <p className="text-muted-foreground">
              {showCodeInput
                ? `We sent a verification code to ${email}`
                : "Sign in or create an account to continue"}
            </p>
          </div>
          {!showCodeInput ? (
            <div className="space-y-4">
              <FieldGroup>
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-1">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`relative ${isLoading ? 'opacity-50' : ''}`}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        console.error('Google Login Error occurred');
                        clearError();
                      }}
                      size="large"
                    />
                    {isLoading && (
                      <div className="absolute inset-0 cursor-not-allowed" />
                    )}
                  </div>
                  <button
                    type="button"
                    className="h-[40px] px-3 bg-white border border-[#dadce0] rounded-[4px] hover:bg-[#f7f8f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
                    disabled={isLoading}
                    onClick={handleMicrosoftLogin}
                  >
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0">
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00A4EF"/>
                      </svg>
                      <span className="text-sm font-medium text-[#3c4043]">Sign in with Microsoft</span>
                    </div>
                  </button>
                </div>
                <FieldSeparator>Or</FieldSeparator>
                <form onSubmit={handleEmailSubmit}>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={handleInputChange(setEmail)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      className="h-11"
                    />
                  </Field>
                  <Button type="submit" disabled={isLoading} className="w-full h-11 mt-4" variant="secondary">
                    <Mail className="h-4 w-4 mr-2" />
                    {isLoading ? "Sending code..." : "Continue with Email"}
                  </Button>
                </form>
              </FieldGroup>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleCodeSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-2 justify-center" onPaste={handleCodePaste} data-testid="code-inputs-container">
                    {code.map((digit, index) => (
                      <Input
                        key={index}
                        ref={el => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleCodeChange(index, e.target.value)}
                        onKeyDown={e => handleCodeKeyDown(index, e)}
                        disabled={isLoading}
                        className="w-12 h-14 text-center text-2xl font-semibold"
                        autoFocus={index === 0}
                        data-testid={`code-input-${index}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Enter the 5-digit code sent to {email}
                  </p>
                </div>
                <Button type="submit" disabled={isLoading || !code.every(d => d)} className="w-full h-11 cursor-pointer" data-testid="verify-code-button">
                  {isLoading ? "Verifying..." : "Continue"}
                </Button>
              </form>
              <div className="space-y-3">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-sm text-muted-foreground transition-colors disabled:opacity-50"
                  >
                    Not seeing the email in your inbox? <span className="text-primary font-medium underline cursor-pointer">Try sending again.</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  ← Use a different email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="hidden md:block flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20" />
        <div className="absolute inset-0 bg-gradient-to-tl from-indigo-200/50 via-transparent to-transparent dark:from-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-200/40 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent" />
      </div>
    </div>
  );
}
