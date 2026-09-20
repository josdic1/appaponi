import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

import {
  Box,
  Button,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends Component<
  Props,
  State
> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ) {
    console.error(
      "Appaponi render failure",
      error,
      info,
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        as="main"
        minH="100vh"
        display="grid"
        placeItems="center"
        p="24px"
        bg="#f6f5f1"
      >
        <Box
          as="section"
          role="alert"
          w="full"
          maxW="390px"
          p="28px"
          borderWidth="1px"
          borderColor="#dddcd5"
          borderRadius="12px"
          bg="#ffffff"
        >
          <HStack
            alignItems="center"
            gap="10px"
          >
            <Box
              w="28px"
              h="28px"
              display="grid"
              placeItems="center"
              flex="0 0 auto"
              borderRadius="8px"
              bg="var(--chakra-colors-green-600)"
              color="#ffffff"
              fontSize="12px"
              fontWeight="800"
            >
              A
            </Box>

            <Stack gap="0">
              <Text
                fontSize="15px"
                fontWeight="760"
                letterSpacing="-0.03em"
              >
                Appaponi
              </Text>

              <Text
                mt="3px"
                color="#6d7169"
                fontSize="11px"
              >
                Camp app
              </Text>
            </Stack>
          </HStack>

          <Box mt="26px" mb="4px">
            <Text
              as="h1"
              m="0"
              fontSize="26px"
              lineHeight="1.1"
              letterSpacing="-0.04em"
              fontWeight="700"
            >
              Something went wrong
            </Text>

            <Text
              mt="8px"
              mb="0"
              color="#6d7169"
            >
              Reload Appaponi to return to your current session.
            </Text>
          </Box>

          <Button
            type="button"
            w="full"
            mt="16px"
            minH="34px"
            borderWidth="1px"
            borderColor="var(--chakra-colors-green-600)"
            borderRadius="8px"
            bg="var(--chakra-colors-green-600)"
            px="14px"
            color="#ffffff"
            fontSize="12px"
            fontWeight="750"
            _hover={{
              borderColor: "var(--chakra-colors-green-700)",
              bg: "var(--chakra-colors-green-700)",
            }}
            onClick={() =>
              window.location.reload()
            }
          >
            Reload Appaponi
          </Button>
        </Box>
      </Box>
    );
  }
}
