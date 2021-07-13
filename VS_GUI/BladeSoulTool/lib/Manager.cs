using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace BladeSoulTool.lib
{
    class Manager
    {
        private static Manager _instance;
        public static Manager Instance => _instance ?? (_instance = new Manager());

        public static void CreateInstance()
        {
            if (_instance == null)
            {
                _instance = new Manager();
            }
        }

        private Manager()
        {
            Init();
        }

        public const int RaceIdKunn = 0;
        public const int RaceIdJinf = 1;
        public const int RaceIdJinm = 2;
        public const int RaceIdGonf = 3;
        public const int RaceIdGonm = 4;
        public const int RaceIdLyn = 5;

        public const int TypeCostume = 0;
        public const int TypeAttach = 1;
        public const int TypeWeapon = 2;
        public const int TypeUtil = 3;

        public readonly string[] Types = {"costume", "attach", "weapon"};

        public const string PathRoot = "../../../../";
        public const string PathConfig = "config/";
        public const string PathDatabase = "database/";
        public const string PathResources = "resources/";

        public const string PathVsRoot = "../../";
        public const string PathVsLog = "log/";
        public const string PathVsConfig = "config/";
        public const string PathVsLocales = "locale/";

        public const string PathJsonSettings = PathRoot + PathConfig + "setting.json";
        public const string PathI18N = PathVsRoot + PathVsLocales;

        public const string PathDataCostume = PathRoot + PathDatabase + "costume/data/";
        public const string PathDataAttach = PathRoot + PathDatabase + "attach/data/";
        public const string PathDataWeapon = PathRoot + PathDatabase + "weapon/data/";

        public const string FileJsonData = "data.json";
        public const string FileJsonDataInvalid = "data_invalid.json";
        public const string FileJsonOrigin = "origin.json";

        public const string PathLoadingGif = PathRoot + PathResources + "others/loading.gif";
        public const string PathNoIcon = PathRoot + PathResources + "others/no_icon_64x64.png";
        public const string PathErrorIcon = PathRoot + PathResources + "others/error_icon_64x64.png";

        public const string GithubRoot = "https://raw.githubusercontent.com/daniels1989/BladeSoulTool/";
        public const string GithubBranch = "master";
        public const string GithubVersionTxt = GithubRoot + GithubBranch + "/VERSION.txt";        
        
        public const string GruntRunSign = "Grunt and task output will also be logged to";
        public const string BstReportMissingInfo = "-1";
        public const string BstReportInvalidJson = "-2";
        public const string BstReportAlreadyExists = "-3";

        public byte[] LoadingGifBytes { get; set; }
        public byte[] NoIconBytes { get; set; }
        public byte[] ErrorIconBytes { get; set; }

        public JObject SystemSettings { get; set; }
        public JObject DataCostume { get; set; }
        public JObject DataCostumeInvalid { get; set; }
        public JObject DataAttach { get; set; }
        public JObject DataAttachInvalid { get; set; }
        public JObject DataWeapon { get; set; }
        public JObject DataWeaponInvalid { get; set; }
        public JObject DataI18N { get; set; }

        public List<string> RaceNames { get; set; }
        public List<string> RaceTypes { get; set; }

        public List<string> LanguageNames { get; set; }
        public List<string> LanguageTypes { get; set; } 

        private bool _isGruntRunning = false;

        private void Init()
        {
            SystemSettings = ReadJsonFile(PathJsonSettings);
            DataCostume = ReadJsonFile(PathDataCostume + FileJsonData);
            DataCostumeInvalid = ReadJsonFile(PathDataCostume + FileJsonDataInvalid);
            DataAttach = ReadJsonFile(PathDataAttach + FileJsonData);
            DataAttachInvalid = ReadJsonFile(PathDataAttach + FileJsonDataInvalid);
            DataWeapon = ReadJsonFile(PathDataWeapon + FileJsonData);
            DataWeaponInvalid = ReadJsonFile(PathDataWeapon + FileJsonDataInvalid);

            var lang = (string) SystemSettings["lang"];
            DataI18N = ReadJsonFile(PathI18N + lang + ".json");

            var raceNamesInConfig = (JArray) DataI18N["Game"]["raceNames"];
            RaceNames = new List<string>();
            RaceNames.AddRange(
                raceNamesInConfig.ToObject<List<string>>()
            );
            RaceTypes = new List<string>();
            RaceTypes.AddRange(new string[] 
            {
                "KunN", "JinF", "JinM", "GonF", "GonM", "Lyn"
            });

            LanguageNames = new List<string>();
            LanguageNames.AddRange(new String[]
            {
                "English", "简体中文"
            });
            LanguageTypes = new List<string>();
            LanguageTypes.AddRange(new String[]
            {
                "en_US", "zh_CN" 
            });

            LoadingGifBytes = Utility.GetBytesFromFile(PathLoadingGif);
            NoIconBytes = Utility.GetBytesFromFile(PathNoIcon);
            ErrorIconBytes = Utility.GetBytesFromFile(PathErrorIcon);
        }

        public static JObject ReadJsonFile(string path)
        {
            if(!File.Exists(path))
            {
                File.WriteAllText(path, "{}");
            } 
            var content = (JObject)JToken.ReadFrom(new JsonTextReader(File.OpenText(path)));
            Logger.Log("Json file loaded: " + path);

            return content;
        }

        public JObject GetAllDataByType(int type)
        {
            JObject data = null;
            switch (type)
            {
                case TypeAttach:
                    data = DataAttach;
                    break;
                case TypeCostume:
                    data = DataCostume;
                    break;
                case TypeWeapon:
                    data = DataWeapon;
                    break;
            }
            return data;
        }

        public JObject GetCostumeDataByRace(int raceId)
        {
            Logger.Log("[BstManager] GetCostumeDataByRace: " + raceId);

            var raceType = RaceTypes[raceId]; // 获取目标种族类型名

            var filtered = new JObject();

            foreach (var element in DataCostume.Properties())
            {
                var elementId = element.Name;
                var elementData = (JObject) element.Value;
                var race = (string) elementData["race"];
                if (race == raceType
                    || Regex.IsMatch(race, raceType, RegexOptions.IgnoreCase))
                {
                    filtered.Add(elementId, elementData);
                }
            }

            return filtered;
        }

        public JObject GetAttachDataByRace(int raceId)
        {
            Logger.Log("[BstManager] GetAttachDataByRace: " + raceId);

            var raceType = RaceTypes[raceId]; // 获取目标种族类型名

            var filtered = new JObject();

            foreach (var element in DataAttach.Properties())
            {
                var elementId = element.Name;
                var elementData = (JObject) element.Value;
                var race = (string) elementData["race"];
                if (race == raceType
                    || Regex.IsMatch(race, raceType, RegexOptions.IgnoreCase))
                {
                    filtered.Add(elementId, elementData);
                }
            }

            return filtered;
        }

        public static void WriteJsonFile(string path, JObject json)
        {
            if (!File.Exists(path))
            {
                CreateFile(path);
            }
            try
            {
                File.WriteAllText(path, json.ToString(Formatting.Indented));
            }
            catch (IOException ex)
            {
                Logger.Log(ex);
            }
        }
        
        public static void DisplayErrorMessageBox(string boxTitle, string boxMsg)
        {
            try {
                MessageBox.Show(App.Instance, boxMsg, boxTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (InvalidOperationException ex)
            {
            }
        }

        public static DialogResult DisplayConfirmMessageBox(string boxTitle, string boxMsg)
        {
            try {
                return MessageBox.Show(App.Instance, boxMsg, boxTitle, MessageBoxButtons.OKCancel, MessageBoxIcon.Information);
            }
            catch (InvalidOperationException ex)
            {
                return DialogResult.Cancel;
            }
        }

        public static DialogResult DisplayInfoMessageBox(string boxTitle, string boxMsg)
        {
            try
            {
                return MessageBox.Show(App.Instance, boxMsg, boxTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (InvalidOperationException ex)
            {
                return DialogResult.Cancel;
            }
        }

        public static void CreateFile(string path)
        {
            File.Create(path).Dispose();
        }

        public static Bitmap ConvertByteToImage(byte[] blob)
        {
            var mStream = new MemoryStream();
            var pData = blob;
            mStream.Write(pData, 0, Convert.ToInt32(pData.Length));
            var bitmap = new Bitmap(mStream, false);
            mStream.Dispose();

            return bitmap;
        }

        public static string GetStringFromWeb(string url)
        {
            if (string.IsNullOrEmpty(url))
            {
                return null;
            }

            var webClient = new WebClient();

            try
            {
                return webClient.DownloadString(url);
            }
            catch (Exception ex)
            {
                Logger.Log(ex);
                return null;
            }
        }

        public static string GetTypeName(int type)
        {
            var name = "attach";
            switch (type)
            {
                case TypeAttach:
                    name = "attach";
                    break;
                case TypeCostume:
                    name = "costume";
                    break;
                case TypeWeapon:
                    name = "weapon";
                    break;
                default:
                    break;
            }
            return name;
        }

        public static string GetIconPath(JObject elementData)
        {
            string path = null;

            var iconPicName = (string)elementData["pic"];

            if (!string.IsNullOrEmpty(iconPicName))
            {
                path = PathRoot + 
                    (string) Instance.SystemSettings["png_optimizer"]["tasks"]["icon"]["src"]
                    + "/" + iconPicName;
            }
            else
            {
                // The picture is set to empty, indicating that the item does not have an icon, directly to the default icon path
                path = PathNoIcon;
            }

            return path;
        }

        public static string GetItemPicPath(int type, JObject elementData)
        {
            return PathRoot + 
                (string)Instance.SystemSettings["png_optimizer"]["tasks"][GetTypeName(type)]["src"]
                + "/" + (string) elementData["core"] + "_" + (string) elementData["col"] + ".png";
        }

        public static string GetItemOriginJsonPath(int type)
        {
            return PathRoot + PathDatabase + GetTypeName(type) + "/data/origin.json";
        }

        public static void ShowMsgInTextBox(TextBox box, string msg, bool logInConsole = true)
        {
            if (box == null)
            {
                return; // TextBox对象不存在
            }
            else
            {
                try
                {
                    box.TryBeginInvoke(() => box.AppendText(msg + "\r\n"));
                }
                catch (InvalidOperationException ex)
                {
                    Logger.Log(ex); // 有的时候在显示的时候TextBox已经被销毁，忽略错误
                }
            }
            if (logInConsole)
            {
                Logger.Log(msg);
            }
        }

        public void RunGrunt(TextBox box, bool showMessage, string task = "", string[] args = null)
        {
            if (_isGruntRunning)
            {
                Logger.Log(I18NLoader.Instance.LoadI18NValue("BstManager", "gruntAlreadyRun"));
                return; // 已经有grunt脚本在运行了，这里不再运行新的脚本
            }

            _isGruntRunning = true;

            Task.Run(() =>
            {
                var proc = new Process();

                var cwd = Directory.GetCurrentDirectory() + "/" + PathRoot;
                const string cmd = "cmd.exe";
                var arguments = "/c grunt " + task + " " + ((args == null) ? "" : String.Join(" ", args)) + " --no-color --stack";
                // 打印命令信息
                var logMsg = string.Format(I18NLoader.Instance.LoadI18NValue("BstManager", "gruntStartLog"), cwd, cmd, arguments);
                ShowMsgInTextBox(box, logMsg);

                proc.StartInfo.WorkingDirectory = cwd;
                proc.StartInfo.FileName = cmd;
                proc.StartInfo.Arguments = arguments;
                proc.StartInfo.UseShellExecute = false;
                proc.StartInfo.CreateNoWindow = true;
                proc.StartInfo.RedirectStandardError = true;
                proc.StartInfo.RedirectStandardOutput = true;

                proc.EnableRaisingEvents = true;
                if (showMessage)
                {
                    proc.Exited += (es, ee) => DisplayInfoMessageBox(
                        I18NLoader.Instance.LoadI18NValue("BstManager", "gruntResultTitle"),
                        I18NLoader.Instance.LoadI18NValue("BstManager", "gruntResultMsg")
                    );
                }

                proc.OutputDataReceived += (dataSender, dataE) => ShowMsgInTextBox(box, dataE.Data); // 注册输出接收事件
                proc.Start(); // 启动
                proc.BeginOutputReadLine(); // 逐行读入输出
                _isGruntRunning = false;
            });
        }
    }
}
