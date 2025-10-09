import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { OrganizationSelector } from './OrganizationSelector';
import { tsr } from '../lib/api-client';
import type { OrganizationWithMembershipResponse } from '@demo-todo/api-contracts';

vi.mock('../lib/api-client', () => ({
  tsr: {
    organizations: {
      listUserOrganizations: {
        useQuery: vi.fn(),
      },
    },
  },
}));

describe('OrganizationSelector', () => {
  const getMockOrganizations = (): OrganizationWithMembershipResponse[] => [
    {
      id: 'org-1',
      name: 'ACME Corp',
      slug: 'acme-corp',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      membership: {
        id: 'membership-1',
        role: 'owner',
      },
    },
    {
      id: 'org-2',
      name: 'Tech Startup',
      slug: 'tech-startup',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      membership: {
        id: 'membership-2',
        role: 'member',
      },
    },
    {
      id: 'org-3',
      name: 'Design Agency',
      slug: 'design-agency',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      membership: {
        id: 'membership-3',
        role: 'admin',
      },
    },
  ];

  const renderOrganizationSelector = (
    selectedOrgId: string,
    onOrganizationChange: (orgId: string) => void,
  ) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <ChakraProvider value={defaultSystem}>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelector
            selectedOrgId={selectedOrgId}
            onOrganizationChange={onOrganizationChange}
          />
        </QueryClientProvider>
      </ChakraProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state while fetching organizations', () => {
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: undefined,
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-1', onOrganizationChange);

    expect(screen.getByText('Loading organizations...')).toBeInTheDocument();
  });

  it('should show error state when fetching organizations fails', () => {
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-1', onOrganizationChange);

    expect(
      screen.getByText('Failed to load organizations'),
    ).toBeInTheDocument();
  });

  it('should display current organization name and role badge', () => {
    const orgs = getMockOrganizations();
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: orgs, status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-1', onOrganizationChange);

    // Organization name appears in heading
    expect(
      screen.getByRole('heading', { name: /organization/i }),
    ).toBeInTheDocument();
    // Organization name appears as text (not in select option)
    const orgNames = screen.getAllByText('ACME Corp');
    expect(orgNames.length).toBeGreaterThan(0);
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('should display correct role badge for different roles', () => {
    const orgs = getMockOrganizations();
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: orgs, status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-2', onOrganizationChange);

    // Organization name appears as text (and in select options)
    const orgNames = screen.getAllByText('Tech Startup');
    expect(orgNames.length).toBeGreaterThan(0);
    expect(screen.getByText('member')).toBeInTheDocument();
  });

  it('should render a dropdown select element', () => {
    const orgs = getMockOrganizations();
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: orgs, status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-1', onOrganizationChange);

    const selectElement = screen.getByRole('combobox', {
      name: /organization/i,
    });
    expect(selectElement).toBeInTheDocument();
  });

  it('should show all organizations as options in dropdown', () => {
    const orgs = getMockOrganizations();
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: orgs, status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-1', onOrganizationChange);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('ACME Corp');
    expect(options[1]).toHaveTextContent('Tech Startup');
    expect(options[2]).toHaveTextContent('Design Agency');
  });

  it('should call onOrganizationChange when user selects different organization', async () => {
    const orgs = getMockOrganizations();
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: orgs, status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-1', onOrganizationChange);

    const selectElement = screen.getByRole('combobox', {
      name: /organization/i,
    });
    await userEvent.selectOptions(selectElement, 'org-2');

    expect(onOrganizationChange).toHaveBeenCalledWith('org-2');
  });

  it('should highlight selected organization in dropdown', () => {
    const orgs = getMockOrganizations();
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: orgs, status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-2', onOrganizationChange);

    const selectElement = screen.getByRole('combobox', {
      name: /organization/i,
    });
    expect(selectElement).toHaveValue('org-2');
  });

  it('should handle empty organization list gracefully', () => {
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: [], status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    renderOrganizationSelector('org-1', onOrganizationChange);

    expect(screen.getByText('No organizations found')).toBeInTheDocument();
  });

  it('should update role badge when selected organization changes', async () => {
    const orgs = getMockOrganizations();
    vi.mocked(tsr.organizations.listUserOrganizations.useQuery).mockReturnValue(
      {
        data: { body: orgs, status: 200 },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      } as never,
    );

    const onOrganizationChange = vi.fn();
    const { rerender } = renderOrganizationSelector(
      'org-1',
      onOrganizationChange,
    );

    expect(screen.getByText('owner')).toBeInTheDocument();

    // Simulate parent updating selectedOrgId prop
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    rerender(
      <ChakraProvider value={defaultSystem}>
        <QueryClientProvider client={queryClient}>
          <OrganizationSelector
            selectedOrgId="org-3"
            onOrganizationChange={onOrganizationChange}
          />
        </QueryClientProvider>
      </ChakraProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });
});
