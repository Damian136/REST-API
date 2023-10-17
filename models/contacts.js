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
    default: false, // Dodaj domyślną wartość dla pola favorite
  },
});

const Contact = mongoose.model("Contact", contactSchema);

const contactsSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  favorite: Joi.boolean(), // Dodaj walidację pola favorite
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

const addContact = async (body) => {
  try {
    const newContact = await Contact.create(body);
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

const updateStatusContact = async (contactId, body) => {
  try {
    const existingContact = await Contact.findById(contactId).exec();

    if (!existingContact) {
      throw new Error("Contact not found");
    }

    if ("favorite" in body) {
      if (body.favorite !== existingContact.favorite) {
        existingContact.favorite = body.favorite;
        await existingContact.save();
      }
    }

    return existingContact;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  contactsSchema,
  listContacts,
  getContactById,
  removeContact,
  addContact,
  updateContact,
  updateStatusContact,
};