const Person = require("../Models/familyMember");
const User = require("../Models/Auth");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { performance } = require("perf_hooks");
const Counter = require("../Models/TasbeehCounter");

const signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
    });

    console.log("New user created: ", newUser);

    await newUser.save();
    console.log("User saved successfully");

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({ message: "Logged in successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

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

const transformFamilyData = (members) => {
  const getGender = (gender) => {
    switch (gender) {
      case "male":
        return "M";
      case "female":
        return "F";
      default:
        return "N";
    }
  };

  const buildNodeObject = (member) => {
    const spouseIds = (member.spouseIds || []).map((id) => id.toString());

    return {
      key: member._id.toString(),
      n: member.name,
      s: getGender(member.gender),
      m: member.parents
        .find((parent) => parent.gender === "female")
        ?._id.toString(),
      f: member.parents
        .find((parent) => parent.gender === "male")
        ?._id.toString(),
      spouse: spouseIds.length ? spouseIds[0] : undefined,
    };
  };

  const transformedData = members.map(buildNodeObject);

  return transformedData;
};

const getFamilyTrees = async (req, res) => {
  try {
    // Fetch all family members from the database and populate relationships
    const members = await Person.find({ status: "approved" }).populate(
      "spouseIds father mother children"
    );

    // Format data according to the structure needed by React Flow
    const familyTree = members.map((member) => {
      return {
        _id: member._id,
        name: member.name,
        gender: member.gender,
        dateOfBirth: member.dateOfBirth,

        // Assign father and mother directly
        father: member.father ? member.father._id : null,
        mother: member.mother ? member.mother._id : null,

        // Populate spouseIds correctly (already an array)
        spouseIds: member.spouseIds
          ? member.spouseIds.map((spouse) => spouse._id)
          : [],

        // Populate childrenIds array with child IDs
        childrenIds: member.children
          ? member.children.map((child) => child._id)
          : [],
      };
    });

    // Return the formatted family tree data
    res.json(familyTree);
  } catch (error) {
    console.error("Error fetching family members:", error);
    res.status(500).json({ message: "Error fetching family members" });
  }
};

const getFamilyTreeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the specific person by ID and populate relationships
    const person = await Person.findById(id).populate(
      "spouseIds father mother children"
    );

    if (!person) {
      return res.status(404).json({ message: "Person not found" });
    }

    // Helper function to format a member, excluding spouseIds and childrenIds for children
    const formatMember = (member, isChild = false) => ({
      _id: member._id,
      name: member.name,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
      father: member.father ? member.father._id : null,
      mother: member.mother ? member.mother._id : null,
      spouseIds: isChild
        ? undefined
        : member.spouseIds
        ? member.spouseIds.map((spouse) => spouse._id)
        : [],
      childrenIds: isChild
        ? undefined
        : member.children
        ? member.children.map((child) => child._id)
        : [],
    });

    // Format the specific person
    const familyTree = [formatMember(person)];

    // Add the related family members (father, mother, spouse, children)
    if (person.father) familyTree.push(formatMember(person.father));
    if (person.mother) familyTree.push(formatMember(person.mother));
    if (person.spouseIds) {
      person.spouseIds.forEach((spouse) =>
        familyTree.push(formatMember(spouse))
      );
    }
    if (person.children) {
      person.children.forEach((child) =>
        familyTree.push(formatMember(child, true))
      );
    }

    const uniqueFamilyTree = familyTree.filter(
      (person, index, self) =>
        index ===
        self.findIndex((p) => p._id.toString() === person._id.toString())
    );

    // Return the formatted family tree data
    res.json(uniqueFamilyTree);
  } catch (error) {
    console.error("Error fetching family tree:", error);
    res.status(500).json({ message: "Error fetching family tree" });
  }
};

