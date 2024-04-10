const Task = require("../models/task");
const auth = require("../middleware/auth");
const { Router } = require("express");
const router = new Router();

router.post("/tasks", auth, async (req, res) => {
  const newTask = new Task({ ...req.body, owner: req.user._id });
  try {
    const task = await newTask.save();
    res.status(201).json(task);
  } catch (e) {
    res.status(404).send();
  }
});

router.get("/tasks", auth, async (req, res) => {
  const user = req.user;

  const match = {};
  const completedQuery = req.query.completed;
  const validValues = ["true", "false"];
  if (completedQuery && !validValues.includes(completedQuery)) {
    return res
      .status(400)
      .json({ error: "Completed query must be true or false" });
  }
  if (completedQuery) {
    match.completed = completedQuery === "true";
  }

  const sortBy = req.query.sortBy;
  const sort = {};
  if (sortBy) {
    const parts = sortBy.split(":");
    if (parts.length !== 2) {
      return res
        .status(400)
        .json({ error: "sortBy must be <field>:<desc|asc>" });
    }
    sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
  }

  try {
    await user.populate({
      path: "tasks",
      match,
      options: {
        limit: parseInt(req.query.limit),
        skip: parseInt(req.query.skip),
        sort,
      },
    });
    res.json(user.tasks);
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

router.get("/tasks/:id", auth, async (req, res) => {
  const _id = req.params.id;
  try {
    const task = await Task.findOne({ _id, owner: req.user._id });
    if (!task) return res.status(404).send();
    res.json(task);
  } catch (e) {
    res.status(500).send();
  }
});

router.patch("/tasks/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedFields = ["description", "completed"];
  const isValidOperation = updates.every((update) => {
    return allowedFields.includes(update);
  });

  if (!isValidOperation) {
    return res.status(400).json({ error: "Invalid updates" });
  }

  try {
    const task = await Task.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!task) return res.status(404).send();

    updates.forEach((update) => (task[update] = req.body[update]));
    task.save();
    res.json(task);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.delete("/tasks/:id", auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!task) return res.status(404).send();
    res.json(task);
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;
