"use strict";

var fs = require('fs');
var path = require('path');
var request = require('request');

/**
 * @type {BstConst|exports}
 */
var BstConst = require('../const/bst_const.js');

var BstUtil = function(grunt) {
    /** @type {grunt} */
    this.grunt = grunt;

    this.gruntWorkingPath = process.cwd();

    this.conf = this.readJsonFile('./config/setting.json');
    this.tencentPath = path.join(this.conf['path']['game'], this.conf['path']['tencent']);
    this.bnsPath = path.join(this.conf['path']['game'], this.conf['path']['bns']);    
    this.working3DPath = path.join(this.gruntWorkingPath, 'working_3d');

    this.asyncList = []; // 异步工作控制器的注册列表

    this.requiredDataKeys = [ // 解析出来的数据必须有的键值
        "skeleton", "texture", "material", "col1Material", "col", "core", "code", "race", "pic"
    ];
};

BstUtil.prototype.getBnsPath = function() {
    return this.bnsPath;
};

BstUtil.prototype.getTencentPath = function() {
    return this.tencentPath;
};

BstUtil.prototype.getWorkingPath = function() {
    return this.working3DPath;
};

BstUtil.prototype.printHr = function() {
    this.grunt.log.writeln('-------------------------------------------------------------------------------');
};

BstUtil.prototype.strUtf8ToHex = function(str) {
    var result = Buffer.from(str).toString('hex');
    this.grunt.log.writeln('[BstUtil] Convert UTF8 to HEX, FROM: ' + str + ', TO: ' + result);

    return result;
};

BstUtil.prototype.checkFileExists = function(path, needFail) {
    if (typeof needFail !== 'boolean') {
        needFail = true;
    }
    if (!this.grunt.file.exists(path) && needFail) {
        this.grunt.fail.fatal('[BstUtil] File not found, path: ' + path);
        return false;
    } else if (!this.grunt.file.exists(path) && !needFail) {
        return false;
    } else {
        return true;
    }
};

BstUtil.prototype.copyFile = function(fromPath, toPath, needFail) {
    if (this.checkFileExists(fromPath, needFail)) {
        this.grunt.file.copy(fromPath, toPath);
        this.grunt.log.writeln('[BstUtil] Copy file FROM: ' + fromPath + ', TO: ' + toPath);
    }
};

BstUtil.prototype.moveFile = function(fromPath, toPath, needFail) {
    if (this.checkFileExists(fromPath, needFail)) {
        this.grunt.file.copy(fromPath, toPath);
        this.grunt.file.delete(fromPath, {force: true});
        this.grunt.log.writeln('[BstUtil] Move file FROM: ' + fromPath + ', TO: ' + toPath);
    }
};

BstUtil.prototype.deleteDir = function(path, needFail) {
    if (this.checkFileExists(path, needFail)) {
        try {
            this.grunt.file.delete(path);
            this.grunt.log.writeln('[BstUtil] Delete dir: ' + path);
        } catch(error) {
            this.grunt.log.error('[BstUtil] Delete err: ' + error);
        }
    }
};

BstUtil.prototype.deleteFile = function(path, needFail) {
    if (this.checkFileExists(path, needFail)) {
        this.grunt.file.delete(path);
        this.grunt.log.writeln('[BstUtil] Delete file: ' + path);
    }
};
BstUtil.prototype.deleteFileSilent = function(path) {
    try{
        if (this.checkFileExists(path, false)) {
            this.grunt.file.delete(path, {'force':true});
        }
    } catch (err) {
        // eslint-disable-next-line no-empty        
    }
};

BstUtil.prototype.mkdir = function(path) {
    if (!this.grunt.file.exists(path)) {
        this.grunt.file.mkdir(path);
        this.grunt.log.writeln('[BstUtil] mkdir: ' + path);
    } else {
        this.grunt.log.error('[BstUtil] mkdir did nothing, since dir already exists: ' + path);
    }
};

// eslint-disable-next-line no-unused-vars
BstUtil.prototype.logChildProcessStdout = function(data) {
    // this.grunt.log.writeln('[BstUtil] process: stdout: ' + data); // Too many info
};

BstUtil.prototype.logChildProcessStderr = function(data) {
    if (data) {
        this.grunt.log.error('[BstUtil] process: stderr: ' + data);
    }
};

BstUtil.prototype.logChildProcessExit = function(task, code) {
    this.grunt.log.writeln('[BstUtil] process "' + task + '" exited with code: ' + code);
};

