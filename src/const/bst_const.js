"use strict";

var path = require('path');

var BstConst = function() {};

//------------------------------------------------------------------------
//- GLOBAL
//------------------------------------------------------------------------
BstConst.PART_BODY = 'body';
BstConst.PART_FACE = 'face';
BstConst.PART_HAIR = 'hair';

BstConst.BACKUP_TAIL = '.bst_bak';

BstConst.PATH_DATABASE = path.join(process.cwd(), 'database');

BstConst.PART_TYPES = ['costume', 'attach', 'weapon'];
BstConst.PART_TYPE_COSTUME = 'costume';
BstConst.PART_TYPE_ATTACH  = 'attach';
BstConst.PART_TYPE_WEAPON  = 'weapon';
BstConst.PART_TYPE_UNRECOGNIZED = 'unrecognized';

BstConst.PATH_PNG_CPS_FAILURE = path.join(process.cwd(), 'database', 'png_cps_failure.json');

BstConst.PATH_TENCENT_SUB_DIR = 'mod';

//------------------------------------------------------------------------
//- MESH XML
//------------------------------------------------------------------------
BstConst.PATH_MESH_XML = path.join(process.cwd(), 'resources/dedat/output/engine/charactertoolappearance_mesh.xml');
BstConst.RACE_VALID = ['곤', '건', '진', '린'];

//------------------------------------------------------------------------
//- UPK
//------------------------------------------------------------------------
BstConst.UPK_NO_OBJ_ERROR = 'Specified package(s) has no supported objects';
BstConst.UPK_UNKNOWN_MEMBER_ERROR = '*** unknown member';

BstConst.UPK_ENTRANCE_LINE_NO = 2; // 一般来说，log的第三行里的内容是关键信息
BstConst.UPK_TYPE_SKELETON = 'SkeletalMesh3';
BstConst.UPK_TYPE_TEXTURE  = 'Texture2D';
BstConst.UPK_TYPE_MATERIAL = 'MaterialInstanceConstant';

BstConst.PATH_UPK_BASE = 'database/upk';
BstConst.PATH_UPK_LOG = path.join(process.cwd(), BstConst.PATH_UPK_BASE, 'log');
BstConst.PATH_UPK_DATA_LIST = path.join(process.cwd(), BstConst.PATH_UPK_BASE, 'data/list');
BstConst.PATH_UPK_DATA_RAW = path.join(process.cwd(), BstConst.PATH_UPK_BASE, 'data/raw');

BstConst.LIST_FILE_SKELETON_COSTUME = 'list_skeleton_costume.json';
BstConst.LIST_FILE_SKELETON_ATTACH = 'list_skeleton_attach.json';
BstConst.LIST_FILE_SKELETON_WEAPON = 'list_skeleton_weapon.json';
BstConst.LIST_FILE_SKELETON_HAIR = 'list_skeleton_hair.json';
BstConst.LIST_FILE_SKELETON_UNRECOGNIZED = 'list_skeleton_unrecognized.json';
BstConst.LIST_FILE_TEXTURE = 'list_texture.json';
BstConst.LIST_FILE_MATERIAL = 'list_material.json';
BstConst.LIST_FILE_UNRECOGNIZED = 'list_unrecognized.json';

BstConst.RAW_FILE_ICON = 'raw_icon.json';
BstConst.RAW_FILE_ICON_INVALID = 'raw_icon_invalid.json';
BstConst.RAW_FILE_SKELETON = 'raw_skeleton.json';
BstConst.RAW_FILE_SKELETON_INVALID = 'raw_skeleton_invalid.json';
BstConst.RAW_FILE_TEXTURE = 'raw_texture.json';
BstConst.RAW_FILE_MATERIAL = 'raw_material.json';
BstConst.RAW_FILE_MATERIAL_INVALID = 'raw_material_invalid.json';

BstConst.HAIR_UPK_SPECIAL_CORES = [
    'JinM_029', 'JinF_023', 'JinF_020', 'GonF_010', 'KunN_014'
];
BstConst.HAIR_UPK_CORE_PREFIX = 'Hair_';
// The upk content is shortened to the long limit length, because it is the shortest change length of the current upk file name, so the maximum length is 8 bits.
BstConst.UPK_REPLACE_SHORT_TO_LONG_LIMIT = 8;
BstConst.UPK_CORE_PHYSICS_SUFFIX = '_Physics';
BstConst.UPK_HEX_STR_NULL = '00';

