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
      await Person.updateMany({ _id: { $in: parents } }, { $addToSet: { children: savedPerson._id } });
    }

    if (validSpouses.length) {
      await Person.updateMany({ _id: { $in: validSpouses } }, { $addToSet: { spouseIds: savedPerson._id } });
    }

    if (children.length) {
      await Person.updateMany({ _id: { $in: children } }, { $addToSet: { parents: savedPerson._id } });
    }

    if (siblings.length) {
      await Person.updateMany({ _id: { $in: siblings } }, { $addToSet: { siblings: savedPerson._id } });
    }

    if (stepParents.length) {
      await Person.updateMany({ _id: { $in: stepParents } }, { $addToSet: { stepChildren: savedPerson._id } });
    }

    if (stepChildren.length) {
      await Person.updateMany({ _id: { $in: stepChildren } }, { $addToSet: { stepParents: savedPerson._id } });
    }

    if (halfSiblings.length) {
      await Person.updateMany({ _id: { $in: halfSiblings } }, { $addToSet: { halfSiblings: savedPerson._id } });
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
      m: member.parents.find((parent) => parent.gender === "female")?._id.toString(),
      f: member.parents.find((parent) => parent.gender === "male")?._id.toString(),
      spouse: spouseIds.length ? spouseIds[0] : undefined,
    };
  };

  const transformedData = members.map(buildNodeObject);

  return transformedData;
};

