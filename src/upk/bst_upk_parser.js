"use strict";

const path = require('path');
const xml2js = require('xml2js');

/**
 * @type {BstUtil|exports}
 */
const BstUtil = require('../util/bst_util.js');
/**
 * @type {BstConst|exports}
 */
const BstConst = require('../const/bst_const.js');

var BstUpkParser = function(grunt, done) {
    this.grunt    = grunt;
    this.util     = new BstUtil(grunt);
    this.parser   = new xml2js.Parser();
    this.taskDone = done; // notify grunt: tasks done

    this.meshXml = [];

    this.upkIdsSkeleton = [];
    this.upkIdsTexture = [];
    this.upkIdsMaterial = [];

    this.upkIdsRescanMaterial = [];

    this.upkSkeletonTypes = {}; // { upkId: "costume", upkId: "attach", upkId: "weapon", ... }
    this.upkIdsLines = {};

    /**
     * {
     *     "65045_JinF_col1": {
     *         "skeleton": "00010868",
     *         "texture": "00010866",
     *         "material": "00010867",
     *         "col1Material": "00010867",
     *         "col": "col1",
     *         "core": "65045_JinF",
     *         "code": "65045",
     *         "race": "JinF",
     *         "pic": "costume_65045_JinM_col2.png",
     *      },
     *      ...
     * }
     */
    this.db = {
        "costume": {},
        "attach": {},
        "weapon": {}
    };
    /**
     * {
     *     "65045": {
     *         "code": "65045",
     *         "notFound": ["skeleton", "texture", "material"],
     *         "invalid": ["skeleton", "material"]
     *     }
     * }
     */
    this.dbInvalid = {
        "costume": {},
        "attach": {},
        "weapon": {}
    };

    /**
     * {
     *     "010051": {
     *         "code": "010051",
     *         "races": [JinM, JinF, ...], // 当前code能找到的所有race信息
     *         "col": ["col1", "col2"], // 当前code能找到的所有col信息
     *         "colIcons": {
     *             "GonM_col1": "Attach_010022_GonM_col1.png", // 有带种族信息的话，完整放入一份，然后再在colX里也放一份
     *             "GonM_col2": "Attach_010022_GonM_col2.png",
     *             "col1": ["Attach_010022_GonM_col1.png", ...],
     *             "col2": ["Attach_010022_GonM_col2.png", ...],
     *             "GonM": "Attach_010022_GonM.png" // 这张图片其实并不存在，这里仅举例
     *         } // 首先选择种族、col都符合的，其次选择符合col的、再次选择符合种族的
     *     },
     *     ...
     * }
     */
    this.iconData = {
        "costume": {},
        "attach": {},
        "weapon": {}
    };
    /**
     * {
     *     "Attach_010002_JInM_col1": {
     *         "filename": "Attach_010002_JInM_col1",
     *         "notFound": ["code", "race", "col"]
     *     }
     * }
     */
    this.iconDataInvalid = {
        "costume": {},
        "attach": {},
        "weapon": {}
    };

    /**
     * {
     *    "00010868": {
     *         "upkId": "00010868",
     *         "code": "65045",
     *         "core": "65045_JinF", // Loading SkeletalMesh3 JinF_043 from package 00019951.upk => JinF_043
     *         "race": "JinF",
     *         "col1Material": "00010867",
     *         "texture": "00010866",
     *         "textureObjs": ["65045_JinF_N", "65045_JinF_M", "65045_JinF_D", "65045_JinF_S"],
     *     },
     *     ...
     * }
     */
    this.upkDataSkeleton = {};
    /**
     * {
     *     "00021612": {
     *         "upkId": "00021612",
     *         "notFound": ["texture", "col1Material"]
     *         "invalid": {
     *             "col1Material": "Acc_990097_GuardianShield_INST"
     *         }
     *     },
     *     ...
     * }
     */
    this.upkDataSkeletonInvalid = {};

    /**
     * {
     *     "00010866": {
     *         "upkId": "00010866",
     *         "objs": [
     *             "65045_JinF_D", "65045_JinF_M", "65045_JinF_N", "65045_JinF_S",
     *             "65045_JinF_col2_D", "65045_JinF_col2_M", "65045_JinF_col2_N", "65045_JinF_col2_S"
     *         ],
     *         "materials": {"col1": "00010867", "col2": "00019801"}
     *     },
     *     ...
     * }
     */
    this.upkDataTexture = {};

    /**
     * {
     *     "00010867": {
     *         "upkId": "00010867",
     *         "col": "col1",
     *         "texture": "00010866",
     *         "objs": ["65045_JinF_N", "65045_JinF_M", "65045_JinF_D", "65045_JinF_S"]
     *     },
     *     "00019801": {
     *         "upkId": "00019801",
     *         "col": "col2",
     *         "texture": "00010866",
     *         "objs": ["65045_JinF_col2_N", "65045_JinF_col2_M", "65045_JinF_col2_D", "65045_JinF_col2_S"]
     *     }
     * }
     */
    this.upkDataMaterial = {};
    /**
     * {
     *     "00021612": {
     *         "upkId": "00021612",
     *         "notFound": ["texture", "col"]
     *         "invalid": {
     *             "col": "Acc_990097_GuardianShield_INST"
     *         },
     *         "noTexture": "00021611"
     *     },
     *     ...
     * }
     */
    this.upkDataMaterialInvalid = {};

    /**
     * 06.根据icon滤出来的列表，搜集信息，制作database，结构：
     * 武器等可能不同
     */
};

