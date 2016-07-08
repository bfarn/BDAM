//Load required libs
var fs = require('fs');
var npath = require('path');
var async = require('async');

//Directory building stuff
var folderIgnore = [".DS_Store", "_COPYdonotdelete", "_COPYdonotdelete copy", "_DO_NOT_USE"];
var isWin = /^win/.test(process.platform);
var workRoot = process.env.BUCK_WORK_ROOT;
if(!isWin) { 
	workRoot = "/Volumes/Work/current";
}


function onLoaded() {
	buildPanel();
	console.log("Template Browser ready");
}


function buildPanel() {
	var body = $('body');
	var projectBox = $(document.createElement("div")).attr("id", "projectBox");
	body.append(projectBox);
	
	var projectSelector = $(document.createElement("p")).attr("id", "projectSelector");
	projectSelector.text("Project:   ");
	projectBox.append(projectSelector);
	
	buildProjectDropdown(projectSelector)
	
	var hRule = $(document.createElement("hr"));
	projectBox.append(hRule);
	
	console.log("Panel built");
}


function buildProjectDropdown(projectSelector) {
	var projectSelectorDropdown = $(document.createElement("select")).attr("id", "projectSelectorDropdown");
		
	var projectList = ["Secret_Project_16", "SodaSprunk_Rebrand_2017", "Tesla_Thing"];
	
	projectSelector.append(projectSelectorDropdown);
	
	for (var i = 0; i < projectList.length; i++) {
		var option = document.createElement("option");
		option.value = projectList[i];
		option.text = projectList[i];
		projectSelectorDropdown.append(option);
	}
	
	console.log("Project Dropdown built");
}


function allFilesInDir(inFolder, fullPath) {
	console.log("Reading all files in Templates dir");
	var allFiles = [];
	if(!fs.existsSync(inFolder)){
		console.log("Folder not found!");
		return allFiles;
	}
	var allFiles = fs.readdirSync(inFolder);
	fullPath = fullPath || false;
	for(var f in allFiles) {
		if(fullPath) {
			allFiles.push(npath.join(inFolder, allFiles[f]));
		} else {
			allFiles.push(allFiles[f]);
		}
	}
	return allFiles;
}