const getFamilyTrees = async (req, res) => {
  try {
    console.log("Inside get tree controller function");

    const people = await Person.find({});

    // const people = await Person.aggregate([
    //   {
    //     $lookup: {
    //       from: "dummypeople",
    //       localField: "mother",
    //       foreignField: "_id",
    //       as: "mother",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "dummypeople",
    //       localField: "father",
    //       foreignField: "_id",
    //       as: "father",
    //     },
    //   },
    //   {
    //     $unwind: "$mother",
    //   },
    //   {
    //     $unwind: "$father",
    //   },
    //   {
    //     $addFields: {
    //       mother: "$mother._id",
    //       father: "$father._id",
    //     },
    //   },
    //   // {
    //   //   $project: {
    //   //     key: 1,
    //   //     n: 1,
    //   //     s: 1,
    //   //     m: { $ifNull: ["$mother", null] },
    //   //     f: { $ifNull: ["$father", null] },
    //   //     spouse: {
    //   //       $cond: {
    //   //         if: { $gt: [{ $size: "$spouse" }, 0] },
    //   //         then: "$spouse",
    //   //         else: null,
    //   //       },
    //   //     },
    //   //   },
    //   // },

    // ]);

    res.json(people);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

const addPerson = async (req, res) => {
  try {
    const { key, n, s, m, f, spouse, t } = req.body;

    // Check if a person with the same key already exists
    const existingPerson = await Person.findOne({ key });
    if (existingPerson) {
      return res.status(400).json({ message: "Person with this key already exists." });
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

    res.status(201).json({ message: "Person added successfully", person: newPerson });
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

    if (!updatedPerson) return res.status(404).json({ error: "Person not found" });
    res.json(updatedPerson);
  } catch (error) {
    res.status(500).json({ error: "Error updating person", details: error.message });
  }
};

const deletePerson = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the person to be deleted
    const personToDelete = await Person.findById(id);

    if (!personToDelete) return res.status(404).json({ error: "Person not found" });

    // Remove references to this person in other documents
    await Person.updateMany({ _id: { $in: personToDelete.parents } }, { $pull: { children: id } });
    await Person.updateMany({ _id: { $in: personToDelete.children } }, { $pull: { parents: id } });
    await Person.updateMany({ _id: { $in: personToDelete.siblings } }, { $pull: { siblings: id } });
    await Person.updateMany({ _id: personToDelete.spouse }, { $unset: { spouse: "" } });
    await Person.updateMany({ _id: { $in: personToDelete.stepParents } }, { $pull: { stepChildren: id } });
    await Person.updateMany({ _id: { $in: personToDelete.stepChildren } }, { $pull: { stepParents: id } });
    await Person.updateMany({ _id: { $in: personToDelete.halfSiblings } }, { $pull: { halfSiblings: id } });

    // Finally, delete the person
    await Person.findByIdAndDelete(id);

    res.json({ message: "Person deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting person", details: error.message });
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

const addChild = async (req, res) => {
  const { isAdmin, parentName, parentDateOfBirth, parentId, childName, childGender, childDateOfBirth } = req.body;

  try {
    console.log("Given parent name");
    console.log(parentName);

    const parents = await Person.find({
      name: parentName,
    });

    console.log("Found parents");
    console.log(parents);

    if (parents.length > 1) {
      if (parentDateOfBirth) {
        const filteredParents = parents.filter(
          (parent) =>
            parent.dateOfBirth.toISOString().split("T")[0] === new Date(parentDateOfBirth).toISOString().split("T")[0]
        );

        if (filteredParents.length === 1) {
          const parent = filteredParents[0];

          const newChild = new Person({
            name: childName.trim(),
            gender: childGender,
            dateOfBirth: new Date(childDateOfBirth),
            parents: [parent._id],
            status: isAdmin && "approved",
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
        } else if (filteredParents.length > 1) {
          if (parentId) {
            const selectedParent = filteredParents.find((parent) => parent._id.toString() === parentId);

            if (selectedParent) {
              const newChild = new Person({
                name: childName.trim(),
                gender: childGender,
                dateOfBirth: new Date(childDateOfBirth),
                parents: [selectedParent._id],
                status: isAdmin && "approved",
              });

              const savedChild = await newChild.save();

              await Person.findByIdAndUpdate(selectedParent._id, {
                $addToSet: { children: savedChild._id },
              });

              return res.json({
                message: "Child added successfully",
                child: savedChild,
                parent: {
                  name: selectedParent.name,
                  dateOfBirth: selectedParent.dateOfBirth,
                  gender: selectedParent.gender,
                },
              });
            } else {
              return res.status(400).json({
                error: "Provided parentId does not match any filtered parents",
                parents: filteredParents.map((parent) => ({
                  _id: parent._id,
                  name: parent.name,
                  dateOfBirth: parent.dateOfBirth,
                  gender: parent.gender,
                })),
              });
            }
          } else {
            return res.status(400).json({
              error: "Multiple parents found with the same name and date of birth",
              parents: filteredParents.map((parent) => ({
                _id: parent._id,
                name: parent.name,
                dateOfBirth: parent.dateOfBirth,
                gender: parent.gender,
              })),
            });
          }
        }
      } else {
        return res.status(400).json({
          error: "Multiple parents found. Please enter a date of birth.",
          parents: parents.map((parent) => ({
            _id: parent._id,
            name: parent.name,
            dateOfBirth: parent.dateOfBirth,
            gender: parent.gender,
          })),
        });
      }
    }

    if (parents.length === 1) {
      const parent = parents[0];

      if (parentDateOfBirth) {
        if (
          parent.dateOfBirth.toISOString().split("T")[0] !== new Date(parentDateOfBirth).toISOString().split("T")[0]
        ) {
          return res.status(400).json({
            error: "Parent found, but date of birth does not match",
            parentDateOfBirth: parent.dateOfBirth.toISOString().split("T")[0],
          });
        }
      }

      const newChild = new Person({
        name: childName.trim(),
        gender: childGender,
        dateOfBirth: new Date(childDateOfBirth),
        parents: [parent._id],
        status: isAdmin && "approved",
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
    }

    return res.status(404).json({ error: "Parent not found" });
  } catch (error) {
    console.error("Error adding child:", error);
    res.status(500).json({
      error: "Error adding child",
      details: error.message,
    });
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
  const { approve, parentId, childName, childGender, childDateOfBirth } = req.body;

  try {
    if (approve) {
      const parent = await Person.findById(parentId);

      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      const newChild = new Person({
        name: childName.trim(),
        gender: childGender,
        dateOfBirth: new Date(childDateOfBirth),
        parents: [parent._id],
        status: "approved",
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
    } else {
      return res.json({
        message: "Child addition request rejected",
      });
    }
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
    // Fetch all persons with the status 'pending'
    const pendingRequests = await Person.find({ status: "pending" }).populate(
      "parents",
      "_id"
    );

    if (pendingRequests.length === 0) {
      return res.json({
        message: "No pending child addition requests found",
      });
    }

    // Extract required data for each pending request
    const requestsData = pendingRequests.map((request) => {
      // Extract all parent IDs
      const parentIds = request.parents.map((parent) => parent._id);
      return {
        requestId: request._id,
        parentIds, // Include all parent IDs
        childName: request.name,
        childGender: request.gender,
        childDateOfBirth: request.dateOfBirth,
        status: request.status,
      };
    });

    return res.json({
      message: "Pending child addition requests retrieved successfully",
      requests: requestsData,
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
  const { personId, spouseId } = req.params;

  try {
    await Person.findByIdAndUpdate(personId, {
      $push: { spouseIds: spouseId },
      spouse: spouseId,
    });

    await Person.findByIdAndUpdate(spouseId, {
      $push: { spouseIds: personId },
      spouse: personId,
    });

    res.json({ message: "Spouse added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error adding spouse", details: error.message });
  }
};

const searchPerson = async (req, res) => {
  const { name, dateOfBirth } = req.body;

  console.log(name, dateOfBirth);

  if (!name) {
    return res.status(400).json({ error: "Name is required to perform search." });
  }

  try {
    const searchCriteria = { name: new RegExp(name, "i") };

    if (dateOfBirth) {
      searchCriteria.dateOfBirth = new Date(dateOfBirth);
    }

    console.log(searchCriteria);

    const people = await Person.find(searchCriteria)
      .populate("parents children spouse siblings stepParents stepChildren halfSiblings")
      .exec();

    if (people.length === 0) {
      return res.status(404).json({ message: "No person found with the provided criteria." });
    }

    if (people.length > 1) {
      return res.status(200).json({ message: "Multiple people found.", data: people });
    }

    const person = people[0];
    const familyTree = await buildNodeObject(person);

    res.status(200).json({ message: "Person found.", data: familyTree });
  } catch (error) {
    res.status(500).json({ error: "Error searching for person.", details: error.message });
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

module.exports = {
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
};
