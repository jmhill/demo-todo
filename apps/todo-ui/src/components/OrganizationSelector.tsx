import { Box, Heading, Stack, Text, Spinner, Badge } from '@chakra-ui/react';
import { Alert } from '@chakra-ui/react/alert';
import { NativeSelectRoot, NativeSelectField } from '@chakra-ui/react';
import { tsr } from '../lib/api-client';

interface OrganizationSelectorProps {
  selectedOrgId: string;
  onOrganizationChange: (orgId: string) => void;
}

export const OrganizationSelector = ({
  selectedOrgId,
  onOrganizationChange,
}: OrganizationSelectorProps) => {
  const { data, isLoading, isError } =
    tsr.organizations.listUserOrganizations.useQuery({
      queryKey: ['organizations'],
    });

  if (isLoading) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={6}>
        <Box textAlign="center" py={4}>
          <Spinner size="lg" color="blue.500" />
          <Text mt={2}>Loading organizations...</Text>
        </Box>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={6}>
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title>Failed to load organizations</Alert.Title>
        </Alert.Root>
      </Box>
    );
  }

  const organizations = data?.body || [];

  if (organizations.length === 0) {
    return (
      <Box borderWidth="1px" borderRadius="lg" p={6}>
        <Alert.Root status="info">
          <Alert.Indicator />
          <Alert.Title>No organizations found</Alert.Title>
        </Alert.Root>
      </Box>
    );
  }

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'purple';
      case 'admin':
        return 'blue';
      case 'member':
        return 'green';
      case 'viewer':
        return 'gray';
      default:
        return 'gray';
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <Stack gap={4}>
        <Heading size="md">Organization</Heading>

        {selectedOrg && (
          <Box>
            <Text fontSize="lg" fontWeight="bold">
              {selectedOrg.name}
            </Text>
            <Badge
              colorPalette={getRoleBadgeColor(selectedOrg.membership.role)}
            >
              {selectedOrg.membership.role}
            </Badge>
          </Box>
        )}

        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Switch Organization
          </Text>
          <NativeSelectRoot>
            <NativeSelectField
              value={selectedOrgId}
              onChange={(e) => onOrganizationChange(e.target.value)}
              aria-label="Organization"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </NativeSelectField>
          </NativeSelectRoot>
        </Box>
      </Stack>
    </Box>
  );
};
