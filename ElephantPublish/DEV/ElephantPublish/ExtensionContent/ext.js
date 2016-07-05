var fs = require('fs');
var npath = require('path');
var async = require('async');

var version = "1.0.4";

var csInterface;
var tree;

var animEnabled = false;
var selectedEmoji;
var selectedAlpha = 'v';
var activeDocPath;
var nextVersionPath;
var nextJPGPath;

var lastPSDPublish;
var lastJPGPublish;

var folderIgnore = [".DS_Store", "####-EmojiTemplate", "Common", "Edit", "MAYA", "MODO", "Previs", "RnD", "Styleframe", "Work", "0_Status", "1_Schedule"];

var isWin = /^win/.test(process.platform);

var workRoot = "//abadal/Work/current";
if(!isWin) { 
	workRoot = "/Volumes/Work/current";
}

var projectPath = workRoot + "/Elephant/Production/";
var dailiesPath = workRoot + "/Elephant/Ref/Dailies/";

var emojiDict = {};


// ***************************************************************************************************************************
// * Helper functions
// ***************************************************************************************************************************

function cleanArray(inArray, cleanList) {
	// removes anything in cleanList from inArray
	// returns cleaned array
	var foundIndex;
	for(var j=0; j < cleanList.length; j++){
		for(var i=0; i < inArray.length; i++){
			if(inArray[i] == cleanList[j]) {
				inArray.splice(i, 1);
			}
		}
	}
	return inArray;
}

function cleanFolderList(inArray) {
	// returns a list of folders in the project, minus any in the folderIgnore list
	return cleanArray(inArray, folderIgnore);
}

function copyFile(source, target, cb) {
	var cbCalled = false;

	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		done(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		done(err);
	});
	wr.on("close", function(ex) {
		done();
	});
	rd.pipe(wr);

	function done(err) {
		if (!cbCalled) {
			cb(err);
			cbCalled = true;
		}
	}
}

function moveFile(src, dst) {
	console.log("moveFile(" + src + ", " + dst + ")");
	var is = fs.createReadStream(src);
	var os = fs.createWriteStream(dst);
	is.pipe(os);
	is.on('end',function() {
	    fs.unlinkSync(src);
	});
}

function slash(str) {
	console.log("slash(" + str + ")");
	var isExtendedLengthPath = /^\\\\\?\\/.test(str);
	var hasNonAscii = /[^\x00-\x80]+/.test(str);
	if (isExtendedLengthPath || hasNonAscii) {
		return str;
	}
	return str.replace(/\\/g, '/');
};

function subfolderList(inSubfolder) {
	// returns a list of folders in the subfolder specified
	// inSubfolder is appended to projectPath
	return fs.readdirSync(npath.join(projectPath, inSubfolder));
}

function dailiesFolderForToday() {
	var d = new Date();
	var dateStr = d.getFullYear() + "_" + pad(d.getMonth()+1, 2) + "_" + pad(d.getDate(), 2);
	return npath.join(dailiesPath, dateStr, process.env.username);
}

//***************************************************************************************************************************
//* Version functions
//***************************************************************************************************************************

function isAnim(inPath) {
	if(inPath.indexOf('_ANIMATION_') < 0) {
		return false;
	}
	return true;
}

function allJpgsInDir(inFolder, fullPath) {
    console.log("allJpgsInDir");
    var allFiles = fs.readdirSync(inFolder);
    var allJpgs = [];
    fullPath = fullPath || false;
    for(var f in allFiles) {
        if(allFiles[f].match(/\.jpg$/)) {
            if(fullPath) {
                allJpgs.push(npath.join(inFolder, allFiles[f]));
            } else {
                allJpgs.push(allFiles[f]);
            }
        }
    }
    return allJpgs;
}

function allPsdsInDir(inFolder, fullPath) {
	console.log("allPsdsInDir");
	var allPsds = [];
	if(!fs.existsSync(inFolder)){
		console.log("Folder not found!");
		return allPsds;
	}
	var allFiles = fs.readdirSync(inFolder);
	fullPath = fullPath || false;
	for(var f in allFiles) {
		if(allFiles[f].match(/\.psd$/)) {
			if(fullPath) {
				allPsds.push(npath.join(inFolder, allFiles[f]));
			} else {
				allPsds.push(allFiles[f]);
			}
		}
	}
	return allPsds;
}