BstUpkParser.prototype.start = function() {
    const self = this;

    self.util.printHr();
    self.grunt.log.writeln('[BstUpkParser] Start to parse upk files ...');
    self.util.printHr();

    let meshData = self.util.readFile(BstConst.PATH_MESH_XML);
    self.parser.parseString(meshData, function(err, result) {
        if (err) {
            self.grunt.fail.fatal('[BstUpkParser] Error in parsing mesh.xml: ' + err.stack);
        }
        self.meshXml = result['table']['record'];
        self.grunt.log.writeln('[BstUpkParser] mesh.xml parsed, "' + self.meshXml.length + '" lines of records read.');

        self.preProcessIcon();

        self.preProcess(); // 准备list & raw数据，参考：database/upk/data/[list | raw]/*

        self.preProcessSkeleton();
        self.preProcessTexture();
        self.preProcessMaterial();

        self.buildDatabase();

        self.taskDone();
    });
};

BstUpkParser.prototype.preProcess = function() {
    const self = this;

    let upkListSkeletonCostume = {};
    let upkListSkeletonAttach = {};
    let upkListSkeletonWeapon = {};
    let upkListSkeletonUnrecognized = {};
    let upkListTexture = {};
    let upkListMaterial = {};
    let upkListUnrecognized = {};

    self.grunt.log.writeln('[BstUpkParser] Pre process, prepare list data ...');
    self.util.printHr();

    self.grunt.file.recurse(BstConst.PATH_UPK_LOG, function(abspath, rootdir, subdir, filename) {
        if (filename === 'upk_dir') {
            return; // 忽略占位文件
        }
        let upkId = filename.substr(0, filename.indexOf('.'));
        let upkLog = self.util.readFileSplitWithLineBreak(abspath);

        for (const textLine of upkLog) {
            const line = textLine.trim();

            if (line.match(BstConst.UPK_TYPE_SKELETON_MATCHER) !== null) {
                self.upkIdsLines[upkId] = line;

                // skeleton
                let skeletonType = self.utilRecognizeSkeletonType(upkId, upkLog);
                
                if (skeletonType == BstConst.PART_TYPE_COSTUME) {
                    // costume
                    self.upkIdsSkeleton.push(upkId);
                    self.upkSkeletonTypes[upkId] = BstConst.PART_TYPE_COSTUME;
                    upkListSkeletonCostume[upkId] = line;
                } else if (skeletonType == BstConst.PART_TYPE_ATTACH) {
                    // attach
                    self.upkIdsSkeleton.push(upkId);
                    self.upkSkeletonTypes[upkId] = BstConst.PART_TYPE_ATTACH;
                    upkListSkeletonAttach[upkId] = line;
                } else if (skeletonType == BstConst.PART_TYPE_WEAPON) {
                    // weapon
                    self.upkIdsSkeleton.push(upkId);
                    self.upkSkeletonTypes[upkId] = BstConst.PART_TYPE_WEAPON;
                    upkListSkeletonWeapon[upkId] = line;
                } else {
                    // unrecognized
                    upkListSkeletonUnrecognized[upkId] = line;
                }
                return;
            } else if (line.match(BstConst.UPK_TYPE_TEXTURE_MATCHER) !== null) {
                // texture
                self.upkIdsLines[upkId] = line;
                self.upkIdsTexture.push(upkId);
                upkListTexture[upkId] = line;
                return;
            } else if (line.match(BstConst.UPK_TYPE_MATERIAL_MATCHER) !== null) {
                // material
                self.upkIdsLines[upkId] = line;
                self.upkIdsMaterial.push(upkId);
                upkListMaterial[upkId] = line;
                return;
            } else {
                // unrecognized
                //upkListUnrecognized[upkId] = coreLineOfContent;
            }
        }
    });

    // 为 buildDatabase 阶段预先准备好需要扫描的材质 upkIds 列表
    self.upkIdsRescanMaterial = Object.keys(upkListSkeletonUnrecognized) // 未能辨认的骨骼upkIds
        .concat(Object.keys(upkListUnrecognized)) // 未能辨认的骨骼upkIds
        .concat(Object.keys(upkListMaterial)); // 所有的材质upkIds

    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_LIST, BstConst.LIST_FILE_SKELETON_COSTUME), self.util.formatJson(upkListSkeletonCostume));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_LIST, BstConst.LIST_FILE_SKELETON_ATTACH), self.util.formatJson(upkListSkeletonAttach));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_LIST, BstConst.LIST_FILE_SKELETON_WEAPON), self.util.formatJson(upkListSkeletonWeapon));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_LIST, BstConst.LIST_FILE_SKELETON_UNRECOGNIZED), self.util.formatJson(upkListSkeletonUnrecognized));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_LIST, BstConst.LIST_FILE_TEXTURE), self.util.formatJson(upkListTexture));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_LIST, BstConst.LIST_FILE_MATERIAL), self.util.formatJson(upkListMaterial));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_LIST, BstConst.LIST_FILE_UNRECOGNIZED), self.util.formatJson(upkListUnrecognized));
    self.util.printHr();

};

