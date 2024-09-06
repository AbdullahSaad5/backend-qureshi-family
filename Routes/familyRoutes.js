const express = require("express");
const router = express.Router();
const familyController = require("../Controllers/familyController");


// router.post("/signup", familyController.signup);

// router.post("/login", familyController.login);

router.post("/members", familyController.createPerson);

router.put("/members/:id", familyController.updatePerson);

router.delete("/members/:id", familyController.deletePerson);

router.get("/members/:id", familyController.getPersonById);

router.get("/members", familyController.getFamilyTrees);

router.get("/getPendingReq", familyController.getPendingChildAdditionRequests);

router.get("/counter", familyController.getCounter);

router.post("/counter/:no", familyController.postCounter);

router.post("/addPerson", familyController.addPerson);





router.post(
  "/members/:parentId/children/:childId",
  familyController.addChildById
);

router.put("/addChildApprov/:childID", familyController.childAdditionRequest);

router.post("/addChild", familyController.addChild);

router.post("/makePublicFigure/:personId", familyController.makePublicFigure);

router.get("/getAllPublicFigures", familyController.getAllPublicFigures);

router.get("/getTreeById/:id", familyController.getFamilyTreeById);

router.get("/searchbyname/:name", familyController.searchPersonByName);

router.get("/getFamilyDetails/:id", familyController.getPersonWithFamily);






router.post("/addSpouse", familyController.addSpouse);

router.get("/search", familyController.searchPerson);

module.exports = router;
