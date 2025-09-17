import express, { Router, type Request, type Response } from 'express';
import type { UserService } from './user-service.js';
import type { CreateUserDto, UserWithoutPassword } from './user-schemas.js';

export function createUserRouter(userService: UserService): Router {
  const router = Router();

  // Parse JSON body for POST requests
  router.use(express.json());

  // POST /users - Create a new user
  router.post('/', async (req: Request, res: Response) => {
    const dto: CreateUserDto = req.body;

    const result = await userService.createUser(dto);

    if (result.isOk()) {
      const user = result.value;
      const userResponse: UserWithoutPassword = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      res.status(201).json(userResponse);
    } else {
      const error = result.error;
      if (error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
      } else if (error.message.includes('Validation failed')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /users/by-email/:email - Get user by email
  router.get('/by-email/:email', async (req: Request, res: Response) => {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({ error: 'Email parameter is required' });
      return;
    }

    const result = await userService.getByEmail(email);

    if (result.isOk()) {
      const user = result.value;
      const userResponse: UserWithoutPassword = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      res.json(userResponse);
    } else {
      const error = result.error;
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Invalid email format') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /users/by-username/:username - Get user by username
  router.get('/by-username/:username', async (req: Request, res: Response) => {
    const { username } = req.params;

    if (!username) {
      res.status(400).json({ error: 'Username parameter is required' });
      return;
    }

    const result = await userService.getByUsername(username);

    if (result.isOk()) {
      const user = result.value;
      const userResponse: UserWithoutPassword = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      res.json(userResponse);
    } else {
      const error = result.error;
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // GET /users/:id - Get user by ID
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'User ID parameter is required' });
      return;
    }

    const result = await userService.getById(id);

    if (result.isOk()) {
      const user = result.value;
      const userResponse: UserWithoutPassword = {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      res.json(userResponse);
    } else {
      const error = result.error;
      if (error.message === 'User not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message === 'Invalid user ID format') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}