BstUpkParser.prototype.preProcessIcon = function() {
    const self = this;

    self.grunt.log.writeln('[BstUpkParser] Pre process icon files ...');
    self.util.printHr();

    self.grunt.file.recurse(BstConst.PATH_ICON_PNG, function(abspath, rootdir, subdir, filename) {
        let iconType = null;
        if (filename.match(/^attach.+/i)) {
            iconType = 'attach';
        } else if (filename.match(/^costume.+/i)) {
            iconType = 'costume';
        } else if (filename.match(/^weapon.+/i)) {
            iconType = 'weapon';
        } else {
            return; // 不是我们需要的icon，直接忽略
        }

        if (filename.match(/_\d+.png$/)) {
            return; // 当前icon文件是..._2.png这样的格式，这种格式一般是无意义的，忽略
        }

        // 准备数据
        let code = filename.match(/(\d+)/);
        if (code !== null) {
            code = code[1];
        } else {
            self.utilBuildIconInvalidInfo(iconType, filename);
            self.iconDataInvalid[iconType][filename]["notFound"].push('code');
            self.grunt.log.error('[BstUpkParser] Code not found in icon filename: ' + filename);
        }

        let race = filename.match(/(KunN|JinF|JinM|GonF|GonM|LynF|LynM|All)/i);
        if (race !== null) {
            race = self.util.formatRawCode(race[1]); // 转换大小写
        } else if (iconType !== 'weapon') { // 武器肯定是没有race信息的
            self.utilBuildIconInvalidInfo(iconType, filename);
            self.iconDataInvalid[iconType][filename]["notFound"].push('race');
            self.grunt.log.error('[BstUpkParser] Race not found in icon filename: ' + filename);
        }

        let col = filename.match(/(col\d+)/i);
        if (col !== null) {
            col = self.util.formatCol(col[1]);
        } else {
            self.utilBuildIconInvalidInfo(iconType, filename);
            self.iconDataInvalid[iconType][filename]["notFound"].push('col');
            self.grunt.log.error('[BstUpkParser] Col not found in icon filename: ' + filename);
        }

        if (code === null) {
            return; // 连code都没有的icon无法辨识，忽略
        }

        // 开始处理最终存储数据
        let iconData = null;
        if (self.iconData[iconType].hasOwnProperty(code)) {
            iconData = self.iconData[iconType][code];
        } else {
            iconData = {
                "code": code,
                "races": [],
                "col": [],
                "colIcons": {}
            };
        }
        if (race !== null && iconData['races'].indexOf(race) === -1) {
            iconData['races'].push(race);
        }
        if (col !== null && iconData['col'].indexOf(col) === -1) {
            iconData['col'].push(col);
        }
        // 处理带种族的icon数据
        if (race !== null && col !== null) {
            let iconKey = race + '_' + col;
            if (!iconData['colIcons'].hasOwnProperty(iconKey)) {
                iconData['colIcons'][iconKey] = filename;
            }
        }
        // 处理col的icon数据
        if (col !== null && !iconData['colIcons'].hasOwnProperty(col)) {
            iconData['colIcons'][col] = [];
        }
        if (col !== null && iconData['colIcons'][col].indexOf(filename) === -1) {
            iconData['colIcons'][col].push(filename);
        }
        // 处理race的icon数据
        if (race !== null && !iconData['colIcons'].hasOwnProperty(race)) {
            iconData['colIcons'][race] = filename;
        }
        // 处理洪门道服的icon，因为洪门道服的默认icon是"costume_startzone_jeja.png"，格式不是标准格式，需要特殊处理
        if (code === '60054') {
            let startzoneJejaIconName = 'costume_startzone_jeja.png';
            if (!iconData['colIcons'].hasOwnProperty('All_col1')) {
                iconData['colIcons']['All_col1'] = startzoneJejaIconName;
            }
            if (!iconData['colIcons'].hasOwnProperty('All')) {
                iconData['colIcons']['All'] = startzoneJejaIconName;
            }
            if (!iconData['colIcons'].hasOwnProperty('col1')) {
                iconData['colIcons']['col1'] = [startzoneJejaIconName];
            } else if (iconData['colIcons'].hasOwnProperty('col1')
                && iconData['colIcons']['col1'].indexOf(startzoneJejaIconName) === -1) {
                iconData['colIcons']['col1'].push(startzoneJejaIconName);
            }
        }

        // 重新赋值回去
        self.iconData[iconType][code] = iconData;

        self.grunt.log.writeln('[BstUpkParser] Pre process icon file: ' + filename + ' done');
        self.util.printHr();
    });

    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_RAW, BstConst.RAW_FILE_ICON), self.util.formatJson(self.iconData));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_RAW, BstConst.RAW_FILE_ICON_INVALID), self.util.formatJson(self.iconDataInvalid));
};

