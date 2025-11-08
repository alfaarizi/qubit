import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msalConfig";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/authStore";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ModeToggle } from "@/components/common/ModeToggle";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, oauthLogin, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { instance } = useMsal();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    // clear any stale errors on mount
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/project");
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setValidationError("");
    clearError();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError("");
    clearError();

    if (formData.password.length < 8) {
      setValidationError("Password must be at least 8 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    try {
      await register(
        formData.email,
        formData.password,
        formData.firstName || undefined,
        formData.lastName || undefined
      );
      // Navigation happens in useEffect when isAuthenticated becomes true
    } catch (err) {
      // error handled by store
    }
  };

  const displayError = validationError || error;

  const handleGoogleSuccess = async (credentialResponse: any) => {
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
      // Error handled by store
    }
  };

  return (
    <div className="relative min-h-screen flex">
      {/* Language Switcher and Mode Toggle - Top Right */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        <ModeToggle />
        <LanguageSwitcher />
      </div>
      {/* left form section */}
      <div className="w-full md:w-[520px] flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-background relative z-10">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              Q
            </div>
            <span className="text-xl font-semibold">QubitKit</span>
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-muted-foreground">
              Get started with QubitKit today
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              {displayError && (
                <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="firstName">First name</FieldLabel>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange("firstName")}
                    disabled={isLoading}
                    autoComplete="given-name"
                    className="h-11"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange("lastName")}
                    disabled={isLoading}
                    autoComplete="family-name"
                    className="h-11"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange("email")}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={handleChange("password")}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-11"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="h-11"
                />
              </Field>
              <Button type="submit" disabled={isLoading} className="w-full h-11">
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
              <FieldSeparator>Or</FieldSeparator>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <div className="absolute inset-0 pointer-events-none opacity-0">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => clearError()}
                    />
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full h-11 justify-center"
                    disabled={isLoading}
                    onClick={() => {
                      const googleBtn = document.querySelector('[role="button"][aria-labelledby]') as HTMLElement;
                      if (googleBtn) googleBtn.click();
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 -mt-0.5">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="leading-none">Google</span>
                    </div>
                  </Button>
                </div>

                <Button
                  variant="outline"
                  type="button"
                  className="w-full h-11 justify-center"
                  disabled={isLoading}
                  onClick={handleMicrosoftLogin}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 -mt-0.5">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00A4EF"/>
                    </svg>
                    <span className="leading-none">Microsoft</span>
                  </div>
                </Button>
              </div>
              <FieldDescription className="text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
        </div>
      </div>
      {/* right gradient section */}
      <div className="hidden md:block flex-1 relative overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20" />
        {/* Lighting variations - subtle overlays */}
        <div className="absolute inset-0 bg-gradient-to-tl from-indigo-200/50 via-transparent to-transparent dark:from-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-200/40 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent" />
      </div>
    </div>
  );
}
