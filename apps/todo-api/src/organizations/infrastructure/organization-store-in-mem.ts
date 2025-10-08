import type { Organization } from '../domain/organization-schemas.js';
import type { OrganizationStore } from '../domain/organization-service.js';

export function createInMemoryOrganizationStore(): OrganizationStore {
  const organizations = new Map<string, Organization>();
  const slugIndex = new Map<string, string>(); // slug -> id

  return {
    async save(org: Organization): Promise<void> {
      organizations.set(org.id, org);
      slugIndex.set(org.slug, org.id);
    },

    async findById(id: string): Promise<Organization | null> {
      return organizations.get(id) ?? null;
    },

    async findBySlug(slug: string): Promise<Organization | null> {
      const id = slugIndex.get(slug);
      if (!id) return null;
      return organizations.get(id) ?? null;
    },

    async update(org: Organization): Promise<void> {
      // Update slug index if slug changed
      const existing = organizations.get(org.id);
      if (existing && existing.slug !== org.slug) {
        slugIndex.delete(existing.slug);
        slugIndex.set(org.slug, org.id);
      }
      organizations.set(org.id, org);
    },
  };
}
