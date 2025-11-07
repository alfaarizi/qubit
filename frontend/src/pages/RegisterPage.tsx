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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const [validationError, setValidationError] = useState("");

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
      navigate("/project");
    } catch (err) {
      // error handled by store
    }
  };

  const displayError = validationError || error;

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
                <Alert variant="destructive">
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
