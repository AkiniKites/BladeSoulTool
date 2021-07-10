"use strict";

var fs = require('fs');
var cp = require('child_process');
var path = require('path');

/**
 * @type {BstUtil|exports}
 */
var BstUtil = require('../util/bst_util.js');
/**
 * @type {BstConst|exports}
 */
var BstConst = require('../const/bst_const.js');

var BstUpkViewer = function(grunt, done) {
    this.grunt    = grunt;
    this.util     = new BstUtil(grunt);
    this.taskDone = done; // notify grunt: tasks done

    this.conf = this.util.readJsonFile('./config/setting.json');

    this.workingList = [];
};

BstUpkViewer.prototype.start = function(partType, elementId) {
    const self = this;

    self.util.printHr();
    self.grunt.log.writeln('[BstUpkViewer] Start view upk ...');
    self.util.printHr();

    self.util.partTypeCheck(partType);

    // clear working dir
    self.grunt.log.writeln('[BstUpkViewer] Clean the tmp working dir: ' + self.util.getWorkingPath());
    self.util.clearWorkingDir();
    self.util.printHr();

    // read conf
    self.grunt.log.writeln('[BstUpkViewer] Read conf of target element, id: ' + elementId);
    var element = self.util.getElementDataFromPartConfFile(partType, elementId);
    self.grunt.log.writeln('[BstUpkViewer] Target element conf found: ' + self.util.formatJson(element));
    self.util.printHr();

    // copy resources upk into working dir
    self.grunt.log.writeln('[BstUpkViewer] Prepare resource upk files ...');

    let workingPath = self.util.getWorkingPath();
    self.util.copyResourceUpk(element['skeleton'], workingPath);
    self.util.copyResourceUpk(element['texture'], workingPath);
    self.util.copyResourceUpk(element['material'], workingPath);
    self.util.copyResourceUpk(element['col1Material'], workingPath);

    // scan upkId.log to copy all resources upk
    var upkLog = self.util.readFileSplitWithLineBreak(path.join(BstConst.PATH_UPK_LOG, element['skeleton'] + '.log'));
    for (const line of upkLog) {
        var match = line.match(/(\d+).upk/);
        if (match !== null) {
            self.util.copyResourceUpk(match[1], workingPath);
        }
    }
    self.util.printHr();

    var displayModel = function() {
        // 将upk文件使用umodel进行可视化
        var worker = cp.exec(
            'umodel.exe -view -meshes -path="' + self.util.getWorkingPath() + '" -game=bns ' + element['skeleton'],
            {"cwd": './resources/umodel/'}
        );
        worker.stdout.on('data', function (data) { self.util.logChildProcessStdout(data); });
        worker.stderr.on('data', function (data) { self.util.logChildProcessStderr(data); });
        worker.on('exit', function () { self.util.clearWorkingDir(); self.taskDone(); });
    };

    // edit the upk skeleton if col is not col1
    if (element['col'] !== 'col1') {
        self.grunt.log.writeln('[BstUpkViewer] Edit skeleton upk file to display not col1 materials ...');
        self.util.readHexFile(path.join(self.util.getWorkingPath(), element['skeleton'] + '.upk'), function(data, skeletonPath) {
            // 将col1的配色upk名 替换成 非col1的配色upk名
            data = self.util.replaceStrAll(data, self.util.strUtf8ToHex(element['col1Material']), self.util.strUtf8ToHex(element['material']));
            // 将col1 替换成 非col1配色的colId
            data = self.util.replaceStrAll(data, self.util.strUtf8ToHex('col1'), self.util.strUtf8ToHex(element['col']));
            // 储存文件到 skeletonPath
            self.util.writeHexFile(skeletonPath, data);
            self.grunt.log.writeln('[BstUpkViewer] Skeleton file edited: ' + skeletonPath);
            // 展示模型
            displayModel();
        });
    } else {
        displayModel(); // 直接展示模型
    }

};

module.exports = BstUpkViewer;