BstUpkParser.prototype.preProcessSkeleton = function() {
    const self = this;

    self.grunt.log.writeln('[BstUpkParser] Pre process skeleton upk data ...');
    self.util.printHr();

    if (self.upkIdsSkeleton.length == 0) {
        return;
    }

    let finishedCount = 0;

    for (const upkId of self.upkIdsSkeleton) {
        self.grunt.log.writeln('[BstUpkParser] Pre process skeleton upk: ' + upkId);

        let upkLog = self.util.readFileSplitWithLineBreak(path.join(BstConst.PATH_UPK_LOG, upkId + '.log'));

        /**
         * ClassName: SkeletalMesh3 ObjectName: 65045_JinF => 65045_JinF
         * ClassName: SkeletalMesh3 ObjectName: 990031_autoscale => 990031_autoscale
         * ClassName: SkeletalMesh3 ObjectName: JinF_043 => JinF_043
         */
        let core = self.upkIdsLines[upkId].match(/ClassName:\sSkeletalMesh3\sObjectName:\s(.+)/)[1];
        let code = core.match(/(\d+)/);
        if (code !== null) {
            code = code[1];
        } else {
            self.utilBuildSkeletonInvalidInfo(upkId);
            self.upkDataSkeletonInvalid[upkId]['notFound'].push('code');
            self.grunt.log.error('[BstUpkParser] Code not found in skeleton upk data: ' + upkId);
        }

        let race = core.match(/(KunN|JinF|JinM|GonF|GonM|LynF|LynM)/i);
        if (race !== null) {
            race = self.util.formatRawCode(race[1]); // 转换大小写
        } else {
            if (core.match(/\d+_Autoscale/i) !== null
                || self.upkIdsLines[upkId].match( /ClassName:\sSkeletalMesh3\sObjectName:\s(.+)/) !== null) {
                // 是武器upk，core信息里不包含race，正常
            } else {
                self.utilBuildSkeletonInvalidInfo(upkId);
                self.upkDataSkeletonInvalid[upkId]['notFound'].push('race');
                self.grunt.log.error('[BstUpkParser] Race not found in skeleton upk data: ' + upkId);
            }
        }

        let col1Material = null;
        for (const line of upkLog) {
            let colMatch = line.match(/Loading\sMaterialInstanceConstant\s(.+)\sfrom\spackage\s(\d+).upk/);
            if (colMatch !== null && col1Material === null) { // 只记录第一个出现的MaterialInstanceConstant的col id信息
                let colInfo = self.util.formatCol(colMatch[1]);
                col1Material = colMatch[2];
                if (colInfo.match(/col\d+/) === null) { // 会有很多情况下col信息是一个非"colX"的格式，这里我们仅打日志，不做处理
                    /**
                     * UPDATE: 这里不再打log，应该可以在后续应用的时候进行处理
                     * self.utilBuildSkeletonInvalidInfo(upkId);
                     * self.upkDataSkeletonInvalid[upkId]['invalid']['col1Material'] = colInfo;
                     * self.grunt.log.error('[BstUpkParser] Material info got with invalid format: ' + colInfo);
                     */
                }
            }
        }

        let textureId = null; // 真正的贴图upk的id
        let textureObjs = {}; // upkId => [object, object, ...]
        for (const line of upkLog) {
            let textureMatch = line.match(/Loading\sTexture2D\s(.+)\sfrom\spackage\s(\d+).upk/);
            if (textureMatch !== null) {
                let textureObjId = textureMatch[1];
                let textureUpkId = textureMatch[2];
                if (textureId === null // 只记录第一个出现的Texture2D的upk id
                    && BstConst.UPK_INVALID_TEXTURE_UPK_IDS.indexOf(textureUpkId) === -1) { // 且该upk id并不在黑名单上
                    textureId = textureUpkId;
                }
                if (!textureObjs.hasOwnProperty(textureUpkId)) {
                    textureObjs[textureUpkId] = [];
                }
                textureObjs[textureUpkId].push(textureObjId);
            }
        }
        textureObjs = textureObjs[textureId]; // 取出真正的贴图upk的objs

        if (col1Material === null && textureId === null) {
            // 材质和贴图都没有找到，说明该upk解析出错，尝试从mesh.xml里查找数据进行修复
            let element = self.utilSearchMeshXmlViaSkeletonId(upkId);
            // 查找该条mesh.xml数据中有没有col1Material材质配置，注意：这里我们只需要col1
            if (element !== null && element['$'].hasOwnProperty('sub-material-name-1')) {
                /**
                 * 一般来说 sub-material-name-x 字段里的内容都是工整的：00017534.col14 这样的格式
                 * 但是也会有例外：
                 * 00014113.Cloth_60018_JinM_col1.col11
                 * 00019714.col1_Fur
                 * 00010543.Col3
                 * INTRO_PK.DochunPung_Wet_INST
                 * 60002_GonM_col3
                 * 这样奇怪的格式，所以这里要处理
                 */
                let split = element['$']['sub-material-name-1'].split('.');
                let splitMaterialUpkId = null; // 解析出来的upk文件名

                if (split.length >= 2 // 字段个数必须大于等于2，否则非法，e.g 60002_GonM_col3
                    && split[0].match(/\d+/) !== null) { // 第一段理论上应该是upk id，如果不是，也非法，e.g INTRO_PK.DochunPung_Wet_INST
                    splitMaterialUpkId = split[0];
                }

                let splitTextureUpkId = null;
                let splitTextureObjs = {};
                if (splitMaterialUpkId !== null) {
                    // 这里我们还是不知道texture的upk id，mesh.xml里没有描述贴图信息，需要分析刚才解析出来的material upk log
                    let materialUpkLog = self.util.readFileSplitWithLineBreak(path.join(BstConst.PATH_UPK_LOG, splitMaterialUpkId + '.log'));
                    for (const line of materialUpkLog) {
                        let textureMatch = line.match(/Loading\sTexture2D\s(.+)\sfrom\spackage\s(\d+).upk/);
                        if (textureMatch !== null) {
                            let textureObjId = textureMatch[1];
                            let textureUpkId = textureMatch[2];
                            if (splitTextureUpkId === null // 只记录第一个出现的Texture2D的upk id
                                && BstConst.UPK_INVALID_TEXTURE_UPK_IDS.indexOf(textureUpkId) === -1) { // 且该upk id并不在黑名单上
                                splitTextureUpkId = textureUpkId;
                            }
                            if (!splitTextureObjs.hasOwnProperty(textureUpkId)) {
                                splitTextureObjs[textureUpkId] = [];
                            }
                            splitTextureObjs[textureUpkId].push(textureObjId);
                        }
                    }
                }

                if (splitMaterialUpkId !== null && splitTextureUpkId !== null) {
                    // 说明我们的补救数据都到位了
                    col1Material = splitMaterialUpkId;
                    textureId = splitTextureUpkId;
                    textureObjs = splitTextureObjs;
                }
            }
        }
        // 在mesh.xml补救之后再检查col1Material和textureId
        if (col1Material === null) {
            self.utilBuildSkeletonInvalidInfo(upkId);
            self.upkDataSkeletonInvalid[upkId]['notFound'].push('col1Material');
            self.grunt.log.error('[BstUpkParser] Material info not found in skeleton upk data: ' + upkId);
        }
        if (textureId === null) {
            self.utilBuildSkeletonInvalidInfo(upkId);
            self.upkDataSkeletonInvalid[upkId]['notFound'].push('texture');
            self.grunt.log.error('[BstUpkParser] Texture info not found in skeleton upk data: ' + upkId);
        }

        self.upkDataSkeleton[upkId] = {
            "upkId": upkId,
            "code": code,
            "core": core,
            "race": race,
            "col1Material": col1Material,
            "texture": textureId,
            "textureObjs": textureObjs
        };
        finishedCount++;

        self.grunt.log.writeln('[BstUpkParser] Pre process skeleton upk: ' + upkId + ' done, progress: ' +
            finishedCount + ' / ' + self.upkIdsSkeleton.length);
        self.util.printHr();
    }

    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_RAW, BstConst.RAW_FILE_SKELETON), self.util.formatJson(self.upkDataSkeleton));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_RAW, BstConst.RAW_FILE_SKELETON_INVALID), self.util.formatJson(self.upkDataSkeletonInvalid));
};

