import type {
  ReactNode,
} from "react";

import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
} from "@chakra-ui/react";

type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <Box
      display="flex"
      flexDirection={{
        base: "column",
        md: "row",
      }}
      alignItems={{
        base: "stretch",
        md: "flex-end",
      }}
      justifyContent="space-between"
      gap="4"
    >
      <Stack gap="1">
        {eyebrow && (
          <Text
            fontSize="xs"
            fontWeight="700"
            color="green.700"
            letterSpacing="wide"
            textTransform="uppercase"
          >
            {eyebrow}
          </Text>
        )}

        <Heading
          as="h1"
          size="2xl"
        >
          {title}
        </Heading>

        {description && (
          <Text color="gray.600">
            {description}
          </Text>
        )}
      </Stack>

      {action}
    </Box>
  );
}

type SectionCardProps = {
  children: ReactNode;
};

export function AdminSectionCard({
  children,
}: SectionCardProps) {
  return (
    <Box
      overflow="hidden"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
    >
      {children}
    </Box>
  );
}

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

export function AdminSectionHeader({
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <Box
      minH="64px"
      display="flex"
      flexDirection={{
        base: "column",
        sm: "row",
      }}
      alignItems={{
        base: "stretch",
        sm: "flex-start",
      }}
      justifyContent="space-between"
      gap="4"
      px="5"
      py="4"
      borderBottomWidth="1px"
      borderColor="gray.200"
    >
      <Stack
        gap="1"
        minW="0"
      >
        <Text fontWeight="700">
          {title}
        </Text>

        {description && (
          <Text
            fontSize="sm"
            color="gray.500"
          >
            {description}
          </Text>
        )}
      </Stack>

      {action}
    </Box>
  );
}

type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
};

export function AdminMetricCard({
  label,
  value,
  detail,
}: MetricCardProps) {
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      bg="white"
      px="4"
      py="3"
    >
      <Text
        fontSize="sm"
        color="gray.500"
      >
        {label}
      </Text>

      <Text
        mt="1"
        fontSize="2xl"
        lineHeight="1.1"
        fontWeight="700"
        letterSpacing="-0.025em"
      >
        {value}
      </Text>

      {detail && (
        <Text
          mt="1"
          fontSize="xs"
          color="gray.500"
        >
          {detail}
        </Text>
      )}
    </Box>
  );
}

type ViewToggleOption = {
  value: string;
  label: string;
};

type ViewToggleProps = {
  value: string;
  options: readonly ViewToggleOption[];
  onChange: (value: string) => void;
  label: string;
};

export function AdminViewToggle({
  value,
  options,
  onChange,
  label,
}: ViewToggleProps) {
  return (
    <HStack
      role="group"
      aria-label={label}
      gap="1"
      p="1"
      w="fit-content"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="lg"
      bg="gray.50"
    >
      {options.map((option) => {
        const active = value === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            minH="32px"
            px="3"
            variant={active ? "solid" : "ghost"}
            colorPalette={active ? "green" : undefined}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </HStack>
  );
}
