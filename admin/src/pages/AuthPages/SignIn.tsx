import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Fly Naveed Travel & Tourtravel and tours   ) SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for Fly Naveed Travel & Tourtravel and tours   )"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
