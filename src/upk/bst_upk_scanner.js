"use strict";

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

/**
 * 扫描所有的upk文件，使用umodel.exe的dump命令，将所有的分析数据搜集，输出到"database/upk/log"下
 */
var BstUpkScanner = function(grunt, done) {
    this.grunt    = grunt;
    this.util     = new BstUtil(grunt);
    this.taskDone = done; // notify grunt: tasks done

    this.conf = this.util.readJsonFile('./config/setting.json');
    this.childProcess = this.conf['upk_scanner']['childProcess'];
    this.cycleInterval = this.conf['upk_scanner']['cycleInterval'];

    this.gruntWorkingPath = process.cwd();

    this.workingList = [];

    this.statusTotalCount = 0;
    this.statusFinishedCount = 0;
    this.statusWorkingChildProcess = 0;
};

BstUpkScanner.prototype.start = function() {
    const self = this;

    self.util.printHr();
    self.grunt.log.writeln('[BstUpkScanner] Start to scan upk files ...');
    self.util.printHr();

    /**
     * 扫描只会扫bns目录下的upk，因为umodel无法指定两个工作目录，所以先要运行preparer，
     * 将所有不重复的upk复制到bns下，然后再开始跑scanner脚本
     */
    // 收集bns目录下的upk文件path
    self.grunt.file.recurse(self.util.getBnsPath(), function(abspath, rootdir, subdir, filename) {
        if (filename.match(/^\d+.upk$/) !== null) {
            self.workingList.push(abspath);
        }
    });

    self.statusTotalCount = self.workingList.length;
    self.grunt.log.writeln('[BstUpkScanner] Total upk files count: ' + self.workingList.length);
    self.util.printHr();

    self.process();
};

BstUpkScanner.prototype.process = function() {
    const self = this;

    var workingTimer = setInterval(function() {
        if (self.statusWorkingChildProcess < self.childProcess // 有空余的进程数
            && self.workingList.length > 0) { // 队列中仍旧有任务需要安排
            self.processSingle(self.workingList.shift());
        }
        if (self.statusFinishedCount >= self.statusTotalCount) {
            clearInterval(workingTimer);
            self.grunt.log.writeln('[BstUpkScanner] All works done ...');
            self.taskDone();
        }
    }, self.cycleInterval);
};

BstUpkScanner.prototype.processSingle = function(upkPath) {
    const self = this;

    self.startProcess(upkPath);

    if (!self.grunt.file.exists(upkPath)) {
        self.finishProcess(upkPath);
        return;
    }

    var upkFileName = path.basename(upkPath);
    var upkId = upkFileName.substr(0, upkFileName.indexOf('.'));
    cp.exec(
        'umodel.exe -dump -path="' + path.dirname(upkPath) + '" -game=bns ' + upkId,
        {"cwd": './resources/umodel', "maxBuffer": 5 * 1024 * 1024}, // max buff 5M
        function(error, stdout) {
            if (error !== null) {
                if (stdout.indexOf(BstConst.UPK_NO_OBJ_ERROR) !== -1) {
                    // 目标upk没有可用的objects
                    self.grunt.log.error('[BstUpkScanner] Error in scanning file: ' + upkId + ', upk has no supported objects ... ');
                } else if (error.stack.indexOf(BstConst.UPK_UNKNOWN_MEMBER_ERROR) !== -1) {
                    // 目标upk含有未知的成员
                    self.grunt.log.error('[BstUpkScanner] Error in scanning file: ' + upkId + ', upk has unknown member ... ');
                    stdout += error.stack; // 将错误信息附加到stdout中，一同写入文件
                } else {
                    // 普通的错误
                    self.grunt.log.error('[BstUpkScanner] Error in scanning file: ' + upkId + ', error: ' + error.stack);
                }
            }
            self.util.writeFile(path.join(self.gruntWorkingPath, 'database/upk/log', upkId + '.log'), stdout.toString());
            self.finishProcess(upkPath);
        }
    );
};

BstUpkScanner.prototype.startProcess = function(upkPath) {
    this.grunt.log.writeln('[BstUpkScanner] Start to handle file ' + path.basename(upkPath));
    this.statusWorkingChildProcess++;
};

BstUpkScanner.prototype.finishProcess = function(upkPath) {
    this.statusWorkingChildProcess--;
    this.statusFinishedCount++;
    this.grunt.log.writeln('[BstUpkScanner] File ' + path.basename(upkPath) + ' done, progress: ' +
        this.statusFinishedCount + ' / ' + this.statusTotalCount);
    this.util.printHr();
};

module.exports = BstUpkScanner;