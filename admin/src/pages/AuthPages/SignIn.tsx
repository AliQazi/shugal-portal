import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Shaheen Wings travel and tours (Pvt Ltd ) SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for Shaheen Wings travel and tours (Pvt Ltd )"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