BstConst.UPK_INVALID_TEXTURE_UPK_IDS = [
    '00002620', // Material3：常见于costume类型数据中：core：Material3 Basic
    '00002640', // Texture2D：大量材质相关obj
    '00002665', // MaterialInstanceConstant：材质upk
    '00002700', // MaterialInstanceConstant：材质upk
    '00005708', // Texture2D：常见于attach类型数据中特别是眼镜上的glasses obj：obj：D, S, glasses3_m
    '00007428', // MaterialInstanceConstant：材质upk
    '00008124', // MaterialInstanceConstant：材质upk
    '00008613', // MaterialInstanceConstant：常见于attach, weapon类型数据中：core：NothingMAT
    '00009220', // MaterialInstanceConstant：材质upk
    '00012963', // Texture2D：大量无用obj
    '00016228', // MaterialInstanceConstant：材质upk
    '00016234', // MaterialInstanceConstant：材质upk
    '00016237', // MaterialInstanceConstant：材质upk
    '00016885', // MaterialInstanceConstant：材质upk
    '00017459', // MaterialInstanceConstant：材质upk
    '00018859', // MaterialInstanceConstant：材质upk
    '00021199', // MaterialInstanceConstant：材质upk
    '00021666', // MaterialInstanceConstant：材质upk
    '00021668', // MaterialInstanceConstant：材质upk
    '00021674'  // MaterialInstanceConstant：材质upk
];

/**
 * Some special material upk files, which reference multiple texture upk files,
 * And, the main texture upk file may also be placed under some of the less important texture upk files.
 * When parsing, the first uploaded upk file appears, so some material upk and texture upk file association errors will occur.
 * Some textures in raw_texture.json may have some more material, and some textures may have no material at all.
 * This configuration is a special case description, some of the special cases are pre-configured
 * Specific examples reference: bone: 00022166, texture: 00022167, material: 00022168
 * The structure of this configuration is basically the same as in raw_material.json:
 * {
 *     "00022168": {
 *         "col": "col1",
 *         "texture": "00022167",
 *         "objs": [
 *             "060012_JinF_col1_D",
 *             "060012_JinF_col1_E",
 *             "060012_JinF_col1_M",
 *             "060012_JinF_col1_N",
 *             "060012_JinF_col1_S"
 *         ]
 *     }
 * }
 */
BstConst.UPK_PRE_DEFINED_MATERIAL_INFO = {
    "00022168": {
        "col": "col1",
        "texture": "00022167",
        "objs": [
            "060012_JinF_col1_D",
            "060012_JinF_col1_E",
            "060012_JinF_col1_M",
            "060012_JinF_col1_N",
            "060012_JinF_col1_S"
        ]
    },
    "00022176": {
        "col": "col1",
        "texture": "00022174",
        "objs": [
            "060011_JinF_col1_D",
            "060011_JinF_col1_E",
            "060011_JinF_col1_M",
            "060011_JinF_col1_N",
            "060011_JinF_col1_S"
        ]
    },
    "00022181": {
        "col": "col1",
        "texture": "00022179",
        "objs": [
            "060008_JinF_col1_D",
            "060008_JinF_col1_M",
            "060008_JinF_col1_N",
            "060008_JinF_col1_S"
        ]
    }
};

/**
 * Some special texture upk files, whose file description may be texture instance (MaterialInstanceConstant),
 * But in fact, its role is to map, in this case, the upk file has been assigned to the material part at the beginning of the bone classification,
 * When the model is parsed, the texture will not be found. This configuration is a special case description, and some special cases are pre-configured.
 * Specific examples reference: bone: 00011151, texture: 00013149, material: 00013150
 * The structure of this configuration is basically the same as in raw_texture.json:
 * {
 *     "00013149": {
 *         "objs": [
 *             "00001_KunN_d",
 *             "00001_KunN_m",
 *             "00001_KunN_n",
 *             "00001_KunN_s"
 *         ],
 *         "materials": {}
 *     }
 * }
 */
BstConst.UPK_PRE_DEFINED_TEXTURE_INFO = {
    "00013149": {
        "objs": [
            "00001_KunN_d",
            "00001_KunN_m",
            "00001_KunN_n",
            "00001_KunN_s"
        ],
        "materials": {}
    }
};

//------------------------------------------------------------------------
//- ICON
//------------------------------------------------------------------------
BstConst.ICON_UPK_ID = '00008758';
BstConst.PATH_ICON_BASE = 'database/icon';
BstConst.PATH_ICON_TGA = path.join(process.cwd(), BstConst.PATH_ICON_BASE, 'tga');
BstConst.PATH_ICON_PNG = path.join(process.cwd(), BstConst.PATH_ICON_BASE, 'png');
BstConst.PATH_ICON_PNG_CPS = path.join(process.cwd(), BstConst.PATH_ICON_BASE, 'png-cps');
BstConst.PATH_ICON_CONVERSION_FAILURE = path.join(process.cwd(), BstConst.PATH_ICON_BASE, 'conversion_failure.json');

module.exports = BstConst;