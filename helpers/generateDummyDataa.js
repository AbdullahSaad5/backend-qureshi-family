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
// const createPerson = async (
//   name,
//   gender,
//   dateOfBirth,
//   dateOfDeath,
//   biography,
//   late,
//   parents = [],
//   spouse = null
// ) => {
//   const person = new Person({
//     name,
//     gender,
//     dateOfBirth,
//     dateOfDeath,
//     biography,
//     late,
//     parents,
//     spouse, // Assign spouse here
//     spouseIds: spouse ? [spouse] : [], // Initialize spouseIds with the spouse if provided
//     status: "approved", // Ensure status is set to "approved"
//   });

//   return await person.save();
// };


// // Function to create a family tree
// const createFamilyTree = async (numOfFamilies, numOfChildrenPerFamily) => {
//   for (let i = 0; i < numOfFamilies; i++) {
//     // Create the grandparent
//     const grandparent = await createPerson(
//       faker.person.fullName(),
//       faker.helpers.arrayElement(["male", "female"]),
//       getRandomDate(1920, 1950),
//       Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
//       faker.lorem.paragraph(),
//       Math.random() > 0.5
//     );

//     // Create the first parent (child of the grandparent)
//     const parent1 = await createPerson(
//       faker.person.fullName(),
//       "male",
//       getRandomDate(1950, 1980),
//       Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
//       faker.lorem.paragraph(),
//       Math.random() > 0.5,
//       [grandparent._id]
//     );

//     // Create the second parent (spouse of the first parent)
//     const parent2 = await createPerson(
//       faker.person.fullName(),
//       "female",
//       getRandomDate(1950, 1980),
//       Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
//       faker.lorem.paragraph(),
//       Math.random() > 0.5
//     );

//     // Update parent1 and parent2 to reference each other as spouses
//     parent1.spouse = parent2._id;
//     parent2.spouse = parent1._id;

//     // Save parent1 and parent2 first to have their IDs for updating spouseIds
//     await parent1.save();
//     await parent2.save();

//     // Add spouse to spouseIds arrays
//     parent1.spouseIds.push(parent2._id);
//     parent2.spouseIds.push(parent1._id);

//     // Save updated spouseIds
//     await parent1.save();
//     await parent2.save();

//     // Create children for parent1 and parent2
//     const children = [];
//     for (let j = 0; j < numOfChildrenPerFamily; j++) {
//       const child = await createPerson(
//         faker.person.fullName(),
//         faker.helpers.arrayElement(["male", "female"]),
//         getRandomDate(1980, 2005),
//         Math.random() > 0.5 ? getRandomDate(2024, 2050) : null,
//         faker.lorem.paragraph(),
//         Math.random() > 0.5,
//         [parent1._id, parent2._id] // Assigning both parents to each child
//       );
//       children.push(child);

//       // Update parents' children lists
//       parent1.children.push(child._id);
//       parent2.children.push(child._id);
//     }

//     // Save all parent-child relationships
//     await parent1.save();
//     await parent2.save();
//     await grandparent.save();

//     // Update children's parent lists and siblings
//     for (const child of children) {
//       child.parents = [parent1._id, parent2._id];
//       await child.save();
//     }

//     // Create siblings relationships
//     for (let k = 0; k < children.length; k++) {
//       for (let l = k + 1; l < children.length; l++) {
//         children[k].siblings.push(children[l]._id);
//         children[l].siblings.push(children[k]._id);
//       }
//     }

//     // Save sibling relationships
//     for (const child of children) {
//       await child.save();
//     }
//   }

//   console.log(
//     `${numOfFamilies} family trees created with parents, children, and spouses.`
//   );
// };


// // Main function to generate dummy data
// const generateDummyData = async () => {
//   try {
//     console.log("Starting dummy data generation...");

//     const numOfFamilies = 10; // Number of family trees to generate
//     const numOfChildrenPerFamily = 3; // Number of children per family

//     // Create multiple family trees
//     await createFamilyTree(numOfFamilies, numOfChildrenPerFamily);

//     console.log("Dummy data generation completed successfully");
//   } catch (error) {
//     console.error("Error generating dummy data", error);
//   } finally {
//     mongoose.connection.close();
//   }
// };

// module.exports = generateDummyData;

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



const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const Person = require("../Models/Person"); // Update the path to your Person model

// Function to create or find a person by key
const findOrCreatePerson = async (key, name, sex) => {
  let person = await Person.findOne({ key });
  if (!person) {
    person = new Person({ key, n: name, s: sex });
    await person.save();
  }
  return person;
};

// Function to create a single person
const createPerson = async (
  key,
  name,
  sex,
  motherId = null,
  fatherId = null,
  spouseIds = [],
  tag = null
) => {
  const person = new Person({
    key,
    n: name,
    s: sex,
    m: motherId,
    f: fatherId,
    spouse: spouseIds,
    t: tag,
  });

  return await person.save();
};

// Function to create a family tree
const createFamilyTree = async (numOfPersons) => {
  const persons = [];

  for (let i = 0; i < numOfPersons; i++) {
    const key = faker.string.uuid();
    const name = faker.person.fullName();
    const sex = faker.helpers.arrayElement(["M", "F", "N"]);

    // Optionally create parents for each person
    let mother = null;
    let father = null;

    if (Math.random() > 0.2) {
      // 80% chance to have parents
      const motherKey = faker.string.uuid();
      const fatherKey = faker.string.uuid();

      mother = await findOrCreatePerson(
        motherKey,
        faker.person.fullName({ sex: "female" }),
        "F"
      );
      father = await findOrCreatePerson(
        fatherKey,
        faker.person.fullName({ sex: "male" }),
        "M"
      );

      // Link mother and father as spouses
      mother.spouse = [...(mother.spouse || []), father._id];
      father.spouse = [...(father.spouse || []), mother._id];

      await mother.save();
      await father.save();
    }

    // Create person
    const person = await createPerson(
      key,
      name,
      sex,
      mother ? mother._id : null,
      father ? father._id : null,
      [], // Initialize with empty spouse array
      null
    );
    persons.push(person);

    // Optionally create a spouse for the person
    if (Math.random() > 0.5) {
      // 50% chance to have a spouse
      const spouseKey = faker.string.uuid();
      const spouseSex = sex === "M" ? "F" : "M"; // Opposite sex for simplicity
      const spouse = await findOrCreatePerson(
        spouseKey,
        faker.person.fullName(),
        spouseSex
      );

      person.spouse = [...(person.spouse || []), spouse._id];
      spouse.spouse = [...(spouse.spouse || []), person._id];

      await person.save();
      await spouse.save();
    }
  }

  console.log(`${numOfPersons} persons created with parents and spouses.`);
};

// Main function to generate dummy data
const generateDummyData = async () => {
  try {
    console.log("Starting dummy data generation...");

    const numOfPersons = 50; // Number of persons to generate

    // Create family tree data
    await createFamilyTree(numOfPersons);

    console.log("Dummy data generation completed successfully");
  } catch (error) {
    console.error("Error generating dummy data", error);
  } finally {
    mongoose.connection.close();
  }
};

module.exports = generateDummyData;



