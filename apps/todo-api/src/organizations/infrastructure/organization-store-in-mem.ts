import type { Organization } from '../domain/organization-schemas.js';
import type { OrganizationStore } from '../domain/organization-service.js';

export function createInMemoryOrganizationStore(): OrganizationStore {
  const organizations = new Map<string, Organization>();
  const slugIndex = new Map<string, string>(); // lowercase slug -> id

  return {
    async save(org: Organization): Promise<void> {
      organizations.set(org.id, org);
      // Store slug in lowercase for case-insensitive lookup
      slugIndex.set(org.slug.toLowerCase(), org.id);
    },

    async findById(id: string): Promise<Organization | null> {
      return organizations.get(id) ?? null;
    },

    async findBySlug(slug: string): Promise<Organization | null> {
      // Lookup using lowercase for case-insensitive search
      const id = slugIndex.get(slug.toLowerCase());
      if (!id) return null;
      return organizations.get(id) ?? null;
    },

    async update(org: Organization): Promise<void> {
      // Update slug index if slug changed
      const existing = organizations.get(org.id);
      if (existing && existing.slug !== org.slug) {
        slugIndex.delete(existing.slug.toLowerCase());
        slugIndex.set(org.slug.toLowerCase(), org.id);
      }
      organizations.set(org.id, org);
    },
  };
}