function allJpgVersionsInDir(inFolder, alpha, animation, fullPath) {
    console.log("allJpgVersionsInDir");
    alpha = alpha || 'v';
    fullPath = fullPath || false;
    var allJpgs = allJpgsInDir(inFolder);
    var allVersions = [];
    var match;
    if(!animation) { animation = false; }
    for(var i in allJpgs) {
        match = allJpgs[i].match(/^([0-9A-F]{4,5})_([A-z_\-]*)_([a-hA-HvV])(\d{2,3})\.jpg$/); 
        if(match && match[3] == alpha && isAnim(allJpgs[i]) == animation) {
            if(fullPath) {
                allVersions.push(npath.join(inFolder, allJpgs[i]));
            } else {
                allVersions.push(match[3] + match[4]);
            }
        }
    }
    allVersions.sort().reverse();
    return allVersions;
}

function allPsdVersionsInDir(inFolder, alpha, animation, fullPath) {
	console.log("allPsdVersionsInDir");
	alpha = alpha || 'v';
	fullPath = fullPath || false;
	var allPsds = allPsdsInDir(inFolder);
	var allVersions = [];
	var match;
	if(!animation) { animation = false; }
	for(var i in allPsds) {
		match = allPsds[i].match(/^([0-9A-F]{4,5})_([A-z_\-]*)_([a-hA-HvV])(\d{2,3})\.psd$/); 
		if(match && match[3] == alpha && isAnim(allPsds[i]) == animation) {
			if(fullPath) {
				allVersions.push(npath.join(inFolder, allPsds[i]));
			} else {
				allVersions.push(match[3] + match[4]);
			}
		}
	}
	allVersions.sort().reverse();
	return allVersions;
}

function latestVersionOfEmoji(emojiName, alpha, animation) {
	console.log("latestVersionOfEmoji");
	alpha = alpha || 'v';
	var emojiDir = psdDirForEmoji(emojiName);
	var allVersions = allPsdVersionsInDir(emojiDir, alpha, animation, true);
	if(allVersions.length < 1){
		return;
	}
	var latest = allVersions[0];
	return latest;
}

function nextVersionOfEmoji(emojiName, alpha, animation) {
	console.log("nextVersionOfEmoji");
	alpha = alpha || 'v';
	var emojiDir = psdDirForEmoji(emojiName);
	var allVersions = allPsdVersionsInDir(emojiDir, alpha, animation);
	if(allVersions.length < 1 && !animation){
		return emojiName + '_' + alpha + '01.psd';
	} else if(allVersions.length < 1) {
		return emojiName + '_ANIMATION_' + alpha + '01.psd';
	}
	var latest = allVersions[0];
	var newVersion = versionUpStr(latest);
	if(animation) {
		return emojiName + '_ANIMATION_' + newVersion + '.psd';
	}
	return emojiName + '_' + newVersion + '.psd';
}

function nextJpgVersionOfEmoji(emojiName, alpha, animation) {
	console.log("nextVersionOfEmoji");
	alpha = alpha || 'v';
	var emojiDir = jpgDirForEmoji(emojiName);
	var allVersions = allJpgVersionsInDir(emojiDir, alpha, animation);
	if(allVersions.length < 1  && !animation){
		return emojiName + '_' + alpha + '01.jpg';
	} else if(allVersions.length < 1) {
		return emojiName + '_ANIMATION_' + alpha + '01.jpg';
	}
	var latest = allVersions[0];
	var newVersion = versionUpStr(latest);
	if(animation) {
		return emojiName + '_ANIMATION_' + newVersion + '.jpg';
	}
	return emojiName + '_' + newVersion + '.jpg';
}

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function jpgDirForEmoji(emojiName) {
	console.log("jpgDirForEmoji");
	if(emojiDict.hasOwnProperty(emojiName)) {
		return emojiDict[emojiName]['jpg_path'];
	}
}

function psdDirForEmoji(emojiName) {
	console.log("psdDirForEmoji");
	if(emojiDict.hasOwnProperty(emojiName)) {
		if(!emojiDict[emojiName]) {
			return;
		}
		return emojiDict[emojiName]['photoshop_path'];
	}
}