// const getFamilyTreeById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const pipeline = [
//       { $match: { _id: new mongoose.Types.ObjectId(id) } },
//       {
//         $lookup: {
//           from: "people",
//           localField: "father",
//           foreignField: "_id",
//           as: "father",
//         },
//       },
//       {
//         $lookup: {
//           from: "people",
//           localField: "mother",
//           foreignField: "_id",
//           as: "mother",
//         },
//       },
//       {
//         $lookup: {
//           from: "people",
//           localField: "spouseIds",
//           foreignField: "_id",
//           as: "spouseIds",
//         },
//       },
//       {
//         $lookup: {
//           from: "people",
//           localField: "children",
//           foreignField: "_id",
//           as: "children",
//         },
//       },
//       {
//         $unwind: { path: "$father", preserveNullAndEmptyArrays: true },
//       },
//       {
//         $unwind: { path: "$mother", preserveNullAndEmptyArrays: true },
//       },
//       {
//         $addFields: {
//           "father.childrenIds": {
//             $map: { input: "$father.children", as: "child", in: "$$child._id" },
//           },
//           "father.spouseIds": {
//             $map: {
//               input: "$father.spouseIds",
//               as: "spouse",
//               in: "$$spouse._id",
//             },
//           },
//           "mother.childrenIds": {
//             $map: { input: "$mother.children", as: "child", in: "$$child._id" },
//           },
//           "mother.spouseIds": {
//             $map: {
//               input: "$mother.spouseIds",
//               as: "spouse",
//               in: "$$spouse._id",
//             },
//           },
//           childrenIds: {
//             $map: { input: "$children", as: "child", in: "$$child._id" },
//           },
//           spouseIds: {
//             $map: { input: "$spouseIds", as: "spouse", in: "$$spouse._id" },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           name: 1,
//           gender: 1,
//           dateOfBirth: 1,
//           father: {
//             _id: "$father._id",
//             name: "$father.name",
//             gender: "$father.gender",
//             dateOfBirth: "$father.dateOfBirth",
//             childrenIds: "$father.childrenIds",
//             spouseIds: "$father.spouseIds",
//           },
//           mother: {
//             _id: "$mother._id",
//             name: "$mother.name",
//             gender: "$mother.gender",
//             dateOfBirth: "$mother.dateOfBirth",
//             childrenIds: "$mother.childrenIds",
//             spouseIds: "$mother.spouseIds",
//           },
//           spouseIds: 1,
//           childrenIds: 1,
//         },
//       },
//     ];

//     const result = await Person.aggregate(pipeline).exec();

//     if (result.length === 0) {
//       return res.status(404).json({ message: "Person not found" });
//     }

//     // Flatten the result and include each person
//     const personMap = new Map();

//     const addPerson = (person) => {
//       if (!person) return; // Skip if person is null or undefined

//       const personId = person._id ? person._id.toString() : null;
//       if (!personId) return; // Skip if personId is null or undefined

//       if (!personMap.has(personId)) {
//         personMap.set(personId, {
//           _id: personId,
//           name: person.name,
//           gender: person.gender,
//           dateOfBirth: person.dateOfBirth,
//           father: person.father
//             ? {
//                 _id: person.father._id ? person.father._id.toString() : null,
//                 name: person.father.name,
//                 gender: person.father.gender,
//                 dateOfBirth: person.father.dateOfBirth,
//                 childrenIds: person.father.childrenIds || [],
//                 spouseIds: person.father.spouseIds || [],
//               }
//             : null,
//           mother: person.mother
//             ? {
//                 _id: person.mother._id ? person.mother._id.toString() : null,
//                 name: person.mother.name,
//                 gender: person.mother.gender,
//                 dateOfBirth: person.mother.dateOfBirth,
//                 childrenIds: person.mother.childrenIds || [],
//                 spouseIds: person.mother.spouseIds || [],
//               }
//             : null,
//           spouseIds:
//             (person.spouseIds || []).map((id) => (id ? id.toString() : null)) ||
//             [],
//           childrenIds:
//             (person.childrenIds || []).map((id) =>
//               id ? id.toString() : null
//             ) || [],
//         });
//       }
//     };

//     result.forEach((person) => {
//       addPerson(person);

//       if (person.father) {
//         addPerson(person.father);
//       }
//       if (person.mother) {
//         addPerson(person.mother);
//       }
//       (person.childrenIds || []).forEach((childId) => {
//         addPerson({ _id: childId });
//       });
//       (person.spouseIds || []).forEach((spouseId) => {
//         addPerson({ _id: spouseId });
//       });
//     });

//     // Convert the map to an array
//     const persons = Array.from(personMap.values());

//     // Return the formatted family tree data
//     res.json(persons);
//   } catch (error) {
//     console.error("Error fetching family tree:", error);
//     res.status(500).json({ message: "Error fetching family tree" });
//   }
// };

