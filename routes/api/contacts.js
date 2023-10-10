const express = require("express");
const router = express.Router();
const {
  contactsSchema,
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
} = require("../../models/contacts");

router.get("/", async (req, res, next) => {
  const contacts = await listContacts();
  res.json(contacts);
});

router.get("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  const contact = await getContactById(contactId);
  if (contact) {
    res.json(contact);
  } else {
    res.status(404).json({ message: "Not found" });
  }
});

router.post("/", async (req, res, next) => {
  const { name, email, phone } = req.body;
  const { error } = contactsSchema.validate({ name, email, phone });
  if (error) {
    res
      .status(400)
      .json({ message: `Validation error: ${error.details[0].message}` });
  } else {
    const newContact = await addContact(req.body);
    res.status(201).json(newContact);
  }
});

router.delete("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  const contact = await getContactById(contactId);
  if (contact) {
    await removeContact(contactId);
    res.json({ message: "Contact deleted" });
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

module.exports = router;