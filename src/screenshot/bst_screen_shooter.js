"use strict";

var cp = require('child_process');
var path = require('path');
const { nanoid } = require('nanoid')

var fs = require('fs');

/**
 * @type {BstUtil|exports}
 */
var BstUtil = require('../util/bst_util.js');
/**
 * @type {BstConst|exports}
 */
var BstConst = require('../const/bst_const.js');

var BstScreenShooter = function(grunt, overwrite, done) {
    this.grunt     = grunt;
    this.util      = new BstUtil(grunt);
    this.overwrite = overwrite;
    this.taskDone  = done; // notify grunt: tasks done

    this.conf = this.util.readJsonFile('./config/setting.json');
    this.childProcess = this.conf['umodel_shooter']['childProcess'];
    this.cycleInterval = this.conf['umodel_shooter']['cycleInterval'];

    this.types = BstConst.PART_TYPES; // 需要处理的数据类型

    this.data = {}; // 需要处理的数据：database/[attach|costume|weapon]/data/data.json, etc...
    this.workingList = null; // 需要处理的数据的键数组：Object.keys(this.data)

    this.statusTotalCount = 0; // 总共需要处理的模型个数
    this.statusFinishedCount = 0; // 处理完成的模型个数
    this.statusWorkingChildProcess = 0;

    this.backupList = []; // 存储为了截图修改过的骨骼备份文件，统一删除

    this.tempFiles = {};
    this.tempFilesPath = path.join(this.util.getWorkingPath(), 'temp-shooter.json');
    if (fs.existsSync(this.tempFilesPath)) {
        this.tempFiles = this.util.readJsonFile(this.tempFilesPath);
    }
};

BstScreenShooter.prototype.start = function() {
    this.util.printHr();
    this.grunt.log.writeln('[BstScreenShooter] Start to take screenshot ... ');
    this.util.printHr();

    this.process(this.types.shift());
};

BstScreenShooter.prototype.process = function(type) {
    // 重置数据与状态
    this.data = this.util.readJsonFile('./database/' + type + '/data/data.json');
    this.workingList = null;
    this.statusTotalCount = 0;
    this.statusFinishedCount = 0;
    this.statusWorkingChildProcess = 0;

    this.processType(type);
};

BstScreenShooter.prototype.processType = function(type) {
    const self = this;

    self.workingList = Object.keys(self.data);
    self.statusTotalCount = self.workingList.length;

    self.grunt.log.writeln('[BstScreenShooter] ' + type + ' data loaded, "' + self.statusTotalCount + '" lines of record read.');
    self.util.printHr();

    // 清理旧的截图文件，并创建目标输出文件夹
    var targetOutputPath = path.join(BstConst.PATH_DATABASE, type, 'pics');
    if (self.overwrite) {
        self.grunt.log.writeln('[BstScreenShooter] Cleaning path: ' + targetOutputPath);
        self.util.deleteDir(targetOutputPath, false); // 文件夹没找到也不要报错
        self.util.mkdir(targetOutputPath);
    }
    if (!self.grunt.file.exists(targetOutputPath)) {
        self.util.mkdir(targetOutputPath);
    }

    var timer = setInterval(function() {
        while (self.statusWorkingChildProcess < self.childProcess && self.workingList.length > 0) {
            // 目前没有运行中的任务，安排任务
            self.processSingle(type, self.data[self.workingList.shift()]);
        }
        if (self.statusWorkingChildProcess == 0 && self.workingList.length == 0) {
            // 任务全部完成
            clearInterval(timer);

            for (const tempFile of Object.keys(self.tempFiles)) {
                self.util.deleteFile(tempFile);
            }
            self.util.clearWorkingDir();            
            self.util.printHr();
            self.grunt.log.writeln('[BstScreenShooter] All "' + type + '" photo shot.');
            if (self.types.length > 0) {
                self.process(self.types.shift()); // 处理下一个类型的数据
            } else {
                // 所有数据类型都已处理完毕，任务完成
                self.grunt.log.writeln('[BstScreenShooter] All types of works done.');
                self.taskDone();
            }
        }
    }, this.cycleInterval);
};