BstUtil.prototype.writeFile = function(path, content) {
    this.grunt.file.write(path, content);
    this.grunt.log.writeln('[BstUtil] Write file: ' + path);
};

BstUtil.prototype.writeHexFile = function(path, data) {
    var buff = Buffer.from(data, 'hex');

    this.grunt.file.write(path, buff, {encoding: 'hex'});

    this.grunt.log.writeln('[BstUtil] Write file: ' + path);
};

BstUtil.prototype.readJsonFile = function(path, needFail) {
    if (this.checkFileExists(path, needFail)) {
        return this.grunt.file.readJSON(path);
    } else {
        return null;
    }
};

BstUtil.prototype.readFile = function(path, needFail) {
    if (this.checkFileExists(path, needFail)) {
        return this.grunt.file.read(path);
    } else {
        return null;
    }
};

BstUtil.prototype.readHexFile = function(path, callback) {
    this.checkFileExists(path);

    var data = '';

    var rs = fs.createReadStream(path, {encoding: 'hex', bufferSize: 11});

    rs.on('data', function(trunk) {
        data += trunk;
    });
    rs.on('end', function() {
        callback(data, path);
    });
};

BstUtil.prototype.readFileToBuffer = function(path, callback) {
    this.checkFileExists(path);

    fs.readFile(path, function(err, data){
        callback(data, path);
    });
};

BstUtil.prototype.replaceStrAll = function(str, fromStr, toStr) {
    this.grunt.log.writeln('[BstUtil] Replace string all appearance from: ' + fromStr + ', to: ' + toStr);
    return str.replace(new RegExp(fromStr, 'g'), toStr);
};

BstUtil.prototype.replaceAllBytes = function(buffer, from, to, onFound) {
    this.grunt.log.writeln('[BstUtil] Replace bytes all appearance from: ' + from + ', to: ' + to);

    const fromBuf = Buffer.from(from);
    const toBuf = Buffer.from(to);

    function replaceAll(buf) {
        const idx = buf.indexOf(fromBuf);
        if (idx == -1) {
            return buf;
        }

        if (onFound && typeof onFound === 'function') {
            onFound(buf, idx);
        }

        const before = buf.slice(0, idx);
        const after = replaceAll(buf.slice(idx + fromBuf.length));
        const len = idx + toBuf.length + after.length;
        return Buffer.concat([ before, toBuf, after ], len);
    }

    return replaceAll(buffer);
};

BstUtil.prototype.findStrCount = function(str, findStr) {
    var match = str.match(new RegExp(findStr, 'g'));
    if (match === null) {
        return 0;
    } else {
        return match.length;
    }
};

BstUtil.prototype.buildSpecialHairCore = function(core) {
    if (BstConst.HAIR_UPK_SPECIAL_CORES.indexOf(core) !== -1) {
        core = BstConst.HAIR_UPK_CORE_PREFIX + core;
    }
    return core;
};

BstUtil.prototype.buildHexCoreStrWithHexNull = function(str, additionalHexNullNum) {
    var base = this.strUtf8ToHex(str);

    if (typeof additionalHexNullNum === 'number') {
        for (var i = 0; i < additionalHexNullNum; i++) {
            base += BstConst.UPK_HEX_STR_NULL;
        }
    }

    // 这个Hex的null值是本来就需要加的
    return base + BstConst.UPK_HEX_STR_NULL;
};

BstUtil.prototype.replaceStrLast = function(str, fromStr, toStr) {
    this.grunt.log.writeln('[BstUtil] Replace string last appearance from: ' + fromStr + ', to: ' + toStr);
    return str.substr(0, str.lastIndexOf(fromStr)) + toStr + str.substr(str.lastIndexOf(fromStr) + fromStr.length);
};

BstUtil.prototype.registerAsyncEvent = function(eventName) {
    if (this.asyncList.indexOf(eventName) === -1) {
        this.grunt.log.writeln('[BstUtil] Async event registered: ' + eventName);
        this.asyncList.push(eventName);
    }
};

BstUtil.prototype.setGruntWorkingDir = function(targetDir) {
    this.grunt.file.setBase(targetDir);
};

BstUtil.prototype.restoreGruntWorkingDir = function() {
    this.grunt.file.setBase(this.gruntWorkingPath);
};

BstUtil.prototype.getBackupFileNameViaOriginPath = function(originPath) {
    return path.basename(originPath) + BstConst.BACKUP_TAIL;
};