BstUpkParser.prototype.preProcessTexture = function() {
    const self = this;

    self.grunt.log.writeln('[BstUpkParser] Pre process texture upk data ...');
    self.util.printHr();

    if (self.upkIdsTexture.length == 0) {
        return;
    }

    let finishedCount = 0;

    for (const upkId of self.upkIdsTexture) {
        self.grunt.log.writeln('[BstUpkParser] Pre process skeleton upk: ' + upkId);

        let upkLog = self.util.readFileSplitWithLineBreak(path.join(BstConst.PATH_UPK_LOG, upkId + '.log'));

        let objs = [];
        for (const line of upkLog) {
            let textureMatch = line.match(/Loading\sTexture2D\s(.+)\sfrom\spackage\s\d+.upk/);
            if (textureMatch !== null) {
                objs.push(textureMatch[1]);
            }
        }
        if (objs.length == 0) {
            self.grunt.log.error('[BstUpkParser] Texture objs not found in texture upk data: ' + upkId);
        }

        self.upkDataTexture[upkId] = {
            "upkId": upkId,
            "objs": objs,
            "materials": {}
        };
        finishedCount++;

        self.grunt.log.writeln('[BstUpkParser] Pre process texture upk: ' + upkId + ' done, progress: ' +
            finishedCount + ' / ' + self.upkIdsTexture.length);
        self.util.printHr();
    }

    // 不要在这里写入文件，因为我们还没收集到material信息，需要在material那步收集
};

BstUpkParser.prototype.preProcessMaterial = function() {
    const self = this;

    self.grunt.log.writeln('[BstUpkParser] Pre process material upk data ...');
    self.util.printHr();

    if (self.upkIdsMaterial.length == 0) {
        return;
    }

    let finishedCount = 0;

    for (const upkId of self.upkIdsMaterial) {
        self.grunt.log.writeln('[BstUpkParser] Pre process material upk: ' + upkId);

        let colInfo = null; // 材质upk的col id
        let textureId = null; // 真正的贴图upk的id
        let textureObjs = {}; // upkId => [object, object, ...]
        let textureKeys = [];

        if (BstConst.UPK_PRE_DEFINED_MATERIAL_INFO.hasOwnProperty(upkId)) {
            // 找到预设的特例数值
            let info = BstConst.UPK_PRE_DEFINED_MATERIAL_INFO[upkId];
            colInfo = info['col'];
            textureId = info['texture'];
            textureObjs = info['objs'];
        } else {
            // 没有预设的数据，自行查找
            let upkLog = self.util.readFileSplitWithLineBreak(path.join(BstConst.PATH_UPK_LOG, upkId + '.log'));

            colInfo = self.util.formatCol( // 先读取核心行的数据，查找colInfo
                self.upkIdsLines[upkId].match(/ClassName:\sMaterialInstanceConstant\sObjectName:\s(.+)/)[1]
            );
            // 会有很多情况下核心col信息是一个非"colX"的格式，循环查询后续的行内容，直到找到我们要的内容
            // There will be many cases where the core col information is in a format other than "colX", and the content of the subsequent rows is cyclically queried until the content we want is found
            if (colInfo.match(/^col\d$/) === null) { 
                for (const line of upkLog) {
                    let coreMatch = line.match(/Loading\sMaterialInstanceConstant\s(.+)\sfrom\spackage\s\d+.upk/);
                    if (coreMatch !== null && self.util.formatCol(coreMatch[1]).match(/^col\d$/) !== null) {
                        colInfo = self.util.formatCol(coreMatch[1]);
                    }
                }
            }
            if (colInfo.match(/^col\d$/) === null) {
                self.grunt.log.writeln('[BstUpkParser] Skipping material, invalid col: ' + colInfo);
            } else {
                for (const line of upkLog) {
                    let textureMatch = line.match(/Loading\sTexture2D\s(.+)\sfrom\spackage\s(\d+).upk/);
                    if (textureMatch !== null) {
                        let textureObjId = textureMatch[1];
                        let textureUpkId = textureMatch[2];

                        if (textureId === null // 只记录第一个出现的Texture2D的upk id
                            && BstConst.UPK_INVALID_TEXTURE_UPK_IDS.indexOf(textureUpkId) === -1) { // 且该upk id并不在黑名单上
                            textureId = textureUpkId;
                        }
                        if (!textureObjs.hasOwnProperty(textureUpkId)) {
                            textureKeys.push(textureUpkId);
                            textureObjs[textureUpkId] = [];
                        }
                        textureObjs[textureUpkId].push(textureObjId);
                    }
                }
                if (textureId === null) {
                    // 查找是否有某个skeleton在使用当前的material upk，如果找到，才记录错误信息
                    let foundMaterialUsage = false;
                    for (const element of Object.values(self.upkDataSkeleton)) {
                        if (element['col1Material'] == upkId) {
                            foundMaterialUsage = true;
                        }
                    }
                    if (foundMaterialUsage) {
                        self.utilBuildMaterialInvalidInfo(upkId);
                        self.upkDataMaterialInvalid[upkId]['notFound'].push('texture');
                        self.grunt.log.error('[BstUpkParser] Texture info not found in material upk data: ' + upkId);
                    }
                }
            }
        }

        if (textureId) {
            let added = false;

            for (const key of textureKeys) {
                if (key && self.upkDataTexture.hasOwnProperty(key)) {
                    added = true;

                    // 同时为对应的texture数据添加material信息
                    self.upkDataTexture[key]['materials'][colInfo] = upkId;

                    self.upkDataMaterial[upkId] = {
                        "upkId": upkId,
                        "col": colInfo,
                        "texture": key,
                        "objs": textureObjs[key]
                    };
                }
            }

            if (!added) {
                // 没有找到对应的texture数据
                self.utilBuildMaterialInvalidInfo(upkId);
                self.upkDataMaterialInvalid[upkId]['noTexture'] = textureId;
                self.grunt.log.error('[BstUpkParser] Corresponding texture data of upk "' + textureId + '" not found, material upk: ' + upkId);
            }
        }
        finishedCount++;

        self.grunt.log.writeln('[BstUpkParser] Pre process material upk: ' + upkId + ' done, progress: ' +
            finishedCount + ' / ' + self.upkIdsMaterial.length);
        self.util.printHr();
    }

    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_RAW, BstConst.RAW_FILE_TEXTURE), self.util.formatJson(self.upkDataTexture));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_RAW, BstConst.RAW_FILE_MATERIAL), self.util.formatJson(self.upkDataMaterial));
    self.util.writeFile(path.join(BstConst.PATH_UPK_DATA_RAW, BstConst.RAW_FILE_MATERIAL_INVALID), self.util.formatJson(self.upkDataMaterialInvalid));
};

