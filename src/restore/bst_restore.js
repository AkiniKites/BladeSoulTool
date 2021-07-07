"use strict";

var path = require('path');

/**
 * @type {BstUtil|exports}
 */
var BstUtil = require('../util/bst_util.js');

var BstRestore = function(grunt, done) {
    this.grunt    = grunt;
    this.util     = new BstUtil(grunt);
    this.taskDone = done; // notify grunt: tasks done

    this.backup = this.util.readJsonFile('./config/backup.json');
};

BstRestore.prototype.start = function() {
    this.util.printHr();
    this.grunt.log.writeln('[BstRestore] Start to restore models ...');
    this.util.printHr();

    this.grunt.log.writeln('[BstRestore] Backup info read: ' + this.util.formatJson(this.backup));

    var backupPath = path.join(process.cwd(), 'config', 'backup.json'); // 因为后面cwd会变动，这里需要暂存

    // 需要先处理restore，因为delete必须要改变当前grunt运行的CWD
    this.processRestore();
    this.processDelete();

    // 重置backup.json文件
    this.util.writeFile(backupPath, this.util.formatJson({
        'delete': [], 'restore': []
    }));

    // 重置工作路径
    this.util.restoreGruntWorkingDir();

    this.taskDone();
};

BstRestore.prototype.processRestore = function() {
    var self = this;
    if (self.backup['restore'].length > 0) {
        // 恢复文件
        for (const backupPath of self.backup['restore']) {
            self.util.restoreFile(backupPath);
        }
        // 删除备份文件
        for (const backupPath of self.backup['restore']) {
            var dir = path.dirname(backupPath);
            self.util.setGruntWorkingDir(dir);
            self.util.deleteFile(backupPath);
        }
    }
};

BstRestore.prototype.processDelete = function() {
    var self = this;
    if (self.backup['delete'].length > 0) {
        for (const deletePath of self.backup['delete']) {
            var dir = path.dirname(deletePath);
            self.util.setGruntWorkingDir(dir);
            self.util.deleteFile(deletePath);
        }
    }
};

module.exports = BstRestore;