function versionUpStr(inVersionStr) {
	console.log("versionUpStr");
	var alpha, newnum, numlength, newversion;
	var match = inVersionStr.match(/([a-hA-HvV])(\d{2,3})/);
	if(match) {
		alpha = match[1];
		num = parseInt(match[2], 10);
		numlength = match[2].length;
		if(num == "99") {
			numlength = 3;
		}
		newnum = pad(num + 1, numlength);
		newversion = alpha + newnum;
		return newversion;
	}
}

//***************************************************************************************************************************
//* UI
//***************************************************************************************************************************

function alphaChecked() {
	if(this.checked) {
		$("#alphaSelect").removeClass('hide');
		selectedAlpha = $("#alphaSelect").val();
		updateOutputLabel();
	} else {
		$("#alphaSelect").addClass('hide');
		selectedAlpha = 'v';
		updateOutputLabel();
	}
}

function alphaChanged() {
	selectedAlpha = $("#alphaSelect").val();
	updateOutputLabel();
}

function animChecked() {
	if(this.checked) {
		animEnabled = true;
		updateOutputLabel();
	} else {
		animEnabled = false;
		updateOutputLabel();
	}
}

function emojiClicked() {
	tree.closeAll();
	selectedEmoji = $(this).attr("content");
	console.log("emojiClicked:" + selectedEmoji);
	$("h2#submitHeader").text(selectedEmoji);
	$("#publishButton").removeClass("hide");
	updateOutputLabel();
}

function openClicked() {
	selectedEmoji = $(this).attr("content");
	console.log("openClicked:" + selectedEmoji);
	var latestFile = latestVersionOfEmoji(selectedEmoji, selectedAlpha, animEnabled);
	if(!latestFile){
		alert("No published PSDs found for " + selectedEmoji + "!");
		return;
	}
	tree.closeAll();
	openScript = "var fileRef = new File('" + slash(latestFile) + "');" +
				 "app.open(fileRef);";
	csInterface.evalScript(openScript, function(result){
		console.log(result);
	});
	$("h2#submitHeader").text(selectedEmoji);
	$("#publishButton").removeClass("hide");
	updateOutputLabel();
}

function dailiesClicked() {
	console.log("dailiesClicked");
	if(!lastJPGPublish) {
		alert("No published JPG found!");
		return;
	}
	var dailiesFolder = slash(dailiesFolderForToday());
	var dailiesParent = npath.resolve(dailiesFolder + "/../");
	if (!fs.existsSync(dailiesParent)) {
		fs.mkdirSync(dailiesParent);
	}
	if (!fs.existsSync(dailiesFolder)) {
		fs.mkdirSync(dailiesFolder);
	}
	var basename = npath.basename(lastJPGPublish);
	var destPath = npath.join(dailiesFolder, basename); 
	copyFile(lastJPGPublish, destPath, function(err){
		if(err){
			console.log("Error occured!");
		}
		alert("Sent to Dailies!");
		$("#infoText").append("<br><br>Sent to Dailies: " + destPath);
	});
}

