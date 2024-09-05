const { faker } = require("@faker-js/faker");
const Person = require("./Models/Person");

const addData = async () => {
  const totalPersons = await Person.countDocuments();

  if (totalPersons > 0) {
    return;
  }
  // Function to generate a random date
  const getRandomDate = (startYear, endYear) => {
    const start = new Date(startYear, 0, 1);
    const end = new Date(endYear, 11, 31);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

  const father = {
    name: faker.person.fullName(),
    gender: "male",
    dob: getRandomDate(1940, 1970),
    dod: Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
    about: faker.lorem.paragraph(),
  };

  const fatherData = await Person.create(father);

  const mother = {
    name: faker.person.fullName(),
    gender: "female",
    dob: getRandomDate(1940, 1970),
    dod: Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
    about: faker.lorem.paragraph(),
    spouse: [fatherData._id],
  };

  const motherData = await Person.create(mother);

  Array.from({ length: 10 }).forEach(async () => {
    const data = {
      name: faker.person.fullName(),
      gender: faker.helpers.arrayElement(["male", "female"]),
      dob: getRandomDate(1920, 1950),
      dod: Math.random() > 0.5 ? getRandomDate(2000, 2024) : null,
      about: faker.lorem.paragraph(),
      father: fatherData._id,
      mother: motherData._id,
    };

    const person = await Person.create(data);
  });
};

module.exports = { addData };
