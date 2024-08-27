const Person = require("../Models/familyMember");
const User = require("../Models/Auth");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


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

const buildNodeObject = (member) => {
  return {
    key: member._id.toString(),
    name: member.name,
    title: member.gender,
    parent: member.parents.length > 0 ? member.parents[0]._id.toString() : null, // Set parent if available
    spouse:
      member.spouseIds.length > 0
        ? member.spouseIds.map((spouse) => ({
            key: spouse._id.toString(),
            name: spouse.name,
            gender: spouse.gender,
            dateOfBirth: spouse.dateOfBirth,
          }))
        : null,
  };
};

const getFamilyTrees = async (req, res) => {
  try {
    const allPersons = await Person.find({})
      .populate("parents")
      .populate("children")
      .populate("spouseIds")
      .populate("siblings")
      .populate("stepParents")
      .populate("stepChildren")
      .populate("halfSiblings");

    const nodeDataArray = [];
    const seenIds = new Set();

    const processFamilyMember = (member) => {
      if (!seenIds.has(member._id.toString())) {
        nodeDataArray.push(buildNodeObject(member));
        seenIds.add(member._id.toString());

        // Process children recursively
        member.children.forEach((child) => {
          processFamilyMember(child);
        });

        // Process spouse relationships
        member.spouseIds.forEach((spouseId) => {
          const spouse = allPersons.find(
            (p) => p._id.toString() === spouseId._id.toString()
          );
          if (spouse) {
            processFamilyMember(spouse);
          }
        });

        // Process step-parents
        member.stepParents.forEach((stepParent) => {
          processFamilyMember(stepParent);
        });

        // Process half-siblings
        member.halfSiblings.forEach((halfSibling) => {
          processFamilyMember(halfSibling);
        });
      }
    };

    // Start processing from the root (those without parents)
    allPersons.forEach((person) => {
      if (!seenIds.has(person._id.toString())) {
        processFamilyMember(person);
      }
    });

    const response = {
      class: "go.TreeModel",
      nodeDataArray: nodeDataArray,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching family trees:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while fetching the family trees." });
  }
};



// const buildMemberObject = (member) => {
//   return {
//     _id: member._id,
//     name: member.name,
//     gender: member.gender,
//     dateOfBirth: member.dateOfBirth,
//     parents: member.parents.map((parent) => parent._id), 
//     children: member.children.map((child) => ({
//       _id: child._id,
//       name: child.name,
//       gender: child.gender,
//       dateOfBirth: child.dateOfBirth,
//       parents: child.parents.map((parent) => parent._id),
//       children: child.children.map((grandChild) => grandChild._id), 
//       siblings: [], 
//       stepParents: [], 
//       stepChildren: [], 
//       halfSiblings: [], 
//       spouseIds: child.spouseIds.map((spouse) => spouse._id),
//       late: child.late,
//       __v: child.__v,
//     })),
//     siblings: [], 
//     stepParents: [], 
//     stepChildren: [], 
//     halfSiblings: [], 
//     spouseIds: member.spouseIds.map((spouse) => spouse._id),
//     late: member.late,
//     __v: member.__v,
//   };
// };



// const getFamilyTrees = async (req, res) => {
//   try {
//     // Step 1: Fetch all persons
//     const allPersons = await Person.find({}).populate("children");

//     // Step 2: Collect all child IDs
//     const childIds = new Set();
//     allPersons.forEach((person) => {
//       person.children.forEach((child) => {
//         childIds.add(child._id.toString());
//       });
//     });

//     // Step 3: Filter male parents who are not children of any other person
//     const maleParentIds = allPersons
//       .filter(
//         (person) =>
//           person.gender === "male" && !childIds.has(person._id.toString())
//       )
//       .map((maleParent) => maleParent._id);

//     if (maleParentIds.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No eligible male parents found." });
//     }

//     // Step 4: Build the family trees for each eligible male parent
//     const familyTrees = [];

//     for (const maleParentId of maleParentIds) {
//       // Fetch the root family member for this male parent
//       const rootMember = await Person.findOne({ _id: maleParentId })
//         .populate("children")
//         .populate("spouseIds");

//       if (!rootMember) {
//         continue; // If no root member found, skip to the next male parent
//       }

//       // Build the root member object
//       const rootObject = buildMemberObject(rootMember);

//       // Fetch all family members related to this family
//       const allFamilyMembers = await Person.find({
//         $or: [
//           { parents: rootMember._id },
//           { children: { $in: rootMember.children.map((child) => child._id) } },
//         ],
//       })
//         .populate("parents")
//         .populate("children")
//         .populate("spouseIds");

//       // Build the 'members' array
//       const members = allFamilyMembers.map((member) =>
//         buildMemberObject(member)
//       );

//       // Add the constructed family tree to the result array
//       familyTrees.push({
//         root: rootObject,
//         members: members,
//       });
//     }

//     return res.status(200).json(familyTrees);
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

const addChild = async (req, res) => {
  const {
    parentName,
    parentDateOfBirth,
    parentId, 
    childName,
    childGender,
    childDateOfBirth,
  } = req.body;

  try {
    
    const parents = await Person.find({ name: parentName });

    
    if (parents.length > 1) {
      if (parentDateOfBirth) {
        
        const filteredParents = parents.filter(
          (parent) =>
            parent.dateOfBirth.toISOString().split("T")[0] ===
            new Date(parentDateOfBirth).toISOString().split("T")[0]
        );

        if (filteredParents.length === 1) {
          const parent = filteredParents[0];

         
          const newChild = new Person({
            name: childName,
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
        } else if (filteredParents.length > 1) {
          
          if (parentId) {
            const selectedParent = filteredParents.find(
              (parent) => parent._id.toString() === parentId
            );

            if (selectedParent) {
             
              const newChild = new Person({
                name: childName,
                gender: childGender,
                dateOfBirth: new Date(childDateOfBirth),
                parents: [selectedParent._id],
              });

             
              const savedChild = await newChild.save();

             
              await Person.findByIdAndUpdate(selectedParent._id, {
                $addToSet: { children: savedChild._id },
              });

              // Respond with success message and all relevant data
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
            // If no parentId is provided and multiple parents are found
            return res.status(400).json({
              error:
                "Multiple parents found with the same name and date of birth. Please provide a parentId.",
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
        // If no date of birth is provided and multiple parents are found
        return res.status(400).json({
          error:
            "Multiple parents found with the same name. Please provide a parentDateOfBirth.",
          parents: parents.map((parent) => ({
            _id: parent._id,
            name: parent.name,
            dateOfBirth: parent.dateOfBirth,
            gender: parent.gender,
          })),
        });
      }
    }

    // If exactly one parent is found
    if (parents.length === 1) {
      const parent = parents[0];

      // If parentDateOfBirth is provided, check for a match
      if (parentDateOfBirth) {
        if (
          parent.dateOfBirth.toISOString().split("T")[0] !==
          new Date(parentDateOfBirth).toISOString().split("T")[0]
        ) {
          return res.status(400).json({
            error: "Parent found, but date of birth does not match",
            parentDateOfBirth: parent.dateOfBirth.toISOString().split("T")[0],
          });
        }
      }

      // Create a new child document
      const newChild = new Person({
        name: childName,
        gender: childGender,
        dateOfBirth: new Date(childDateOfBirth),
        parents: [parent._id],
      });

      // Save the new child document
      const savedChild = await newChild.save();

      // Update the parent's document to include the new child
      await Person.findByIdAndUpdate(parent._id, {
        $addToSet: { children: savedChild._id },
      });

      // Respond with success message and all relevant data
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

    // If no parent is found
    return res.status(404).json({ error: "Parent not found" });
  } catch (error) {
    console.error("Error adding child:", error);
    res.status(500).json({
      error: "Error adding child",
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
};
