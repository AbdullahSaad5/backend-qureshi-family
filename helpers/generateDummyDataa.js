const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const Person = require("../Models/familyMember");

// Function to generate a random date
const getRandomDate = (startYear, endYear) => {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

// Function to create a single person
const createPerson = async (parents = []) => {
  const person = {
    name: faker.person.fullName(),
    gender: faker.helpers.arrayElement(["male", "female"]),
    dateOfBirth: getRandomDate(1950, 2000), // Random date between 1950 and 2000
    dateOfDeath: Math.random() > 0.5 ? getRandomDate(2000, 2024) : null, // Random date if dead
    biography: faker.lorem.paragraph(),
    late: Math.random() > 0.5,
    parents,
  };
  return await Person.create(person);
};

// Function to create a family with a given number of children
const createFamily = async (numChildren, parentIds = []) => {
  const family = [];
  for (let i = 0; i < numChildren; i++) {
    const person = await createPerson(parentIds);
    family.push(person);
  }
  return family;
};

// Recursive function to create a tree structure
const createFamilyTree = async (
  numGenerations,
  numFamiliesPerGeneration,
  numChildrenPerFamily,
  parentIds = []
) => {
  if (numGenerations <= 0) return;

  const families = [];

  for (let i = 0; i < numFamiliesPerGeneration; i++) {
    const family = await createFamily(numChildrenPerFamily, parentIds);
    families.push(family);

    // Prepare parent IDs for the next generation
    const newParentIds = family.map((member) => member._id);

    // Recursively create the next generation
    await createFamilyTree(
      numGenerations - 1,
      numFamiliesPerGeneration,
      numChildrenPerFamily,
      newParentIds
    );
  }

  return families;
};

const generateDummyDataa = async () => {
  try {
    console.log("Starting dummy data generation...");

    // Number of generations and families per generation
    const numGenerations = 5;
    const numFamiliesPerGeneration = 10; // Number of families per generation
    const numChildrenPerFamily = 4; // Number of children per family

    // Create the root generation
    await createFamilyTree(
      numGenerations,
      numFamiliesPerGeneration,
      numChildrenPerFamily
    );

    console.log("Dummy data generation completed successfully");
  } catch (error) {
    console.error("Error generating dummy data", error);
  } finally {
    mongoose.connection.close();
  }
};

module.exports = generateDummyDataa;
