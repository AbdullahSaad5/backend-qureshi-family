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
const createPerson = async (
  name,
  gender,
  dateOfBirth,
  dateOfDeath,
  biography,
  late,
  parents = []
) => {
  const person = new Person({
    name,
    gender,
    dateOfBirth,
    dateOfDeath,
    biography,
    late,
    parents,
    status: "approved", // Ensure status is set to "approved"
  });

  return await person.save();
};

// Function to create a family with a given number of children
const createFamily = async (numChildren, mother, father) => {
  const family = [];
  for (let i = 0; i < numChildren; i++) {
    const child = await createPerson(
      faker.person.fullName(),
      faker.helpers.arrayElement(["male", "female"]),
      getRandomDate(1950, 2000),
      Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
      faker.lorem.paragraph(),
      Math.random() > 0.5,
      [mother._id, father._id] // Array of parent IDs
    );
    family.push(child);

    // Update parents' children lists
    mother.children.push(child._id);
    father.children.push(child._id);
  }

  await mother.save();
  await father.save();

  return family;
};

// Function to create a small family tree with one grandparent and two families
const createSmallFamilyTree = async () => {
  // Create the grandparent
  const grandparent = await createPerson(
    faker.person.fullName(),
    faker.helpers.arrayElement(["male", "female"]),
    getRandomDate(1920, 1950),
    Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
    faker.lorem.paragraph(),
    Math.random() > 0.5
  );

  // Create the first parent (child of the grandparent)
  const parent1 = await createPerson(
    faker.person.fullName(),
    "male",
    getRandomDate(1950, 1980),
    Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
    faker.lorem.paragraph(),
    Math.random() > 0.5,
    [grandparent._id]
  );

  // Create the second parent (child of the grandparent)
  const parent2 = await createPerson(
    faker.person.fullName(),
    "female",
    getRandomDate(1950, 1980),
    Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
    faker.lorem.paragraph(),
    Math.random() > 0.5,
    [grandparent._id]
  );

  // Create two families with the parents
  const family1 = await createFamily(3, parent1, parent2);
  const family2 = await createFamily(2, parent1, parent2);

  // Create a sub-family with one of the children from Family 1
  const subFamilyParent = family1[0]; // First child of parent1 and parent2
  const subFamily = await createFamily(2, subFamilyParent, subFamilyParent); // This person is their own parent for this example

  // Update all relevant parent-child relationships
  const allParents = [parent1, parent2];
  for (const family of [family1, family2]) {
    for (const child of family) {
      child.parents.push(...allParents.map((p) => p._id));
      await child.save();
    }
  }

  // Update sub-family parent relationships
  for (const child of subFamily) {
    child.parents.push(subFamilyParent._id);
    await child.save();
  }

  await grandparent.save();
};

const generateDummyData = async () => {
  try {
    console.log("Starting dummy data generation...");

    // Create the small family tree
    await createSmallFamilyTree();

    console.log("Dummy data generation completed successfully");
  } catch (error) {
    console.error("Error generating dummy data", error);
  } finally {
    mongoose.connection.close();
  }
};

module.exports = generateDummyData;

// const mongoose = require("mongoose");
// const { faker } = require("@faker-js/faker");
// const Person = require("../Models/familyMember");

// // Function to generate a random date
// const getRandomDate = (startYear, endYear) => {
//   const start = new Date(startYear, 0, 1);
//   const end = new Date(endYear, 11, 31);
//   return new Date(
//     start.getTime() + Math.random() * (end.getTime() - start.getTime())
//   );
// };

// // Function to create a single person
// const createPerson = async (parents = []) => {
//   const person = {
//     name: faker.person.fullName(),
//     gender: faker.helpers.arrayElement(["male", "female"]),
//     dateOfBirth: getRandomDate(1950, 2000), // Random date between 1950 and 2000
//     dateOfDeath: Math.random() > 0.5 ? getRandomDate(2000, 2024) : null, // Random date if dead
//     biography: faker.lorem.paragraph(),
//     late: Math.random() > 0.5,
//     parents,
//     status: "approved", // Ensure status is set to "approved"
//   };
//   return await Person.create(person);
// };

// // Function to create a family with a given number of children
// const createFamily = async (numChildren, parentIds = []) => {
//   const family = [];
//   for (let i = 0; i < numChildren; i++) {
//     const person = await createPerson(parentIds);
//     family.push(person);
//   }
//   return family;
// };

// // Recursive function to create a tree structure
// const createFamilyTree = async (
//   numGenerations,
//   numFamiliesPerGeneration,
//   numChildrenPerFamily,
//   parentIds = []
// ) => {
//   if (numGenerations <= 0) return;

//   const families = [];

//   for (let i = 0; i < numFamiliesPerGeneration; i++) {
//     const family = await createFamily(numChildrenPerFamily, parentIds);
//     families.push(family);

//     // Prepare parent IDs for the next generation
//     const newParentIds = family.map((member) => member._id);

//     // Recursively create the next generation
//     await createFamilyTree(
//       numGenerations - 1,
//       numFamiliesPerGeneration,
//       numChildrenPerFamily,
//       newParentIds
//     );
//   }

//   return families;
// };

// const generateDummyData = async () => {
//   try {
//     console.log("Starting dummy data generation...");

//     // Number of generations and families per generation
//     const numGenerations = 5;
//     const numFamiliesPerGeneration = 10; // Number of families per generation
//     const numChildrenPerFamily = 4; // Number of children per family

//     // Create the root generation
//     await createFamilyTree(
//       numGenerations,
//       numFamiliesPerGeneration,
//       numChildrenPerFamily
//     );

//     console.log("Dummy data generation completed successfully");
//   } catch (error) {
//     console.error("Error generating dummy data", error);
//   } finally {
//     mongoose.connection.close();
//   }
// };

// module.exports = generateDummyData;
