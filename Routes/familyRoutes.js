const express = require("express");
const router = express.Router();
const familyController = require("../Controllers/familyController");

router.post("/signup", familyController.signup);

router.post("/login", familyController.login);

router.post("/members", familyController.createPerson);

router.put("/members/:id", familyController.updatePerson);

router.delete("/members/:id", familyController.deletePerson);

router.get("/members/:id", familyController.getPersonById);

router.get("/members", familyController.getFamilyTrees);

router.get("/getPendingReq", familyController.getPendingChildAdditionRequests);


router.post(
  "/members/:parentId/children/:childId",
  familyController.addChildById
);

router.put("/addChildApprov", familyController.childAdditionRequest);

router.post("/addChild", familyController.addChild);

router.post("/members/:personId/spouse/:spouseId", familyController.addSpouse);

router.get("/search", familyController.searchPerson);

module.exports = router;
