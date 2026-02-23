import { Redirect } from "expo-router";

// Redirect to the SplashScreen which will then navigate to Welcome
export default function Index() {
  return <Redirect href="/auth/SplashScreen" />;
}
