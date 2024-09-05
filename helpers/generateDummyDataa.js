const mongoose = require("mongoose");
const Person = require("../Models/familyMember"); // Assuming your model is in a file called familyMember.js

// Function to create dummy data for one generation family
const generateDummyFamily = async () => {
  try {
    // Create the grandparents (father's side)
    const grandFather = new Person({
      name: "Grandfather",
      gender: "male",
      dateOfBirth: new Date("1950-01-01"),
      spouseIds: [], // Will be updated later
    });

    const grandMother = new Person({
      name: "Grandmother",
      gender: "female",
      dateOfBirth: new Date("1955-01-01"),
      spouseIds: [], // Will be updated later
    });

    // Save the grandparents
    await grandFather.save();
    await grandMother.save();

    // Update spouse references for grandparents
    grandFather.spouseIds.push(grandMother._id);
    grandMother.spouseIds.push(grandFather._id);
    await grandFather.save();
    await grandMother.save();

    // Create the father
    const father = new Person({
      name: "Father",
      gender: "male",
      dateOfBirth: new Date("1980-01-01"),
      father: grandFather._id, // Father's father is the grandfather
      mother: grandMother._id, // Father's mother is the grandmother
      spouseIds: [], // Will be updated later
    });

    // Create the mother
    const mother = new Person({
      name: "Mother",
      gender: "female",
      dateOfBirth: new Date("1982-01-01"),
      spouseIds: [], // Will be updated later
    });

    // Save the parents (father and mother)
    await father.save();
    await mother.save();

    // Update spouse references for parents
    father.spouseIds.push(mother._id);
    mother.spouseIds.push(father._id);
    await father.save();
    await mother.save();

    // Create children (array)
    const children = [];
    for (let i = 0; i < 3; i++) {
      const child = new Person({
        name: `Child ${i + 1}`,
        gender: i % 2 === 0 ? "male" : "female",
        dateOfBirth: new Date(`2010-0${i + 1}-01`),
        father: father._id, // Child's father
        mother: mother._id, // Child's mother
      });
      await child.save();
      children.push(child);
    }

    // Optional: Update parent references for children
    father.children = children.map((child) => child._id);
    mother.children = children.map((child) => child._id);
    await father.save();
    await mother.save();

    console.log("Dummy family generated successfully!");
  } catch (error) {
    console.error("Error generating family tree:", error);
  }
};

module.exports = { generateDummyFamily };
