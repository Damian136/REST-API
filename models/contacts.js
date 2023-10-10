const fs = require("fs/promises");
const Joi = require("joi");
let nanoid;
try {
  const nanoidModule = require("nanoid");
  nanoid = nanoidModule.nanoid || nanoidModule;
} catch (error) {
  nanoid = require("nanoid");
}

const contactsSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
});

const contactsPath = "./models/contacts.json";

const readContacts = async () => {
  try {
    const data = await fs.readFile(contactsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    throw error;
  }
};

const writeContacts = async (data) => {
  try {
    await fs.writeFile(contactsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    throw error;
  }
};

const listContacts = async () => {
  const contacts = await readContacts();
  return contacts;
};

const getContactById = async (contactId) => {
  const contacts = await readContacts();
  const contact = contacts.find((c) => c.id === contactId);
  return contact;
};

const removeContact = async (contactId) => {
  const contacts = await readContacts();
  const updatedContacts = contacts.filter((c) => c.id !== contactId);
  await writeContacts(updatedContacts);
};

const addContact = async (body) => {
  const contacts = await readContacts();
  const newContact = { ...body, id: nanoid() };
  contacts.push(newContact);
  await writeContacts(contacts);
  return newContact;
};

const updateContact = async (contactId, body) => {
  const contacts = await readContacts();
  const index = contacts.findIndex((c) => c.id === contactId);
  if (index === -1) {
    return null; // Kontakt nie istnieje
  }
  contacts[index] = { ...contacts[index], ...body };
  await writeContacts(contacts);
  return contacts[index];
};

module.exports = {
  contactsSchema,
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
};