BstUtil.prototype.getBackupFilePathViaOriginPath = function(originPath) {
    var dir = path.dirname(originPath);
    var backupName = this.getBackupFileNameViaOriginPath(originPath);
    return path.join(dir, backupName);
};

BstUtil.prototype.backupFile = function(originPath) { // 这里的path是需要备份的原始文件
    var backupPath = this.getBackupFilePathViaOriginPath(originPath);

    if (!this.grunt.file.exists(originPath)) {
        this.grunt.log.writeln('[BstUtil] Skipping backup, file missing: ' + originPath);
    } else if (this.grunt.file.exists(backupPath)) {
        this.grunt.log.writeln('[BstUtil] Skipping backup, backup exists: ' + backupPath);
    } else {
        this.copyFile(originPath, backupPath);
        this.grunt.log.writeln('[BstUtil] Backup file generated: ' + backupPath);
    }

    return backupPath; // 用来保存到backup.json，或者马上恢复文件
};

BstUtil.prototype.restoreFile = function(backupPath) { // 这里的path是带后缀名的已备份文件
    var dir = path.dirname(backupPath);
    var backupName = path.basename(backupPath);
    var originName = backupName.substr(0, backupName.indexOf(BstConst.BACKUP_TAIL));
    var originPath = path.join(dir, originName);
    if (this.grunt.file.exists(backupPath)) { // 备份文件存在
        this.moveFile(backupPath, originPath);        
        this.grunt.log.writeln('[BstUtil] Original file restored: ' + originPath);
    }
};

BstUtil.prototype.clearWorkingDir = function() {
    const self = this;
    self.grunt.file.recurse(self.getWorkingPath(), function(abspath, rootdir, subdir, filename) {
        if (filename !== 'working_3d_dir') {
            self.deleteFileSilent(abspath);
        }
    });
};

BstUtil.prototype.copyResourceUpk = function(upkId, dir, onErr) {
    let output = path.join(dir, upkId + '.upk');

    this.grunt.file.copy(
        this.findUpkPath(upkId, function() {
            output = null;

            if (onErr && typeof onErr === 'function') {
                onErr();
            } else {
                this.grunt.fail.fatal('[BstUpkViewer] Target upk not found ...');
            }
        }),
        output
    );

    return output;
};

BstUtil.prototype.cancelAsyncEvent = function(eventName) {
    var index = this.asyncList.indexOf(eventName);
    if (index !== -1) {
        this.grunt.log.writeln('[BstUtil] Async event cancelled: ' + eventName);
        this.asyncList.remove(index);
    }
};

BstUtil.prototype.startToListenAsyncList = function(callback) {
    const self = this;
    var timer = setInterval(function() {
        if (self.asyncList.length == 0) { // all done
            self.grunt.log.writeln('[BstUtil] Async event list done.');
            clearInterval(timer);
            self.asyncList = [];
            if (typeof callback === 'function') {
                callback();
            } else {
                self.grunt.fail.fatal('[BstUtil] Async callback type is invalid: ' + (typeof callback));
            }
        }
    }, 50);
};

BstUtil.prototype.formatJson = function(json) {
    return JSON.stringify(json, null, 2);
};

BstUtil.prototype.printJson = function(json) {
    console.log(this.formatJson(json));
};

BstUtil.prototype.fileDownload = function(url, filepath, callback, headers) {
    const self = this;
    self.grunt.log.writeln('[BstUtil] Start to download file: ' + url);

    var errReport = function(err) {
        self.grunt.log.error('[BstUtil] Error in downloading: ' + url);
        self.grunt.log.error(err);
    };

    var dir = path.dirname(filepath);
    if (!self.grunt.file.exists(dir)) {
        self.grunt.file.mkdir(dir);
    }

    var ws = fs.createWriteStream(filepath);
    ws.on('error', function(err) { errReport(err); });

    var options = {"url": url};
    if (typeof headers !== 'undefined' && Object.keys(headers).length != 0) {
        options['headers'] = headers;
    }
    request(options).pipe(ws).on('close', function() {
        self.grunt.log.writeln('File "' + url + '" downloaded');
        callback();
    });
};

BstUtil.prototype.readFileSplitWithLineBreak = function(filePath) {
    var content = this.readFile(filePath).toString();
    var lineBreak = this.detectFileLineBreak(content);

    return content.split(lineBreak);
};

BstUtil.prototype.detectFileLineBreak = function(fileContent) {
    var lfCount = fileContent.countOccurence("\n");
    var crlfCount = fileContent.countOccurence("\r\n");

    if (crlfCount > lfCount) {
        return "\r\n";
    } else {
        return "\n";
    }
};

