"use strict";

var cp = require('child_process');
var path = require('path');
var xml2js = require('xml2js');
var _ = require('underscore');
/**
 * @type {BstUtil|exports}
 */
var Util = require('../util/bst_util.js');

var BstMeshParser = function(grunt) {
    this.grunt  = grunt;
    this.util   = new Util(grunt);
    this.parser = new xml2js.Parser();

    this.conf = this.util.readJsonFile('./config/setting.json');

    this.part = null; // 当前在解析的数据是哪个部分的：body、face、hair
    this.xml  = null; // 读取出来的mesh xml的record列表：<table>[xml => <record></record>]</table>
    this.body = null; // 过滤出所有 type-mesh 是 body-mesh 的数据
    this.face = null; // 过滤出所有 type-mesh 是 accessory-mesh 的数据
    this.hair = null; // 过滤出所有 type-mesh 是 hair-mesh 的数据

    this.crawledData = null; // 从17173站点上爬取到的数据，根据当前的part不同，可能从不同的文件读入
    this.tmpData = { // 正在处理收集的数据
        "KunN": {},
        "JinF": {},
        "JinM": {},
        "GonF": {},
        "GonM": {},
        "LynF": {},
        "LynM": {}
    };
};

BstMeshParser.PART_BODY = 'body-mesh';
BstMeshParser.PART_FACE = 'accessory-mesh'; // FIXME 是这么分类的么？ accessory-mesh 应该是 attach 配件的意思
BstMeshParser.PART_HAIR = 'hair-mesh';

BstMeshParser.RACE_GON   = '곤';
BstMeshParser.RACE_KUN   = '건';
BstMeshParser.RACE_JIN   = '진';
BstMeshParser.RACE_LYN   = '린';
BstMeshParser.RACE_VALID = ['곤', '건', '진', '린'];
BstMeshParser.RACE_NONE  = 'race-none';

BstMeshParser.GENDER_M = '남';
BstMeshParser.GENDER_F = '여';

BstMeshParser.MESH_NAME = 'charactertoolappearance_mesh.xml';

BstMeshParser.prototype.start = function(part) {
    this.util.printHr();
    if ([BstMeshParser.PART_BODY, BstMeshParser.PART_FACE, BstMeshParser.PART_HAIR].indexOf(part) === -1) {
        this.grunt.fail.fatal('[BstMeshParser] Invalid start part specified: ' + part);
    }
    this.grunt.log.writeln('[BstMeshParser] Start to parse mesh xml of part: ' + part);
    this.util.printHr();

    this.part = part;
    this.dedat();
};

/**
 * 流程：
 * 1. 解包xml.dat文件
 * 2. 找出mesh.xml
 * 3. 解析，轮询所有项
 * 4. 如果是多色的，xml里有描述
 * 5. 如果是单色的，则需要umodel，分解，再查看单色的色指定文件
 *
 * 截图解决思路：
 * 1. 使用umodel.exe -view功能，启动展示窗，sleep 1秒，将UE Viewer窗口缩小，移动到屏幕0,0点，使用第三方软件截屏
 * http://www.nirsoft.net/utils/nircmd.html
 * http://stackoverflow.com/questions/10392620/how-can-a-batch-file-run-a-program-and-set-the-position-and-size-of-the-window
 * 2. 使用剑灵模型识别器，来批量导出图片，时候取用
 */

BstMeshParser.prototype.dedat = function() {
    var self = this;

    var meshXmlPath = './resources/dedat/output/engine/' + BstMeshParser.MESH_NAME;

    // 处理mesh xml的函数，需要在确定其存在（解包完成后），才会被调用
    var funcReadMeshXml = function() {
        self.util.readFile(meshXmlPath, function(data) {
            self.parser.parseString(data, function(err, result) {
                if (err) {
                    self.grunt.fail.fatal('[BstMeshParser] Error in parsing mesh.xml: ' + err.stack);
                }
                self.xml = result['table']['record'];
                self.grunt.log.writeln('[BstMeshParser] mesh.xml parsed, "' + self.xml.length + '" lines of records read.');
                self.process();
            });
        });
    };

    // 检查是否mesh xml已存在
    if (!this.grunt.file.exists(meshXmlPath)) { // 没有已经被解包的dat文件内容，需要现场解包
        var xmlDatPath = path.join(this.conf['path']['game'], this.conf['path']['data'], 'xml.dat');
        this.grunt.log.writeln('[BstMeshParser] Start to dedat xml.dat: ' + xmlDatPath);
        var worker = cp.spawn('dated_from208.exe', [xmlDatPath, '--', 'output', '--', 'd'], {"cwd": './resources/dedat/'});

        worker.stdout.on('data', function (data) {
            self.grunt.log.writeln('[BstMeshParser] Dedat process: stdout: ' + data);
        });
        worker.stderr.on('data', function (data) {
            if (data) {
                self.grunt.log.error('[BstMeshParser] Dedat process: stderr: ' + data);
            }
        });
        worker.on('exit', function (code) {
            self.grunt.log.writeln('[BstMeshParser] Dedat process exit with code: ' + code);
            funcReadMeshXml();
        });
    } else {
        funcReadMeshXml();
    }
};