BstUpkParser.prototype.buildDatabase = function() {
    const self = this;

    self.grunt.log.writeln('[BstUpkParser] Start to build database ...');
    self.util.printHr();

    let totalCount = Object.keys(self.upkDataSkeleton).length;
    let finishedCount = 0;

    // 循环构造数据
    for (const [skeletonKey, skeletonData] of Object.entries(self.upkDataSkeleton)) {
        self.buildData(skeletonKey, skeletonData);
        finishedCount++;
        self.grunt.log.writeln('[BstUpkParser] Finish data build of skeleton: ' + skeletonKey +
            ', progress: ' + finishedCount + ' / ' + totalCount);
        self.util.printHr();
    }

    function sortObj(unordered) {
        return Object.keys(unordered).sort().reduce(
            (obj, key) => { 
                obj[key] = unordered[key]; 
                return obj;
            }, 
            {}
        );
    }

    // 写入数据
    for (const type of BstConst.PART_TYPES) {
        self.util.writeFile(path.join(BstConst.PATH_DATABASE, type, 'data', 'data.json'), self.util.formatJson(sortObj(self.db[type])));
        self.util.writeFile(path.join(BstConst.PATH_DATABASE, type, 'data', 'data_invalid.json'), self.util.formatJson(sortObj(self.dbInvalid[type])));
        self.grunt.log.writeln('[BstUpkParser] Database build of ' + type + ' done ...');
    }

    self.grunt.log.writeln('[BstUpkParser] Database build all done ...');
    self.util.printHr();
};

