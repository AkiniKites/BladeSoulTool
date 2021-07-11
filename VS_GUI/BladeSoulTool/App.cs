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

        private GuiItems[] _items = new GuiItems[3];
        private Control _formUtil;

        private I18NLoader _i18N;

        private App()
        {
            InitializeComponent();

            Manager.CreateInstance();
            IconLoader.CreateInstance();

            CheckBnsGamePath();

            InitI18N();
            Init();
        }

        private void InitI18N()
        {
            _i18N = I18NLoader.Instance;
            tabCostume.Text = _i18N.LoadI18NValue("App", "tabCostume");
            tabAttach.Text = _i18N.LoadI18NValue("App", "tabAttach");
            tabWeapon.Text = _i18N.LoadI18NValue("App", "tabWeapon");
            tabUtil.Text = _i18N.LoadI18NValue("App", "tabUtil");
            Text = _i18N.LoadI18NValue("App", "title");
        }

        private void Init()
        {
            Logger.Log("[App] BladeSoulTool App start ...");

            tabControl.SelectedIndexChanged += tabControl_SelectedIndexChanged;
            tabControl_SelectedIndexChanged(null, null);
        }

        private void CheckBnsGamePath()
        {
            Task.Run(() =>
            {
                var gamePath = (string)Manager.Instance.SystemSettings["path"]["game"];
                if (!Directory.Exists(gamePath) || !File.Exists(gamePath + "/bin/Client.exe"))
                {
                    // 游戏地址配置不存在或不正确，更新为null
                    Manager.Instance.SystemSettings["path"]["game"] = null;
                    Manager.WriteJsonFile(Manager.PathJsonSettings, Manager.Instance.SystemSettings);
                    Manager.DisplayErrorMessageBox(
                        I18NLoader.Instance.LoadI18NValue("App", "gamePathErrTitle"),
                        I18NLoader.Instance.LoadI18NValue("App", "gamePathErrContent")
                    );
                }
            });
        }

        private void CheckNewVersion()
        {
            var currentVer = (string)Manager.Instance.SystemSettings["version"];
            Task.Run(() =>
            {
                var releasedVer = Manager.GetStringFromWeb(Manager.GithubVersionTxt);
                // releasedVer是从网络下载的，在网络无法访问或下载失败的情况下，可能为null，需要做验证
                if (!String.IsNullOrEmpty(releasedVer) && currentVer != releasedVer)
                {
                    var result = Manager.DisplayConfirmMessageBox(
                        _i18N.LoadI18NValue("App", "newVerTitle"),
                        string.Format(
                            _i18N.LoadI18NValue("App", "newVerContent"),
                            currentVer,
                            releasedVer,
                            I18NLoader.Instance.LoadI18NValue("App", "releaseSiteUrl"))
                    );
                    if (result == DialogResult.OK)
                    {
                        Process.Start(I18NLoader.Instance.LoadI18NValue("App", "releaseSiteUrl"));
                    }
                }
            });
        }

        private void tabControl_SelectedIndexChanged(Object sender, EventArgs e)
        {
            Logger.Log("[App] Switch to tab: " + tabControl.SelectedIndex);

            var idx = tabControl.SelectedIndex;
            if (idx < 3)
            {
                if (_items[idx] == null)
                {
                    _items[idx] = new GuiItems(idx);
                    
                    switch(idx)
                    {
                        case Manager.TypeCostume: tabCostume.Controls.Add(_items[idx]); break;
                        case Manager.TypeAttach: tabAttach.Controls.Add(_items[idx]); break;
                        case Manager.TypeWeapon: tabWeapon.Controls.Add(_items[idx]); break;
                    };

                    _items[idx].Load();
                }
            }
            else
            {
                if (_formUtil == null)
                {
                    _formUtil = CreateUtilForm();
                    tabUtil.Controls.Add(_formUtil);
                }
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
