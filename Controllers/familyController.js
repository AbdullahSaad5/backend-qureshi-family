const Person = require("../Models/familyMember");
const mongoose = require("mongoose");

const createPerson = async (req, res) => {
  const {
    name,
    gender,
    dateOfBirth,
    dateOfDeath,
    parents = [],
    spouseIds = [],
    children = [],
    siblings = [],
    stepParents = [],
    stepChildren = [],
    halfSiblings = [],
    additionalInfo = {},
  } = req.body;

  try {
    const validSpouses = Array.isArray(spouseIds) ? spouseIds : [];

    const newPerson = new Person({
      name,
      gender,
      dateOfBirth,
      dateOfDeath,
      parents,
      spouseIds: validSpouses,
      children,
      siblings,
      stepParents,
      stepChildren,
      halfSiblings,
      additionalInfo,
    });

    const savedPerson = await newPerson.save();

    if (parents.length) {
      await Person.updateMany(
        { _id: { $in: parents } },
        { $addToSet: { children: savedPerson._id } }
      );
    }

    if (validSpouses.length) {
      await Person.updateMany(
        { _id: { $in: validSpouses } },
        { $addToSet: { spouseIds: savedPerson._id } }
      );
    }

    if (children.length) {
      await Person.updateMany(
        { _id: { $in: children } },
        { $addToSet: { parents: savedPerson._id } }
      );
    }

    if (siblings.length) {
      await Person.updateMany(
        { _id: { $in: siblings } },
        { $addToSet: { siblings: savedPerson._id } }
      );
    }

    if (stepParents.length) {
      await Person.updateMany(
        { _id: { $in: stepParents } },
        { $addToSet: { stepChildren: savedPerson._id } }
      );
    }

    if (stepChildren.length) {
      await Person.updateMany(
        { _id: { $in: stepChildren } },
        { $addToSet: { stepParents: savedPerson._id } }
      );
    }

    if (halfSiblings.length) {
      await Person.updateMany(
        { _id: { $in: halfSiblings } },
        { $addToSet: { halfSiblings: savedPerson._id } }
      );
    }

    res.status(201).json(savedPerson);
  } catch (error) {
    res.status(500).json({
      error: "Error creating person",
      details: error.message,
    });
  }
};

const getAllPeople = async (req, res) => {
  try {
    const people = await Person.find()
      .populate("parents")
      .populate("children")
      .populate("spouse")
      .populate("siblings")
      .populate("stepParents")
      .populate("stepChildren")
      .populate("halfSiblings");
    res.json(people);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error fetching people", details: error.message });
  }
};

const getPersonById = async (req, res) => {
  const { id } = req.params;

  try {
    console.log("Inside get person by id API");

    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    const person = await Person.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $graphLookup: {
          from: "people",
          startWith: "$parents",
          connectFromField: "_id",
          connectToField: "_id",
          as: "parentTree",
        },
      },
      {
        $graphLookup: {
          from: "people",
          startWith: "$children",
          connectFromField: "_id",
          connectToField: "_id",
          as: "childrenTree",
        },
      },
      {
        $graphLookup: {
          from: "people",
          startWith: "$siblings",
          connectFromField: "_id",
          connectToField: "_id",
          as: "siblingsTree",
        },
      },
      {
        $lookup: {
          from: "people",
          localField: "spouseIds",
          foreignField: "_id",
          as: "spouseDetails",
        },
      },
      {
        $lookup: {
          from: "people",
          localField: "stepParents",
          foreignField: "_id",
          as: "stepParentsDetails",
        },
      },
      {
        $lookup: {
          from: "people",
          localField: "stepChildren",
          foreignField: "_id",
          as: "stepChildrenDetails",
        },
      },
      {
        $lookup: {
          from: "people",
          localField: "halfSiblings",
          foreignField: "_id",
          as: "halfSiblingsDetails",
        },
      },
      {
        $project: {
          name: 1,
          gender: 1,
          dateOfBirth: 1,
          dateOfDeath: 1,
          parents: "$parentTree",
          children: "$childrenTree",
          siblings: "$siblingsTree",
          spouse: "$spouseDetails",
          stepParents: "$stepParentsDetails",
          stepChildren: "$stepChildrenDetails",
          halfSiblings: "$halfSiblingsDetails",
          biography: 1,
          late: 1,
        },
      },
    ]);

    if (!person.length) {
      return res.status(404).json({ error: "Person not found" });
    }

    res.json(person[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error fetching person",
      details: error.message,
    });
  }
};

const updatePerson = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updatedPerson = await Person.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("parents")
      .populate("children")
      .populate("spouse")
      .populate("siblings")
      .populate("stepParents")
      .populate("stepChildren")
      .populate("halfSiblings");

    if (!updatedPerson)
      return res.status(404).json({ error: "Person not found" });
    res.json(updatedPerson);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error updating person", details: error.message });
  }
};

const deletePerson = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the person to be deleted
    const personToDelete = await Person.findById(id);

    if (!personToDelete)
      return res.status(404).json({ error: "Person not found" });

    // Remove references to this person in other documents
    await Person.updateMany(
      { _id: { $in: personToDelete.parents } },
      { $pull: { children: id } }
    );
    await Person.updateMany(
      { _id: { $in: personToDelete.children } },
      { $pull: { parents: id } }
    );
    await Person.updateMany(
      { _id: { $in: personToDelete.siblings } },
      { $pull: { siblings: id } }
    );
    await Person.updateMany(
      { _id: personToDelete.spouse },
      { $unset: { spouse: "" } }
    );
    await Person.updateMany(
      { _id: { $in: personToDelete.stepParents } },
      { $pull: { stepChildren: id } }
    );
    await Person.updateMany(
      { _id: { $in: personToDelete.stepChildren } },
      { $pull: { stepParents: id } }
    );
    await Person.updateMany(
      { _id: { $in: personToDelete.halfSiblings } },
      { $pull: { halfSiblings: id } }
    );

    // Finally, delete the person
    await Person.findByIdAndDelete(id);

    res.json({ message: "Person deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error deleting person", details: error.message });
  }
};

const addChild = async (req, res) => {
  const { parentId, childId } = req.params;

  try {
    // Update the parent document to include the new child
    await Person.findByIdAndUpdate(parentId, {
      $addToSet: { children: childId },
    });

    // Update the child document to include the parent
    await Person.findByIdAndUpdate(childId, {
      $addToSet: { parents: parentId },
    });

    res.json({ message: "Child added successfully" });
  } catch (error) {
    res.status(500).json({
      error: "Error adding child",
      details: error.message,
    });
  }
};

const addSpouse = async (req, res) => {
  const { personId, spouseId } = req.params;

  try {
    // Update both persons to reference each other as spouses
    await Person.findByIdAndUpdate(personId, { spouse: spouseId });
    await Person.findByIdAndUpdate(spouseId, { spouse: personId });

    res.json({ message: "Spouse added successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error adding spouse", details: error.message });
  }
};

module.exports = {
  createPerson,
  getAllPeople,
  getPersonById,
  updatePerson,
  deletePerson,
  addChild,
  addSpouse,
};