BstUpkParser.prototype.buildData = function(skeletonKey, skeletonData) {
    const self = this;

    let skeletonId = skeletonData['upkId'];
    let skeletonCode = skeletonData['code'];
    let skeletonType = self.upkSkeletonTypes[skeletonId];

    // 查找对应code的icon数据
    let iconData = null;
    for (const typeName of BstConst.PART_TYPES) {
        if (self.iconData[typeName].hasOwnProperty(skeletonCode)) {
            iconData = { ...self.iconData[typeName][skeletonCode]};
        }
    }
    if (iconData === null
        && skeletonCode.match(/^\d{3}$/) === null) { // 3位数字类型的code一般是默认头发等没有icon的模型
        // 没有找到icon数据集，记录日志
        /**
         * UPDATE: 这里不再打log，日志过多
         * self.utilBuildDataInvalidInfo(skeletonType, skeletonCode);
         * self.dbInvalid[skeletonType][skeletonCode]['notFound'].push('pic:[skeleton:' + skeletonId + ']');
         * self.grunt.log.error('[BstUpkParser] Icon pic has not been found, code: ' + skeletonCode + ', skeleton: ' + skeletonId);
         */
    }

    // 根据skeleton数据，获得texture数据
    let textureId = skeletonData['texture'];
    let textureData = null;
    if (self.upkDataTexture.hasOwnProperty(textureId)) {
        textureData = self.upkDataTexture[textureId];
    } else if (BstConst.UPK_PRE_DEFINED_TEXTURE_INFO.hasOwnProperty(textureId)) {
        // 检查预设的贴图数据，目标贴图数据存在的话，直接赋予
        textureData = BstConst.UPK_PRE_DEFINED_TEXTURE_INFO[textureId];
    } else {
        self.utilBuildDataInvalidInfo(skeletonType, skeletonCode);
        self.dbInvalid[skeletonType][skeletonCode]['notFound'].push('texture:[skeleton:' + skeletonId + ',texture:' + textureId + ']');
        self.grunt.log.error('[BstUpkParser] Texture data not found, code: ' + skeletonCode +
            ', skeleton: ' + skeletonId + ', texture: ' + textureId);
        return; // 这个skeleton没必要处理下去了，因为缺失texture
    }

    if (Object.keys(textureData['materials']).length == 0) {
        // 仍旧没有找到贴图对应的材质upk信息
        self.utilBuildDataInvalidInfo(skeletonType, skeletonCode);
        self.dbInvalid[skeletonType][skeletonCode]['invalid'].push('texture:[skeleton:' + skeletonId + ',texture:' + textureId + ']');
        self.grunt.log.warn('[BstUpkParser] Texture has no materials data, code: ' + skeletonCode +
            ', skeleton: ' + skeletonId + ', texture: ' + textureId);
        return; // 当前的texture没有对应的material
    }

    // 根据texture数据，获得相关的materials列表和数据
    let materials = textureData['materials']; // { colX : upkId, ... }

    // 组装数据
    for (const [col, materialId] of Object.entries(materials)) { // 轮询所有的materials数据
        // 检查material数据
        if (self.upkDataMaterialInvalid.hasOwnProperty(materialId)
            && self.upkDataMaterialInvalid[materialId]['notFound'].length === 0 // 没有未找到信息错误
            && Object.keys(self.upkDataMaterialInvalid[materialId]['invalid']).length === 0 // 没有不合法元素错误
            && self.upkDataMaterialInvalid[materialId]['noTexture'] == textureId) { // 贴图信息没找到错误
            // 这里不需要处理错误，因为能跑到这里，说明上面的贴图数据肯定已经找到了，所以贴图没找到的错误可以忽略
        } else if (self.upkDataMaterialInvalid.hasOwnProperty(materialId)) {
            self.utilBuildDataInvalidInfo(skeletonType, skeletonCode);
            self.dbInvalid[skeletonType][skeletonCode]['invalid'].push('material:[skeleton:' + skeletonId + ',texture:' + textureId + ',material:' + materialId + ']');
            self.grunt.log.error('[BstUpkParser] Material has invalid data, code: ' + skeletonCode +
                ', skeleton: ' + skeletonId + ', texture: ' + textureId + ', material: ' + materialId);
            return; // 当前的material有错误数据
        }

        // 选取图片
        let pic = null;
        if (iconData !== null) {
            let icons = iconData['colIcons'];
            if (icons.hasOwnProperty(skeletonData['race'] + '_' + col)) {
                // 有精确的种族 + col icon
                pic = icons[skeletonData['race'] + '_' + col];
            } else if (icons.hasOwnProperty('All_' + col)) {
                // 有all种族 + col icon
                pic = icons['All_' + col];
            } else if (icons.hasOwnProperty(col) && icons[col].length > 0) {
                // 有对应的 col icon
                pic = icons[col][0];
            } else if (icons.hasOwnProperty(skeletonData['race'])) {
                // 有对应的种族icon
                pic = icons[skeletonData['race']];
            } else if (icons.hasOwnProperty('All')) {
                // 有all种族的icon
                pic = icons['All'];
            }
            if (pic === null && Object.keys(icons).length > 0) {
                // icon图片未找到，但是icon图片配置列表里是有东西的，则随便给一个
                for (let iconKey in icons) {
                    if (!icons.hasOwnProperty(iconKey)) { continue; }
                    if (Array.isArray(icons[iconKey]) && icons[iconKey].length > 0) {
                        pic = icons[iconKey][0];
                        break;
                    } else if (icons[iconKey] !== '' && icons[iconKey] !== null && typeof icons[iconKey] !== 'undefined') {
                        pic = icons[iconKey];
                        break;
                    }
                }
            }
            if (pic !== null && pic.match(new RegExp(skeletonType, 'i')) === null) {
                /**
                 * 最后检查一次icon类型是否错误匹配，发现过虽然code相同，但其实完全不是一类的
                 * 例子：skeleton：00006912，code：010003，对应的icon只有一张Weapon_SW_010003_2.png，其实物品并不是武器
                 * 如果匹配错误，重新给pic赋null值
                 */
                pic = null;
            }
            if (pic === null) {
                // 没有找到icon，记录日志
                /**
                 * UPDATE: 这里不再打log，日志过多
                 * self.utilBuildDataInvalidInfo(skeletonType, skeletonCode);
                 * self.dbInvalid[skeletonType][skeletonCode]['notFound'].push('pic:[skeleton:' + skeletonId + ',texture:' + textureId + ',material:' + materialId + ']');
                 * self.grunt.log.error('[BstUpkParser] Icon pic has not been found, code: ' + skeletonCode +
                 *     ', skeleton: ' + skeletonId + ', texture: ' + textureId + ', material: ' + materialId);
                 */
            }
        }

        // 写入数据
        self.db[skeletonType][skeletonData['core'] + '_' + col] = {
            "skeleton": skeletonId,
            "texture": textureId,
            "material": materialId,
            "col1Material": skeletonData['col1Material'],
            "col": col,
            "core": skeletonData['core'],
            "code": skeletonCode,
            "race": skeletonData['race'],
            "pic": pic
        };
    }
};

