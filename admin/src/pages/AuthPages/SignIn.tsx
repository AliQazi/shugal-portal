import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Stack Works Flow | SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for Stack Works Flow"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
