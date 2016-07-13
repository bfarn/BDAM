//Load required libs
var fs = require('fs');
var npath = require('path');
var async = require('async');
var csInterface;

//Directory building stuff
var ignoreProjectsList = [".DS_Store", "_COPYdonotdelete", "_COPYdonotdelete copy", "_DO_NOT_USE", "Work"];
var ignoreFilesList = [".DS_Store"];
var isWin = /^win/.test(process.platform);
var workRoot = process.env.BUCK_WORK_ROOT;
var currentProject = process.env.BUCK_PROJECT;
var activeProjectIndex = 0;
var projectTemplateRoot = workRoot + "/" + currentProject + "/Ref/templates";
var studioTemplateRoot = "//abadal/GlobalPrefs/work.david/templates";

if(!isWin) { 
	workRoot = "/Volumes/Work/current";
	projectTemplateRoot = workRoot + "/" + currentProject + "/Ref/templates";
}
//console.log(projectTemplateRoot);



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
	var projectTemplateBox = $(document.createElement("div")).attr("id", "projectTemplateBox");
	body.append(projectTemplateBox);
	var templateHeading = $(document.createElement("p")).attr("id", "templateHeading");
	
	//Build project template list
	templateHeading.text("Project Specific Templates:");
	projectTemplateBox.append(templateHeading);
	projectTemplateBox.append(buildTemplateList("project"));
	var hRule = $(document.createElement("hr"));
	projectTemplateBox.append(hRule);
	
	//Build studo template list
	var templateHeading = $(document.createElement("p")).attr("id", "templateHeading");
	templateHeading.text("Studio Templates:");
	projectTemplateBox.append(templateHeading);
	projectTemplateBox.append(buildTemplateList("studio"));
	var hRule = $(document.createElement("hr"));
	projectTemplateBox.append(hRule);
	
	console.log("Panel built");
}


function buildProjectDropdown(projectSelector) {
	var projectSelectorDropdown = $(document.createElement("select")).attr("id", "projectSelectorDropdown");
	projectSelectorDropdown.attr("onchange", "reloadPanel()");
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
		activeProjects = ["--Projects directory not found--"];
		return activeProjects;
	}
	
	var activeProjects = cleanArray(fs.readdirSync(workRoot), ignoreProjectsList);
	activeProjects.splice(0,0,"--Buck Universal Templates--");
	
	console.log("Active projects directory scanned");
	return activeProjects;
}

function buildTemplateList(projectVsStudio) {
	//Initialize blank Unordered List
	var templateList = $(document.createElement("ul")).attr("id", "templateList");
	
	var rootDir = studioTemplateRoot;
	if (projectVsStudio == "project") rootDir = projectTemplateRoot;
	console.log("root dir: " + rootDir);
	
	//Populate list with filtered dir contents
	var templateDirContents = [];
	if(!fs.existsSync(rootDir)){
		console.log("No templates found!");
		var listItem = $(document.createElement("li")).attr("class", "templateListItems");
		listItem.append("No templates found");
		templateList.append(listItem);
		return templateList;
	}
	
	var cleanTemplateDirContents = cleanArray(fs.readdirSync(rootDir), ignoreFilesList);
	
	for(var i=0; i < cleanTemplateDirContents.length; i++){
		//Create empty list item
		var listItem = $(document.createElement("li")).attr("class", "templateListItems");
		
		//Create empty link to add to list item
		var clickableListItem = $(document.createElement("a")).attr("class", "templateListItems");
		clickableListItem.attr("href", "#");
		
		//Add template name to link
		clickableListItem.text(cleanTemplateDirContents[i]);
		
		//Add file path to link
		var templatePath = rootDir + "/" + cleanTemplateDirContents[i];
		templatePath = slash(templatePath);
		var onClickScript = "openTemplateFile('" + templatePath + "')";
		//console.log(onClickScript);
		clickableListItem.attr("onclick", onClickScript);
		
		//Add link to list item
		listItem.append(clickableListItem);
		
		//Add list item to list
		templateList.append(listItem);
	}
	return templateList;
}

function slash(str) {
	//console.log("slash(" + str + ")");
	var isExtendedLengthPath = /^\\\\\?\\/.test(str);
	var hasNonAscii = /[^\x00-\x80]+/.test(str);
	if (isExtendedLengthPath || hasNonAscii) {
		return str;
	}
	return str.replace(/\\/g, '/');
};

//***************************************************************************************************************************
//* High Level
//***************************************************************************************************************************
function onLoaded() {
	csInterface = new CSInterface();
	buildPanel();
	console.log("Template Browser ready");
	console.log("----------------------------");
}

function reloadPanel() {
	var currentIndex = document.getElementById("projectSelectorDropdown").selectedIndex;
	currentProject = document.getElementById("projectSelectorDropdown").options[currentIndex].value;
	projectTemplateRoot = workRoot + "/" + currentProject + "/Ref/templates";

	$(document.getElementById("projectBox").remove());
	$(document.getElementById("projectTemplateBox").remove());
	buildPanel();
	
	console.log("Template Browser reloaded");
	console.log("----------------------------");
}

function openTemplateFile(openPath) {
	console.log("Opening a template");
	openScript = "templatePath = '" + openPath + "'; tempFile = new File(templatePath); app.open(tempFile);"
	//console.log(openScript);
	csInterface.evalScript(openScript);
	dupeScript = "var templateSource = app.activeDocument; templateSource.duplicate(templateSource.name); templateSource.close(SaveOptions.DONOTSAVECHANGES);"
	//console.log(openScript);
	csInterface.evalScript(dupeScript);
}