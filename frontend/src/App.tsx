import { Box, Button, Heading, Stack, Text } from "@chakra-ui/react";

import AppErrorBoundary from "./components/AppErrorBoundary";
import { MataponiLoader } from "./components/feedback/MataponiLoader";

import AuthProvider from "./providers/AuthProvider";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AdminPage from "./pages/AdminPage";
import MemberHouseholdGate from "./pages/MemberHouseholdGate";
import StaffPage from "./pages/StaffPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./hooks/useAuth";

function AppContent() {
  const { account, loading, logout } = useAuth();

  if (loading) {
    return <MataponiLoader />;
  }

  if (!account) {
    return <LoginPage />;
  }

  if (account.must_change_password) {
    return <ChangePasswordPage />;
  }

  if (account.account_type === "admin") {
    return <AdminPage />;
  }

  if (account.account_type === "member") {
    return <MemberHouseholdGate />;
  }

  if (account.account_type === "staff") {
    return <StaffPage />;
  }

  return (
    <Box
      minH="100vh"
      bg="gray.50"
      display="grid"
      placeItems="center"
      px="4"
      py="10"
    >
      <Box
        w="full"
        maxW="420px"
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="xl"
        p={{ base: "6", md: "8" }}
      >
        <Stack gap="7">
          <Stack gap="1">
            <Box
              w="10"
              h="10"
              display="grid"
              placeItems="center"
              borderRadius="md"
              bg="green.700"
              color="white"
              fontWeight="700"
              fontSize="lg"
            >
              A
            </Box>

            <Box pt="2">
              <Text
                fontWeight="700"
                fontSize="lg"
              >
                Appaponi
              </Text>

              <Text
                color="gray.500"
                fontSize="sm"
              >
                {account.account_type}
              </Text>
            </Box>
          </Stack>

          <Stack gap="1">
            <Heading as="h1" size="2xl">
              {account.username}
            </Heading>

            <Text color="gray.600">
              Authenticated Appaponi account.
            </Text>
          </Stack>

          <Button
            type="button"
            colorPalette="green"
            size="lg"
            w="full"
            onClick={() => {
              void logout();
            }}
          >
            Sign out
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
