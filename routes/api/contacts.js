const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const express = require("express");
const router = express.Router();
const checkToken = require("../../middleware/checkToken");

const {
  contactsSchema,
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
} = require("../../models/contacts");

router.get("/", checkToken, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const contacts = await listContacts({ owner: userId });

    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

router.get("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  try {
    const contact = await getContactById(contactId);
    if (contact) {
      res.json(contact);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    if (error.name === "CastError" && error.kind === "ObjectId") {
      res.status(400).json({ message: "Invalid contact ID format" });
    } else {
      next(error);
    }
  }
});

router.post("/", checkToken, async (req, res, next) => {
  const { name, email, phone } = req.body;
  const { error } = contactsSchema.validate({ name, email, phone });
  if (error) {
    res
      .status(400)
      .json({ message: `Validation error: ${error.details[0].message}` });
  } else {
    try {
      const userId = req.user._id;

      const newContact = await addContact(userId, { ...req.body });

      res.status(201).json(newContact);
    } catch (error) {
      next(error);
    }
  }
});

router.delete("/:contactId", checkToken, async (req, res, next) => {
  const { contactId } = req.params;
  const contact = await getContactById(contactId);
  if (contact) {
    if (contact.owner.toString() === req.user._id.toString()) {
      await removeContact(contactId);
      res.json({ message: "Contact deleted" });
    } else {
      res.status(403).json({ message: "Forbidden" });
    }
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

router.put("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  const contact = await getContactById(contactId);
  if (!contact) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  const { error } = contactsSchema.validate(req.body);
  if (error) {
    res
      .status(400)
      .json({ message: `Validation error: ${error.details[0].message}` });
  } else {
    const updatedContact = await updateContact(contactId, req.body);
    if (updatedContact) {
      res.json(updatedContact);
    } else {
      res.status(404).json({ message: "Not found" });
    }
  }
});
router.patch("/:contactId/favorite", async (req, res, next) => {
  const { contactId } = req.params;
  const { favorite } = req.body;

  if (!ObjectId.isValid(contactId)) {
    res.status(400).json({ message: "Invalid contact ID format" });
    return;
  }

  if (typeof favorite === "undefined") {
    res.status(400).json({ message: "Field favorite is missing" });
    return;
  }

  const updatedContact = await updateStatusContact(contactId, { favorite });

  if (updatedContact) {
    res.json(updatedContact);
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

module.exports = router;