import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();
import { authenticate } from "../middlewares/auth";

// GET /api/lists - get all lists current user owns or collaborates on
router.get("/", authenticate, async (req, res) => {
  const userId = req.user.id;
  const lists = await prisma.list.findMany({
    where: {
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    include: { owner: true, collaborators: true },
  });
  res.json(lists);
});

// POST /api/lists - create a new list
router.post("/", authenticate, async (req, res) => {
  const userId = req.user.id;
  const { title, description } = req.body;
  const list = await prisma.list.create({
    data: { title, description, ownerId: userId },
  });
  res.status(201).json(list);
});

// GET /api/lists/:id - get single list with tasks, collaborators, comments
router.get("/:id", authenticate, async (req, res) => {
  const listId = req.params.id;
  const userId = req.user.id;

  // Check access: user must be owner or collaborator
  const list = await prisma.list.findFirst({
    where: {
      id: listId,
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
    },
    include: {
      tasks: true,
      collaborators: { include: { user: true } },
      comments: true,
    },
  });

  if (!list) return res.status(403).json({ error: "Access denied" });
  res.json(list);
});

export default router;
