import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/common/ModeToggle";
import { UserNav } from "@/components/common/UserNav";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b bg-muted/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/project")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <div className="scale-[0.8] origin-left">
              <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-6">
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white overflow-hidden">
              {user?.profile_url ? (
                <img
                  src={user.profile_url}
                  alt={`${user.first_name || 'User'}'s profile`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold">{getInitials()}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : "User Profile"}
              </h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Separator />

          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your account details and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <p className="mt-1 text-base">{user?.first_name || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <p className="mt-1 text-base">{user?.last_name || "Not set"}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1 text-base">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                <p className="mt-1 text-base font-mono">{user?.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" disabled>
                Change Password
              </Button>
              <p className="text-sm text-muted-foreground">
                Password management coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