function publishClicked() {
	//alert("Publish button clicked!");
	var savePSDScript, allExistingPSDs, psdArchiveFolder, psdLogPath;
	var saveJPGScript, allExistingJPGs, jpgArchiveFolder, jpgLogPath;
	
	async.series([              
	    function getActiveDocument(callback){
	    	csInterface.evalScript("app.activeDocument.fullName", function(result){
	    		if(result.indexOf('error') < 0) {
	    			activeDocPath = result;
	    		} else {
	    			alert("No saved active document found! Please save your file in order to publish.");
	    			callback("No saved active document found! Please save your file in order to publish.");
	    		}
	    		callback(null, result);
	    	});
	    },
	    
	    function savePSD(callback){
	    	savePSDScript = "var psdOutputPath = '" + slash(nextVersionPath) + "';" +
							"var psdOutputFile = new File(psdOutputPath);" +
							"var psdSaveOptions = new PhotoshopSaveOptions();" +
							"psdSaveOptions.alphaChannels = true;" +
							"psdSaveOptions.annotations = true;" +
							"psdSaveOptions.embedColorProfile = true;" +
							"psdSaveOptions.layers = true;" +
							"app.activeDocument.saveAs(psdOutputFile, psdSaveOptions, false, Extension.LOWERCASE);";
	    	allExistingPSDs = allPsdVersionsInDir(emojiDict[selectedEmoji]['photoshop_path'], selectedAlpha, animEnabled, true);
			psdArchiveFolder = emojiDict[selectedEmoji]['photoshop_archive_path'];
			psdLogPath = emojiDict[selectedEmoji]['photoshop_log_path'];
			csInterface.evalScript(savePSDScript, function(result){
				console.log("savePSDScript result:");
				console.log(result);
				if(result.indexOf('error') > -1) {
					alert("Error saving new PSD to " + nextVersionPath);
					callback("Error saving new PSD to " + nextVersionPath);
				}
				//Move any existing PSDs in photoshop_path to photoshop_archive_path
				if (!fs.existsSync(emojiDict[selectedEmoji]['photoshop_path'])){
					//create the PSD folder if it doesn't already exist
				    fs.mkdirSync(emojiDict[selectedEmoji]['photoshop_path']);
				}
				if (!fs.existsSync(psdArchiveFolder)){
					//create the archive folder if it doesn't already exist
				    fs.mkdirSync(psdArchiveFolder);
				}
				var newpath, basename;
				for(var i in allExistingPSDs) {
					basename = npath.basename(allExistingPSDs[i]);
					newpath = npath.join(psdArchiveFolder, basename);
					moveFile(slash(allExistingPSDs[i]), slash(newpath));
				}
				
				//Append entry to PSD log
				var timestamp = new Date().toLocaleString();
				var outFilePath = npath.basename(nextVersionPath);
				var logline = timestamp + " - " + process.env.username + " published " + outFilePath + " from " + activeDocPath + "\n";  
				fs.appendFileSync(psdLogPath, logline);
				
				lastPSDPublish = nextVersionPath;
				callback(null, logline);
			});
	    },
	    
	    function saveJpg(callback) {
	    	saveJPGScript = "var outputPath = '" + slash(nextJPGPath) + "';" +
							"var outputFile = new File(outputPath);" +
							"jpgSaveOptions = new JPEGSaveOptions();" +
							"jpgSaveOptions.quality = 12;" +
							"app.activeDocument.saveAs(outputFile, jpgSaveOptions, true, Extension.LOWERCASE);";
	    	allExistingJPGs = allJpgVersionsInDir(emojiDict[selectedEmoji]['jpg_path'], selectedAlpha, true);
	    	jpgArchiveFolder = emojiDict[selectedEmoji]['jpg_archive_path'];
	    	jpgLogPath = emojiDict[selectedEmoji]['jpg_log_path'];
	    	csInterface.evalScript(saveJPGScript, function(result){
	    	    console.log("saveJPGScript result:");
	    	    console.log(result);
	    	    if(result.indexOf('error') > -1) {
	    	        alert("Error saving new JPG to " + nextJPGPath);
	    	        callback("Error saving new JPG to " + nextJPGPath);
	    	    }
	    	    //Move any existing JPGs in jpg_path to jpg_archive_path
	    	    if (!fs.existsSync(emojiDict[selectedEmoji]['jpg_path'])){
	    	        //create the PSD folder if it doesn't already exist
	    	        fs.mkdirSync(emojiDict[selectedEmoji]['jpg_path']);
	    	    }
	    	    if (!fs.existsSync(jpgArchiveFolder)){
	    	        //create the archive folder if it doesn't already exist
	    	        fs.mkdirSync(jpgArchiveFolder);
	    	    }
	    	    var newpath, basename;
	    	    for(var i in allExistingJPGs) {
	    	        basename = npath.basename(allExistingJPGs[i]);
	    	        newpath = npath.join(jpgArchiveFolder, basename);
	    	        moveFile(slash(allExistingJPGs[i]), slash(newpath));
	    	    }
	    	    
	    	    //Append entry to JPG log
	    	    var timestamp = new Date().toLocaleString();
	    	    var outFilePath = npath.basename(nextJPGPath);
	    	    var logline = timestamp + " - " + process.env.username + " published " + outFilePath + " from " + activeDocPath + "\n";  
	    	    fs.appendFileSync(jpgLogPath, logline);
	    	    
	    	    lastJPGPublish = nextJPGPath;
	    	    callback(null, logline);
	    	});
	    }
	    // TODO: Save icons in icons_path (HARD, probably best done with an action...)
	], 
		function(err, results){
			if(err) {
				console.log(err);
				return
			}
			console.log(results);
			
			var infoBox = $('#infoBox').removeClass('hide');
			var infoText = $('#infoText').html("PSD published to: " + lastPSDPublish + "<br><br>" + 
					  	 					   "JPG published to: " + lastJPGPublish);
			updateOutputLabel();
			alert("Publish Complete!");
		}
	);
	
}