BstUpkParser.prototype.utilBuildSkeletonInvalidInfo = function(upkId) {
    if (!this.upkDataSkeletonInvalid.hasOwnProperty(upkId)) {
        this.upkDataSkeletonInvalid[upkId] = {
            "upkId": upkId,
            "notFound": [],
            "invalid": {}
        };
    }
};

BstUpkParser.prototype.utilBuildMaterialInvalidInfo = function(upkId) {
    if (!this.upkDataMaterialInvalid.hasOwnProperty(upkId)) {
        this.upkDataMaterialInvalid[upkId] = {
            "upkId": upkId,
            "notFound": [],
            "invalid": {},
            "noTexture": null
        };
    }
};

BstUpkParser.prototype.utilBuildIconInvalidInfo = function(iconType, filename) {
    if (!this.iconDataInvalid[iconType].hasOwnProperty(filename)) {
        this.iconDataInvalid[iconType][filename] = {
            "filename": filename,
            "notFound": []
        }
    }
};

BstUpkParser.prototype.utilBuildDataInvalidInfo = function(dataType, code) {
    if (!this.dbInvalid[dataType].hasOwnProperty(code)) {
        this.dbInvalid[dataType][code] = {
            "code": code,
            "notFound": [],
            "invalid": []
        };
    }
};

BstUpkParser.prototype.utilSearchMeshXmlViaSkeletonId = function(skeletonId) {
    let filtered = this.meshXml.filter(function(element) {
        let resourceMatch = element['$']['resource-name'].match(/(\d+)\..*/);
        return (
            BstConst.RACE_VALID.indexOf(element['$']['race']) !== -1 // race 种族字符串必须是4大种族中的一个
            && resourceMatch !== null // resource-name 这一项"."之前必须是一串数字，匹配skeleton upk id
            && resourceMatch[1] == skeletonId // skeleton upk id 数值一致
        );
    });
    filtered = filtered.shift(); // 只取第一个，虽然理论上也只应该有一个，因为是根据skeleton upk id来筛选的

    /**
     * _.filter的返回结果永远是一个object，即便没找到，返回的也是"[]"格式的object，shift()返回值可能为undefined
     */
    if (typeof filtered === 'undefined') {
        filtered = null;
    }

    return filtered;
};

BstUpkParser.prototype.utilRecognizeSkeletonType = function(skeletonId, upkLog) {
    const self = this;

    if (upkLog === null || upkLog === '' || typeof upkLog === 'undefined') {
        upkLog = self.util.readFileSplitWithLineBreak(path.join(BstConst.PATH_UPK_LOG, skeletonId + '.log'));
    }

    let coreLineOfContent = self.upkIdsLines[skeletonId];

    if (coreLineOfContent.match(/\d+_(KunN|JinF|JinM|GonF|GonM|LynF|LynM)/i) !== null) {
        // costume & attachment
        let type = BstConst.PART_TYPE_ATTACH; // 默认 attach

        let codeMatch = coreLineOfContent.match(/(\d+)_(KunN|JinF|JinM|GonF|GonM|LynF|LynM)/i);
        let code = codeMatch[1];

// 新的做法，通过code长度进行识别，长度为6的，是饰品，5的是服装
        if (code.length === 5) {
            type = BstConst.PART_TYPE_COSTUME;
        }

// 老的做法：
//        // 01. 检查icon，在icon数据集的costume分类下存在code的，是衣服
//        if (self.iconData['costume'].hasOwnProperty(code)) {
//            type = BstConst.PART_TYPE_COSTUME;
//        } else if (self.iconData['attach'].hasOwnProperty(code)) {
//            // 在icon的attach分类里已经找到了，说明必然是attach，后续不必做了
//            return type;
//        }
//
//        // 02. 检查mesh.xml里的数据，数据存在，且类型是"body-mesh"的，是衣服
//        if (type === BstConst.PART_TYPE_ATTACH) {
//            let meshElement = self.utilSearchMeshXmlViaSkeletonId(skeletonId);
//            if (meshElement !== null
//                && meshElement.hasOwnProperty('type-mesh')
//                && meshElement['$']['type-mesh'] == 'body-mesh') {
//                type = BstConst.PART_TYPE_COSTUME;
//            }
//        }
//
//        // 03. 首先检查upk log里有没有含body的Material3信息，有的话，是衣服（注意：有部分饰品因为和身体相关的，也有这个代码，会串）
//        if (type === BstConst.PART_TYPE_ATTACH) {
//            for (const line of upkLog) {
//                let match = line.match(/Loading\sMaterial3\s(.+)\sfrom\spackage\s\d+.upk/);
//                if (match !== null && match[1].toLowerCase().match(/.*body.*/i) !== null) {
//                    type = BstConst.PART_TYPE_COSTUME;
//                }
//            }
//        }

        return type;

    } else if (coreLineOfContent.match(/\d+_Autoscale/i) !== null) {
        // weapon with autoscale
        return BstConst.PART_TYPE_WEAPON;
    } else if (coreLineOfContent.match(/ClassName:\sSkeletalMesh3\sObjectName:(\d+)/) !== null) {
        // weapon with numeric id
        return BstConst.PART_TYPE_WEAPON;
    } else if (coreLineOfContent.match(/(KunN|JinF|JinM|GonF|GonM|LynF|LynM)_\d+/i) !== null) {
        // hair
        return BstConst.PART_TYPE_ATTACH;
    } else {
        // unrecognized
        return BstConst.PART_TYPE_UNRECOGNIZED;
    }
};

module.exports = BstUpkParser;