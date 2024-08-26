const express = require("express");
const router = express.Router();
const familyController = require("../Controllers/familyController");


router.post("/members", familyController.createPerson);


router.put("/members/:id", familyController.updatePerson);


router.delete("/members/:id", familyController.deletePerson);


router.get("/members/:id", familyController.getPersonById);


router.get("/members", familyController.getAllPeople);


router.post("/members/:parentId/children/:childId", familyController.addChild);


router.post("/members/:personId/spouse/:spouseId", familyController.addSpouse);

module.exports = router;
