import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center h-screen bg-slate-900">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