function updateOutputLabel() {
	if(!selectedEmoji){
		console.log("No emoji selected!");
		return;
	}
	var outputLabelLabel = $("#outputLabelLabel"); 
	var outputLabel = $("#outputLabel");
	var nextPsd = nextVersionOfEmoji(selectedEmoji, selectedAlpha, animEnabled);
	outputLabel.removeClass('hide');
	outputLabelLabel.removeClass('hide');
	outputLabel.text(nextVersionOfEmoji(selectedEmoji, selectedAlpha, animEnabled));
	nextVersionPath = npath.join(emojiDict[selectedEmoji]['photoshop_path'], nextPsd);
	nextJPGPath = npath.join(emojiDict[selectedEmoji]['jpg_path'], nextPsd.replace(/\.psd$/, ".jpg"));
}

//***************************************************************************************************************************
//* High Level
//***************************************************************************************************************************

function onLoaded() {
	// runs when extension is first loaded
    csInterface = new CSInterface();

    buildFolderTree();
    buildSubmitBox();
    console.log("Loading complete!");
}

function buildFolderTree() {
	var allFolders = cleanFolderList(fs.readdirSync(projectPath));
	var body = $('body');
	// create emojiSelectDiv as a wrapper to our emoji selection interface
	var emojiSelectDiv = $(document.createElement("div")).attr("id", "emojiSelectDiv");
	body.append(emojiSelectDiv);
	// create search input field
	var searchInput = $(document.createElement("input")).attr("id", "my-search");
	searchInput.attr("placeholder", "Search");
	emojiSelectDiv.append(searchInput);
	
	// create Emoji parent list
	var parentList = $(document.createElement("ul")).attr("id", "my-tree");
	emojiSelectDiv.append(parentList);
	var newEl = $(document.createElement("li"));
	newEl.attr("id", "emojiSelectRootLi");
	var innerEl = document.createElement("div");
	innerEl.innerText = "Emoji";
	newEl.append(innerEl);
	parentList.append(newEl);
	
	var emojiList = $(document.createElement("ul"));
	newEl.append(emojiList);
	
	// create category folders, and emoji folders inside those
	var newLi, innerDiv, fullpath, childLi, childDiv, childPath, childFolders, childList, openSpan, labelSpan;
	for(var i in allFolders){
		newLi = $(document.createElement("li"));
		innerDiv = document.createElement("div");
		newLi.append(innerDiv);
		emojiList.append(newLi);
		
		fullPath = npath.join(projectPath, allFolders[i]);
		newLi.attr("content", allFolders[i]);
		newLi.attr("fullpath", fullPath);
		innerDiv.innerText = allFolders[i];
		
		// create emoji child folder list
		childList = $(document.createElement("ul"));
		newLi.append(childList);
		childFolders = subfolderList(allFolders[i]);
		for(var j in childFolders){
			childPath = npath.join(fullPath, childFolders[j]);
			
			childLi = $(document.createElement("li"));
			childDiv = $(document.createElement("div"));
			openSpan = $(document.createElement("span")).addClass("openButton").attr("content", childFolders[j]).attr("fullpath", childPath);
			openSpan.click(openClicked);
			labelSpan = $(document.createElement("span")).addClass("emojiLabel").attr("content", childFolders[j]).attr("fullpath", childPath).text(childFolders[j]);
			childLi.append(childDiv);
			childList.append(childLi);
			
			childLi.attr("content", childFolders[j]);
			childLi.attr("fullpath", childPath);
			
			//childDiv.text(childFolders[j]);
			childDiv.attr("content", childFolders[j]);
			childDiv.attr("fullpath", childPath);
			childDiv.prepend(openSpan);
			childDiv.append(labelSpan);
			
			labelSpan.click(emojiClicked);
			childLi.click(emojiClicked);
			
			emojiDict[childFolders[j]] = {};
			emojiDict[childFolders[j]]['category'] = allFolders[i];
			emojiDict[childFolders[j]]['category_path'] = fullPath;
			emojiDict[childFolders[j]]['path'] = childPath;
			emojiDict[childFolders[j]]['icons_path'] = npath.join(childPath, 'Icons');
			emojiDict[childFolders[j]]['jpg_path'] = npath.join(childPath, 'JPG');
			emojiDict[childFolders[j]]['jpg_archive_path'] = npath.join(childPath, 'JPG', 'Archive');
			emojiDict[childFolders[j]]['jpg_log_path'] = npath.join(childPath, 'JPG', childFolders[j] + "_log.txt");
			emojiDict[childFolders[j]]['photoshop_path'] = npath.join(childPath, 'Work', 'Photoshop');
			emojiDict[childFolders[j]]['photoshop_archive_path'] = npath.join(childPath, 'Work', 'Photoshop', 'Archive');
			emojiDict[childFolders[j]]['photoshop_log_path'] = npath.join(childPath, 'Work', 'Photoshop', childFolders[j] + "_log.txt");
		}
		
	}
	
	// initialize jquery.treefilter
	tree = new treefilter($("#my-tree"), {
        searcher : $("input#my-search") // set if you need search function.
    });
	
	newEl.addClass("tf-open");
}