BstScreenShooter.prototype.processSingle = function(type, element) {
    const self = this;

    this.statusWorkingChildProcess++;
    var name = element['core'] + '_' + element['col'];
    self.grunt.log.writeln('[BstScreenShooter] Start to process: ' + name);

    // 确保当前元素的格式是规范的
    if (self.util.dataKeyCheck(element)) { // true返回表示有异常键值
        self.finishSingle(name); // 格式不规范，停止执行
        return;
    }

    var outputPath = path.join(BstConst.PATH_DATABASE, type, 'pics', name + '.png');
    if (self.util.checkFileExists(outputPath, false)) {
        self.grunt.log.writeln('[BstScreenShooter] Skipping file, already exists: ' + name);
        
        self.finishSingle(name);
        return;
    }
    
    let tempSkeletonFile;
    let skeletonName = element['skeleton'];    
    let skeletonPath = self.util.findUpkPath(skeletonName);
    if (skeletonPath === null) {
        self.finishSingle(name);
        return;
    }

    // 修改skeleton骨骼upk里的值，调整成非默认配色
    var handleUpk = function() {        
        let pp = path.parse(skeletonPath);
        skeletonName = pp.name + nanoid(10) + '-bst';
        tempSkeletonFile = path.join(pp.dir, skeletonName + pp.ext);

        self.tempFiles[tempSkeletonFile] = true;
        self.saveTempFiles();

        self.util.copyFile(skeletonPath, tempSkeletonFile);
        skeletonPath = tempSkeletonFile;

        self.util.readFileToBuffer(skeletonPath, function(data, path) {
            data = self.util.replaceAllBytes(data, element['col1Material'], element['material']);
            data = self.util.replaceAllBytes(data, 'col1', element['col']);

            // 储存文件到 skeletonPath
            self.util.writeFile(path, data);
            self.grunt.log.writeln('[BstScreenShooter] Skeleton file edited: ' + skeletonPath);
            // 执行下一步
            handleUmodel();
        });
    };

    // 将upk文件使用umodel进行可视化
    var handleUmodel = function() {
        const cmd = `umodel.exe -view -meshes -path="${path.dirname(skeletonPath)}" -game=bns ${skeletonName}`;
        self.grunt.log.writeln('[BstScreenShooter] Run: ' + cmd);
        var worker = cp.exec(
            cmd,
            {"cwd": './resources/umodel/'}
        );
        worker.stdout.on('data', function (data) { self.util.logChildProcessStdout(data); });
        worker.stderr.on('data', function (data) {
            self.util.logChildProcessStderr(data);
            
            if (element['col'] !== 'col1') {
            //     // 出错了，而且当前material并非col1，则直接将col1的图拷贝过来
            //     var imgBasePath = path.join('database', type,  'pics');
            //     var col1ImgPath = path.join(imgBasePath, element['core'] + '_col1.png');
            //     if (self.grunt.file.exists(col1ImgPath)) {
            //         self.util.copyFile(
            //             col1ImgPath,
            //             path.join(imgBasePath, name + '.png')
            //         );
            //     }
            }
        });
        worker.on('exit', function (code) { self.util.logChildProcessExit('umodel', code); });

        handleExport(worker);
    };
    
    var handleExport = function(umodel) {
        const timeout = 10000, width = 500, height = 600;

        const cmd = `ExportTool ${umodel.pid} ${timeout} ${width} ${height} true "${outputPath}"`;
        self.grunt.log.writeln('[BstScreenShooter] Run: ' + cmd);
        var worker = cp.exec(
            cmd,
            {"cwd": './VS_GUI/ExportTool/bin/Debug/'}
        );
        worker.stdout.on('data', function (data) { self.util.logChildProcessStdout(data); });
        worker.stderr.on('data', function (data) { self.util.logChildProcessStderr(data); });
        worker.on('exit', function (code) {
            self.util.logChildProcessExit('ExportTool', code);
            umodel.kill();
            self.finishSingle(name, tempSkeletonFile);
        });
    };

    // 开始处理
    if (element['col'] != 'col1') { // 不是默认色调，首先要处理upk文件
        handleUpk();
    } else {
        handleUmodel();
    }
};

BstScreenShooter.prototype.saveTempFiles = function() {
    this.util.writeFile(this.tempFilesPath, this.util.formatJson(this.tempFiles));
}

BstScreenShooter.prototype.finishSingle = function(name, tempSkeletonFile) {
    if (tempSkeletonFile !== undefined) {
        let deleteOk = false;
        try {
            this.grunt.file.delete(tempSkeletonFile, {'force':true});
            deleteOk = true;
        } catch (err) {
            this.grunt.log.error(err);
        }

        if (deleteOk && this.tempFiles.hasOwnProperty(tempSkeletonFile)) {
            delete this.tempFiles[tempSkeletonFile];
            this.saveTempFiles();
        }
    }

    this.statusWorkingChildProcess--;
    this.statusFinishedCount++;

    this.grunt.log.writeln('[BstScreenShooter] Processing of "' + name + '" done, ' +
        'progress: ' + this.statusFinishedCount + ' / ' + this.statusTotalCount);
    this.util.printHr();
};

module.exports = BstScreenShooter;