BstUtil.prototype.findUpkPath = function(upkId, errCallback) {
    var upkName = upkId + '.upk';
    var upkPath = path.join(this.getBnsPath(), upkName);

    if (!this.grunt.file.exists(upkPath)) {
        this.grunt.log.error('[BstUtil] Upk file not found in bns dir: ' + upkPath);
        upkPath = path.join(this.getTencentPath(), upkName);
        if (!this.grunt.file.exists(upkPath)) {
            this.grunt.log.error('[BstUtil] Upk file not found in tencent dir: ' + upkPath);
            if (typeof errCallback === 'function') {
                errCallback();
            }
            return null;
        }
    }

    return upkPath;
};

BstUtil.prototype.formatRawCode = function(rawCode) {
    /**
     * rawCode：基本上应该是 "数字短码_种族性别" 这样的格式，e.g：20002_KunN，
     * 但事实上mesh.xml里有大量的大小写错误，或者拼写错误之类的不符合规律的地方，
     * 为了方便后续的逻辑处理，我们这里会把 "种族性别" 这个字符串格式化为：
     * KunN | JinF | JinM | GonF | GonM | LynF | LynM | All
     */
    // 处理：_Kun
    if (rawCode.indexOf('_') !== -1
        && rawCode.substr(rawCode.indexOf('_')).toLowerCase() === '_kun') {
        // 捕获从 "_" 开始到rawCode结束，匹配 "_Kun" | "_kun"，替换成 "_KunN"
        rawCode = rawCode.replace(new RegExp('kun', 'i'), 'KunN');
    }

    // 处理：_jiM
    rawCode = rawCode.replace(new RegExp('jim', 'i'), 'JinM');

    // 处理：批量替换大小写错误
    return rawCode.
        replace(new RegExp('kunn', 'i'), 'KunN').
        replace(new RegExp('jinf', 'i'), 'JinF').
        replace(new RegExp('jinm', 'i'), 'JinM').
        replace(new RegExp('gonf', 'i'), 'GonF').
        replace(new RegExp('gonm', 'i'), 'GonM').
        replace(new RegExp('lynf', 'i'), 'LynF').
        replace(new RegExp('lynm', 'i'), 'LynM').
        replace(new RegExp('all', 'i'), 'All');
};

BstUtil.prototype.formatCol = function(colInfo) {
    if (colInfo.match(/col\d+/i) !== null) { // 只有带数字后缀的，才有必要转换，否则可能就是一个"Col"
        colInfo = colInfo.replace(new RegExp('col', 'i'), 'col');
    }
    return colInfo;
};

BstUtil.prototype.formatCode = function(code) { // 删掉code开头的0字符串，方便匹配相等
    var result = code;

    if (code !== null) {
        code = code.split(''); // "0041003" => ["0", "0", "4", "1", "0", "0", "3"]
        var notDone = true;
        while (notDone) {
            if (code[0] === '0') {
                code.shift();
            } else {
                notDone = false;
            }
        }
        result = code.join('');
    }

    return result;
};

BstUtil.prototype.dataKeyCheck = function(element) {
    const self = this;

    var hasInvalidKey = false;
    var elementKeys = Object.keys(element);
    for (const requiredKey of self.requiredDataKeys) {
        if (elementKeys.indexOf(requiredKey) === -1) { // 必须的键值在当前元素中未找到
            hasInvalidKey = true;
            self.grunt.log.error('[BstUtil] Required mesh element key "' + requiredKey + '"' +
                ' not found in element: ' +
                '"' + element['codeWithRace'] + '_' + element['col'] + '"');
        }
    }

    return hasInvalidKey;
};

BstUtil.prototype.partTypeCheck = function(partType) {
    if (BstConst.PART_TYPES.indexOf(partType) === -1) {
        this.grunt.fail.fatal('[BstUtil] Invalid part type, part shall only be one of the: "' +
            this.formatJson(BstConst.PART_TYPES) + '"');
    }
};

BstUtil.prototype.getElementDataFromPartConfFile = function(partType, elementId) {
    this.partTypeCheck(partType);

    var conf = this.readJsonFile(path.join(BstConst.PATH_DATABASE, partType, 'data', 'data.json'));
    if (Object.keys(conf).indexOf(elementId) === -1) {
        this.grunt.fail.fatal('[BstUtil] Target element with id "' + elementId + '" was not found in conf of part: ' + partType);
    }

    return conf[elementId];
};

module.exports = BstUtil;