const addPerson = async (req, res) => {
  try {
    const { key, n, s, m, f, spouse, t } = req.body;

    // Check if a person with the same key already exists
    const existingPerson = await Person.findOne({ key });
    if (existingPerson) {
      return res
        .status(400)
        .json({ message: "Person with this key already exists." });
    }

    // Create a new person
    const newPerson = new Person({
      key,
      n,
      s,
      m,
      f,
      spouse,
      t,
    });

    // Save the person to the database
    await newPerson.save();

    res
      .status(201)
      .json({ message: "Person added successfully", person: newPerson });
  } catch (error) {
    console.error("Error adding person:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// const buildNodeObject = (member) => {
//   return {
//     key: member._id.toString(),
//     name: member.name,
//     title: member.gender,
//     parent: member.parents.length > 0 ? member.parents[0]._id.toString() : null, // Set parent if available
//     spouse:
//       member.spouseIds.length > 0
//         ? member.spouseIds.map((spouse) => ({
//             key: spouse._id.toString(),
//             name: spouse.name,
//             gender: spouse.gender,
//             dateOfBirth: spouse.dateOfBirth,
//           }))
//         : null,
//   };
// };

// const getFamilyTrees = async (req, res) => {
//   const startTime = performance.now(); // Start timing

//   try {
//     const allPersons = await Person.find({})
//       .populate("parents")
//       .populate("children")
//       .populate("spouseIds")
//       .populate("siblings")
//       .populate("stepParents")
//       .populate("stepChildren")
//       .populate("halfSiblings");

//     const nodeDataArray = [];
//     const seenIds = new Set();

//     const buildNodeObject = (member) => {
//       // Ensure the member and its properties are defined
//       if (!member) return {};

//       return {
//         id: member._id.toString(),
//         name: member.name,
//         gender: member.gender,
//         dateOfBirth: member.dateOfBirth,
//         dateOfDeath: member.dateOfDeath,
//         biography: member.biography,
//         late: member.late,
//         parents: member.parents
//           ? member.parents.map((p) => p._id.toString())
//           : [],
//         children: member.children
//           ? member.children.map((c) => c._id.toString())
//           : [],
//         spouseIds: member.spouseIds
//           ? member.spouseIds.map((s) => s._id.toString())
//           : [],
//         siblings: member.siblings
//           ? member.siblings.map((s) => s._id.toString())
//           : [],
//         stepParents: member.stepParents
//           ? member.stepParents.map((sp) => sp._id.toString())
//           : [],
//         stepChildren: member.stepChildren
//           ? member.stepChildren.map((sc) => sc._id.toString())
//           : [],
//         halfSiblings: member.halfSiblings
//           ? member.halfSiblings.map((hs) => hs._id.toString())
//           : [],
//       };
//     };

//     const processFamilyMember = (member) => {
//       if (!seenIds.has(member._id.toString())) {
//         nodeDataArray.push(buildNodeObject(member));
//         seenIds.add(member._id.toString());

//         // Process children recursively
//         if (Array.isArray(member.children)) {
//           member.children.forEach((child) => {
//             processFamilyMember(child);
//           });
//         }

//         // Process spouse relationships
//         if (Array.isArray(member.spouseIds)) {
//           member.spouseIds.forEach((spouseId) => {
//             const spouse = allPersons.find(
//               (p) => p._id.toString() === spouseId._id.toString()
//             );
//             if (spouse) {
//               processFamilyMember(spouse);
//             }
//           });
//         }

//         // Process step-parents
//         if (Array.isArray(member.stepParents)) {
//           member.stepParents.forEach((stepParent) => {
//             processFamilyMember(stepParent);
//           });
//         }

//         // Process half-siblings
//         if (Array.isArray(member.halfSiblings)) {
//           member.halfSiblings.forEach((halfSibling) => {
//             processFamilyMember(halfSibling);
//           });
//         }
//       }
//     };

//     // Start processing from the root (those without parents)
//     allPersons.forEach((person) => {
//       if (!seenIds.has(person._id.toString())) {
//         processFamilyMember(person);
//       }
//     });

//     const response = {
//       class: "go.TreeModel",
//       nodeDataArray: nodeDataArray,
//     };

//     const endTime = performance.now(); // End timing
//     const responseTime = (endTime - startTime).toFixed(2); // Calculate response time

//     return res
//       .status(200)
//       .json({ ...response, responseTime: `${responseTime}ms` });
//   } catch (error) {
//     console.error("Error fetching family trees:", error);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while fetching the family trees." });
//   }
// };

// const getFamilyTrees = async (req, res) => {
//   try {
//     const allPersons = await Person.find({})
//       .populate("parents")
//       .populate("children")
//       .populate("spouseIds")
//       .populate("siblings")
//       .populate("stepParents")
//       .populate("stepChildren")
//       .populate("halfSiblings");

//     const nodeDataArray = [];
//     const seenIds = new Set();

//     const processFamilyMember = (member) => {
//       if (!seenIds.has(member._id.toString())) {
//         nodeDataArray.push(buildNodeObject(member));
//         seenIds.add(member._id.toString());

//         // Process children recursively
//         member.children.forEach((child) => {
//           processFamilyMember(child);
//         });

//         // Process spouse relationships
//         member.spouseIds.forEach((spouseId) => {
//           const spouse = allPersons.find(
//             (p) => p._id.toString() === spouseId._id.toString()
//           );
//           if (spouse) {
//             processFamilyMember(spouse);
//           }
//         });

//         // Process step-parents
//         member.stepParents.forEach((stepParent) => {
//           processFamilyMember(stepParent);
//         });

//         // Process half-siblings
//         member.halfSiblings.forEach((halfSibling) => {
//           processFamilyMember(halfSibling);
//         });
//       }
//     };

//     // Start processing from the root (those without parents)
//     allPersons.forEach((person) => {
//       if (!seenIds.has(person._id.toString())) {
//         processFamilyMember(person);
//       }
//     });

//     const response = {
//       class: "go.TreeModel",
//       nodeDataArray: nodeDataArray,
//     };

//     return res.status(200).json(response);
//   } catch (error) {
//     console.error("Error fetching family trees:", error);
//     return res
//       .status(500)
//       .json({ message: "An error occurred while fetching the family trees." });
//   }
// };

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

const addChildById = async (req, res) => {
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

// -------------------- Validate Father -------------------

const addChild = async (req, res) => {
  const {
    childName,
    childDOB,
    childGender,
    fatherId,
    motherId,
    spouseName,
    spouseDOB,
    spouseGender,
    tribe,
    about,
    ID,
    address,
  } = req.body;

  try {
    // Validate input
    if (!childName || !childDOB || !childGender || !fatherId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if motherId is provided
    if (!motherId) {
      return res.status(400).json({ message: "Mother ID is required" });
    }

    // Find the father by ID
    const father = await Person.findById(fatherId);
    if (!father) {
      return res.status(404).json({ message: "Father not found" });
    }

    // Verify that the mother is in the father's spouseIds array
    if (!father.spouseIds.includes(motherId)) {
      return res
        .status(400)
        .json({ message: "Mother is not a spouse of the father" });
    }

    // Create the new child
    const newChild = new Person({
      name: childName,
      dateOfBirth: new Date(childDOB),
      gender: childGender,
      father: fatherId,
      mother: motherId,
      tribe: tribe || "",
      biography: about || "",
      ID: ID || "",
      address: address || "",
    });
    const savedChild = await newChild.save();

    if (spouseName && spouseDOB && spouseGender) {
      const newSpouse = new Person({
        name: spouseName,
        dateOfBirth: new Date(spouseDOB),
        gender: spouseGender,
        father: null,
        mother: null,
      });

      const savedSpouse = await newSpouse.save();

      savedChild.spouseIds.push(savedSpouse._id);
      await savedChild.save();

      savedSpouse.spouseIds.push(savedChild._id);
      await savedSpouse.save();
    }

    father.children.push(savedChild._id);

    await father.save();

    const mother = await Person.findById(motherId);
    if (!mother) {
      return res.status(404).json({ message: "Mother not found" });
    }
    mother.children.push(savedChild._id);
    await mother.save();

    res.status(201).json({
      message: "Child added successfully",
      child: savedChild,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const createAndSaveChild = async ({
  father,
  motherId,
  childName,
  childGender,
  childDOB,
  spouse,
  res,
}) => {
  try {
    let mother = null;

    // Find possible mothers from spouseIds if motherId is not provided
    if (!motherId) {
      if (!father) {
        return res.status(400).json({
          message: "Father details are required to find possible mothers.",
        });
      }

      // Find possible mothers based on father’s spouseIds
      const possibleMothers = await Person.find({
        _id: { $in: father.spouseIds },
      });

      // Check if there are no possible mothers
      if (possibleMothers.length === 0) {
        return res.status(400).json({
          message: "No possible mothers found in father's spouse IDs.",
          fatherID: father._id,
        });
      }

      // If there's only one possible mother, use that mother
      if (possibleMothers.length === 1) {
        mother = possibleMothers[0];
      } else {
        // Multiple possible mothers found, ask for correct motherId
        return res.status(400).json({
          message: "Please provide the correct mother ID.",
          possibleMothers: possibleMothers.map((mother) => ({
            id: mother._id,
            name: mother.name,
            dateOfBirth: mother.dateOfBirth,
          })),
        });
      }
    } else {
      // If motherId is provided, find and validate the mother
      mother = await Person.findById(motherId);
      if (!mother) {
        return res.status(404).json({ message: "Mother not found" });
      }
    }

    // Create and save the child
    const child = new Person({
      name: childName,
      gender: childGender,
      dateOfBirth: new Date(childDOB),
      father: father ? father._id : undefined, // Set father
      mother: mother ? mother._id : undefined, // Set mother if found, otherwise undefined
      spouseIds: spouse ? [spouse._id] : [], // Add spouse ID if available
    });

    await child.save();

    // Update the father and mother with the child
    if (father) {
      father.children = [...(father.children || []), child._id];
      await father.save();
    }

    if (mother) {
      mother.children = [...(mother.children || []), child._id];
      await mother.save();
    }

    // Update the spouse's spouseIds array if the spouse is found
    if (spouse) {
      spouse.spouseIds = [...(spouse.spouseIds || []), child._id];
      await spouse.save();
    }

    res.status(201).json({
      message: "Child added successfully!",
      child,
    });
  } catch (error) {
    console.error("Error creating child:", error);
    res.status(500).json({ message: "Error creating child" });
  }
};

// -------------Searchable select API Males only -----------------

const searchPersonByName = async (req, res) => {
  const { name } = req.params;

  try {
    const people = await Person.find({
      name: new RegExp(name, "i"),
      gender: "male",
    })
      .populate("mother", "name")
      .populate("father", "name")
      .select("name tribe dateOfBirth mother father _id");

    if (people.length === 0) {
      return res.status(200).json({
        message: "No matching persons found",
        people: [],
      });
    }

    // Format the response to include mother and father names
    const formattedPeople = people.map((person) => ({
      _id: person._id,
      name: person.name,
      tribe: person.tribe || "Unknown Tribe",
      dateOfBirth: person.dateOfBirth,
      mother: person.mother ? person.mother.name : "Unknown Mother",
      father: person.father ? person.father.name : "Unknown Father",
    }));

    res.status(200).json(formattedPeople);
  } catch (error) {
    console.error("Error fetching persons:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------Searchable select API all users  -----------------

const searchUserByName = async (req, res) => {
  const { name } = req.params;

  try {
    const people = await Person.find({
      name: new RegExp(name, "i"),
    })
      .populate("mother", "name")
      .populate("father", "name")
      .select("name tribe dateOfBirth mother father _id");
    if (people.length === 0) {
      return res.status(200).json({
        message: "No matching persons found",
        people: [],
      });
    }

    // Format the response to include mother and father names
    const formattedPeople = people.map((person) => ({
      _id: person._id,
      name: person.name,
      tribe: person.tribe || "Unknown Tribe",
      dateOfBirth: person.dateOfBirth,
      mother: person.mother ? person.mother.name : "Unknown Mother",
      father: person.father ? person.father.name : "Unknown Father",
    }));

    res.status(200).json(formattedPeople);
  } catch (error) {
    console.error("Error fetching persons:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------- Get Person With family --------------

const getPersonWithFamily = async (req, res) => {
  const { id } = req.params;

  try {
    const person = await Person.findById(id)
      .populate({
        path: "father",
        select: "name father mother",
        populate: {
          path: "father mother",
          select: "name",
        },
      })
      .populate({
        path: "spouseIds",
        select: "name",
      })
      .populate("mother", "name")
      .select("name dateOfBirth father mother gender");

    if (!person) {
      return res.status(404).json({ message: "Person not found" });
    }

    const spouses = person.spouseIds.map((spouse) => ({
      id: spouse._id,
      name: spouse.name,
    }));

    const responseData = {
      name: person.name,
      dateOfBirth: person.dateOfBirth,
      father: person.father ? person.father.name : null,
      mother: person.mother ? person.mother.name : null,
      grandfather: person.father?.father ? person.father.father.name : null,
      grandmother: person.father?.mother ? person.father.mother.name : null,
      spouses: spouses.length > 0 ? spouses : null,
      gender: person.gender,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching person with family:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// const addChild = async (req, res) => {
//   const {
//     parentName,
//     parentDateOfBirth,
//     parentId,
//     childName,
//     childGender,
//     childDateOfBirth,
//   } = req.body;

//   // Trim and convert to lowercase for consistency in searching
//   const sanitizedParentName = parentName.trim();
//   console.log(sanitizedParentName);

//   try {
//     // Find parents by name using regex for case-insensitive match
//     const parents = await Person.find({
//       name: sanitizedParentName,
//     });

//     if (parents.length > 1) {
//       if (parentDateOfBirth) {
//         const filteredParents = parents.filter(
//           (parent) =>
//             parent.dateOfBirth.toISOString().split("T")[0] ===
//             new Date(parentDateOfBirth).toISOString().split("T")[0]
//         );

//         if (filteredParents.length === 1) {
//           // Single match found with name and DOB
//           const parent = filteredParents[0];
//           await handleChildCreation(req, res, parent);
//         } else if (filteredParents.length > 1) {
//           if (parentId) {
//             const selectedParent = filteredParents.find(
//               (parent) => parent._id.toString() === parentId
//             );

//             if (selectedParent) {
//               await handleChildCreation(req, res, selectedParent);
//             } else {
//               return res.status(400).json({
//                 error: "Provided parentId does not match any filtered parents",
//                 parents: filteredParents.map((parent) => ({
//                   _id: parent._id,
//                   name: parent.name,
//                   dateOfBirth: parent.dateOfBirth,
//                   gender: parent.gender,
//                 })),
//               });
//             }
//           } else {
//             return res.status(400).json({
//               error:
//                 "Multiple parents found with the same name and date of birth",
//               parents: filteredParents.map((parent) => ({
//                 _id: parent._id,
//                 name: parent.name,
//                 dateOfBirth: parent.dateOfBirth,
//                 gender: parent.gender,
//               })),
//             });
//           }
//         } else {
//           return res.status(400).json({
//             error: "No matching parent found with the given date of birth.",
//             parents: parents.map((parent) => ({
//               _id: parent._id,
//               name: parent.name,
//               dateOfBirth: parent.dateOfBirth,
//               gender: parent.gender,
//             })),
//           });
//         }
//       } else {
//         // Multiple parents found but no date of birth provided
//         return res.status(400).json({
//           error: "Multiple parents found. Please enter a date of birth.",
//           parents: parents.map((parent) => ({
//             _id: parent._id,
//             name: parent.name,
//             dateOfBirth: parent.dateOfBirth,
//             gender: parent.gender,
//           })),
//         });
//       }
//     } else if (parents.length === 1) {
//       const parent = parents[0];

//       if (parentDateOfBirth) {
//         if (
//           parent.dateOfBirth.toISOString().split("T")[0] !==
//           new Date(parentDateOfBirth).toISOString().split("T")[0]
//         ) {
//           return res.status(400).json({
//             error: "Parent found, but date of birth does not match",
//             parentDateOfBirth: parent.dateOfBirth.toISOString().split("T")[0],
//           });
//         }
//       }

//       // Single parent found with matching name and optional DOB check
//       await handleChildCreation(req, res, parent);
//     } else {
//       // No parent found
//       return res.status(404).json({ error: "Parent not found" });
//     }
//   } catch (error) {
//     console.error("Error processing child addition request:", error);
//     res.status(500).json({
//       error: "Error processing child addition request",
//       details: error.message,
//     });
//   }
// };

// Helper function to handle child creation logic
const handleChildCreation = async (req, res, parent) => {
  const { childName, childGender, childDateOfBirth } = req.body;

  try {
    const newChild = new Person({
      name: childName.trim(),
      gender: childGender,
      dateOfBirth: new Date(childDateOfBirth),
      parents: [parent._id],
    });

    const savedChild = await newChild.save();

    await Person.findByIdAndUpdate(parent._id, {
      $addToSet: { children: savedChild._id },
    });

    return res.json({
      message: "Child added successfully",
      child: savedChild,
      parent: {
        name: parent.name,
        dateOfBirth: parent.dateOfBirth,
        gender: parent.gender,
      },
    });
  } catch (error) {
    console.error("Error adding child:", error);
    res.status(500).json({
      error: "Error adding child",
      details: error.message,
    });
  }
};

const childAdditionRequest = async (req, res) => {
  const { childID } = req.params;

  try {
    const childExist = await Person.findById(childID);

    if (!childExist) {
      return res.status(404).json({ error: "Child not found" });
    }

    childExist.status = "approved";

    await childExist.save();

    return res.json({
      message: "Child approve successfully",
    });
  } catch (error) {
    console.error("Error processing child addition request:", error);
    res.status(500).json({
      error: "Error processing child addition request",
      details: error.message,
    });
  }
};

const childAddRequestDecline = async (req, res) => {
  const { childID } = req.params;

  try {
    const childExist = await Person.findById(childID);

    if (!childExist) {
      return res.status(404).json({ error: "Child not found" });
    }

    childExist.status = "rejected";

    await childExist.save();

    return res.json({
      message: "Child add request decline successfully",
    });
  } catch (error) {
    console.error("Error processing child addition request:", error);
    res.status(500).json({
      error: "Error processing child addition request",
      details: error.message,
    });
  }
};

const getPendingChildAdditionRequests = async (req, res) => {
  try {
    const pendingRequests = await Person.find({ status: "pending" });

    return res.json({
      message: "Pending child addition requests retrieved successfully",
      requests: pendingRequests,
    });
  } catch (error) {
    console.error("Error retrieving pending child addition requests:", error);
    res.status(500).json({
      error: "Error retrieving pending child addition requests",
      details: error.message,
    });
  }
};

const addSpouse = async (req, res) => {
  const { userID, spouseName, spouseDOB, spouseGender } = req.body;

  // Validate the input fields
  if (!userID || !spouseName || !spouseDOB || !spouseGender) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Create a new Person document for the spouse
    const newSpouse = new Person({
      name: spouseName,
      dateOfBirth: new Date(spouseDOB),
      gender: spouseGender,
    });

    // Save the new spouse document
    const savedSpouse = await newSpouse.save();

    // 2. Find the original person by ID
    const person = await Person.findById(userID);

    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }

    // 3. Add the spouse ID to the person's spouseIds array
    person.spouseIds.push(savedSpouse._id);
    await person.save();

    // 4. Add the person's ID to the spouse's spouseIds array
    savedSpouse.spouseIds.push(person._id);
    await savedSpouse.save();

    // Respond with success
    res.json({ message: "Spouse added successfully", spouse: savedSpouse });
  } catch (error) {
    // Handle any errors
    res
      .status(500)
      .json({ error: "Error adding spouse", details: error.message });
  }
};

const searchPerson = async (req, res) => {
  const { name, dateOfBirth } = req.body;

  console.log(name, dateOfBirth);

  if (!name) {
    return res
      .status(400)
      .json({ error: "Name is required to perform search." });
  }

  try {
    const searchCriteria = { name: new RegExp(name, "i") };

    if (dateOfBirth) {
      searchCriteria.dateOfBirth = new Date(dateOfBirth);
    }

    console.log(searchCriteria);

    const people = await Person.find(searchCriteria)
      .populate(
        "parents children spouse siblings stepParents stepChildren halfSiblings"
      )
      .exec();

    if (people.length === 0) {
      return res
        .status(404)
        .json({ message: "No person found with the provided criteria." });
    }

    if (people.length > 1) {
      return res
        .status(200)
        .json({ message: "Multiple people found.", data: people });
    }

    const person = people[0];
    const familyTree = await buildNodeObject(person);

    res.status(200).json({ message: "Person found.", data: familyTree });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error searching for person.", details: error.message });
  }
};

const getCounter = async (req, res) => {
  try {
    // Fetch the counter value from the database
    let counter = await Counter.findOne();

    if (!counter) {
      // Initialize the counter if it doesn't exist
      counter = new Counter({ count: 0 });
      await counter.save();
    }

    // Respond with the current counter value
    res.status(200).json({ count: counter.count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const postCounter = async (req, res) => {
  try {
    // Fetch the counter value from the database
    let counter = await Counter.findOne();

    if (!counter) {
      // Initialize the counter if it doesn't exist
      counter = new Counter({ count: 0 });
    }

    // Get the number from the request parameters
    const incrementValue = parseInt(req.params.no, 10);

    if (isNaN(incrementValue) || incrementValue <= 0) {
      return res.status(400).json({ message: "Invalid increment value" });
    }

    // Increment the counter value by the number from the parameters
    counter.count += incrementValue;
    await counter.save();

    // Respond with the updated counter value
    res.status(200).json({ count: counter.count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const makePublicFigure = async (req, res) => {
  const { personId } = req.params;

  const personExist = await Person.findById(personId);
  if (!personExist) {
    return res.status(404).json({ error: "Person not found" });
  }
  personExist.isProminentFigure = true;
  await personExist.save();
  res.json({ message: "Person made public" });
};

const getAllPublicFigures = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default to page 1, limit 10

    // Convert page and limit to numbers
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    // Fetch public figures with pagination
    const publicFigures = await Person.find(
      { isProminentFigure: true },
      "name biography"
    )
      .skip((pageNumber - 1) * limitNumber) // Skip the previous pages' items
      .limit(limitNumber); // Limit the number of items to the requested limit

    // Get the total count for pagination metadata
    const total = await Person.countDocuments({ isProminentFigure: true });

    res.status(200).json({
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      limit: limitNumber,
      publicFigures,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch public figures", error });
  }
};


const getAllPersons = async (req, res) => {
  try {
    const persons = await Person.find().populate(
      "father mother children spouseIds siblings"
    );

    res.status(200).json(persons);
  } catch (error) {
    console.error("Error fetching persons:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const openSearch = async (req, res) => {
  try {
    const {
      biography,
      gender,
      dateOfBirth,
      dateOfDeath,
      status,
      isProminentFigure,
      fatherName,
      motherName,
      childName,
      grandfatherName,
      grandmotherName,
    } = req.query;

    let filter = {};

    // Add basic filters
    if (biography) filter.biography = { $regex: biography, $options: "i" };
    if (gender) filter.gender = gender;
    if (dateOfBirth) filter.dateOfBirth = new Date(dateOfBirth);
    if (dateOfDeath) filter.dateOfDeath = new Date(dateOfDeath);
    if (status) filter.status = status;
    if (isProminentFigure)
      filter.isProminentFigure = isProminentFigure === "true";

    // Step 1: Handle childName if provided
    let personList = [];
    if (childName) {
      personList = await Person.find({
        name: { $regex: childName, $options: "i" },
      });

      // If no children found, return early
      if (!personList || personList.length === 0) {
        return res
          .status(404)
          .json({ message: "No persons found matching the child name." });
      }

      // Step 2: Handle fatherName if provided
      if (fatherName) {
        personList = await Promise.all(
          personList.map(async (child) => {
            const father = await Person.findOne({
              _id: child.father,
              name: { $regex: fatherName, $options: "i" },
            });
            return father ? child : null;
          })
        );
        personList = personList.filter((child) => child !== null);

        // If no matches found, return early
        if (personList.length === 0) {
          return res
            .status(404)
            .json({ message: "No persons found matching the father name." });
        }
      }

      // Step 3: Handle grandfatherName if provided
      if (grandfatherName) {
        personList = await Promise.all(
          personList.map(async (child) => {
            const father = await Person.findById(child.father);
            if (father) {
              const grandfather = await Person.findOne({
                _id: father.father,
                name: { $regex: grandfatherName, $options: "i" },
              });
              return grandfather ? child : null;
            }
            return null;
          })
        );
        personList = personList.filter((child) => child !== null);

        // If no matches found, return early
        if (personList.length === 0) {
          return res
            .status(404)
            .json({
              message: "No persons found matching the grandfather name.",
            });
        }
      }
    }

    // Additional filtering on top of family relationships (other parameters)
    if (personList.length === 0) {
      // If no child name was provided, we search directly by other filters
      personList = await Person.find(filter, "name ID biography");
    } else {
      // If child name was provided, filter the list of found persons
      personList = personList.filter((person) =>
        Object.keys(filter).every((key) => filter[key] === person[key])
      );
    }

    // Check if any persons were found
    if (!personList || personList.length === 0) {
      return res
        .status(404)
        .json({ message: "No persons found matching the criteria." });
    }

    // Return the search results
    res.status(200).json(personList);
  } catch (error) {
    console.error("Error while searching persons:", error);
    res
      .status(500)
      .json({ message: "Server error occurred while searching persons." });
  }
};

module.exports = {
  getAllPersons,
  createPerson,
  getFamilyTrees,
  getPersonById,
  updatePerson,
  deletePerson,
  addChild,
  addSpouse,
  signup,
  searchPerson,
  login,
  addChildById,
  childAdditionRequest,
  getPendingChildAdditionRequests,
  getCounter,
  postCounter,
  addPerson,
  makePublicFigure,
  getAllPublicFigures,
  getFamilyTreeById,
  searchPersonByName,
  getPersonWithFamily,
  searchUserByName,
  childAddRequestDecline,
  openSearch,
};
