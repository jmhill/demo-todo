## NPM Workspace Structure

This is an npm workspaces monorepo. Your working directory should be the **repository root** (where package.json with "workspaces" is located).

### Running Scripts

- **Quality scripts (`npm run quality`, `npm run quality:fix`)**: ALWAYS run from repository root
- **Workspace-specific tests**: Use `npm run test --workspace=<workspace-name>` from repository root
  - Example: `npm run test --workspace=todo-ui`
- **Never `cd` into workspace directories** - bash should stay at repository root

### Database Reset

- To reset the development database with fresh seed data: `npm run db:reset --workspace=todo-api`
- This will: destroy the MySQL container and volume, recreate it, run migrations, and seed test users with their todos
- Use this when existing users prevent todos from being seeded during development

### Quality Checks

- Always run `npm run quality` before and after changes to verify that system meets minimum prerequisites for integration
- If `npm run quality` fails on formatting or type-checking, try to run `npm run quality:fix` first
- `npm run quality` MUST complete successfully to call a coding task 'done'. We're not done until quality checks pass!
