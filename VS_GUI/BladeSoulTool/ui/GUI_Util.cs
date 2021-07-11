using System;
using System.IO;
using System.Windows.Forms;
using BladeSoulTool.lib;

namespace BladeSoulTool.ui
{
    public partial class GuiUtil : Form
    {
        private I18NLoader _i18N;

        public GuiUtil()
        {
            InitializeComponent();
            InitI18N();
            Init();
        }

        private void InitI18N()
        {
            _i18N = I18NLoader.Instance;
            labelSelectGameDir.Text = _i18N.LoadI18NValue("GuiUtil", "labelSelectGameDir");
            btnSelectGameDir.Text = _i18N.LoadI18NValue("GuiUtil", "btnSelectGameDir");
            labelSelectLang.Text = _i18N.LoadI18NValue("GuiUtil", "labelSelectLang");
        }

        private void Init()
        {
            // 读取已配置的游戏地址配置
            var gamePath = (string) Manager.Instance.SystemSettings["path"]["game"];
            textBoxGameDir.Text = gamePath;

            // 语言选项
            comboBoxSelectLang.Items.AddRange(Manager.Instance.LanguageNames.ToArray());
            var lang = (string) Manager.Instance.SystemSettings["lang"];
            comboBoxSelectLang.SelectedIndex = Manager.Instance.LanguageTypes.IndexOf(lang);
            comboBoxSelectLang.SelectedIndexChanged += comboBoxSelectLang_SelectedIndexChanged;

            // license文字内容
            textBoxLicense.Text = string.Format(_i18N.LoadI18NValue("GuiUtil", "license"), "");

            // 选择游戏安装路径控件
            btnSelectGameDir.Click += btnSelectGameDir_Click;
        }

        private void btnSelectGameDir_Click(Object sender, EventArgs e)
        {
            string path = "";

            var browser = new FolderBrowserDialog();
            var result = browser.ShowDialog();

            if (result == DialogResult.OK)
            {
                path = browser.SelectedPath;
                if (!File.Exists(path + "/bin/Client.exe"))
                {
                    Manager.DisplayErrorMessageBox(
                        _i18N.LoadI18NValue("GuiUtil", "boxTitle"),
                        _i18N.LoadI18NValue("GuiUtil", "boxMessage")
                    );
                }
                else
                {
                    textBoxGameDir.Text = path;
                    Manager.Instance.SystemSettings["path"]["game"] = path;
                    Manager.WriteJsonFile(Manager.PathJsonSettings, Manager.Instance.SystemSettings);
                }
            }
        }

        private void comboBoxSelectLang_SelectedIndexChanged(Object sender, EventArgs e)
        {
            // 重新记录语言信息，并写入配置文件
            var lang = Manager.Instance.LanguageTypes[comboBoxSelectLang.SelectedIndex];
            Manager.Instance.SystemSettings["lang"] = lang;
            Manager.WriteJsonFile(Manager.PathJsonSettings, Manager.Instance.SystemSettings);

            // 显示重启程序提示信息
            // 这一段因为关系到语言的设定，使用双语显示，不作为配置设定
            Manager.DisplayInfoMessageBox(
                "重启以生效改动 / Restart to activate the setting change", 
                "你需要手动重启应用程序，来应用当前改动的语言配置！\r\n" +
                "You have to restart the application manually, to activate the language setting change!"
            );
        }
        
    }
}
