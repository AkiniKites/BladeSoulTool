using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using BladeSoulTool.lib;
using BladeSoulTool.ui;

namespace BladeSoulTool
{
    public partial class App : Form
    {
        private static App _instance;

        public static App Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = new App();
                }
                return _instance;
            }
        }

        private Control _costumes;
        private Control _formAttach;
        private Control _formWeapon;
        private Control _formUtil;

        private BstI18NLoader _i18N;

        private App()
        {
            InitializeComponent();
            
            BstManager.CreateInstance();
            BstIconLoader.CreateInstance();

            CheckBnsGamePath();

            InitI18N();
            Init();
        }

        private void InitI18N()
        {
            _i18N = BstI18NLoader.Instance;
            tabCostume.Text = _i18N.LoadI18NValue("App", "tabCostume");
            tabAttach.Text = _i18N.LoadI18NValue("App", "tabAttach");
            tabWeapon.Text = _i18N.LoadI18NValue("App", "tabWeapon");
            tabUtil.Text = _i18N.LoadI18NValue("App", "tabUtil");
            Text = _i18N.LoadI18NValue("App", "title");
        }

        private void Init()
        {
            BstLogger.Instance.Log("[App] BladeSoulTool App start ...");

            _costumes = new GuiItems(BstManager.TypeCostume);
            tabCostume.Controls.Add(_costumes);

            tabControl.SelectedIndexChanged += new EventHandler(tabControl_SelectedIndexChanged);
        }

        private void CheckBnsGamePath()
        {
            Task.Run(() =>
            {
                var gamePath = (string) BstManager.Instance.SystemSettings["path"]["game"];
                if (!Directory.Exists(gamePath) || !File.Exists(gamePath + "/bin/Client.exe"))
                {
                    // 游戏地址配置不存在或不正确，更新为null
                    BstManager.Instance.SystemSettings["path"]["game"] = null;
                    BstManager.WriteJsonFile(BstManager.PathJsonSettings, BstManager.Instance.SystemSettings);
                    BstManager.DisplayErrorMessageBox(
                        BstI18NLoader.Instance.LoadI18NValue("App", "gamePathErrTitle"),
                        BstI18NLoader.Instance.LoadI18NValue("App", "gamePathErrContent")
                    );
                }
            });
        }

        private void CheckNewVersion()
        {
            var currentVer = (string) BstManager.Instance.SystemSettings["version"];
            Task.Run(() =>
            {
                var releasedVer = BstManager.GetStringFromWeb(BstManager.GithubVersionTxt);
                // releasedVer是从网络下载的，在网络无法访问或下载失败的情况下，可能为null，需要做验证
                if (!String.IsNullOrEmpty(releasedVer) && currentVer != releasedVer)
                {
                    var result = BstManager.DisplayConfirmMessageBox(
                        _i18N.LoadI18NValue("App", "newVerTitle"),
                        string.Format(
                            _i18N.LoadI18NValue("App", "newVerContent"),
                            currentVer,
                            releasedVer,
                            BstI18NLoader.Instance.LoadI18NValue("App", "releaseSiteUrl"))
                    );
                    if (result == DialogResult.OK)
                    {
                        Process.Start(BstI18NLoader.Instance.LoadI18NValue("App", "releaseSiteUrl"));
                    }
                }
            });
        }

        private void tabControl_SelectedIndexChanged(Object sender, EventArgs e)
        {
            BstLogger.Instance.Log("[App] Switch to tab: " + tabControl.SelectedIndex);
            switch (tabControl.SelectedIndex)
            {
                case BstManager.TypeCostume:
                    if (_costumes == null) 
                    {
                        _costumes = new GuiItems(BstManager.TypeCostume);
                        tabCostume.Controls.Add(_costumes);
                    }
                    break;
                case BstManager.TypeAttach:
                    if (_formAttach == null)
                    {
                        _formAttach = new GuiItems(BstManager.TypeAttach);
                        tabAttach.Controls.Add(_formAttach);
                    }
                    break;
                case BstManager.TypeWeapon:
                    if (_formWeapon == null)
                    {
                        _formWeapon = new GuiItems(BstManager.TypeWeapon);
                        tabWeapon.Controls.Add(_formWeapon);
                    }
                    break;
                case BstManager.TypeUtil:
                    if (_formUtil == null)
                    {
                        _formUtil = CreateUtilForm();
                        tabUtil.Controls.Add(_formUtil);
                    }
                    break;
                default:
                    break;
            }
        }
        
        private static Form CreateUtilForm()
        {
            return CreateFormAttr(new GuiUtil());
        }

        private static Form CreateFormAttr(Form form)
        {
            form.TopLevel = false;
            form.Visible = true;
            form.FormBorderStyle = FormBorderStyle.None;
            form.WindowState = FormWindowState.Maximized;
            form.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Bottom | AnchorStyles.Right;

            return form;
        }
    }
}