BstMeshParser.prototype.process = function() {
    switch (this.part) {
        case BstMeshParser.PART_BODY:
            this.processBody();
            break;
        case BstMeshParser.PART_FACE:
            this.processFace();
            break;
        case BstMeshParser.PART_HAIR:
            this.processHair();
            break;
        default:
            break;
    }
};

BstMeshParser.prototype.processBody = function() {
    this.body = _.filter(this.xml, function(element) {
        return (element['$']['type-mesh'] == BstMeshParser.PART_BODY
            && BstMeshParser.RACE_VALID.indexOf(element['$']['race']) !== -1);
    });
    this.grunt.log.writeln('[BstMeshParser] body-mesh parsed, "' + this.body.length + '" lines of record read.');

    this.crawledData = this.util.readJsonFile('./database/crawler/body/data.json');
    this.grunt.log.writeln('[BstMeshParser] body crawled data loaded, "' + _.keys(this.crawledData).length + '" lines of record read.');

    _.each(this.body, this.parseBodyElement, this);
};

/**
 {
     "$": {
         "alias": "60089_JinF",
         "data-version": "2",
         "description": "",
         "id": "160",
         "name": "60089_수묵의 color vari.",
         "race": "진",
         "resource-name": "00019786.60089_JinF",
         "sex": "여",
         "sub-material-name-1": "00019785.col1",
         "sub-material-name-2": "00019811.col2",
         "type-mesh": "body-mesh"
     }
 },
 {
     "$": {
         "alias": "65070_JinF",
         "data-version": "2",
         "description": "",
         "id": "161",
         "name": "65070_하오방 기녀",
         "race": "진",
         "resource-name": "00020425.65070_JinF",
         "sex": "여",
         "type-mesh": "body-mesh"
     }
 },
 */

BstMeshParser.prototype.parseBodyElement = function(element, index, list) {
    if (index !== 0) {
        return; // FIXME for test
    }
    var self = this;

    self.util.printHr();
    self.grunt.log.writeln('[BstMeshParser] Parsing "' + element['$']['alias'] + '", ' +
        'progress: ' + (index + 1) + ' / ' + list.length + ' ...');
    self.util.printHr();

    var parsedCode = self.utilParseRawCode(element['$']['alias']);
    if (parsedCode === null) {
        self.grunt.log.error('[BstMeshParser] Invalid body-mesh format, alias: ' + element['$']['alias']);
        return; // 这不是一个常规的body mesh数据，忽略它
    }

    // 01. 找到skeleton的upk id
    var skeleton = element['$']['resource-name'].substr(0, element['$']['resource-name'].indexOf('.'));
    var texture;
    var material;

    // 02. 检查skeleton upk是否存在
    var skeletonPath = path.join(self.conf['path']['game'], self.conf['path']['bns'], skeleton + '.upk');
    if (!self.grunt.file.exists(skeletonPath)) {
        self.grunt.log.error('[BstMeshParser] Code: "' + parsedCode['codeWithRace'] + '", Info: skeleton upk not found in bns dir: ' + skeletonPath);
        skeletonPath = path.join(self.conf['path']['game'], self.conf['path']['tencent'], skeleton + '.upk');
        self.util.checkFileExists(skeletonPath); // 保证文件存在
    }

    // 03. 启动子进程拆包skeleton upk
    var worker = cp.exec('umodel.exe -export -path=' + path.dirname(skeletonPath) + ' -game=bns -out=output ' + skeleton, {"cwd": './resources/umodel/'});
    worker.stdout.on('data', function (data) {
        // self.grunt.log.writeln('[BstMeshParser] umodel process: stdout: ' + data); // Too many info
    });
    worker.stderr.on('data', function (data) {
        if (data) {
            self.grunt.log.error('[BstMeshParser] umodel process: stderr: ' + data);
        }
    });
    worker.on('exit', function (code) {
        self.grunt.log.writeln('[BstMeshParser] umodel processing "' + skeleton + '" exit with code: ' + code);
        funcLoopUmodelOutput();
    });

    // 04. 找出texture和col1的upk id
    var funcLoopUmodelOutput = function() {
        self.grunt.file.recurse('./resources/umodel/output', function(abspath, rootdir, subdir, filename) {
            /**
             * abspath: resources/umodel/output/00002704/Texture2D/XLM000_d.tga
             * rootdir: ./resources/umodel/output
             * subdir: 00002704/Texture2D
             * filename: XLM000_d.tga
             */
            if (abspath.match(/Texture2D/)) {
                texture = subdir.match(/\d+/)[0];
            } else if (abspath.match(/MaterialInstanceConstant/)) {
                material = subdir.match(/\d+/)[0];
            }
        });
        self.util.deleteFile('./resources/umodel/output');
        self.util.mkdir('./resources/umodel/output');
        funcCollectData();
    };

    // 05. 组织数据，进行存储
    var funcCollectData = function() { console.log('here1');
        // loop查看当前的mesh.xml配置里是否有多色配置项
        var hasMultiMaterial = false; // 是否多色的标识位
        for (var key in element['$']) {
            if (!element['$'].hasOwnProperty(key)) {
                continue;
            }
            var match = key.match(/sub-material-name-(\d+)/);
            if (match !== null) {
                hasMultiMaterial = true;
                funcProcessData(match[1], element['$'][key].substr(0, element['$'][key].indexOf('.')));
            }
        }
        if (!hasMultiMaterial) { // 表示当前服装为单色，给默认配置
            funcProcessData(1, material);
        }
    };

    var funcProcessData = function(colId, colUpkId) { console.log('here2');
        var col = 'col' + colId;
        var pk = parsedCode['codeWithRace'] + '_' + col;

        var data = {
            "skeleton": skeleton,
            "texture": texture,
            "material": colUpkId,
            "col1Material": material,
            "col": col,
            "codeWithRace": parsedCode['codeWithRace'],
            "code": parsedCode['code'],
            "race": parsedCode['race'],
            "name": element['$']['name'],
            "pic": null,
            "piclink": null,
            "link": null
        };

        // 如果找到从17173上抓取的数据的话
        var crawledData = self.utilSearchCrawledData(parsedCode, col);
        if (crawledData !== null) {
            data['name'] = crawledData['name'];
            data['pic'] = crawledData['pic'];
            data['piclink'] = crawledData['piclink'];
            data['link'] = crawledData['link'];
        }

        self.tmpData[parsedCode['race']][pk] = data;
        funcSaveCollectedData();
    };

    var funcSaveCollectedData = function() { console.log('here3');
        if (index == (list.length - 1)) {
            // 当前处理完的元素已经是最后一个了，存储数据
            var dataFilePath = './database/costume/' + self.part + '/data.json'; // 使用grunt的write API，所以需要相对于Gruntfile.js的路径
            self.util.printHr();
            self.grunt.log.writeln('[BstMeshParser] All parsing done, start to save file: ' + dataFilePath);
            self.util.writeFile(dataFilePath, JSON.stringify(self.tmpData, null, 4));
            self.util.printHr();
            self.grunt.log.writeln('[BstMeshParser] All "' + self.part + '" mesh xml parsed.');
        }
    };
};