function buildSubmitBox() {
	var body = $('body');
	var submitBox = $(document.createElement("div")).attr("id", "submitBox");
	body.append(submitBox);
	
	var submitHeader = $(document.createElement("h2")).attr("id", "submitHeader");
	submitHeader.text("No Emoji Selected!");
	submitBox.append(submitHeader);
	
	var alphaCheckboxLabel = $(document.createElement("label")).attr("id", "alphaCheckboxLabel");
	alphaCheckboxLabel.text("Alpha Versioning");
	var alphaCheckbox = $(document.createElement("input")).attr("id", "alphaCheckbox");
	alphaCheckbox.attr("type", "checkbox");
	alphaCheckbox.change(alphaChecked);
	alphaCheckboxLabel.append(alphaCheckbox);
	submitBox.append(alphaCheckboxLabel);
	
	var alphaSelect = $(document.createElement("select")).attr("id", "alphaSelect");
	alphaSelect.addClass("hide");
	alphaSelect.change(alphaChanged);
	var alphaOptions = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
	var option;
	for(var i in alphaOptions){
		option = $(document.createElement("option")).attr("value", alphaOptions[i]).text(alphaOptions[i]);
		alphaSelect.append(option);
	}
	submitBox.append(alphaSelect);
	
	submitBox.append($(document.createElement("br")));
	
	var animCheckboxLabel = $(document.createElement("label")).attr("id", "animCheckboxLabel");
	animCheckboxLabel.text("Animation Mode");
	var animCheckbox = $(document.createElement("input")).attr("id", "animCheckbox");
	animCheckbox.attr("type", "checkbox");
	animCheckbox.change(animChecked);
	animCheckboxLabel.append(animCheckbox);
	submitBox.append(animCheckboxLabel);
	
	var outputLabelLabel = $(document.createElement("p")).attr("id", "outputLabelLabel");
	outputLabelLabel.text("File will be published as:");
	outputLabelLabel.addClass('hide');
	var outputLabel = $(document.createElement("h3")).attr("id", "outputLabel");
	outputLabel.addClass('hide');
	submitBox.append(outputLabelLabel);
	submitBox.append(outputLabel);
	
	var publishButton = $(document.createElement("div")).attr("id", "publishButton");
	publishButton.text("Publish");
	publishButton.addClass("hide");
	publishButton.click(publishClicked);
	submitBox.append(publishButton);
	
	var infoBox = $(document.createElement("div")).attr("id", "infoBox");
	infoBox.addClass("hide");
	var infoText = $(document.createElement("p")).attr("id", "infoText");
	infoBox.append(infoText);
	var dailiesButton = $(document.createElement("div")).attr("id", "dailiesButton");
	dailiesButton.text("Send to Dailies");
	//dailiesButton.addClass("hide");
	dailiesButton.click(dailiesClicked);
	infoBox.append(dailiesButton);
	body.append(infoBox);
	
	var versionLabel = $(document.createElement("p")).attr("id", "versionLabel").text("Elephant Publish v" + version);
	body.append(versionLabel);
	
}