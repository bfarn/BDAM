//Load required libs
var fs = require('fs');
var npath = require('path');
var async = require('async');

//Directory building stuff
var ignoreProjectsList = [".DS_Store", "_COPYdonotdelete", "_COPYdonotdelete copy", "_DO_NOT_USE", "Work"];
var isWin = /^win/.test(process.platform);
var workRoot = process.env.BUCK_WORK_ROOT;
var currentProject = process.env.BUCK_PROJECT;
var activeProjectIndex = 0;
if(!isWin) { 
	workRoot = "/Volumes/Work/current";
}



// ***************************************************************************************************************************
// * Helper functions
// ***************************************************************************************************************************

function cleanArray(inArray, cleanList) {
	// removes anything in cleanList from inArray
	// returns cleaned array
	var foundIndex;
	for(var j=0; j < cleanList.length; j++){
		for(var i=0; i < inArray.length; i++){
			if((inArray[i] == cleanList[j]) || (inArray[i].charAt(0) == ".")){
				inArray.splice(i, 1);
			}
		}
	}
	return inArray;
}


// ***************************************************************************************************************************
// * Builder functions
// ***************************************************************************************************************************

function buildPanel() {
	//Build the main document
	var body = $('body');
	var projectBox = $(document.createElement("div")).attr("id", "projectBox");
	body.append(projectBox);
	
	//Build the Project selection interface
	var projectSelector = $(document.createElement("p")).attr("id", "projectSelector");
	projectSelector.text("Project:   ");
	projectBox.append(projectSelector);
	buildProjectDropdown(projectSelector);
	
	var hRule = $(document.createElement("hr"));
	projectBox.append(hRule);
	
	//Build the template list interface
	var templateBox = $(document.createElement("div")).attr("id", "templateBox");
	body.append(templateBox);
	var templateHeading = $(document.createElement("p")).attr("id", "templateHeading");
	templateHeading.text("Available Templates:");
	templateBox.append(templateHeading);
	
	//Build template list
	var templateList = $(document.createElement("ul")).attr("id", "templateList");
	for(var i=1; i < 21; i++){
		var testVal = $(document.createElement("li")).attr("class", "templateListItems");
		testVal.append(i);
		templateList.append(testVal);
	}
	templateBox.append(templateList);
	
	
	
	console.log("Panel built");
}


function buildProjectDropdown(projectSelector) {
	var projectSelectorDropdown = $(document.createElement("select")).attr("id", "projectSelectorDropdown");
	projectSelector.append(projectSelectorDropdown);
	
	//Scan dir structure for job folders
	var projectList = buildProjectList();
	
	//Populate Dropdown Menu
	for (var i = 0; i < projectList.length; i++) {
		var option = document.createElement("option");
		option.value = projectList[i];
		option.text = projectList[i];
		projectSelectorDropdown.append(option);
	}
	
	//Choose current active project
	for (var i=0; i < projectList.length; i++){
		if (projectList[i] == currentProject) {
			activeProjectIndex = i;
		}
	}
	$(document.getElementById("projectSelectorDropdown").selectedIndex = activeProjectIndex);
		
	console.log("Project Dropdown built");
}

function buildProjectList() {
	var activeProjects = [];
	
	//Check for the work dir
	if(!fs.existsSync(workRoot)){
		console.log("Folder not found!");
		activeProjects = ["--Projects directory not found--"]
		return activeProjects;
	}
	
	var activeProjects = cleanArray(fs.readdirSync(workRoot), ignoreProjectsList);
	activeProjects.splice(0,0,"--Buck Universal Templates--");
	
	console.log("Active projects directory scanned");
	return activeProjects;
}



//***************************************************************************************************************************
//* High Level
//***************************************************************************************************************************
function onLoaded() {
	buildPanel();
	console.log("Template Browser ready");
}


