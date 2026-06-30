import React from "react";
import { Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { captureException } from "../services/sentry";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | null;
}

/**
 * App-wide error boundary. Wraps the entire provider/navigation tree so an
 * unhandled render error shows a recoverable screen instead of a white screen.
 *
 * NOTE: `componentDidCatch` is the integration point for a crash-reporting
 * service (Sentry / Firebase Crashlytics). Wire `captureException(error)` here
 * once one is added.
 */
export default class RootErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RootErrorBoundary] Unhandled error:", error, info?.componentStack);
    // Forward to Sentry (no-op until a DSN is configured).
    captureException(error, { componentStack: info?.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app ran into an unexpected problem. You can try again — if it keeps
            happening, please restart the app.
          </Text>
          {__DEV__ && this.state.error ? (
            <Text style={styles.detail}>{this.state.error.message}</Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10, color: "#111" },
  message: { fontSize: 14, color: "#444", textAlign: "center", marginBottom: 16, lineHeight: 20 },
  detail: { fontSize: 12, color: "#B00020", textAlign: "center", marginBottom: 16, fontFamily: "monospace" },
  button: { backgroundColor: "#FF4848", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
