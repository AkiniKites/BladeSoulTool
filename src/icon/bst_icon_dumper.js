"use strict";

var fs = require('fs');
var cp = require('child_process');
var path = require('path');
const tga2png = require('tga2png');

/**
 * @type {BstUtil|exports}
 */
var BstUtil = require('../util/bst_util.js');
/**
 * @type {BstConst|exports}
 */
var BstConst = require('../const/bst_const.js');

var BstIconDumper = function(grunt, done) {
    this.grunt    = grunt;
    this.util     = new BstUtil(grunt);
    this.taskDone = done; // notify grunt: tasks done

    this.conf = this.util.readJsonFile('./config/setting.json');
    this.childProcess = this.conf['icon_dumper']['childProcess'];
    this.cycleInterval = this.conf['icon_dumper']['cycleInterval'];

    this.gruntWorkingPath = process.cwd();

    this.workingList = [];

    this.statusErrorList = []; // The name of the image that was wrong during the conversion of png to tga

    this.statusTotalCount = 0;
    this.statusFinishedCount = 0;
    this.statusWorkingChildProcess = 0;
};

BstIconDumper.prototype.start = function() {
    const self = this;

    self.util.printHr();
    self.grunt.log.writeln('[BstIconDumper] Start to dump all icon resources ...');
    self.util.printHr();

    // Unpacking icon upk
    self.grunt.log.writeln('[BstIconDumper] Umodel exporting ' + BstConst.ICON_UPK_ID + '.upk ...');

    var iconUpkPath = self.util.findUpkPath(BstConst.ICON_UPK_ID);
    var umodelWorkingPath = path.dirname(iconUpkPath);

    var exec = 'umodel.exe -export -path="' + umodelWorkingPath + '" -game=bns -out=output ' + BstConst.ICON_UPK_ID;
    self.grunt.log.writeln('[BstIconDumper] Dump command: ' + exec);
    cp.exec(exec, {"cwd": path.join(self.gruntWorkingPath, 'resources/umodel'), "maxBuffer": 5 * 1024 * 1024}, // max buff 5M
        function(error) {
            if (error) {
                self.grunt.fail.fatal('[BstIconDumper] Error in umodel exporting ' + BstConst.ICON_UPK_ID + '.upk: ' + error.stack);
            }
            self.grunt.log.writeln('[BstIconDumper] Umodel exporting ' + BstConst.ICON_UPK_ID + '.upk done ...');
            self.process();
        }
    );
};

BstIconDumper.prototype.process = function() {
    const self = this;

    // Clean up tga copy folder
    if (self.grunt.file.exists(BstConst.PATH_ICON_TGA)) {
        self.grunt.log.writeln('[BstIconDumper] Clear previous tga outputs ...');
        self.util.deleteDir(BstConst.PATH_ICON_TGA);
        self.util.mkdir(BstConst.PATH_ICON_TGA);
    } else {
        self.util.mkdir(BstConst.PATH_ICON_TGA);
    }

    // Copy the tga file to the database folder
    self.grunt.log.writeln('[BstIconDumper] Copying all tga icon resources from output dir to database dir ...');
    self.grunt.file.recurse(
        './resources/umodel/output/' + BstConst.ICON_UPK_ID + '/Texture2D',
        function(abspath, rootdir, subdir, filename) {
            // new regex ^([a-z]{2,4}_(cash_)?)?(attach|costume|weapon_[a-z]{2}|wing|cat_(acc|cloth|hat))_
            if (filename.match(/^([a-z]{2,4}_(cash_)?)?(attach|costume|weapon_[a-z]{2}|wing|cat_(acc|cloth|hat))_.*/i) !== null ) {
                self.workingList.push(filename);
                self.util.copyFile(abspath, path.join(BstConst.PATH_ICON_TGA, filename));
            }
        }
    );
    self.statusTotalCount = self.workingList.length;
    self.grunt.log.writeln('[BstIconDumper] Copying all tga done ...');

    // 清理png文件输出文件夹
    if (self.grunt.file.exists(BstConst.PATH_ICON_PNG)) {
        self.grunt.log.writeln('[BstIconDumper] Clear previous png outputs ...');
        self.util.deleteDir(BstConst.PATH_ICON_PNG);
        self.util.mkdir(BstConst.PATH_ICON_PNG);
    } else {
        self.util.mkdir(BstConst.PATH_ICON_PNG);
    }

    for (const tgaFileName of self.workingList) {
        self.processTgaConvert(tgaFileName);
    }
    
    // 开始将tga转成png，方便预览
    var workingTimer = setInterval(function() {
        if (self.statusFinishedCount >= self.statusTotalCount) {
            clearInterval(workingTimer);
            if (self.statusErrorList.length > 0) {
                // 有错误，记录错误
                self.grunt.log.writeln('[BstIconDumper] ' + self.statusErrorList.length + ' conversions failed: ' +
                    self.util.formatJson(self.statusErrorList));
                self.util.writeFile(BstConst.PATH_ICON_CONVERSION_FAILURE, self.util.formatJson(self.statusErrorList));
            }
            self.grunt.log.writeln('[BstIconDumper] Clear umodel output dir ...');
            self.util.deleteDir(path.join(self.gruntWorkingPath, 'resources/umodel/output', BstConst.ICON_UPK_ID));
            
            self.grunt.log.writeln('[BstIconDumper] Clear tga file dir ...');
            if (self.grunt.file.exists(BstConst.PATH_ICON_TGA)) {
                self.util.deleteDir(BstConst.PATH_ICON_TGA);
            }
            self.grunt.log.writeln('[BstIconDumper] All works done ...');

            self.taskDone();
        }
    }, self.cycleInterval);
};

BstIconDumper.prototype.processTgaConvert = function(tgaFileName) {
    const self = this;

    self.startConvert(tgaFileName);

    var tgaFilePath = path.join(BstConst.PATH_ICON_TGA, tgaFileName);
    
    const basename = path.basename(tgaFileName, path.extname(tgaFileName))
    const pngFilePath = path.join(BstConst.PATH_ICON_PNG, path.dirname(tgaFileName), basename + '.png');

    tga2png(tgaFilePath, pngFilePath).then(buf => {
        self.finishConvert(tgaFileName);
    }, err => {
        self.grunt.log.error('[BstIconDumper] Error in converting tga file ' + tgaFileName + ': ' + err);
        self.statusErrorList.push(tgaFileName);
        self.finishConvert(tgaFileName);
    });
};

BstIconDumper.prototype.startConvert = function(tgaFileName) {
    this.grunt.log.writeln('[BstIconDumper] Start to covnert tga file ' + tgaFileName);
    this.statusWorkingChildProcess++;
};

BstIconDumper.prototype.finishConvert = function(tgaFileName) {
    this.statusWorkingChildProcess--;
    this.statusFinishedCount++;
    this.grunt.log.writeln('[BstIconDumper] File ' + tgaFileName + ' converted, progress: ' +
        this.statusFinishedCount + ' / ' + this.statusTotalCount);
    this.util.printHr();
};

module.exports = BstIconDumper;