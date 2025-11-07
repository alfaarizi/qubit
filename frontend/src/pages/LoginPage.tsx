import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/project");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate("/project");
    } catch (err) {
      // error handled by store
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
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11"
                />
              </Field>

              <Button type="submit" disabled={isLoading} className="w-full h-11">
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>

              <FieldSeparator>Or</FieldSeparator>

              <Button variant="outline" type="button" disabled className="w-full h-11">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Continue with Google
              </Button>

              <FieldDescription className="text-center">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  Sign up
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