BstMeshParser.prototype.processFace = function() {

};

BstMeshParser.prototype.processHair = function() {

};

BstMeshParser.prototype.utilParseRawCode = function(rawCode) {
    rawCode = this.util.formatRawCode(rawCode);

    var match = rawCode.match(/\d+_(KunN|JinF|JinM|GonF|GonM|LynF|LynM)/);

    if (match === null) {
        return null;
    }

    var codeWithRace = match[0]; // 40013_GonM
    var code = codeWithRace.substr(0, codeWithRace.indexOf('_')); // 40013
    var race = match[1]; // GonM

    return {
        "codeWithRace": codeWithRace,
        "code": code,
        "race": race
    };
};

BstMeshParser.prototype.utilSearchCrawledData = function(parsedCode, col) { // col => col1 | col2 ...
    var searched;

    // 完全匹配格式：40013_GonM_col1 || 40013_col1_GonM
    searched = _.find(this.crawledData, function(element, key) {
        return (
            key.match(new RegExp(parsedCode['codeWithRace'] + '_' + col)) !== null
            || key.match(new RegExp(parsedCode['code'] + '_' + col + '_' + parsedCode['race'])) !== null
        );
    });
    if (searched !== undefined) { return searched; }

    // 种族不匹配格式：40013_(.*)_col1 || 40013_col1
    searched = _.find(this.crawledData, function(element, key) {
        return (
            key.match(new RegExp(parsedCode['code'] + '_(.*)_' + col)) !== null
                || key.match(new RegExp(parsedCode['code'] + '_' + col)) !== null
            );
    });
    if (searched !== undefined) { return searched; }

    // 色指定不匹配：40013_GonM || 40013_(.*)_GonM
    searched = _.find(this.crawledData, function(element, key) {
        return (
            key.match(new RegExp(parsedCode['codeWithRace'] + '_' + col)) !== null
                || key.match(new RegExp(parsedCode['code'] + '_' + col + '_' + parsedCode['race'])) !== null
            );
    });
    if (searched !== undefined) { return searched; }

    // 种族 & 色指定都不匹配：40013
    searched = _.find(this.crawledData, function(element, key) {
        return key.match(new RegExp(parsedCode['code']));
    });
    if (searched !== undefined) { return searched; }

    return null; // 什么都没找到
};

module.exports = BstMeshParser;