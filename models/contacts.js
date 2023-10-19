const mongoose = require("mongoose");
const Joi = require("joi");

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Set name for contact"],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  favorite: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Contact = mongoose.model("Contact", contactSchema);

const contactsSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  favorite: Joi.boolean(),
});

const listContacts = async () => {
  try {
    const contacts = await Contact.find().exec();
    return contacts;
  } catch (error) {
    throw error;
  }
};

const getContactById = async (contactId) => {
  try {
    const contact = await Contact.findById(contactId).exec();
    return contact;
  } catch (error) {
    throw error;
  }
};

const removeContact = async (contactId) => {
  try {
    const result = await Contact.deleteOne({ _id: contactId }).exec();
    if (result.deletedCount === 0) {
      throw new Error("Contact not found");
    }
  } catch (error) {
    throw error;
  }
};

const addContact = async (userId, body) => {
  try {
    const newContact = await Contact.create({ ...body, owner: userId });
    return newContact;
  } catch (error) {
    throw error;
  }
};

const updateContact = async (contactId, body) => {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { $set: body },
      { new: true }
    ).exec();
    if (!updatedContact) {
      throw new Error("Contact not found");
    }
    return updatedContact;
  } catch (error) {
    throw error;
  }
};

async function updateStatusContact(contactId, update) {
  try {
    const updatedContact = await Contact.findByIdAndUpdate(contactId, update, {
      new: true,
    });

    if (!updatedContact) {
      throw new Error("Contact not found");
    }

    return updatedContact;
  } catch (error) {
    return null; // Zwracamy null w przypadku błędu
  }
}

module.exports = {
  contactsSchema,
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
};